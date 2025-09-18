const express = require('express');
const axios = require('axios');
const { dbQuery, dbRun, dbGet } = require('../config/database');
const router = express.Router();

// Ecwid API base URL
const ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

// Middleware to get store credentials
const getStoreCredentials = async (req, res, next) => {
  try {
    const storeId = req.params.storeId || req.body.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    const store = await dbGet(
      'SELECT * FROM stores WHERE store_id = ?',
      [storeId]
    );

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    req.store = store;
    next();
  } catch (error) {
    console.error('Error getting store credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get store information
router.get('/store/:storeId', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    
    // Fetch store info from Ecwid API
    const response = await axios.get(`${ECWID_API_BASE}/${store.store_id}/profile`, {
      headers: {
        'Authorization': `Bearer ${store.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching store info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch store information',
      details: error.response?.data || error.message
    });
  }
});

// Get products from Ecwid
router.get('/store/:storeId/products', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    const { limit = 20, offset = 0, keyword, categoryId } = req.query;

    let url = `${ECWID_API_BASE}/${store.store_id}/products?limit=${limit}&offset=${offset}`;
    
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    if (categoryId) url += `&categoryId=${categoryId}`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${store.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    // Store products in local database
    if (response.data.items) {
      for (const product of response.data.items) {
        await dbRun(`
          INSERT OR REPLACE INTO products 
          (store_id, ecwid_product_id, name, description, price, compare_price, sku, quantity, enabled, image_url, category_id, custom_fields, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          store.store_id,
          product.id,
          product.name,
          product.description,
          product.price,
          product.compareToPrice,
          product.sku,
          product.quantity,
          product.enabled ? 1 : 0,
          product.imageUrl,
          product.categoryId,
          JSON.stringify(product.customFields || {})
        ]);
      }
    }

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.response?.data || error.message
    });
  }
});

// Get orders from Ecwid
router.get('/store/:storeId/orders', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    const { limit = 20, offset = 0, status, paymentStatus } = req.query;

    let url = `${ECWID_API_BASE}/${store.store_id}/orders?limit=${limit}&offset=${offset}`;
    
    if (status) url += `&status=${status}`;
    if (paymentStatus) url += `&paymentStatus=${paymentStatus}`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${store.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    // Store orders in local database
    if (response.data.items) {
      for (const order of response.data.items) {
        await dbRun(`
          INSERT OR REPLACE INTO orders 
          (store_id, ecwid_order_id, order_number, customer_email, customer_name, total, subtotal, tax_amount, shipping_amount, status, payment_status, shipping_status, order_data, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          store.store_id,
          order.id,
          order.orderNumber,
          order.email,
          order.customerName,
          order.total,
          order.subtotal,
          order.taxAmount,
          order.shippingAmount,
          order.fulfillmentStatus,
          order.paymentStatus,
          order.shippingStatus,
          JSON.stringify(order)
        ]);
      }
    }

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: error.response?.data || error.message
    });
  }
});

// Get customers from Ecwid
router.get('/store/:storeId/customers', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    const { limit = 20, offset = 0, email } = req.query;

    let url = `${ECWID_API_BASE}/${store.store_id}/customers?limit=${limit}&offset=${offset}`;
    
    if (email) url += `&email=${encodeURIComponent(email)}`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${store.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    // Store customers in local database
    if (response.data.items) {
      for (const customer of response.data.items) {
        await dbRun(`
          INSERT OR REPLACE INTO customers 
          (store_id, ecwid_customer_id, email, first_name, last_name, phone, customer_group_id, customer_data, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          store.store_id,
          customer.id,
          customer.email,
          customer.firstName,
          customer.lastName,
          customer.phone,
          customer.customerGroupId,
          JSON.stringify(customer)
        ]);
      }
    }

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customers',
      details: error.response?.data || error.message
    });
  }
});

// Webhook handler for Ecwid events
router.post('/webhook/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { eventType, data } = req.body;

    // Verify webhook signature if webhook secret is set
    const store = await dbGet('SELECT * FROM stores WHERE store_id = ?', [storeId]);
    if (store && store.webhook_secret) {
      // Add webhook signature verification here
    }

    // Log the webhook event
    await dbRun(`
      INSERT INTO analytics (store_id, event_type, event_data, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [storeId, eventType, JSON.stringify(data)]);

    // Handle different event types
    switch (eventType) {
      case 'order.created':
        console.log('New order created:', data);
        break;
      case 'order.updated':
        console.log('Order updated:', data);
        break;
      case 'product.created':
        console.log('New product created:', data);
        break;
      case 'product.updated':
        console.log('Product updated:', data);
        break;
      default:
        console.log('Unhandled webhook event:', eventType, data);
    }

    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Create or update store configuration
router.post('/store', async (req, res) => {
  try {
    const { storeId, storeName, accessToken, refreshToken, webhookSecret, settings } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    // Check if store already exists
    const existingStore = await dbGet('SELECT * FROM stores WHERE store_id = ?', [storeId]);

    if (existingStore) {
      // Update existing store
      await dbRun(`
        UPDATE stores 
        SET store_name = ?, access_token = ?, refresh_token = ?, webhook_secret = ?, 
            settings = ?, updated_at = CURRENT_TIMESTAMP
        WHERE store_id = ?
      `, [
        storeName || existingStore.store_name,
        accessToken || existingStore.access_token,
        refreshToken || existingStore.refresh_token,
        webhookSecret || existingStore.webhook_secret,
        JSON.stringify(settings || {}),
        storeId
      ]);
    } else {
      // Create new store
      await dbRun(`
        INSERT INTO stores (store_id, store_name, access_token, refresh_token, webhook_secret, settings)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        storeId,
        storeName || 'Ecwid Store',
        accessToken || null,
        refreshToken || null,
        webhookSecret || null,
        JSON.stringify(settings || {})
      ]);
    }

    // Get the updated/created store
    const store = await dbGet('SELECT * FROM stores WHERE store_id = ?', [storeId]);

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('Error creating/updating store:', error);
    res.status(500).json({ error: 'Failed to create/update store' });
  }
});

// Get store statistics
router.get('/store/:storeId/stats', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;

    // Get local database statistics
    const [productCount, orderCount, customerCount] = await Promise.all([
      dbGet('SELECT COUNT(*) as count FROM products WHERE store_id = ?', [store.store_id]),
      dbGet('SELECT COUNT(*) as count FROM orders WHERE store_id = ?', [store.store_id]),
      dbGet('SELECT COUNT(*) as count FROM customers WHERE store_id = ?', [store.store_id])
    ]);

    // Get recent analytics
    const recentAnalytics = await dbQuery(`
      SELECT event_type, COUNT(*) as count 
      FROM analytics 
      WHERE store_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY event_type
    `, [store.store_id]);

    res.json({
      success: true,
      data: {
        products: productCount.count,
        orders: orderCount.count,
        customers: customerCount.count,
        recentAnalytics
      }
    });
  } catch (error) {
    console.error('Error fetching store stats:', error);
    res.status(500).json({ error: 'Failed to fetch store statistics' });
  }
});

module.exports = router;
