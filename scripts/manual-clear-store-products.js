#!/usr/bin/env node
// Manual script to delete all products for a single store.
// Usage: node scripts/manual-clear-store-products.js <storeId>

import { initializeDatabase, closeDatabase } from '../server/config/database.js';
import { ProductService } from '../server/data/index.js';

async function main() {
  const storeId = process.argv[2];
  if (!storeId) {
    console.error('Usage: node scripts/manual-clear-store-products.js <storeId>');
    process.exit(1);
  }

  await initializeDatabase();
  const productService = new ProductService();
  const res = await productService.deleteByStoreId(storeId);
  console.log(`Deleted ${res.changes || 0} products for store ${storeId}.`);
  await closeDatabase();
}

main().catch((err) => {
  console.error('Error clearing products:', err);
  process.exit(1);
});
