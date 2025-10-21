import express from 'express';
import { StoreService } from '../data/index.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Initialize services
const storeService = new StoreService();

// OAuth configuration
const ECWID_CLIENT_ID = process.env.ECWID_CLIENT_ID;
const ECWID_CLIENT_SECRET = process.env.ECWID_CLIENT_SECRET;
const ECWID_REDIRECT_URI = process.env.ECWID_REDIRECT_URI;
const ECWID_SCOPES = process.env.ECWID_SCOPES;

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

    // Log OAuth configuration
    console.log('OAuth configuration:', {
      clientId: ECWID_CLIENT_ID ? 'SET' : 'NOT SET',
      clientSecret: ECWID_CLIENT_SECRET ? 'SET' : 'NOT SET',
      redirectUri: ECWID_REDIRECT_URI,
      scopes: ECWID_SCOPES,
      storeId
    });
    
    // Debug: Log actual values (without sensitive data)
    console.log('Environment variables debug:', {
      NODE_ENV: process.env.NODE_ENV,
      hasClientId: !!process.env.ECWID_CLIENT_ID,
      hasClientSecret: !!process.env.ECWID_CLIENT_SECRET,
      hasRedirectUri: !!process.env.ECWID_REDIRECT_URI,
      hasScopes: !!process.env.ECWID_SCOPES,
      clientIdLength: process.env.ECWID_CLIENT_ID?.length || 0,
      redirectUriValue: process.env.ECWID_REDIRECT_URI,
      scopesValue: process.env.ECWID_SCOPES
    });

    // Build OAuth authorization URL
    const authUrl = new URL('https://my.ecwid.com/api/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', ECWID_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', ECWID_REDIRECT_URI);
    authUrl.searchParams.set('scope', ECWID_SCOPES);
    authUrl.searchParams.set('store_id', storeId);

    console.log('Generated OAuth URL:', authUrl.toString());
    console.log('OAuth URL components:', {
      base: 'https://my.ecwid.com/api/oauth/authorize',
      response_type: authUrl.searchParams.get('response_type'),
      client_id: authUrl.searchParams.get('client_id'),
      redirect_uri: authUrl.searchParams.get('redirect_uri'),
      scope: authUrl.searchParams.get('scope'),
      store_id: authUrl.searchParams.get('store_id')
    });
    
    console.log('⚠️  IMPORTANT: Check redirect URI!');
    console.log('Current redirect URI:', ECWID_REDIRECT_URI);
    console.log('Expected callback URL should be:', `${ECWID_REDIRECT_URI.replace('/auth/callback', '/api/oauth/callback')}`);
    console.log('Make sure ECWID_REDIRECT_URI in .env is set to: https://ec.1nax.app/api/oauth/callback');

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

// Handle OAuth callback (GET request from Ecwid)
router.get('/callback', async (req, res) => {
  try {
    console.log('=== OAuth Callback Started ===');
    console.log('Request URL:', req.url);
    console.log('Request query params:', req.query);
    console.log('Request headers:', req.headers);
    
    const { code, state, store_id } = req.query;
    
    console.log('Extracted parameters:', { code: !!code, state: !!state, store_id });
    
    if (!code || !store_id) {
      console.log('Missing required OAuth parameters:', { code: !!code, state: !!state, store_id: !!store_id });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required OAuth parameters (code and store_id are required)' 
      });
    }
    
    console.log('✅ OAuth parameters valid, proceeding with token exchange...');

    // Log OAuth callback parameters
    console.log('OAuth callback received:', {
      storeId: store_id,
      hasCode: !!code,
      hasState: !!state,
      clientId: ECWID_CLIENT_ID ? 'SET' : 'NOT SET',
      redirectUri: ECWID_REDIRECT_URI
    });

    // Verify store exists (optional check)
    const store = await storeService.findByStoreId(store_id);

    // Exchange code for access token
    console.log('Starting token exchange...');
    const tokenRequestData = {
      grant_type: 'authorization_code',
      client_id: ECWID_CLIENT_ID,
      client_secret: ECWID_CLIENT_SECRET,
      code: code,
      redirect_uri: ECWID_REDIRECT_URI
    };
    
    console.log('Token request data:', {
      grant_type: tokenRequestData.grant_type,
      client_id: tokenRequestData.client_id,
      hasCode: !!tokenRequestData.code,
      redirect_uri: tokenRequestData.redirect_uri
    });
    
    const tokenResponse = await fetch('https://my.ecwid.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenRequestData)
    });

    console.log('Token exchange response status:', tokenResponse.status);
    console.log('Token exchange response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.log('Token exchange error:', errorData);
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to exchange code for token',
        details: errorData
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      scope: tokenData.scope
    });

    // Get store information using the access token
    const storeInfoResponse = await fetch(`https://app.ecwid.com/api/v3/${store_id}/profile`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    let storeInfo = null;
    if (storeInfoResponse.ok) {
      storeInfo = await storeInfoResponse.json();
    }

    // Save tokens and store info to database
    console.log('Saving store to database...');
    console.log('Store data:', {
      storeId: store_id,
      storeName: storeInfo?.generalInfo?.storeName || `Store ${store_id}`,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      scopes: tokenData.scope
    });
    
    const updatedStore = await storeService.createOrUpdate({
      storeId: store_id,
      storeName: storeInfo?.generalInfo?.storeName || `Store ${store_id}`,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      scopes: tokenData.scope
    });

    console.log('Store saved successfully:', {
      storeId: updatedStore.store_id,
      storeName: updatedStore.store_name,
      hasAccessToken: !!updatedStore.access_token
    });

    console.log('OAuth flow completed successfully for store:', store_id);
    console.log('Redirecting to:', `/store/${store_id}?partner=ecwid_no_free#app:name=1faq-wavy:1`);
    
    // Redirect back to the settings page
    res.redirect(`/store/${store_id}?partner=ecwid_no_free#app:name=1faq-wavy:1`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    // Redirect back to settings page even on error
    const { store_id } = req.query;
    res.redirect(`/store/${store_id}?partner=ecwid_no_free#app:name=1faq-wavy:1&error=oauth_failed`);
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
        await storeService.clearTokens(storeId);
        
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
