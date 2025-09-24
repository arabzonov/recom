/**
 * Background script to sync all authenticated stores
 * 
 * This script:
 * 1. Fetches all authenticated stores from the database
 * 2. For each store, fetches products and orders from Ecwid API
 * 3. Stores the data in the local database
 * 4. Generates category and product recommendations
 * 
 * Usage: node scripts/background/sync-all-stores.js
 */

import axios from 'axios';
import { closeDatabase } from '../../server/config/database.js';
import { StoreService, ProductService, OrderService } from '../../server/data/index.js';
import CategoryService from '../../server/data/CategoryService.js';
import dotenv from 'dotenv';

dotenv.config();

// Ecwid API configuration
const ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

// Data services will be initialized in the main function

/**
 * Get all authenticated stores from database
 */
async function getAuthenticatedStores() {
  console.log('🔍 Fetching authenticated stores from database...');
  
  const storeService = new StoreService();
  const stores = await storeService.findAuthenticated();
  console.log(`📊 Found ${stores.length} authenticated stores:`, stores.map(s => s.store_id));
  return stores;
}

/**
 * Fetch products from Ecwid API for a store
 */
async function fetchStoreProducts(store) {
  console.log(`🛍️  Fetching products for store ${store.store_id}...`);
  const allProducts = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    try {
      console.log(`📡 API call: GET /${store.store_id}/products (offset: ${offset}, limit: ${limit})`);
      const response = await axios.get(`${ECWID_API_BASE}/${store.store_id}/products`, {
        headers: {
          'Authorization': `Bearer ${store.access_token}`
        },
        params: {
          limit,
          offset
        }
      });

      const products = response.data.items || [];
      console.log(`📦 Received ${products.length} products in this batch`);
      allProducts.push(...products);

      if (products.length < limit) {
        console.log('✅ No more products to fetch');
        break;
      }

      offset += limit;
    } catch (error) {
      if (error.response?.status === 403) {
        console.error(`❌ Access denied for store ${store.store_id}. Token may be expired or invalid.`);
        console.error(`   Token: ${store.access_token ? 'Present' : 'Missing'}`);
        console.error(`   Scopes: ${store.scopes || 'Not set'}`);
      } else {
        console.error(`❌ Error fetching products for store ${store.store_id}:`, error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
      }
      break;
    }
  }

  console.log(`✅ Fetched ${allProducts.length} total products for store ${store.store_id}`);
  return allProducts;
}

/**
 * Fetch orders from Ecwid API for a store
 */
