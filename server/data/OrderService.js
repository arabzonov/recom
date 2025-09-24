import BaseDataAccess from './BaseDataAccess.js';

class OrderService extends BaseDataAccess {
  constructor() {
    super('orders');
  }

  /**
   * Find order by store ID and Ecwid order ID
   * @param {string} storeId - Store ID
   * @param {string} ecwidOrderId - Ecwid order ID
   * @returns {Promise<Object|null>} Order record
   */
  async findByStoreAndEcwidId(storeId, ecwidOrderId) {
    return await this.get(
      'SELECT * FROM orders WHERE store_id = ? AND ecwid_order_id = ?',
      [storeId, ecwidOrderId]
    );
  }

  /**
   * Find all orders for a store
   * @param {string} storeId - Store ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of orders
   */
  async findByStoreId(storeId, options = {}) {
    const { limit, offset, orderBy = 'id DESC' } = options;
    let sql = 'SELECT * FROM orders WHERE store_id = ?';
    const params = [storeId];

    if (orderBy) {
<<<<<<< HEAD
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset) {
      sql += ` OFFSET ?`;
      params.push(offset);
=======
      // Validate orderBy clause to prevent SQL injection
      if (typeof orderBy !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*(\s+(ASC|DESC))?$/.test(orderBy.trim())) {
        throw new Error('Invalid orderBy clause format. Use format: "column ASC" or "column DESC"');
      }
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      // Validate limit to prevent SQL injection
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 0 || limitNum > 10000) {
        throw new Error('Invalid limit value. Must be a number between 0 and 10000');
      }
      sql += ` LIMIT ?`;
      params.push(limitNum);
    }
    if (offset) {
      // Validate offset to prevent SQL injection
      const offsetNum = parseInt(offset);
      if (isNaN(offsetNum) || offsetNum < 0) {
        throw new Error('Invalid offset value. Must be a non-negative number');
      }
      sql += ` OFFSET ?`;
      params.push(offsetNum);
>>>>>>> main
    }

    return await this.query(sql, params);
  }

  /**
   * Create or update order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Order record
   */
  async createOrUpdate(orderData) {
    const {
      storeId,
      ecwidOrderId,
      orderNumber,
      productIds
    } = orderData;

    const productIdsJson = JSON.stringify(productIds || []);

    // Check if order already exists
    const existingOrder = await this.findByStoreAndEcwidId(storeId, ecwidOrderId);

    if (existingOrder) {
      // Update existing order
      await this.execute(`
        UPDATE orders 
        SET order_number = ?, product_ids = ?
        WHERE store_id = ? AND ecwid_order_id = ?
      `, [
        orderNumber,
        productIdsJson,
        storeId,
        ecwidOrderId
      ]);

      return await this.findByStoreAndEcwidId(storeId, ecwidOrderId);
    } else {
      // Create new order
      await this.execute(`
        INSERT INTO orders (store_id, ecwid_order_id, order_number, product_ids)
        VALUES (?, ?, ?, ?)
      `, [
        storeId,
        ecwidOrderId,
        orderNumber,
        productIdsJson
      ]);

      return await this.findByStoreAndEcwidId(storeId, ecwidOrderId);
    }
  }

  /**
   * Bulk create or update orders
   * @param {Array} orders - Array of order data objects
   * @returns {Promise<Object>} Summary of operation
   */
  async bulkCreateOrUpdate(orders) {
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const orderData of orders) {
      try {
        const existing = await this.findByStoreAndEcwidId(orderData.storeId, orderData.ecwidOrderId);
        
        if (existing) {
          updated++;
        } else {
          created++;
        }
        
        await this.createOrUpdate(orderData);
      } catch (error) {
        console.error(`Error processing order ${orderData.ecwidOrderId}:`, error.message);
        errors++;
      }
    }

    return { created, updated, errors, total: orders.length };
  }

  /**
   * Delete all orders for a store
   * @param {string} storeId - Store ID
   * @returns {Promise<number>} Number of deleted orders
   */
  async deleteByStoreId(storeId) {
    const result = await this.execute('DELETE FROM orders WHERE store_id = ?', [storeId]);
    return result.changes;
  }

  /**
   * Bulk insert orders (used by sync script)
   * @param {string} storeId - Store ID
   * @param {Array} orders - Array of order data objects
   * @returns {Promise<Object>} Summary of operation
   */
  async bulkInsert(storeId, orders) {
    let created = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        const orderData = {
          storeId,
          ecwidOrderId: order.id.toString(),
          orderNumber: order.orderNumber || order.number || '',
          productIds: order.items ? order.items.map(item => item.productId?.toString()).filter(Boolean) : []
        };
        
        await this.createOrUpdate(orderData);
        created++;
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error.message);
        errors++;
      }
    }

    return { created, errors, total: orders.length };
  }
}

export default OrderService;