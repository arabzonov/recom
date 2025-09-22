const express = require('express');
const axios = require('axios');
const { StoreService, OAuthService } = require('../data');
const router = express.Router();

// Initialize services
const storeService = new StoreService();
const oauthService = new OAuthService();

// Ecwid OAuth configuration
const ECWID_OAUTH_BASE = 'https://my.ecwid.com/api/oauth';
const ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

// Get OAuth status for a store
router.get('/status/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store ID is required' 
      });
    }

    // Check if store exists and has access token
    const store = await storeService.findByStoreId(storeId);

    if (!store) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'Store not found'
      });
    }

    // Check if store has valid access token
    if (!store.access_token) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'Store not authenticated'
      });
    }

    // Verify token is still valid by making a test API call
    try {
      const response = await axios.get(`${ECWID_API_BASE}/${storeId}/profile`, {
        headers: {
          'Authorization': `Bearer ${store.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      return res.json({
        success: true,
        authenticated: true,
        store: {
          storeId: store.store_id,
          storeName: store.store_name,
          profile: response.data
        }
      });
    } catch (apiError) {
      // Token is invalid or expired
      if (apiError.response?.status === 401 || apiError.response?.status === 403) {
        return res.json({
          success: true,
          authenticated: false,
          message: 'Access token expired or invalid'
        });
      }
      throw apiError;
    }

  } catch (error) {
    console.error('Error checking OAuth status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check OAuth status',
      details: error.message
    });
  }
});

// Initiate OAuth flow
router.get('/auth/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store ID is required' 
      });
    }

    // Get OAuth configuration from environment
    const clientId = process.env.ECWID_CLIENT_ID;
    const redirectUri = process.env.ECWID_REDIRECT_URI;
    const scopes = process.env.ECWID_SCOPES;

    if (!clientId || !redirectUri || !scopes) {
      return res.status(500).json({ 
        success: false, 
        error: 'OAuth configuration missing. Please check ECWID_CLIENT_ID, ECWID_REDIRECT_URI, and ECWID_SCOPES environment variables.' 
      });
    }

    // Ensure store exists in database before creating OAuth state
    let store = await storeService.findByStoreId(storeId);
    if (!store) {
      // Create store record if it doesn't exist
      store = await storeService.createOrUpdate({
        storeId,
        storeName: `Store ${storeId}`, // Temporary name, will be updated after OAuth
        accessToken: null,
        refreshToken: null,
        scopes: null,
        settings: {}
      });
    }

    // Generate state parameter for security
    const state = oauthService.generateState(storeId);
    console.log('🔑 OAuth initiation - generated state:', state);
    
    // Store state in database for verification
    await oauthService.createState(state, storeId);
    console.log('💾 OAuth initiation - state stored in database');

    // Build OAuth URL
    const oauthUrl = `${ECWID_OAUTH_BASE}/authorize?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state: state
    });

    res.json({
      success: true,
      authUrl: oauthUrl,
      state: state
    });

  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to initiate OAuth flow',
      details: error.message
    });
  }
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error);
      const redirectUri = process.env.ECWID_REDIRECT_URI;
      if (!redirectUri) {
        return res.status(500).json({ error: 'ECWID_REDIRECT_URI environment variable is required' });
      }
      const clientUrl = redirectUri.replace('/auth/callback', '');
      return res.redirect(`${clientUrl}/settings?error=${encodeURIComponent(error)}`);
    }

    // Validate required parameters
    if (!code || !state) {
      const redirectUri = process.env.ECWID_REDIRECT_URI;
      if (!redirectUri) {
        return res.status(500).json({ error: 'ECWID_REDIRECT_URI environment variable is required' });
      }
      const clientUrl = redirectUri.replace('/auth/callback', '');
      return res.redirect(`${clientUrl}/settings?error=missing_parameters`);
    }

    // Verify state parameter
    console.log('🔍 OAuth callback - validating state:', state);
    const stateRecord = await oauthService.validateState(state);
    console.log('🔍 OAuth callback - state record found:', stateRecord);

    if (!stateRecord) {
      console.log('❌ OAuth callback - state validation failed, redirecting to error');
      const redirectUri = process.env.ECWID_REDIRECT_URI;
      if (!redirectUri) {
        return res.status(500).json({ error: 'ECWID_REDIRECT_URI environment variable is required' });
      }
      const clientUrl = redirectUri.replace('/auth/callback', '');
      return res.redirect(`${clientUrl}/settings?error=invalid_state`);
    }

    const storeId = stateRecord.store_id;

    // Exchange code for access token
    const clientId = process.env.ECWID_CLIENT_ID;
    const clientSecret = process.env.ECWID_CLIENT_SECRET;
    const redirectUri = process.env.ECWID_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      const clientUrl = redirectUri.replace('/auth/callback', '');
      return res.redirect(`${clientUrl}/settings?error=oauth_config_missing`);
    }

    console.log('🔄 OAuth callback - exchanging code for token...');
    console.log('🔄 OAuth callback - token request params:', { client_id: clientId, redirect_uri: redirectUri, code: code ? 'YES' : 'NO' });
    
    let tokenResponse;
    try {
      tokenResponse = await axios.post(`${ECWID_OAUTH_BASE}/token`, {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code: code
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ OAuth callback - token exchange successful');
      console.log('🔑 OAuth callback - token response status:', tokenResponse.status);
      console.log('🔑 OAuth callback - token response data:', tokenResponse.data);
    } catch (tokenError) {
      console.error('❌ OAuth callback - token exchange failed:', tokenError.message);
      console.error('❌ OAuth callback - token error response:', tokenError.response?.data);
      console.error('❌ OAuth callback - token error status:', tokenError.response?.status);
      
      const clientUrl = redirectUri.replace('/auth/callback', '');
      return res.redirect(`${clientUrl}/settings?error=token_exchange_failed`);
    }

    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
    console.log('🔑 OAuth callback - received access token:', access_token ? 'YES' : 'NO');
    console.log('🔑 OAuth callback - token scopes:', scope);

    // Get store profile to get store name
    let storeName = null;
    try {
      console.log('🏪 OAuth callback - fetching store profile...');
      console.log('🏪 OAuth callback - profile URL:', `${ECWID_API_BASE}/${storeId}/profile`);
      console.log('🏪 OAuth callback - using access token:', access_token ? 'YES' : 'NO');
      
      const profileResponse = await axios.get(`${ECWID_API_BASE}/${storeId}/profile`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ OAuth callback - profile fetch successful');
      console.log('🏪 OAuth callback - profile response status:', profileResponse.status);
      console.log('🏪 OAuth callback - profile data:', profileResponse.data);
      
      storeName = profileResponse.data.settings.storeName;
      console.log('🏪 OAuth callback - extracted store name:', storeName);
    } catch (profileError) {
      console.error('❌ OAuth callback - profile fetch failed:', profileError.message);
      console.error('❌ OAuth callback - profile error response:', profileError.response?.data);
      console.error('❌ OAuth callback - profile error status:', profileError.response?.status);
    }

    if (!storeName) {
      const clientUrl = redirectUri.replace('/auth/callback', '');
      return res.redirect(`${clientUrl}/settings?error=could_not_fetch_store_profile`);
    }

    // Store tokens in database
    await storeService.createOrUpdate({
      storeId,
      storeName,
      accessToken: access_token,
      refreshToken: refresh_token,
      scopes: scope
    });

    // Clean up state record
    await oauthService.deleteState(state);

    // Redirect to success page
    const clientUrl = redirectUri.replace('/auth/callback', '');
    res.redirect(`${clientUrl}/settings?success=oauth_complete`);

  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    const redirectUri = process.env.ECWID_REDIRECT_URI;
    if (!redirectUri) {
      return res.status(500).json({ error: 'ECWID_REDIRECT_URI environment variable is required' });
    }
    const clientUrl = redirectUri.replace('/auth/callback', '');
    res.redirect(`${clientUrl}/settings?error=oauth_callback_failed`);
  }
});


module.exports = router;
