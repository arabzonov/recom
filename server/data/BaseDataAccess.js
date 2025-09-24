import { dbQuery, dbRun, dbGet } from '../config/database.js';

/**
 * Base data access class that provides common database operations
 */
class BaseDataAccess {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Validate WHERE clause to prevent SQL injection
   * @param {string} whereClause - WHERE clause to validate
   * @returns {boolean} True if valid
   */
  isValidWhereClause(whereClause) {
    // Only allow simple column comparisons with placeholders
    const safePattern = /^[a-zA-Z_][a-zA-Z0-9_]*\s*(=|!=|>|<|>=|<=|LIKE|IN)\s*(\?|[a-zA-Z0-9_]+)$/i;
    return safePattern.test(whereClause.trim());
  }

  /**
   * Validate ORDER BY clause to prevent SQL injection
   * @param {string} orderBy - ORDER BY clause to validate
   * @returns {boolean} True if valid
   */
  isValidOrderByClause(orderBy) {
    // Only allow column names with optional ASC/DESC
    const safePattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\s+(ASC|DESC))?$/i;
    return safePattern.test(orderBy.trim());
  }

  /**
   * Validate field names to prevent SQL injection
   * @param {Array} fields - Field names to validate
   * @returns {boolean} True if all fields are valid
   */
  isValidFieldNames(fields) {
    const safePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return fields.every(field => safePattern.test(field));
  }

  /**
   * Execute a raw SQL query
   * @param {string} sql - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(sql, params = []) {
    return await dbQuery(sql, params);
  }

  /**
   * Execute a raw SQL statement (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL statement
   * @param {Array} params - Statement parameters
   * @returns {Promise<Object>} Execution result
   */
  async execute(sql, params = []) {
    return await dbRun(sql, params);
  }

  /**
   * Get a single record by SQL query
   * @param {string} sql - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} Single record or null
   */
  async get(sql, params = []) {
    return await dbGet(sql, params);
  }

  /**
   * Find a record by ID
   * @param {string|number} id - Record ID
   * @returns {Promise<Object|null>} Record or null
   */
  async findById(id) {
    return await this.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  /**
   * Find all records
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of records
   */
  async findAll(options = {}) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];

    if (options.where) {
      // Validate WHERE clause to prevent SQL injection
      if (typeof options.where !== 'string' || !this.isValidWhereClause(options.where)) {
        throw new Error('Invalid WHERE clause: must be a safe SQL condition');
      }
      sql += ` WHERE ${options.where}`;
      params.push(...options.params || []);
    }

    if (options.orderBy) {
      // Validate ORDER BY clause to prevent SQL injection
      if (typeof options.orderBy !== 'string' || !this.isValidOrderByClause(options.orderBy)) {
        throw new Error('Invalid ORDER BY clause: must be a safe column name with optional ASC/DESC');
      }
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      // Validate LIMIT to prevent SQL injection
      const limit = parseInt(options.limit);
      if (isNaN(limit) || limit < 0 || limit > 10000) {
        throw new Error('Invalid LIMIT: must be a number between 0 and 10000');
      }
      sql += ` LIMIT ${limit}`;
    }

    if (options.offset) {
      // Validate OFFSET to prevent SQL injection
      const offset = parseInt(options.offset);
      if (isNaN(offset) || offset < 0) {
        throw new Error('Invalid OFFSET: must be a non-negative number');
      }
      sql += ` OFFSET ${offset}`;
    }

    return await this.query(sql, params);
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    // Validate field names to prevent SQL injection
    if (!this.isValidFieldNames(fields)) {
      throw new Error('Invalid field names: must contain only alphanumeric characters and underscores');
    }
    
    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await this.execute(sql, values);
    
    return {
      id: result.lastID,
      ...data
    };
  }

  /**
   * Update a record by ID
   * @param {string|number} id - Record ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Update result
   */
  async updateById(id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    // Validate field names to prevent SQL injection
    if (!this.isValidFieldNames(fields)) {
      throw new Error('Invalid field names: must contain only alphanumeric characters and underscores');
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    return await this.execute(sql, [...values, id]);
  }

  /**
   * Delete a record by ID
   * @param {string|number} id - Record ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteById(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    return await this.execute(sql, [id]);
  }

  /**
   * Count records
   * @param {Object} options - Query options
   * @returns {Promise<number>} Record count
   */
  async count(options = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];

    if (options.where) {
      sql += ` WHERE ${options.where}`;
      params.push(...options.params || []);
    }

    const result = await this.get(sql, params);
    return result.count;
  }
}

export default BaseDataAccess;
