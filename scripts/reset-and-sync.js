/**
 * Reset and Sync Script
 * 
 * This script clears all products and orders data for all stores and then syncs all stores again.
 * It reuses the existing sync-all-stores.js script to avoid code duplication.
 * 
 * This script has no public access - it's a server-side utility only.
 * 
 * Usage: node scripts/reset-and-sync.js
 */

import { spawn } from 'child_process';
import { initializeDatabase, closeDatabase } from '../server/config/database.js';
import { StoreService, ProductService, OrderService } from '../server/data/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize services
const storeService = new StoreService();
const productService = new ProductService();
const orderService = new OrderService();

// Get the path to the sync script
const syncScriptPath = path.join(__dirname, 'background', 'sync-all-stores.js');

/**
 * Clear all products and orders data for all stores
 */
async function clearAllStoreData() {
  try {
    console.log('🗑️  Clearing all products and orders data...');
    
    // Initialize database connection
    await initializeDatabase();
    console.log('✅ Database connection initialized');

    // Get all stores from database
    const stores = await storeService.findAll();
    
    if (stores.length === 0) {
      console.log('🟡 No stores found in database');
      return { storesProcessed: 0, productsDeleted: 0, ordersDeleted: 0 };
    }

    console.log(`🟢 Found ${stores.length} stores to clear`);

    // Log authentication status for each store
    console.log('🔐 Authentication Status Check:');
    for (const store of stores) {
      const hasToken = !!store.access_token;
      const hasRefreshToken = !!store.refresh_token;
      const scopes = store.scopes || 'Not set';
      
      console.log(`   Store ${store.store_id} (${store.store_name}):`);
      console.log(`     - Access Token: ${hasToken ? '✅ Present' : '❌ Missing'}`);
      console.log(`     - Refresh Token: ${hasRefreshToken ? '✅ Present' : '❌ Missing'}`);
      console.log(`     - Scopes: ${scopes}`);
      
      if (!hasToken) {
        console.log(`     🚨 WARNING: Store ${store.store_id} has no access token - will skip sync`);
      }
    }

    let totalProductsDeleted = 0;
    let totalOrdersDeleted = 0;
    let authenticatedStores = 0;

    // Clear each store
    for (const store of stores) {
      const storeId = store.store_id;
      console.log(`🗑️  Clearing data for store ${storeId} (${store.store_name})...`);

      // Count authenticated stores
      if (store.access_token) {
        authenticatedStores++;
      }

      try {
        // Delete all products for this store
        const productsDeleted = await productService.deleteByStoreId(storeId);
        totalProductsDeleted += productsDeleted;
        console.log(`🗑️  Deleted ${productsDeleted} products for store ${storeId}`);

        // Delete all orders for this store
        const ordersDeleted = await orderService.deleteByStoreId(storeId);
        totalOrdersDeleted += ordersDeleted;
        console.log(`🗑️  Deleted ${ordersDeleted} orders for store ${storeId}`);

        console.log(`✅ Data cleared for store ${storeId}`);
      } catch (error) {
        console.error(`❌ Error clearing store ${storeId}:`, error.message);
      }
    }

    console.log('🎉 Data clearing completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Stores processed: ${stores.length}`);
    console.log(`   - Authenticated stores: ${authenticatedStores}`);
    console.log(`   - Products deleted: ${totalProductsDeleted}`);
    console.log(`   - Orders deleted: ${totalOrdersDeleted}`);
    
    if (authenticatedStores === 0) {
      console.log('🚨 WARNING: No authenticated stores found - sync will likely fail');
      console.log('🔧 Action Required: Re-authenticate stores via OAuth flow');
    }

    return {
      storesProcessed: stores.length,
      authenticatedStores,
      productsDeleted: totalProductsDeleted,
      ordersDeleted: totalOrdersDeleted
    };

  } catch (error) {
    console.error('❌ Error during data clearing:', error.message);
    if (error.stack) {
      console.error('❌ Stack trace:', error.stack);
    }
    throw error;
  } finally {
    // Close database connection
    await closeDatabase();
    console.log('✅ Database connection closed');
  }
}

/**
 * Run the sync-all-stores script
 */
async function runSyncScript() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Starting sync-all-stores script...');
    
    console.log(`📁 Sync script path: ${syncScriptPath}`);
    console.log(`🔧 Environment check:`, {
      NODE_ENV: process.env.NODE_ENV,
      hasEcwidClientId: !!process.env.ECWID_CLIENT_ID,
      hasEcwidClientSecret: !!process.env.ECWID_CLIENT_SECRET,
      hasEcwidScopes: !!process.env.ECWID_SCOPES,
      ecwidScopes: process.env.ECWID_SCOPES
    });
    
    // Spawn the sync script as a child process
    const syncProcess = spawn('node', [syncScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let output = '';
    let errorOutput = '';
    let hasAuthError = false;
    let authErrorDetails = '';

    // Capture stdout
    syncProcess.stdout.on('data', (data) => {
      const message = data.toString();
      output += message;
      
      // Check for authentication-related messages
      if (message.includes('403') || message.includes('401') || message.includes('Forbidden') || message.includes('Unauthorized')) {
        hasAuthError = true;
        authErrorDetails += message;
        console.error('🚨 AUTH ERROR DETECTED:', message.trim());
      } else if (message.includes('Bearer') || message.includes('Authorization') || message.includes('token')) {
        console.log('🔐 AUTH LOG:', message.trim());
      } else {
        console.log('Sync script output:', message.trim());
      }
    });

    // Capture stderr
    syncProcess.stderr.on('data', (data) => {
      const message = data.toString();
      errorOutput += message;
      
      // Check for authentication-related errors
      if (message.includes('403') || message.includes('401') || message.includes('Forbidden') || message.includes('Unauthorized') || message.includes('token')) {
        hasAuthError = true;
        authErrorDetails += message;
        console.error('🚨 AUTH ERROR:', message.trim());
      } else {
        console.error('Sync script error:', message.trim());
      }
    });

    // Handle process completion
    syncProcess.on('close', (code) => {
      console.log(`📊 Sync process completed with exit code: ${code}`);
      
      if (hasAuthError) {
        console.log('🚨 AUTHENTICATION ISSUES DETECTED:');
        console.log('📋 Auth Error Summary:');
        console.log('   - 403/401 errors indicate expired or invalid access tokens');
        console.log('   - Forbidden errors suggest insufficient permissions/scopes');
        console.log('   - Token errors indicate malformed or missing tokens');
        console.log('🔧 Recommended Actions:');
        console.log('   1. Re-authenticate the store via OAuth flow');
        console.log('   2. Check if ECWID_SCOPES includes required permissions');
        console.log('   3. Verify access tokens are not expired');
        console.log('   4. Ensure store is properly authenticated in database');
        console.log(`📝 Auth Error Details:\n${authErrorDetails}`);
      }
      
      if (code === 0) {
        console.log('✅ Sync script completed successfully');
        resolve({
          success: true,
          output: output.trim(),
          errorOutput: errorOutput.trim(),
          hasAuthError,
          authErrorDetails
        });
      } else {
        console.error('❌ Sync script failed with exit code:', code);
        reject(new Error(`Sync script failed with exit code ${code}`));
      }
    });

    // Handle process errors
    syncProcess.on('error', (error) => {
      console.error('❌ Error spawning sync process:', error);
      console.log('🔧 Process Error Debug Info:');
      console.log('   - Check if Node.js is properly installed');
      console.log('   - Verify script path exists:', syncScriptPath);
      console.log('   - Ensure proper file permissions');
      reject(error);
    });

    // Set a timeout for the sync process (30 minutes)
    const timeout = setTimeout(() => {
      if (!syncProcess.killed) {
        console.log('⏰ Sync process timed out after 30 minutes');
        syncProcess.kill('SIGTERM');
        reject(new Error('Sync process timed out after 30 minutes'));
      }
    }, 30 * 60 * 1000);

    // Clear timeout when process completes
    syncProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Main execution function
 */
async function main() {
  try {
    const startTime = Date.now();
    
    console.log('🚀 Starting reset and sync process...');
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    
    // Step 1: Clear all store data
    console.log('\n=== STEP 1: CLEARING ALL STORE DATA ===');
    const clearResult = await clearAllStoreData();
    
    // Step 2: Run the sync script to fetch fresh data
    console.log('\n=== STEP 2: RUNNING SYNC SCRIPT ===');
    const syncResult = await runSyncScript();
    
    // Final summary
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n🎉 Reset and sync completed!');
    console.log(`📊 Final Summary:`);
    console.log(`   - Stores processed: ${clearResult.storesProcessed}`);
    console.log(`   - Authenticated stores: ${clearResult.authenticatedStores}`);
    console.log(`   - Products deleted: ${clearResult.productsDeleted}`);
    console.log(`   - Orders deleted: ${clearResult.ordersDeleted}`);
    console.log(`   - Sync script: ${syncResult.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (syncResult.hasAuthError) {
      console.log(`   - Auth errors: ${syncResult.hasAuthError ? 'DETECTED' : 'NONE'}`);
      console.log('🚨 AUTHENTICATION ISSUES FOUND:');
      console.log('   - Check the auth error details above');
      console.log('   - Re-authenticate stores if needed');
      console.log('   - Verify OAuth scopes and tokens');
    }
    
    console.log(`   - All stores now have fresh data from Ecwid API`);
    console.log(`⏱️  Total duration: ${duration}ms`);
    console.log(`📅 Completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('❌ Error during reset and sync:', error.message);
    if (error.stack) {
      console.error('❌ Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
