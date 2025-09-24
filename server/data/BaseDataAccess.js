import { dbQuery, dbRun, dbGet } from '../config/database.js';

/**
 * Base data access class that provides common database operations
 */
class BaseDataAccess {
  constructor(tableName) {
    this.tableName = tableName;
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
      // Validate where clause to prevent SQL injection
      if (typeof options.where !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*\s*[=<>!]+\s*\?$/.test(options.where.trim())) {
        throw new Error('Invalid where clause format. Use format: "column = ?"');
      }
      sql += ` WHERE ${options.where}`;
      params.push(...options.params || []);
    }

    if (options.orderBy) {
      // Validate orderBy clause to prevent SQL injection
      if (typeof options.orderBy !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*(\s+(ASC|DESC))?$/.test(options.orderBy.trim())) {
        throw new Error('Invalid orderBy clause format. Use format: "column ASC" or "column DESC"');
      }
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      // Validate limit to prevent SQL injection
      const limit = parseInt(options.limit);
      if (isNaN(limit) || limit < 0 || limit > 10000) {
        throw new Error('Invalid limit value. Must be a number between 0 and 10000');
      }
      sql += ` LIMIT ${limit}`;
    }

    if (options.offset) {
      // Validate offset to prevent SQL injection
      const offset = parseInt(options.offset);
      if (isNaN(offset) || offset < 0) {
        throw new Error('Invalid offset value. Must be a non-negative number');
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