async function fetchStoreOrders(store) {
  console.log(`📋 Fetching orders for store ${store.store_id}...`);
  const allOrders = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    try {
      console.log(`📡 API call: GET /${store.store_id}/orders (offset: ${offset}, limit: ${limit})`);
      const response = await axios.get(`${ECWID_API_BASE}/${store.store_id}/orders`, {
        headers: {
          'Authorization': `Bearer ${store.access_token}`
        },
        params: {
          limit,
          offset
        }
      });

      const orders = response.data.items || [];
      console.log(`📋 Received ${orders.length} orders in this batch`);
      allOrders.push(...orders);

      if (orders.length < limit) {
        console.log('✅ No more orders to fetch');
        break;
      }

      offset += limit;
    } catch (error) {
      console.error(`❌ Error fetching orders for store ${store.store_id}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      break;
    }
  }

  console.log(`✅ Fetched ${allOrders.length} total orders for store ${store.store_id}`);
  return allOrders;
}

/**
 * Store products in database
 */
async function storeProducts(storeId, products) {
  console.log(`💾 Storing ${products.length} products for store ${storeId}...`);
  try {
    const storeService = new StoreService();
    const productService = new ProductService();
    
    // Ensure store exists in database before inserting products
    console.log(`🔍 Checking if store ${storeId} exists in database...`);
    const existingStore = await storeService.findByStoreId(storeId);
    if (!existingStore) {
      console.error(`❌ Store ${storeId} not found in database`);
      return { created: 0, errors: products.length, total: products.length };
    }
    console.log(`✅ Store ${storeId} found in database`);
    
    // DELETE: Remove all existing products for this store
    console.log(`🗑️  Deleting existing products for store ${storeId}...`);
    const deleteResult = await productService.deleteByStoreId(storeId);
    console.log(`🗑️  Deleted ${deleteResult} existing products`);
    
    // Process products to calculate minimum prices from variants and filter products with quantity > 0
    const processedProducts = products
      .map(product => {
        // Calculate minimum price from variants if they exist
        let minPrice = product.price || 0;
        if (product.combinations && product.combinations.length > 0) {
          const variantPrices = product.combinations
            .map(combo => combo.price || 0)
            .filter(price => price > 0);
          if (variantPrices.length > 0) {
            minPrice = Math.min(...variantPrices);
          }
        }

        // Calculate total stock
        let totalStock = 0;
        if (product.unlimited) {
          totalStock = 999;
        } else if (product.quantityInStock !== undefined) {
          totalStock = product.quantityInStock;
        } else {
          // Handle cases where quantityInStock is undefined
          if (product.inStock === true) {
            // If quantity is undefined but inStock is true, treat as unlimited
            totalStock = 999;
          } else {
            // If quantity is undefined and inStock is false, treat as 0
            totalStock = 0;
          }
        }

        
        return {
          id: product.id,
          name: product.name || 'Unnamed Product',
          price: minPrice,
          stock: totalStock,
          sku: product.sku || null,
          imageUrl: product.imageUrl || null,
          categoryId: product.categoryIds ? JSON.stringify(product.categoryIds) : '[]'
        };
      })
      .filter(product => {
        // Only include products with stock > 0
        return product.stock > 0;
      });

    console.log(`📊 Processed ${processedProducts.length} products (filtered from ${products.length} total)`);
    
    // INSERT: Insert all current products from API
    console.log(`💾 Inserting ${processedProducts.length} products into database...`);
    const result = await productService.bulkInsert(storeId, processedProducts);
    console.log(`✅ Product sync completed: ${result.created} created, ${result.errors} errors`);
    
    return result;
  } catch (error) {
    console.error('❌ Error storing products:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Store orders in database
 */
async function storeOrders(storeId, orders) {
  console.log(`💾 Storing ${orders.length} orders for store ${storeId}...`);
  try {
    const storeService = new StoreService();
    const orderService = new OrderService();
    
    // Ensure store exists in database before inserting orders
    console.log(`🔍 Checking if store ${storeId} exists in database...`);
    const existingStore = await storeService.findByStoreId(storeId);
    if (!existingStore) {
      console.error(`❌ Store ${storeId} not found in database`);
      return { created: 0, errors: orders.length, total: orders.length };
    }
    console.log(`✅ Store ${storeId} found in database`);
    
    // DELETE: Remove all existing orders for this store
    console.log(`🗑️  Deleting existing orders for store ${storeId}...`);
    const deleteResult = await orderService.deleteByStoreId(storeId);
    console.log(`🗑️  Deleted ${deleteResult} existing orders`);
    
    // INSERT: Insert all current orders from API
    console.log(`💾 Inserting ${orders.length} orders into database...`);
    const result = await orderService.bulkInsert(storeId, orders);
    console.log(`✅ Order sync completed: ${result.created} created, ${result.errors} errors`);
    
    return result;
  } catch (error) {
    console.error('❌ Error storing orders:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Main sync function
 */
async function syncAllStores() {
  console.log('🚀 Starting sync-all-stores process...');
  try {
    const stores = await getAuthenticatedStores();

    if (stores.length === 0) {
      console.log('⚠️  No authenticated stores found. Exiting.');
      return;
    }

    console.log(`🔄 Processing ${stores.length} stores...`);

    for (const store of stores) {
      console.log(`\n🏪 Processing store: ${store.store_name} (${store.store_id})`);
      try {
        // Initialize services for this store
        const productService = new ProductService();
        const orderService = new OrderService();
        const categoryService = new CategoryService();
        
        // Clean up existing data for this store only using data layer
        console.log(`🧹 Cleaning up data for store ${store.store_id}...`);
        const deletedProducts = await productService.deleteByStoreId(store.store_id);
        const deletedOrders = await orderService.deleteByStoreId(store.store_id);
        const deletedCategories = await categoryService.deleteByStoreId(store.store_id);
        console.log(`✅ Cleaned ${deletedProducts} products, ${deletedOrders} orders, ${deletedCategories} categories for store ${store.store_id}`);
        
        // Fetch and store products
        console.log(`\n📦 Starting product sync for store ${store.store_id}...`);
        const products = await fetchStoreProducts(store);
        await storeProducts(store.store_id, products);
        
        // Fetch and store orders
        console.log(`\n📋 Starting order sync for store ${store.store_id}...`);
        const orders = await fetchStoreOrders(store);
        await storeOrders(store.store_id, orders);
        
        // Generate category recommendations (after orders are stored)
        console.log(`\n🎯 Generating category recommendations for store ${store.store_id}...`);
        try {
          const categorySummary = await categoryService.generateAllCategoryRecommendations(store.store_id);
          console.log(`✅ Category recommendations: ${categorySummary.successful}/${categorySummary.totalCategories} categories processed`);
        } catch (catError) {
          console.error(`⚠️  Failed to generate category recommendations for store ${store.store_name}:`, catError.message);
        }
        
        // Generate recommendations for all products (after orders are stored for cross-sell analysis)
        if (products.length > 0) {
          console.log(`\n🎯 Generating product recommendations for store ${store.store_id}...`);
          try {
            const recommendationSummary = await productService.generateAllRecommendations(store.store_id);
            console.log(`✅ Product recommendations: ${recommendationSummary.successful}/${recommendationSummary.totalProducts} products processed`);
          } catch (recError) {
            console.error(`⚠️  Failed to generate recommendations for store ${store.store_name}:`, recError.message);
          }
        }
        
        console.log(`✅ Store ${store.store_name} sync completed successfully`);
        
      } catch (error) {
        console.error(`❌ Error syncing store ${store.store_name}:`, error.message);
        console.error('Stack trace:', error.stack);
      }
    }

  } catch (error) {
    console.error('❌ Error during sync:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    console.log('🔌 Closing database connection...');
    await closeDatabase();
    console.log('✅ Sync-all-stores process completed');
  }
}

// Run the sync
console.log('🎬 Starting sync-all-stores script...');
console.log('📅 Timestamp:', new Date().toISOString());
syncAllStores();