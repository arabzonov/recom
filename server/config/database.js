import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const { verbose } = sqlite3;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    db = new (verbose().Database)(DB_PATH, (err) => {
      if (err) {
      } else {
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
    resolve();
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
        } else {
        }
        db = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
};

export {
  createDatabaseConnection,
  initializeDatabase,
  dbQuery,
  dbRun,
  dbGet,
  closeDatabase
};
