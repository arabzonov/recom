-- Database Setup Script for Ecwid Recommendation Plugin
-- This script creates the database schema for the recommendation system
-- Run this script to initialize a fresh database

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS plugin_settings;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS stores;

-- Create stores table
CREATE TABLE stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  scopes TEXT,
  webhook_secret TEXT
);

-- Create products table
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  ecwid_product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL,
  sku TEXT,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  category_ids TEXT DEFAULT '[]',
  cross_sells TEXT DEFAULT '[]',
  upsells TEXT DEFAULT '[]',
  FOREIGN KEY (store_id) REFERENCES stores (store_id),
  UNIQUE(store_id, ecwid_product_id)
);

-- Create orders table
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  ecwid_order_id TEXT NOT NULL,
  order_number TEXT,
  product_ids TEXT DEFAULT '[]',
  FOREIGN KEY (store_id) REFERENCES stores (store_id),
  UNIQUE(store_id, ecwid_order_id)
);

-- Create categories table
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  recommended_products TEXT DEFAULT '[]',
  FOREIGN KEY (store_id) REFERENCES stores (store_id),
  UNIQUE(store_id, category_id)
);

-- Create plugin_settings table
CREATE TABLE plugin_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores (store_id),
  UNIQUE(store_id, setting_key)
);

-- Create indexes for better performance
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_ecwid_id ON products(ecwid_product_id);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_ecwid_id ON orders(ecwid_order_id);
CREATE INDEX idx_categories_store_id ON categories(store_id);
CREATE INDEX idx_categories_category_id ON categories(category_id);
CREATE INDEX idx_plugin_settings_store_id ON plugin_settings(store_id);
CREATE INDEX idx_plugin_settings_key ON plugin_settings(setting_key);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Display success message
SELECT 'Database setup completed successfully!' as message;
