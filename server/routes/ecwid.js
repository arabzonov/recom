import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { dbQuery, dbRun, dbGet } from '../config/database.js';

const router = express.Router();

// Ecwid API base URL
const ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

// Secure payload decoding endpoint
router.post('/decode-payload', async (req, res) => {
  try {
    const { payload } = req.body;
    
    if (!payload) {
      return res.status(400).json({ error: 'Payload is required' });
    }
    
    // Get client secret from environment
    const clientSecret = process.env.ECWID_CLIENT_SECRET;
    if (!clientSecret) {
      console.error('ECWID_CLIENT_SECRET not found in environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    console.log('🔐 Decoding payload securely on server...');
    
    // Step 1: Get encryption key (first 16 characters of client secret)
    const encryptionKey = clientSecret.substring(0, 16);
    
    // Step 2: Convert URL-safe base64 to standard base64
    const base64Original = payload.replace(/-/g, '+').replace(/_/g, '/');
    
    // Step 3: Add padding if needed
    const paddedBase64 = base64Original + '='.repeat((4 - base64Original.length % 4) % 4);
    
    // Step 4: Decode base64 to binary
    const decoded = Buffer.from(paddedBase64, 'base64');
    
    // Step 5: Extract IV (first 16 bytes)
    const iv = decoded.subarray(0, 16);
    
    // Step 6: Extract payload (remaining bytes)
    const encryptedPayload = decoded.subarray(16);
    
    // Step 7: Decrypt using AES-128-CBC
    const decipher = crypto.createDecipheriv('aes-128-cbc', encryptionKey, iv);
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(encryptedPayload, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('✅ Payload decrypted successfully');
    
    // Step 8: Parse JSON
    const payloadData = JSON.parse(decrypted);
    console.log('✅ JSON parsed successfully');
    
    // Save store configuration to database
    if (payloadData.store_id && payloadData.access_token) {
      try {
        // Check if store already exists
        // Insert or update store
        await dbRun(`
          INSERT OR REPLACE INTO stores (store_id, store_name, access_token)
          VALUES (?, ?, ?)
        `, [
          payloadData.store_id,
          payloadData.store_name || 'Ecwid Store',
          payloadData.access_token
        ]);
        
        console.log('🎉 Store configuration saved to database');
      } catch (dbError) {
        console.error('❌ Error saving to database:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      data: payloadData
    });
    
  } catch (error) {
    console.error('❌ Error decoding payload:', error.message);
    res.status(500).json({ 
      error: 'Failed to decode payload',
      details: error.message
    });
  }
});

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

    // Log webhook event
    console.log(`Webhook event received for store ${storeId}:`, eventType, data);

    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Create or update store configuration
router.post('/store', async (req, res) => {
  try {
    const { storeId, storeName, accessToken, refreshToken, webhookSecret } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    // Insert or update store
    await dbRun(`
      INSERT OR REPLACE INTO stores (store_id, store_name, access_token, refresh_token, webhook_secret)
      VALUES (?, ?, ?, ?, ?)
    `, [
      storeId,
      storeName || 'Ecwid Store',
      accessToken || null,
      refreshToken || null,
      webhookSecret || null
    ]);

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


export default router;
