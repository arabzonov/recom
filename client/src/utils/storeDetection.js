import logger from './logger.js';

/**
 * Store Detection Utility
 * Detects the Ecwid store ID using proper SDK methods
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

  // Method 1: From Ecwid SDK (the official way for storefront)
  if (window.Ecwid && window.Ecwid.getStoreId) {
    try {
      storeId = window.Ecwid.getStoreId();
      if (storeId) {
        localStorage.setItem('ecwid_store_id', storeId);
        logger.storeDetection('Ecwid.getStoreId()', storeId);
        return storeId;
      }
    } catch (e) {
      logger.warn('Ecwid.getStoreId() error', e);
    }
  }

  // Method 2: From EcwidApp SDK (for admin iframe context)
  if (window.EcwidApp && window.EcwidApp.getSettings) {
    try {
      // This is async, so we need to handle it properly
      return new Promise((resolve) => {
        window.EcwidApp.getSettings((settings) => {
          if (settings && settings.storeId) {
            storeId = settings.storeId;
            localStorage.setItem('ecwid_store_id', storeId);
            logger.storeDetection('EcwidApp.getSettings()', storeId);
            resolve(storeId);
          } else {
            resolve(null);
          }
        });
      });
    } catch (e) {
      logger.warn('EcwidApp.getSettings() error', e);
    }
  }

  // Method 3: From localStorage (fallback for already configured stores)
  storeId = localStorage.getItem('ecwid_store_id');
  if (storeId) {
    logger.storeDetection('localStorage', storeId);
    return storeId;
  }

  // Method 4: From window.ecwid_store_id (legacy fallback)
  if (window.ecwid_store_id) {
    storeId = window.ecwid_store_id;
    localStorage.setItem('ecwid_store_id', storeId);
    logger.storeDetection('window.ecwid_store_id', storeId);
    return storeId;
  }

  logger.warn('No store ID found using proper SDK methods');
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