# Database Setup Instructions

## Overview
The database initialization has been moved from the application code to a dedicated SQL script for better security and control.

## Setup Steps

### 1. Create Database File
The database file will be created automatically when the application first connects to it.

### 2. Run Database Setup
Execute the setup script to create all tables and indexes:

```bash
# Using sqlite3 command line
sqlite3 data/ecwid_plugin.db < server/setup.sql

# Or using Node.js
node -e "
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('data/ecwid_plugin.db');
const sql = fs.readFileSync('server/setup.sql', 'utf8');
db.exec(sql, (err) => {
  if (err) console.error(err);
  else console.log('Database setup completed');
  db.close();
});
"
```

### 3. Verify Setup
Check that all tables were created:

```bash
sqlite3 data/ecwid_plugin.db ".tables"
```

Expected output:
```
categories  orders  plugin_settings  products  stores
```

## Database Schema

The setup script creates the following tables:

- **stores** - Store configurations and credentials
- **products** - Product data with cross-sell and upsell recommendations
- **orders** - Order history for analysis
- **categories** - Category-based recommendations
- **plugin_settings** - Plugin configuration settings

### Products Table Schema
- `id` - Primary key
- `store_id` - Store identifier
- `ecwid_product_id` - Ecwid product ID
- `name` - Product name (required)
- `price` - Product price
- `sku` - Product SKU
- `stock` - Stock quantity
- `image_url` - Product image URL
- `category_ids` - JSON array of category IDs
- `cross_sells` - JSON array of cross-sell recommendation IDs
- `upsells` - JSON array of upsell recommendation IDs

## Security Benefits

- ✅ **No automatic data deletion** - Database setup is manual and controlled
- ✅ **Production safe** - No risk of accidental schema changes in production
- ✅ **Version controlled** - Database schema is tracked in git
- ✅ **Explicit setup** - Clear separation between app code and database setup

## Troubleshooting

If you encounter issues:

1. **Database locked**: Ensure no other processes are using the database
2. **Permission denied**: Check file permissions on the data directory
3. **Schema errors**: Delete the database file and run setup.sql again

## Development vs Production

- **Development**: Run setup.sql when needed for fresh database
- **Production**: Run setup.sql once during deployment, never again
- **Migrations**: Use separate migration scripts for schema changes
