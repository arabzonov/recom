const express = require('express');
const axios = require('axios');
const { StoreService } = require('../data');
const router = express.Router();

// Initialize services
const storeService = new StoreService();

// Ecwid API base URL
const ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

// Middleware to get store credentials
const getStoreCredentials = async (req, res, next) => {
  try {
    const storeId = req.params.storeId || req.body.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    const store = await storeService.findByStoreId(storeId);

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
    
    // Check if store has access token
    if (!store.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
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
    
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access token expired or invalid. Please re-authenticate.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch store information',
      details: error.response?.data || error.message
    });
  }
});


// Create or update store configuration
router.post('/store', async (req, res) => {
  try {
    const { storeId, storeName, accessToken, refreshToken, settings } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    // Create or update store
    const store = await storeService.createOrUpdate({
      storeId,
      storeName,
      accessToken,
      refreshToken,
      settings
    });

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('Error creating/updating store:', error);
    res.status(500).json({ error: 'Failed to create/update store' });
  }
});


module.exports = router;
