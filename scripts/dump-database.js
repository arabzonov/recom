/**
 * Database Dump Script
 * 
 * This script dumps all database content to the console for debugging purposes.
 * It shows all tables, records, and relationships in a readable format.
 * 
 * This script has no public access - it's a server-side utility only.
 * 
 * Usage: node scripts/dump-database.js
 */

import { initializeDatabase, closeDatabase } from '../server/config/database.js';
import { StoreService, ProductService, OrderService } from '../server/data/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize services
const storeService = new StoreService();
const productService = new ProductService();
const orderService = new OrderService();

/**
 * Dump all database content
 */
async function dumpDatabase() {
  let db;
  try {
    console.log('🗄️  Starting database dump...');
    console.log(`📅 Dump started at: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
    
    // Initialize database connection
    await initializeDatabase();
    console.log('✅ Database connection initialized\n');

    // Get all stores
    console.log('🏪 STORES TABLE');
    console.log('-'.repeat(40));
    const stores = await storeService.findAll();
    
    if (stores.length === 0) {
      console.log('No stores found in database\n');
    } else {
      console.log(`Found ${stores.length} stores:\n`);
      
      stores.forEach((store, index) => {
        console.log(`Store ${index + 1}:`);
        console.log(`  ID: ${store.id}`);
        console.log(`  Store ID: ${store.store_id}`);
        console.log(`  Store Name: ${store.store_name}`);
        console.log(`  Access Token: ${store.access_token ? 'Present (hidden)' : 'Missing'}`);
        console.log(`  Refresh Token: ${store.refresh_token ? 'Present (hidden)' : 'Missing'}`);
        console.log(`  Scopes: ${store.scopes || 'Not set'}`);
        console.log(`  Recommendation Settings: ${store.recommendation_settings || 'Not set'}`);
        console.log('');
      });
    }

    // Get all products
    console.log('📦 PRODUCTS TABLE');
    console.log('-'.repeat(40));
    const products = await productService.findAll();
    
    if (products.length === 0) {
      console.log('No products found in database\n');
    } else {
      console.log(`Found ${products.length} products:\n`);
      
      products.forEach((product, index) => {
        console.log(`Product ${index + 1}:`);
        console.log(`  ID: ${product.id}`);
        console.log(`  Store ID: ${product.store_id}`);
        console.log(`  Ecwid Product ID: ${product.ecwid_product_id}`);
        console.log(`  Name: ${product.name}`);
        console.log(`  Price: ${product.price}`);
        console.log(`  Compare To Price: ${product.compare_to_price}`);
        console.log(`  Stock: ${product.stock}`);
        console.log(`  SKU: ${product.sku}`);
        console.log(`  Image URL: ${product.image_url}`);
        console.log(`  Product URL: ${product.product_url}`);
        console.log(`  Category IDs: ${product.category_ids}`);
        console.log(`  Options: ${product.options}`);
        console.log(`  Cross Sells: ${product.cross_sells}`);
        console.log(`  Upsells: ${product.upsells}`);
        console.log('');
      });
    }

    // Get all orders
    console.log('📋 ORDERS TABLE');
    console.log('-'.repeat(40));
    const orders = await orderService.findAll();
    
    if (orders.length === 0) {
      console.log('No orders found in database\n');
    } else {
      console.log(`Found ${orders.length} orders:\n`);
      
      orders.forEach((order, index) => {
        console.log(`Order ${index + 1}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  Store ID: ${order.store_id}`);
        console.log(`  Ecwid Order ID: ${order.ecwid_order_id}`);
        console.log(`  Order Number: ${order.order_number}`);
        console.log(`  Product IDs: ${order.product_ids}`);
        console.log('');
      });
    }

    // Get all categories (if CategoryService exists)
    try {
      const { CategoryService } = await import('../server/data/index.js');
      const categoryService = new CategoryService();
      
      console.log('📂 CATEGORIES TABLE');
      console.log('-'.repeat(40));
      const categories = await categoryService.findAll();
      
      if (categories.length === 0) {
        console.log('No categories found in database\n');
      } else {
        console.log(`Found ${categories.length} categories:\n`);
        
        categories.forEach((category, index) => {
          console.log(`Category ${index + 1}:`);
          console.log(`  ID: ${category.id}`);
          console.log(`  Store ID: ${category.store_id}`);
          console.log(`  Category ID: ${category.category_id}`);
          console.log(`  Recommended Products: ${category.recommended_products}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('Categories table not available or error accessing it\n');
    }

    // Database statistics
    console.log('📊 DATABASE STATISTICS');
    console.log('-'.repeat(40));
    console.log(`Total Stores: ${stores.length}`);
    console.log(`Total Products: ${products.length}`);
    console.log(`Total Orders: ${orders.length}`);
    
    // Store-specific statistics
    if (stores.length > 0) {
      console.log('\nStore-specific statistics:');
      for (const store of stores) {
        const storeProducts = products.filter(p => p.store_id === store.store_id);
        const storeOrders = orders.filter(o => o.store_id === store.store_id);
        
        console.log(`\nStore ${store.store_id} (${store.store_name}):`);
        console.log(`  Products: ${storeProducts.length}`);
        console.log(`  Orders: ${storeOrders.length}`);
        
        // Show products with options
        const productsWithOptions = storeProducts.filter(p => {
          try {
            const options = JSON.parse(p.options || '[]');
            return Array.isArray(options) && options.length > 0;
          } catch {
            return false;
          }
        });
        
        if (productsWithOptions.length > 0) {
          console.log(`  Products with options: ${productsWithOptions.length}`);
          productsWithOptions.forEach(product => {
            try {
              const options = JSON.parse(product.options);
              console.log(`    - ${product.name}: ${options.length} options`);
              options.forEach((option, idx) => {
                console.log(`      ${idx + 1}. ${option.name} (Price: ${option.price}, Stock: ${option.stock})`);
              });
            } catch (e) {
              console.log(`    - ${product.name}: Error parsing options`);
            }
          });
        } else {
          console.log(`  Products with options: 0`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Database dump completed successfully');
    console.log(`📅 Dump completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('❌ Error during database dump:', error.message);
    if (error.stack) {
      console.error('❌ Stack trace:', error.stack);
    }
    throw error;
  } finally {
    if (db) {
      await closeDatabase();
      console.log('✅ Database connection closed');
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    await dumpDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database dump failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
