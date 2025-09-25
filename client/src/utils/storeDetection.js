import logger from './logger.js';

/**
 * Store Detection Utility
 * Detects the Ecwid store ID from various sources
 */

export const detectStoreId = async () => {
  let storeId = null;
  
  logger.debug('Starting store ID detection', {
    url: window.location.href,
    searchParams: window.location.search
  });

  // ALWAYS process payload first to save access token to database
  const urlParams = new URLSearchParams(window.location.search);
  const payload = urlParams.get('payload');
  
  if (payload) {
    try {
      logger.info('Processing Ecwid payload');
      const response = await fetch('/api/ecwid/decode-payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.store_id) {
          storeId = result.data.store_id;
          localStorage.setItem('ecwid_store_id', storeId);
          logger.storeDetection('payload', storeId);
          
          
          return storeId;
        }
      } else {
        logger.warn('Payload processing failed', { status: response.status });
      }
    } catch (error) {
      logger.error('Payload processing error', error);
      // Continue to other methods if payload processing fails
    }
  }

  // Method 1: From Ecwid global object (the official way)
  if (window.Ecwid) {
    if (typeof window.Ecwid.getOwnerId === 'function') {
      try {
        storeId = window.Ecwid.getOwnerId();
        if (storeId) {
          localStorage.setItem('ecwid_store_id', storeId);
          logger.storeDetection('Ecwid.getOwnerId()', storeId);
          return storeId;
        }
      } catch (e) {
        logger.warn('Ecwid.getOwnerId() error', e);
        // Continue to other methods
      }
    }
  }

  // Method 2: From window.ecwid_store_id (common fallback)
  if (window.ecwid_store_id) {
    storeId = window.ecwid_store_id;
    localStorage.setItem('ecwid_store_id', storeId);
    logger.storeDetection('window.ecwid_store_id', storeId);
    return storeId;
  }

  // Method 3: From window.ec.config.storefrontUrls.cleanStoreUrl (another fallback)
  if (window.ec && window.ec.config && window.ec.config.storefrontUrls && window.ec.config.storefrontUrls.cleanStoreUrl) {
    const match = window.ec.config.storefrontUrls.cleanStoreUrl.match(/store\/(\d+)/);
    if (match && match[1]) {
      storeId = match[1];
      localStorage.setItem('ecwid_store_id', storeId);
      logger.storeDetection('window.ec.config.storefrontUrls.cleanStoreUrl', storeId);
      return storeId;
    }
  }

  // Method 4: From localStorage (fallback)
  storeId = localStorage.getItem('ecwid_store_id');
  if (storeId) {
    logger.storeDetection('localStorage', storeId);
    return storeId;
  }

  // Method 5: From URL parameters (fallback for development)
  const urlParamsFallback = new URLSearchParams(window.location.search);
  storeId = urlParamsFallback.get('storeId') || urlParamsFallback.get('ecwid_store_id') || urlParamsFallback.get('store_id');
  if (storeId) {
    localStorage.setItem('ecwid_store_id', storeId);
    logger.storeDetection('URL parameters', storeId);
    return storeId;
  }

  // Method 6: From URL hash (fallback for development)
  const hash = window.location.hash;
  if (hash) {
    // Try to extract store ID from hash like 124288251#app:name=1faq-dev:1
    const hashStoreIdMatch = hash.match(/^#?(\d+)/);
    if (hashStoreIdMatch && hashStoreIdMatch[1]) {
      storeId = hashStoreIdMatch[1];
      localStorage.setItem('ecwid_store_id', storeId);
      logger.storeDetection('URL hash', storeId);
      return storeId;
    }
  }

  // Method 7: From URL path (fallback for development)
  const currentUrl = window.location.href;
  const urlPathMatch = currentUrl.match(/\/store\/(\d+)/);
  if (urlPathMatch && urlPathMatch[1]) {
    storeId = urlPathMatch[1];
    localStorage.setItem('ecwid_store_id', storeId);
    logger.storeDetection('URL path', storeId);
    return storeId;
  }

  // Method 8: From referrer URL (fallback)
  if (document.referrer) {
    const referrerMatch = document.referrer.match(/\/store\/(\d+)/);
    if (referrerMatch && referrerMatch[1]) {
      storeId = referrerMatch[1];
      localStorage.setItem('ecwid_store_id', storeId);
      logger.storeDetection('referrer URL', storeId);
      return storeId;
    }
  }

  logger.warn('No store ID found using any detection method');
  return null;
};

export const detectStoreIdWithRetry = async (maxRetries = 5, delay = 1000) => {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    attempts++;
    
    const storeId = await detectStoreId();
    if (storeId) {
      return storeId;
    }
    
    if (attempts < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
};

export const debugEcwidEnvironment = () => {
  // Debug function - no console output
  return {
    url: window.location.href,
    ecwid: window.Ecwid,
    ecwidStoreId: window.ecwid_store_id,
    ec: window.ec,
    localStorage: {
      ecwid_store_id: localStorage.getItem('ecwid_store_id'),
      ecwid_store_configured: localStorage.getItem('ecwid_store_configured')
    }
  };
};

export const autoConfigureStore = (storeConfig) => {
  try {
    localStorage.setItem('ecwid_store_configured', 'true');
    localStorage.setItem('ecwid_store_id', storeConfig.storeId);
    localStorage.setItem('ecwid_store_info', JSON.stringify(storeConfig));
    return true;
  } catch (error) {
    return false;
  }
};

export const getStoredStoreConfig = () => {
  try {
    const stored = localStorage.getItem('ecwid_store_info');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

export const clearStoredStoreConfig = () => {
  localStorage.removeItem('ecwid_store_configured');
  localStorage.removeItem('ecwid_store_id');
  localStorage.removeItem('ecwid_store_info');
};