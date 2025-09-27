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
  let pageCount = 0;
  const startTime = Date.now();

  console.log(`📦 Fetching products for store ${store.store_id}...`);

  while (true) {
    try {
      pageCount++;
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
      
      // Enhanced logging for debugging compare_to from Ecwid API
      if (products.length > 0) {
        console.log(`[SYNC] Sample product from Ecwid API:`, {
          sampleProduct: products[0],
          sampleProductKeys: Object.keys(products[0]),
          hasCompareToPrice: products[0].compareToPrice !== undefined,
          compareToPriceValue: products[0].compareToPrice
        });
      }
      
      allProducts.push(...products);

      console.log(`📦 Store ${store.store_id}: Fetched page ${pageCount} (${products.length} products)`);

      if (products.length < limit) {
        break;
      }

      offset += limit;
    } catch (error) {
      console.error(`❌ Error fetching products for store ${store.store_id} (page ${pageCount}):`, error.message);
      if (error.response) {
        console.error(`❌ API Response: ${error.response.status} - ${error.response.statusText}`);
      }
      break;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`📦 Store ${store.store_id}: Product fetch completed in ${duration}ms (${allProducts.length} total products)`);
  return allProducts;
}

/**
 * Fetch orders from Ecwid API for a store
 */
async function fetchStoreOrders(store) {
  const allOrders = [];
  let offset = 0;
  const limit = 100;
  let pageCount = 0;
  const startTime = Date.now();

  console.log(`📋 Fetching orders for store ${store.store_id}...`);

  while (true) {
    try {
      pageCount++;
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

      console.log(`📋 Store ${store.store_id}: Fetched page ${pageCount} (${orders.length} orders)`);

      if (orders.length < limit) {
        break;
      }

      offset += limit;
    } catch (error) {
      console.error(`❌ Error fetching orders for store ${store.store_id} (page ${pageCount}):`, error.message);
      if (error.response) {
        console.error(`❌ API Response: ${error.response.status} - ${error.response.statusText}`);
      }
      break;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`📋 Store ${store.store_id}: Order fetch completed in ${duration}ms (${allOrders.length} total orders)`);
  return allOrders;
}

/**
 * Store products in database
 */
async function storeProducts(storeId, products) {
  const startTime = Date.now();
  
  try {
    console.log(`💾 Processing products for store ${storeId}...`);
    
    // Ensure store exists in database before inserting products
    const existingStore = await storeService.findByStoreId(storeId);
    if (!existingStore) {
      console.error(`❌ Store ${storeId} not found in database`);
      return { created: 0, errors: products.length, total: products.length };
    }
    
    // DELETE: Remove all existing products for this store
    console.log(`🗑️  Deleting existing products for store ${storeId}...`);
    const deleteResult = await productService.deleteByStoreId(storeId);
    console.log(`🗑️  Deleted ${deleteResult} existing products for store ${storeId}`);
    
    // Process products to calculate minimum prices from variants and filter enabled products
    console.log(`⚙️  Processing ${products.length} products for store ${storeId}...`);
    const processedProducts = products
      .map(product => {
        // Calculate minimum price from variants if they exist
        let minPrice = product.price;
        if (product.combinations && product.combinations.length > 0) {
          const variantPrices = product.combinations
            .map(combo => combo.price)
            .filter(price => price > 0);
          if (variantPrices.length > 0) {
            minPrice = Math.min(...variantPrices);
          }
        }

        // Calculate total stock - do not record stock for products
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

        // If main stock is 0, check all options stocks and sum them up
        if (totalStock === 0 && product.options && product.options.length > 0) {
          totalStock = product.options.reduce((sum, option) => {
            return sum + option.quantityInStock;
          }, 0);
        }

        // Process options as JSON array containing option name, price and stock
        const optionsArray = [];
        if (product.options && product.options.length > 0) {
          product.options.forEach(option => {
            optionsArray.push({
              name: option.name,
              price: option.priceModifier,
              stock: option.quantityInStock
            });
          });
        }

        // Enhanced logging for debugging compare_to
        if (product.compareToPrice) {
          console.log(`[SYNC] Product ${product.id} has compareToPrice:`, {
            id: product.id,
            name: product.name,
            price: minPrice,
            compareToPrice: product.compareToPrice,
            originalProductData: product
          });
        }

        return {
          id: product.id,
          name: product.name,
          price: minPrice,
          compareToPrice: product.compareToPrice, // Ecwid API uses compareToPrice
          stock: totalStock,
          categoryId: JSON.stringify(product.categoryIds),
          enabled: product.enabled,
          sku: product.sku,
          imageUrl: product.thumbnailUrl,
          productUrl: product.url,
          options: JSON.stringify(optionsArray)
        };
      })
      .filter(product => {
        // Only include enabled products with stock > 0
        return product.enabled && product.stock > 0;
      });

    console.log(`⚙️  Processed ${processedProducts.length} valid products (${products.length - processedProducts.length} filtered out)`);

    // INSERT: Insert all current products from API
    console.log(`💾 Inserting ${processedProducts.length} products into database...`);
    const result = await productService.bulkInsert(storeId, processedProducts);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Store ${storeId}: ${result.created} products stored (${result.errors} errors, ${products.length} total fetched, ${processedProducts.length} processed) in ${duration}ms`);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error storing products for store ${storeId} after ${duration}ms:`, error.message);
    if (error.stack) {
      console.error(`❌ Stack trace:`, error.stack);
    }
    throw error;
  }
}

