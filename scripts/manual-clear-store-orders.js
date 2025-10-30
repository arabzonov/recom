#!/usr/bin/env node
// Manual script to delete all orders for a single store.
// Usage: node scripts/manual-clear-store-orders.js <storeId>

import { initializeDatabase, closeDatabase } from '../server/config/database.js';
import { OrderService } from '../server/data/index.js';

async function main() {
  const storeId = process.argv[2];
  if (!storeId) {
    console.error('Usage: node scripts/manual-clear-store-orders.js <storeId>');
    process.exit(1);
  }

  await initializeDatabase();
  const orderService = new OrderService();
  const res = await orderService.deleteByStoreId(storeId);
  console.log(`Deleted ${res.changes || 0} orders for store ${storeId}.`);
  await closeDatabase();
}

main().catch((err) => {
  console.error('Error clearing orders:', err);
  process.exit(1);
});
