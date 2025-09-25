import express from 'express';
import { StoreService } from '../data/index.js';
import crypto from 'crypto';

const router = express.Router();

// Initialize services
const storeService = new StoreService();

// OAuth configuration
const ECWID_CLIENT_ID = process.env.ECWID_CLIENT_ID;
const ECWID_CLIENT_SECRET = process.env.ECWID_CLIENT_SECRET;
const ECWID_REDIRECT_URI = process.env.ECWID_REDIRECT_URI;
const ECWID_SCOPES = process.env.ECWID_SCOPES || 'read_catalog,read_orders,read_store_profile,update_catalog';

// Generate OAuth authorization URL
router.get('/auth/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store ID is required' 
      });
    }

    // Generate state parameter for security
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in database for verification
    await storeService.createOrUpdate({
      storeId,
      oauthState: state
    });

    // Build OAuth authorization URL
    const authUrl = new URL('https://my.ecwid.com/api/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', ECWID_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', ECWID_REDIRECT_URI);
    authUrl.searchParams.set('scope', ECWID_SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('store_id', storeId);

    res.json({
      success: true,
      authUrl: authUrl.toString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate OAuth URL',
      details: error.message
    });
  }
});

// Handle OAuth callback
router.post('/callback', async (req, res) => {
  try {
    const { code, state, storeId } = req.body;
    
    if (!code || !state || !storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required OAuth parameters' 
      });
    }

    // Verify state parameter
    const store = await storeService.findByStoreId(storeId);
    if (!store || store.oauth_state !== state) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid state parameter' 
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://my.ecwid.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ECWID_CLIENT_ID,
        client_secret: ECWID_CLIENT_SECRET,
        code: code,
        redirect_uri: ECWID_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to exchange code for token',
        details: errorData
      });
    }

    const tokenData = await tokenResponse.json();

    // Get store information using the access token
    const storeInfoResponse = await fetch(`https://app.ecwid.com/api/v3/${storeId}/profile`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    let storeInfo = null;
    if (storeInfoResponse.ok) {
      storeInfo = await storeInfoResponse.json();
    }

    // Save tokens and store info to database
    const updatedStore = await storeService.createOrUpdate({
      storeId,
      storeName: storeInfo?.generalInfo?.storeName || `Store ${storeId}`,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      scopes: tokenData.scope,
      oauthState: null // Clear the state after successful authentication
    });

    res.json({
      success: true,
      store: {
        store_id: updatedStore.store_id,
        store_name: updatedStore.store_name,
        access_token: updatedStore.access_token
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'OAuth callback failed',
      details: error.message
    });
  }
});

// Check OAuth status for a store
router.get('/status/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store ID is required' 
      });
    }

    const store = await storeService.findByStoreId(storeId);
    
    if (!store) {
      return res.json({
        success: true,
        authenticated: false,
        error: 'Store not found'
      });
    }

    if (!store.access_token) {
      return res.json({
        success: true,
        authenticated: false,
        error: 'Store not authenticated'
      });
    }

    // Verify the access token is still valid by making a test API call
    try {
      const testResponse = await fetch(`https://app.ecwid.com/api/v3/${storeId}/profile`, {
        headers: {
          'Authorization': `Bearer ${store.access_token}`
        }
      });

      if (testResponse.ok) {
        const storeInfo = await testResponse.json();
        return res.json({
          success: true,
          authenticated: true,
          store: {
            store_id: store.store_id,
            store_name: store.store_name,
            access_token: store.access_token
          }
        });
      } else {
        // Token is invalid, clear it
        await storeService.createOrUpdate({
          storeId,
          accessToken: null,
          refreshToken: null
        });
        
        return res.json({
          success: true,
          authenticated: false,
          error: 'Access token expired'
        });
      }
    } catch (apiError) {
      return res.json({
        success: true,
        authenticated: false,
        error: 'Failed to verify access token'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to check OAuth status',
      details: error.message
    });
  }
});

export default router;
