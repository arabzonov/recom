const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/ecwid_plugin.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Database initialization
const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create stores table
      db.run(`
        CREATE TABLE IF NOT EXISTS stores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT UNIQUE NOT NULL,
          store_name TEXT NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          webhook_secret TEXT,
          settings TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT NOT NULL,
          ecwid_product_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          price REAL,
          compare_price REAL,
          sku TEXT,
          quantity INTEGER DEFAULT 0,
          enabled BOOLEAN DEFAULT 1,
          image_url TEXT,
          category_id TEXT,
          custom_fields TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (store_id) REFERENCES stores (store_id),
          UNIQUE(store_id, ecwid_product_id)
        )
      `);

      // Create orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT NOT NULL,
          ecwid_order_id TEXT NOT NULL,
          order_number TEXT,
          customer_email TEXT,
          customer_name TEXT,
          total REAL,
          subtotal REAL,
          tax_amount REAL,
          shipping_amount REAL,
          status TEXT DEFAULT 'pending',
          payment_status TEXT DEFAULT 'pending',
          shipping_status TEXT DEFAULT 'pending',
          order_data TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (store_id) REFERENCES stores (store_id),
          UNIQUE(store_id, ecwid_order_id)
        )
      `);

      // Create customers table
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT NOT NULL,
          ecwid_customer_id TEXT NOT NULL,
          email TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          phone TEXT,
          customer_group_id TEXT,
          customer_data TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (store_id) REFERENCES stores (store_id),
          UNIQUE(store_id, ecwid_customer_id)
        )
      `);

      // Create analytics table
      db.run(`
        CREATE TABLE IF NOT EXISTS analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_data TEXT DEFAULT '{}',
          user_agent TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (store_id) REFERENCES stores (store_id)
        )
      `);

      // Create plugin_settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS plugin_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT NOT NULL,
          setting_key TEXT NOT NULL,
          setting_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (store_id) REFERENCES stores (store_id),
          UNIQUE(store_id, setting_key)
        )
      `);

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_products_ecwid_id ON products(ecwid_product_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_orders_ecwid_id ON orders(ecwid_order_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_analytics_store_id ON analytics(store_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type)');

      console.log('Database tables created successfully');
      resolve();
    });
  });
};

// Database query helper functions
const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Close database connection
const closeDatabase = () => {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
};

module.exports = {
  db,
  initializeDatabase,
  dbQuery,
  dbRun,
  dbGet,
  closeDatabase
};
