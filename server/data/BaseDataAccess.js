const { dbQuery, dbRun, dbGet } = require('../config/database');

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
      sql += ` WHERE ${options.where}`;
      params.push(...options.params || []);
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
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

module.exports = BaseDataAccess;
