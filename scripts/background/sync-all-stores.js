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
import { initializeDatabase, closeDatabase } from '../../server/config/database.js';
import { StoreService, ProductService, OrderService, CategoryService } from '../../server/data/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Ecwid API configuration
const ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

// Initialize data services
const storeService = new StoreService();
const productService = new ProductService();
const orderService = new OrderService();
const categoryService = new CategoryService();

/**
 * Get all authenticated stores from database
 */
async function getAuthenticatedStores() {
  return await storeService.findAuthenticated();
}

/**
 * Fetch products from Ecwid API for a store
 */
async function fetchStoreProducts(store) {
  const allProducts = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    try {
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
      allProducts.push(...products);

      if (products.length < limit) {
        break;
      }

      offset += limit;
    } catch (error) {
      if (error.response?.status === 403) {
        console.error(`❌ Access denied for store ${store.store_id}. Token may be expired or invalid.`);
        console.error(`   Token: ${store.access_token ? 'Present' : 'Missing'}`);
        console.error(`   Scopes: ${store.scopes || 'Not set'}`);
      } else {
        console.error(`Error fetching products for store ${store.store_id}:`, error.message);
      }
      break;
    }
  }

  return allProducts;
}

/**
 * Fetch orders from Ecwid API for a store
 */
async function fetchStoreOrders(store) {
  const allOrders = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    try {
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
      allOrders.push(...orders);

      if (orders.length < limit) {
        break;
      }

      offset += limit;
    } catch (error) {
      console.error(`Error fetching orders for store ${store.store_id}:`, error.message);
      break;
    }
  }

  return allOrders;
}

/**
 * Store products in database
 */
async function storeProducts(storeId, products) {
  try {
    // Ensure store exists in database before inserting products
    const existingStore = await storeService.findByStoreId(storeId);
    if (!existingStore) {
      return { created: 0, errors: products.length, total: products.length };
    }
    
    // DELETE: Remove all existing products for this store
    const deleteResult = await productService.deleteByStoreId(storeId);
    
    // Process products to calculate minimum prices from variants and filter enabled products with quantity > 0
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
          price: minPrice,
          stock: totalStock,
          categoryId: product.categoryIds ? JSON.stringify(product.categoryIds) : '[]',
          enabled: product.enabled
        };
      })
      .filter(product => {
        // Only include enabled products with stock > 0
        return product.enabled && product.stock > 0;
      });

    // INSERT: Insert all current products from API
    const result = await productService.bulkInsert(storeId, processedProducts);
    
    return result;
  } catch (error) {
    console.error('❌ Error storing products:', error.message);
    throw error;
  }
}

/**
 * Store orders in database
 */
async function storeOrders(storeId, orders) {
  try {
    // Ensure store exists in database before inserting orders
    const existingStore = await storeService.findByStoreId(storeId);
    if (!existingStore) {
      return { created: 0, errors: orders.length, total: orders.length };
    }
    
    // DELETE: Remove all existing orders for this store
    const deleteResult = await orderService.deleteByStoreId(storeId);
    
    // INSERT: Insert all current orders from API
    const result = await orderService.bulkInsert(storeId, orders);
    
    return result;
  } catch (error) {
    console.error('❌ Error storing orders:', error.message);
    throw error;
  }
}

/**
 * Main sync function
 */
async function syncAllStores() {
  try {
    const stores = await getAuthenticatedStores();

    if (stores.length === 0) {
      return;
    }

    for (const store of stores) {
      try {
        // Clean up existing data for this store only using data layer
        console.log(`🧹 Cleaning up data for store ${store.store_id}...`);
        const deletedProducts = await productService.deleteByStoreId(store.store_id);
        const deletedOrders = await orderService.deleteByStoreId(store.store_id);
        const deletedCategories = await categoryService.deleteByStoreId(store.store_id);
        console.log(`✅ Cleaned ${deletedProducts} products, ${deletedOrders} orders, ${deletedCategories} categories for store ${store.store_id}`);
        
        // Fetch and store products
        const products = await fetchStoreProducts(store);
        await storeProducts(store.store_id, products);
        
        // Fetch and store orders
        const orders = await fetchStoreOrders(store);
        await storeOrders(store.store_id, orders);
        
        // Generate category recommendations (after orders are stored)
        try {
          const categorySummary = await categoryService.generateAllCategoryRecommendations(store.store_id);
        } catch (catError) {
          console.error(`⚠️  Failed to generate category recommendations for store ${store.store_name}:`, catError.message);
        }
        
        // Generate recommendations for all products (after orders are stored for cross-sell analysis)
        if (products.length > 0) {
          try {
            const recommendationSummary = await productService.generateAllRecommendations(store.store_id);
          } catch (recError) {
            console.error(`⚠️  Failed to generate recommendations for store ${store.store_name}:`, recError.message);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error syncing store ${store.store_name}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error during sync:', error.message);
  } finally {
    await closeDatabase();
  }
}

// Run the sync
syncAllStores();