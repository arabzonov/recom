const express = require('express');
const { dbQuery, dbRun, dbGet } = require('../config/database');
const router = express.Router();

// Get all orders from local database
router.get('/', async (req, res) => {
  try {
    const { storeId, limit = 20, offset = 0, status, paymentStatus, shippingStatus, search } = req.query;

    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (paymentStatus) {
      sql += ' AND payment_status = ?';
      params.push(paymentStatus);
    }

    if (shippingStatus) {
      sql += ' AND shipping_status = ?';
      params.push(shippingStatus);
    }

    if (search) {
      sql += ' AND (order_number LIKE ? OR customer_email LIKE ? OR customer_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const orders = await dbQuery(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const countParams = [];

    if (storeId) {
      countSql += ' AND store_id = ?';
      countParams.push(storeId);
    }

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    if (paymentStatus) {
      countSql += ' AND payment_status = ?';
      countParams.push(paymentStatus);
    }

    if (shippingStatus) {
      countSql += ' AND shipping_status = ?';
      countParams.push(shippingStatus);
    }

    if (search) {
      countSql += ' AND (order_number LIKE ? OR customer_email LIKE ? OR customer_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const countResult = await dbGet(countSql, countParams);

    res.json({
      success: true,
      data: {
        items: orders,
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId } = req.query;

    let sql = 'SELECT * FROM orders WHERE id = ?';
    const params = [id];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    const order = await dbGet(sql, params);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId, status, paymentStatus, shippingStatus, orderData } = req.body;

    // Check if order exists
    let checkSql = 'SELECT * FROM orders WHERE id = ?';
    const checkParams = [id];

    if (storeId) {
      checkSql += ' AND store_id = ?';
      checkParams.push(storeId);
    }

    const existingOrder = await dbGet(checkSql, checkParams);

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order
    const updateSql = `
      UPDATE orders 
      SET status = ?, payment_status = ?, shipping_status = ?, 
          order_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const updateParams = [
      status || existingOrder.status,
      paymentStatus || existingOrder.payment_status,
      shippingStatus || existingOrder.shipping_status,
      orderData ? JSON.stringify(orderData) : existingOrder.order_data,
      id
    ];

    await dbRun(updateSql, updateParams);

    // Get updated order
    const updatedOrder = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get order analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId } = req.query;

    // Get order details
    let orderSql = 'SELECT * FROM orders WHERE id = ?';
    const orderParams = [id];

    if (storeId) {
      orderSql += ' AND store_id = ?';
      orderParams.push(storeId);
    }

    const order = await dbGet(orderSql, orderParams);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get analytics for this order
    const analytics = await dbQuery(`
      SELECT event_type, COUNT(*) as count, DATE(created_at) as date
      FROM analytics 
      WHERE store_id = ? AND event_data LIKE ?
      GROUP BY event_type, DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [order.store_id, `%"orderId":"${order.ecwid_order_id}"%`]);

    res.json({
      success: true,
      data: {
        order,
        analytics
      }
    });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    res.status(500).json({ error: 'Failed to fetch order analytics' });
  }
});

// Get order statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    const orders = await dbQuery(sql, params);

    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      averageOrderValue: 0,
      statusBreakdown: {},
      paymentStatusBreakdown: {},
      shippingStatusBreakdown: {}
    };

    if (orders.length > 0) {
      stats.averageOrderValue = stats.totalRevenue / orders.length;
    }

    // Status breakdowns
    orders.forEach(order => {
      stats.statusBreakdown[order.status] = (stats.statusBreakdown[order.status] || 0) + 1;
      stats.paymentStatusBreakdown[order.payment_status] = (stats.paymentStatusBreakdown[order.payment_status] || 0) + 1;
      stats.shippingStatusBreakdown[order.shipping_status] = (stats.shippingStatusBreakdown[order.shipping_status] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
});

// Get recent orders
router.get('/recent/list', async (req, res) => {
  try {
    const { storeId, limit = 10 } = req.query;

    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const orders = await dbQuery(sql, params);

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
});

// Bulk update orders
router.put('/bulk', async (req, res) => {
  try {
    const { storeId, updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    const results = [];

    for (const update of updates) {
      const { id, ...updateData } = update;

      if (!id) {
        results.push({ id, error: 'Order ID is required' });
        continue;
      }

      try {
        // Check if order exists and belongs to store
        let checkSql = 'SELECT * FROM orders WHERE id = ?';
        const checkParams = [id];

        if (storeId) {
          checkSql += ' AND store_id = ?';
          checkParams.push(storeId);
        }

        const existingOrder = await dbGet(checkSql, checkParams);

        if (!existingOrder) {
          results.push({ id, error: 'Order not found' });
          continue;
        }

        // Update order
        const updateSql = `
          UPDATE orders 
          SET status = COALESCE(?, status),
              payment_status = COALESCE(?, payment_status),
              shipping_status = COALESCE(?, shipping_status),
              order_data = COALESCE(?, order_data),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        const updateParams = [
          updateData.status,
          updateData.paymentStatus,
          updateData.shippingStatus,
          updateData.orderData ? JSON.stringify(updateData.orderData) : null,
          id
        ];

        await dbRun(updateSql, updateParams);
        results.push({ id, success: true });
      } catch (error) {
        results.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating orders:', error);
    res.status(500).json({ error: 'Failed to bulk update orders' });
  }
});

module.exports = router;
