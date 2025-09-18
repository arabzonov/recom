/**
 * Store Detection Utilities
 * Automatically detects Ecwid store ID and other parameters from various sources
 */

export const detectStoreId = () => {
  let storeId = null;
  
  // Method 1: From script tag data attribute
  const script = document.querySelector('script[data-ecwid-store-id]');
  if (script) {
    storeId = script.getAttribute('data-ecwid-store-id');
    if (storeId && storeId !== 'YOUR_STORE_ID') {
      return storeId;
    }
  }
  
  // Method 2: From Ecwid global object
  if (window.Ecwid && window.Ecwid.storeId) {
    storeId = window.Ecwid.storeId;
    if (storeId) return storeId;
  }
  
  // Method 3: From URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  storeId = urlParams.get('storeId') || urlParams.get('ecwid_store_id') || urlParams.get('store_id');
  if (storeId) return storeId;
  
  // Method 4: From localStorage (for development/persistence)
  storeId = localStorage.getItem('ecwid_store_id');
  if (storeId) return storeId;
  
  // Method 5: From referrer or parent window (for embedded scenarios)
  if (window.parent !== window) {
    try {
      const parentUrl = new URL(document.referrer);
      const parentParams = new URLSearchParams(parentUrl.search);
      storeId = parentParams.get('storeId') || parentParams.get('ecwid_store_id') || parentParams.get('store_id');
      if (storeId) return storeId;
    } catch (e) {
      console.log('Could not parse parent URL');
    }
  }
  
  // Method 6: From iframe src (for embedded scenarios)
  if (window.parent !== window) {
    try {
      const iframeSrc = window.location.href;
      const iframeUrl = new URL(iframeSrc);
      const iframeParams = new URLSearchParams(iframeUrl.search);
      storeId = iframeParams.get('storeId') || iframeParams.get('ecwid_store_id') || iframeParams.get('store_id');
      if (storeId) return storeId;
    } catch (e) {
      console.log('Could not parse iframe URL');
    }
  }
  
  // Method 7: From postMessage (for embedded scenarios)
  if (window.parent !== window) {
    // Listen for postMessage from parent
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'ECWID_STORE_ID') {
        storeId = event.data.storeId;
        if (storeId) {
          window.removeEventListener('message', handleMessage);
          return storeId;
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Request store ID from parent
    window.parent.postMessage({ type: 'REQUEST_ECWID_STORE_ID' }, '*');
  }
  
  return storeId;
};

export const detectStoreParameters = () => {
  const storeId = detectStoreId();
  
  if (!storeId) {
    return null;
  }
  
  const parameters = {
    storeId,
    detectedAt: new Date().toISOString(),
    source: 'auto-detection'
  };
  
  // Try to get additional parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const additionalParams = {};
  
  // Common Ecwid parameters
  const paramKeys = [
    'clientId',
    'client_id',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'webhookSecret',
    'webhook_secret',
    'currency',
    'timezone',
    'language',
    'theme'
  ];
  
  paramKeys.forEach(key => {
    const value = urlParams.get(key);
    if (value) {
      additionalParams[key] = value;
    }
  });
  
  return {
    ...parameters,
    ...additionalParams
  };
};

export const saveStoreConfiguration = (storeConfig) => {
  try {
    localStorage.setItem('ecwid_store_config', JSON.stringify(storeConfig));
    localStorage.setItem('ecwid_store_id', storeConfig.storeId);
    localStorage.setItem('ecwid_store_configured', 'true');
    return true;
  } catch (error) {
    console.error('Error saving store configuration:', error);
    return false;
  }
};

export const loadStoreConfiguration = () => {
  try {
    const config = localStorage.getItem('ecwid_store_config');
    return config ? JSON.parse(config) : null;
  } catch (error) {
    console.error('Error loading store configuration:', error);
    return null;
  }
};

export const clearStoreConfiguration = () => {
  try {
    localStorage.removeItem('ecwid_store_config');
    localStorage.removeItem('ecwid_store_id');
    localStorage.removeItem('ecwid_store_configured');
    return true;
  } catch (error) {
    console.error('Error clearing store configuration:', error);
    return false;
  }
};

// Auto-detect and configure store on page load
export const autoConfigureStore = async () => {
  const storeParams = detectStoreParameters();
  
  if (!storeParams || !storeParams.storeId) {
    console.warn('Could not auto-detect store parameters');
    return null;
  }
  
  console.log('Auto-detected store parameters:', storeParams);
  
  // Save configuration
  saveStoreConfiguration(storeParams);
  
  return storeParams;
};
