const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/ecwid_plugin.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection (only in development)
let db = null;

const createDatabaseConnection = () => {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database');
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
      }
    });
  }
  return db;
};

// Database initialization
const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    console.log('🗄️ Database initialization started...');
    const db = createDatabaseConnection();
    db.serialize(() => {
      // Clean up unused tables first
      console.log('🧹 Cleaning up unused database tables...');
      db.run('DROP TABLE IF EXISTS customers');
      db.run('DROP TABLE IF EXISTS analytics');
      db.run('DROP TABLE IF EXISTS plugin_settings');
      db.run('DROP TABLE IF EXISTS settings');
      
      // Drop existing tables to recreate with clean structure (but preserve stores and oauth states)
      db.run('DROP TABLE IF EXISTS products');
      db.run('DROP TABLE IF EXISTS orders');
      
      // Create stores table with only used columns (only if it doesn't exist)
      db.run(`
        CREATE TABLE IF NOT EXISTS stores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT UNIQUE NOT NULL,
          store_name TEXT NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          scopes TEXT,
          settings TEXT DEFAULT '{}'
        )
      `);
      
      // Create OAuth states table for OAuth flow security (only if it doesn't exist)
      db.run(`
        CREATE TABLE IF NOT EXISTS oauth_states (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          state TEXT UNIQUE NOT NULL,
          store_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (store_id) REFERENCES stores (store_id)
        )
      `);

      // Create products table for background sync
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT NOT NULL,
          ecwid_product_id TEXT NOT NULL,
          name TEXT NOT NULL,
          price REAL,
          sku TEXT,
          stock INTEGER DEFAULT 0,
          image_url TEXT,
          category_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (store_id) REFERENCES stores (store_id),
          UNIQUE(store_id, ecwid_product_id)
        )
      `);

      // Create orders table for background sync
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT NOT NULL,
          ecwid_order_id TEXT NOT NULL,
          order_number TEXT,
          total REAL,
          subtotal REAL,
          tax_amount REAL,
          status TEXT DEFAULT 'pending',
          order_data TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (store_id) REFERENCES stores (store_id),
          UNIQUE(store_id, ecwid_order_id)
        )
      `);

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state)');
      db.run('CREATE INDEX IF NOT EXISTS idx_oauth_states_store_id ON oauth_states(store_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_products_ecwid_id ON products(ecwid_product_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_orders_ecwid_id ON orders(ecwid_order_id)');

      console.log('✅ Database cleanup and tables created successfully');
      console.log('📊 Final structure: stores, oauth_states, products, orders');
      console.log('🗑️  Removed: customers, analytics, plugin_settings, settings');
      console.log('💾 Preserved: existing stores and oauth states data');
      resolve();
    });
  });
};

// Database query helper functions
const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const db = createDatabaseConnection();
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
    const db = createDatabaseConnection();
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
    const db = createDatabaseConnection();
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
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
        db = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  createDatabaseConnection,
  initializeDatabase,
  dbQuery,
  dbRun,
  dbGet,
  closeDatabase
};
