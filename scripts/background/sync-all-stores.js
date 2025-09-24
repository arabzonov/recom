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
  const allStores = await storeService.findAll();
  const authenticatedStores = allStores.filter(store => store.access_token);
  console.log(`✅ Found ${authenticatedStores.length} authenticated stores`);
  return authenticatedStores;
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
      console.error(`❌ Error fetching products for store ${store.store_id}:`, error.message);
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
      console.error(`❌ Error fetching orders for store ${store.store_id}:`, error.message);
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
      console.error(`❌ Store ${storeId} not found in database`);
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
          name: product.name || `Product ${product.id}`,
          price: minPrice,
          stock: totalStock,
          categoryId: product.categoryIds ? JSON.stringify(product.categoryIds) : '[]',
          enabled: product.enabled,
          sku: product.sku || null,
          imageUrl: product.thumbnailUrl || null
        };
      })
      .filter(product => {
        // Only include enabled products with stock > 0
        return product.enabled && product.stock > 0;
      });

    // INSERT: Insert all current products from API
    const result = await productService.bulkInsert(storeId, processedProducts);
    console.log(`✅ Store ${storeId}: ${result.created} products stored (${result.errors} errors, ${products.length} total fetched, ${processedProducts.length} processed)`);
    
    return result;
  } catch (error) {
    console.error(`❌ Error storing products for store ${storeId}:`, error.message);
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
      console.error(`❌ Store ${storeId} not found in database`);
      return { created: 0, errors: orders.length, total: orders.length };
    }
    
    // DELETE: Remove all existing orders for this store
    const deleteResult = await orderService.deleteByStoreId(storeId);
    
    // INSERT: Insert all current orders from API
    const result = await orderService.bulkInsert(storeId, orders);
    console.log(`✅ Store ${storeId}: ${result.created} orders stored (${result.errors} errors)`);
    
    return result;
  } catch (error) {
    console.error(`❌ Error storing orders for store ${storeId}:`, error.message);
    throw error;
  }
}

/**
 * Main sync function
 */
async function syncAllStores() {
  try {
    console.log('🟢 Database initialization started...');
    await initializeDatabase();
    console.log('✅ Database connection initialized');

    const stores = await getAuthenticatedStores();

    if (stores.length === 0) {
      console.log('🟡 No authenticated stores found');
      return;
    }

    console.log(`🟢 Starting sync for ${stores.length} stores...`);

    for (const store of stores) {
      try {
        console.log(`\n🟢 Syncing store ${store.store_id} (${store.store_name})...`);
        
        // Fetch and store products
        const products = await fetchStoreProducts(store);
        await storeProducts(store.store_id, products);
        
        // Fetch and store orders
        const orders = await fetchStoreOrders(store);
        await storeOrders(store.store_id, orders);
        
        // Generate category recommendations (after orders are stored)
        try {
          const categorySummary = await categoryService.generateAllCategoryRecommendations(store.store_id);
          const categoryCount = categorySummary?.successful || 0;
          const categoryTotal = categorySummary?.totalCategories || 0;
          console.log(`✅ Store ${store.store_id}: ${categoryCount}/${categoryTotal} category recommendations generated`);
        } catch (catError) {
          console.log(`🟡 Store ${store.store_id}: Category recommendations failed, using fallbacks`);
        }
        
        // Generate recommendations for all products (after orders are stored for cross-sell analysis)
        if (products.length > 0) {
          try {
            const recommendationSummary = await productService.generateAllRecommendations(store.store_id);
            const productCount = recommendationSummary?.successful || 0;
            const productTotal = recommendationSummary?.totalProducts || 0;
            console.log(`✅ Store ${store.store_id}: ${productCount}/${productTotal} product recommendations generated`);
          } catch (recError) {
            console.log(`🟡 Store ${store.store_id}: Product recommendations failed, using fallbacks`);
          }
        }
        
        console.log(`✅ Completed sync for store ${store.store_id}`);
        
      } catch (error) {
        console.error(`❌ Error during sync for store ${store.store_id}:`, error.message);
      }
    }

    console.log('\n✅ Sync completed for all stores');

  } catch (error) {
    console.error('❌ Error during sync:', error.message);
  } finally {
    console.log('🟢 Closing database connection...');
    await closeDatabase();
    console.log('✅ Database connection closed');
  }
}

// Run the sync
console.log('🟢 Starting background sync...');
syncAllStores();