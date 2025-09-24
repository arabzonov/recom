import express from 'express';
import { StoreService, ProductService } from '../data/index.js';
import PayloadService from '../services/PayloadService.js';
import EcwidApiService from '../services/EcwidApiService.js';

const router = express.Router();

// Initialize services
const storeService = new StoreService();
const productService = new ProductService();

// Ecwid API base URL
const ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

// Secure payload decoding endpoint
router.post('/decode-payload', async (req, res) => {
  try {
    const { payload } = req.body;
    
    if (!payload) {
      return res.status(400).json({ error: 'Payload is required' });
    }
    
    // Decode payload using service
    const payloadData = PayloadService.decodePayload(payload);

    // Save store configuration to database
    try {
      const store = await storeService.createOrUpdate({
        storeId: payloadData.store_id,
        storeName: payloadData.store_name,
        accessToken: payloadData.access_token,
        refreshToken: payloadData.refresh_token,
        scopes: payloadData.scopes
      });

      res.json({
        success: true,
        data: {
          store_id: store.store_id,
          store_name: store.store_name,
          access_token: store.access_token
        }
      });
    } catch (dbError) {
      res.status(500).json({ error: 'Failed to save store configuration' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid payload format' });
  }
});

// Middleware to get store credentials
const getStoreCredentials = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const store = await storeService.findByStoreId(storeId);
    
    if (!store) {
      return res.status(404).json({ 
        success: false, 
        error: 'Store not found' 
      });
    }
    
    req.store = store;
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Error getting store credentials',
      details: error.message
    });
  }
};

// Get store information
router.get('/store/:storeId', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    
    // Check if store has access token
    if (!store.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
    // Fetch store info from Ecwid API
    const storeInfo = await EcwidApiService.getStoreProfile(store.store_id, store.access_token);
    
    res.json({
      success: true,
      data: {
        store_id: store.store_id,
        store_name: store.store_name,
        access_token: store.access_token,
        ecwid_info: storeInfo
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Error fetching store info',
      details: error.message
    });
  }
});

// Create or update store configuration
router.post('/store', async (req, res) => {
  try {
    const { storeId, storeName, accessToken, refreshToken } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    // Create or update store
    const store = await storeService.createOrUpdate({
      storeId,
      storeName,
      accessToken,
      refreshToken
    });

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create/update store' });
  }
});

export default router;