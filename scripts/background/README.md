# Background Scripts

This directory contains utility scripts for database management and data synchronization.

## Scripts

### `sync-all-stores.js`
Synchronizes data from all authenticated Ecwid stores to the local database.

**Usage:**
```bash
node scripts/background/sync-all-stores.js
```

**What it does:**
- Fetches all authenticated stores from the database
- For each store, retrieves products and orders from Ecwid API
- **DELETES all existing data** for the store first (ensures exact match with Ecwid)
- **INSERTS fresh data** from the API (no updates, only new inserts)
- Handles product variants to get minimum prices
- **Filters products**: Only includes enabled products that are in stock
- **Stock calculation**: Uses `inStock` status and combination quantities
- Ensures local database exactly matches current Ecwid data


## Prerequisites

- Environment variables must be configured in `.env`
- At least one store must be authenticated via OAuth
- Database must be initialized

## Notes

- These scripts are designed to be run manually or via cron jobs
- The sync script respects Ecwid API rate limits
- All scripts include comprehensive error handling and logging