/**
 * Store orders in database
 */
async function storeOrders(storeId, orders) {
  const startTime = Date.now();
  
  try {
    console.log(`💾 Processing orders for store ${storeId}...`);
    
    // Ensure store exists in database before inserting orders
    const existingStore = await storeService.findByStoreId(storeId);
    if (!existingStore) {
      console.error(`❌ Store ${storeId} not found in database`);
      return { created: 0, errors: orders.length, total: orders.length };
    }
    
    // DELETE: Remove all existing orders for this store
    console.log(`🗑️  Deleting existing orders for store ${storeId}...`);
    const deleteResult = await orderService.deleteByStoreId(storeId);
    console.log(`🗑️  Deleted ${deleteResult} existing orders for store ${storeId}`);
    
    // INSERT: Insert all current orders from API
    console.log(`💾 Inserting ${orders.length} orders into database...`);
    const result = await orderService.bulkInsert(storeId, orders);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Store ${storeId}: ${result.created} orders stored (${result.errors} errors) in ${duration}ms`);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error storing orders for store ${storeId} after ${duration}ms:`, error.message);
    if (error.stack) {
      console.error(`❌ Stack trace:`, error.stack);
    }
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

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const storeStartTime = Date.now();
      
      try {
        console.log(`\n🟢 [${i + 1}/${stores.length}] Syncing store ${store.store_id} (${store.store_name})...`);
        
        // Fetch and store products
        const products = await fetchStoreProducts(store);
        await storeProducts(store.store_id, products);
        
        // Fetch and store orders
        const orders = await fetchStoreOrders(store);
        await storeOrders(store.store_id, orders);
        
        // Generate category recommendations (after orders are stored)
        console.log(`🎯 Generating category recommendations for store ${store.store_id}...`);
        try {
          const categoryStartTime = Date.now();
          const categorySummary = await categoryService.generateAllCategoryRecommendations(store.store_id);
          const categoryCount = categorySummary?.successful || 0;
          const categoryTotal = categorySummary?.totalCategories || 0;
          const categoryDuration = Date.now() - categoryStartTime;
          console.log(`✅ Store ${store.store_id}: ${categoryCount}/${categoryTotal} category recommendations generated in ${categoryDuration}ms`);
        } catch (catError) {
          console.log(`🟡 Store ${store.store_id}: Category recommendations failed, using fallbacks - ${catError.message}`);
        }
        
        // Generate recommendations for all products (after orders are stored for cross-sell analysis)
        if (products.length > 0) {
          console.log(`🎯 Generating product recommendations for store ${store.store_id}...`);
          try {
            const recommendationStartTime = Date.now();
            const recommendationSummary = await productService.generateAllRecommendations(store.store_id);
            const productCount = recommendationSummary?.successful || 0;
            const productTotal = recommendationSummary?.totalProducts || 0;
            const recommendationDuration = Date.now() - recommendationStartTime;
            console.log(`✅ Store ${store.store_id}: ${productCount}/${productTotal} product recommendations generated in ${recommendationDuration}ms`);
          } catch (recError) {
            console.log(`🟡 Store ${store.store_id}: Product recommendations failed, using fallbacks - ${recError.message}`);
          }
        }
        
        const storeDuration = Date.now() - storeStartTime;
        console.log(`✅ Completed sync for store ${store.store_id} in ${storeDuration}ms`);
        
      } catch (error) {
        const storeDuration = Date.now() - storeStartTime;
        console.error(`❌ Error during sync for store ${store.store_id} after ${storeDuration}ms:`, error.message);
        if (error.stack) {
          console.error(`❌ Stack trace:`, error.stack);
        }
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
const overallStartTime = Date.now();
console.log('🟢 Starting background sync...');
syncAllStores().then(() => {
  const overallDuration = Date.now() - overallStartTime;
  console.log(`\n🎉 Background sync completed in ${overallDuration}ms`);
}).catch(error => {
  const overallDuration = Date.now() - overallStartTime;
  console.error(`\n💥 Background sync failed after ${overallDuration}ms:`, error.message);
  process.exit(1);
});