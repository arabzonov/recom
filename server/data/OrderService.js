const BaseDataAccess = require('./BaseDataAccess');

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
    const { limit, offset, orderBy = 'created_at DESC' } = options;
    let sql = 'SELECT * FROM orders WHERE store_id = ?';
    const params = [storeId];

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset) {
      sql += ` OFFSET ?`;
      params.push(offset);
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
      total,
      subtotal,
      taxAmount,
      status,
      orderData: fullOrderData
    } = orderData;

    // Check if order already exists
    const existingOrder = await this.findByStoreAndEcwidId(storeId, ecwidOrderId);

    if (existingOrder) {
      // Update existing order
      await this.execute(`
        UPDATE orders 
        SET order_number = ?, total = ?, subtotal = ?, tax_amount = ?, 
            status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE store_id = ? AND ecwid_order_id = ?
      `, [
        orderNumber,
        total,
        subtotal,
        taxAmount,
        status,
        JSON.stringify(fullOrderData),
        storeId,
        ecwidOrderId
      ]);

      return await this.findByStoreAndEcwidId(storeId, ecwidOrderId);
    } else {
      // Create new order
      await this.execute(`
        INSERT INTO orders 
        (store_id, ecwid_order_id, order_number, total, subtotal, tax_amount, status, order_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        storeId,
        ecwidOrderId,
        orderNumber,
        total,
        subtotal,
        taxAmount,
        status,
        JSON.stringify(fullOrderData)
      ]);

      return await this.findByStoreAndEcwidId(storeId, ecwidOrderId);
    }
  }

  /**
   * Bulk create or update orders
   * @param {string} storeId - Store ID
   * @param {Array} orders - Array of order data
   * @returns {Promise<Object>} Result summary
   */
  async bulkCreateOrUpdate(storeId, orders) {
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        const existing = await this.findByStoreAndEcwidId(storeId, order.id);
        
        if (existing) {
          updated++;
        } else {
          created++;
        }

        await this.createOrUpdate({
          storeId,
          ecwidOrderId: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          status: order.fulfillmentStatus || 'pending',
          orderData: order
        });
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error.message);
        if (error.code === 'SQLITE_CONSTRAINT') {
          console.error(`  Foreign key constraint failed - store ${storeId} may not exist`);
        }
        errors++;
      }
    }

    return { created, updated, errors, total: orders.length };
  }

  /**
   * Delete orders for a store
   * @param {string} storeId - Store ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteByStoreId(storeId) {
    return await this.execute('DELETE FROM orders WHERE store_id = ?', [storeId]);
  }

  /**
   * Get order count for a store
   * @param {string} storeId - Store ID
   * @returns {Promise<number>} Order count
   */
  async countByStoreId(storeId) {
    const result = await this.get(
      'SELECT COUNT(*) as total FROM orders WHERE store_id = ?',
      [storeId]
    );
    return result ? result.total : 0;
  }

  /**
   * Get orders by status
   * @param {string} storeId - Store ID
   * @param {string} status - Order status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of orders
   */
  async findByStatus(storeId, status, options = {}) {
    const { limit, offset, orderBy = 'created_at DESC' } = options;
    let sql = 'SELECT * FROM orders WHERE store_id = ? AND status = ?';
    const params = [storeId, status];

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset) {
      sql += ` OFFSET ?`;
      params.push(offset);
    }

    return await this.query(sql, params);
  }
}

module.exports = OrderService;
