#!/usr/bin/env node

/**
 * Standalone script to sync all stores data with our database
 * 
 * This script:
 * 1. Retrieves all authenticated stores from the database
 * 2. For each store, fetches products and orders from Ecwid API
 * 3. Handles product variants to get the minimum price
 * 4. Stores the data in our database
 * 
 * Usage: node scripts/background/sync-all-stores.js
 */

const axios = require('axios');
const { initializeDatabase, closeDatabase } = require('../../server/config/database');
const { StoreService, ProductService, OrderService } = require('../../server/data');
require('dotenv').config();

// Ecwid API configuration
const ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

// Initialize data services
const storeService = new StoreService();
const productService = new ProductService();
const orderService = new OrderService();

/**
 * Get all authenticated stores from database
 */
async function getAuthenticatedStores() {
  try {
    const stores = await storeService.query(`
      SELECT store_id, store_name, access_token, refresh_token, scopes
      FROM stores 
      WHERE access_token IS NOT NULL AND access_token != ''
    `);
    
    console.log(`📊 Found ${stores.length} authenticated stores`);
    return stores;
  } catch (error) {
    console.error('❌ Error fetching stores:', error.message);
    throw error;
  }
}

/**
 * Fetch products from Ecwid API for a store
 */
async function fetchStoreProducts(store) {
  try {
    console.log(`🛍️  Fetching products for store: ${store.store_name} (${store.store_id})`);
    
    let allProducts = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(`${ECWID_API_BASE}/${store.store_id}/products`, {
        headers: {
          'Authorization': `Bearer ${store.access_token}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit,
          offset
        }
      });

      const products = response.data.items || [];
      allProducts = allProducts.concat(products);
      
      hasMore = products.length === limit;
      offset += limit;
      
      console.log(`   📦 Fetched ${products.length} products (total: ${allProducts.length})`);
    }

    return allProducts;
  } catch (error) {
    console.error(`❌ Error fetching products for store ${store.store_id}:`, error.message);
    throw error;
  }
}

/**
 * Fetch orders from Ecwid API for a store
 */
async function fetchStoreOrders(store) {
  try {
    console.log(`📋 Fetching orders for store: ${store.store_name} (${store.store_id})`);
    
    let allOrders = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(`${ECWID_API_BASE}/${store.store_id}/orders`, {
        headers: {
          'Authorization': `Bearer ${store.access_token}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit,
          offset
        }
      });

      const orders = response.data.items || [];
      allOrders = allOrders.concat(orders);
      
      hasMore = orders.length === limit;
      offset += limit;
      
      console.log(`   📋 Fetched ${orders.length} orders (total: ${allOrders.length})`);
    }

    return allOrders;
  } catch (error) {
    console.error(`❌ Error fetching orders for store ${store.store_id}:`, error.message);
    throw error;
  }
}

/**
 * Store products in database
 */
async function storeProducts(storeId, products) {
  try {
    console.log(`💾 Storing ${products.length} products in database...`);
    
    // Ensure store exists in database before inserting products
    const existingStore = await storeService.findByStoreId(storeId);
    if (!existingStore) {
      console.log(`⚠️  Store ${storeId} not found in database, skipping products sync`);
      return { created: 0, updated: 0, errors: products.length, total: products.length };
    }
    
    // Process products to calculate minimum prices from variants
    const processedProducts = products.map(product => {
      // Get minimum price from variants if available
      let minPrice = product.price;
      if (product.variants && product.variants.length > 0) {
        const prices = product.variants.map(v => v.price).filter(p => p > 0);
        if (prices.length > 0) {
          minPrice = Math.min(...prices);
        }
      }

      return {
        id: product.id,
        name: product.name,
        price: minPrice,
        sku: product.sku,
        quantity: product.quantity,
        enabled: product.enabled,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId
      };
    });

    // Use bulk create/update method
    const result = await productService.bulkCreateOrUpdate(storeId, processedProducts);
    
    console.log(`✅ Successfully stored ${products.length} products (${result.created} created, ${result.updated} updated, ${result.errors} errors)`);
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
    console.log(`💾 Storing ${orders.length} orders in database...`);
    
    // Ensure store exists in database before inserting orders
    const existingStore = await storeService.findByStoreId(storeId);
    if (!existingStore) {
      console.log(`⚠️  Store ${storeId} not found in database, skipping orders sync`);
      return { created: 0, updated: 0, errors: orders.length, total: orders.length };
    }
    
    // Use bulk create/update method
    const result = await orderService.bulkCreateOrUpdate(storeId, orders);
    
    console.log(`✅ Successfully stored ${orders.length} orders (${result.created} created, ${result.updated} updated, ${result.errors} errors)`);
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
    console.log('🚀 Starting sync for all stores...');
    
    // Initialize database
    await initializeDatabase();
    
    // Get all authenticated stores
    const stores = await getAuthenticatedStores();
    
    if (stores.length === 0) {
      console.log('ℹ️  No authenticated stores found. Please authenticate stores first.');
      return;
    }
    
    // Process each store
    for (const store of stores) {
      console.log(`\n🏪 Processing store: ${store.store_name} (${store.store_id})`);
      
      try {
        // Fetch and store products
        const products = await fetchStoreProducts(store);
        await storeProducts(store.store_id, products);
        
        // Fetch and store orders
        const orders = await fetchStoreOrders(store);
        await storeOrders(store.store_id, orders);
        
        console.log(`✅ Successfully synced store: ${store.store_name}`);
        
      } catch (storeError) {
        console.error(`❌ Failed to sync store ${store.store_name}:`, storeError.message);
        // Continue with next store
      }
    }
    
    console.log('\n🎉 Sync completed for all stores!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run the sync
if (require.main === module) {
  syncAllStores();
}

module.exports = { syncAllStores };
