/**
 * Store Detection Utilities
 * Automatically detects Ecwid store ID and other parameters from various sources
 */

export const detectStoreId = async () => {
  let storeId = null;
  
  // Log the Ecwid payload
  console.log('=== Ecwid Payload ===');
  console.log('URL:', window.location.href);
  console.log('Referrer:', document.referrer);
  console.log('In iframe:', window.parent !== window);
  
  const urlParams = new URLSearchParams(window.location.search);
  console.log('URL params:', Object.fromEntries(urlParams.entries()));
  
  // Decode the Ecwid payload to extract store ID using official Ecwid algorithm
  const payload = urlParams.get('payload');
  if (payload) {
    // For Ecwid apps, we should decode the payload on the server side
    // The client should not have access to the client secret
    console.log('🔐 Payload detected, but client-side decryption is not secure.');
    console.log('💡 The payload should be decoded on the server side for security.');
    console.log('💡 Sending payload to server for secure decryption...');
    
    // Send payload to server for secure decryption
    try {
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
          console.log('🎉 Store ID decoded by server:', result.data.store_id);
          
          // Store the decoded store ID for immediate use
          if (window.localStorage) {
            localStorage.setItem('ecwid_store_id', result.data.store_id);
          }
          
          if (result.data.access_token && window.localStorage) {
            localStorage.setItem('ecwid_access_token', result.data.access_token);
            console.log('🎉 Access token stored:', result.data.access_token);
          }
          
          return result.data.store_id;
        }
      } else {
        console.log('❌ Server failed to decode payload:', response.status);
      }
    } catch (apiError) {
      console.log('❌ Error sending payload to server:', apiError.message);
    }
    
    // Fallback: Try to extract store ID using regex from the raw payload
    const storeIdMatch = payload.match(/(\d{6,})/);
    if (storeIdMatch) {
      console.log('🎯 Store ID extracted from payload using regex:', storeIdMatch[1]);
      return storeIdMatch[1];
    }
  }
  
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  console.log('Hash params:', Object.fromEntries(hashParams.entries()));
  
  if (window.parent !== window) {
    try {
      const parentUrl = new URL(window.parent.location.href);
      const parentParams = new URLSearchParams(parentUrl.search);
      console.log('Parent URL params:', Object.fromEntries(parentParams.entries()));
    } catch (e) {
      console.log('Cannot access parent window');
    }
  }
  
  // Method 1: From Ecwid admin context (when running in Ecwid admin)
  if (window.parent !== window) {
    // Check if we're in an Ecwid admin iframe
    try {
      // Look for store ID in the parent window's location or global variables
      if (window.parent && window.parent.location) {
        const parentUrl = new URL(window.parent.location.href);
        const parentParams = new URLSearchParams(parentUrl.search);
        storeId = parentParams.get('storeId') || parentParams.get('ecwid_store_id') || parentParams.get('store_id');
        if (storeId) {
          console.log('Store ID detected from parent URL:', storeId);
          return storeId;
        }
      }
      
      // Check parent window for Ecwid global objects
      if (window.parent && window.parent.Ecwid) {
        storeId = window.parent.Ecwid.storeId;
        if (storeId) {
          console.log('Store ID detected from parent Ecwid object:', storeId);
          return storeId;
        }
      }
      
      // Check for store ID in parent window's global variables
      if (window.parent && window.parent.ECWID_STORE_ID) {
        storeId = window.parent.ECWID_STORE_ID;
        if (storeId) {
          console.log('Store ID detected from parent global variable:', storeId);
          return storeId;
        }
      }
    } catch (e) {
      console.log('Could not access parent window:', e.message);
    }
  }
  
  // Method 2: From URL parameters
  storeId = urlParams.get('storeId') || urlParams.get('ecwid_store_id') || urlParams.get('store_id');
  if (storeId) {
    console.log('Store ID detected from URL parameters:', storeId);
    return storeId;
  }
  
  // Method 3: From localStorage (for development/persistence)
  storeId = localStorage.getItem('ecwid_store_id');
  if (storeId) {
    console.log('Store ID detected from localStorage:', storeId);
    return storeId;
  }
  
  // Method 4: From script tag data attribute
  const script = document.querySelector('script[data-ecwid-store-id]');
  if (script) {
    storeId = script.getAttribute('data-ecwid-store-id');
    if (storeId && storeId !== 'YOUR_STORE_ID') {
      console.log('Store ID detected from script tag:', storeId);
      return storeId;
    }
  }
  
  // Method 5: From Ecwid global object
  if (window.Ecwid && window.Ecwid.storeId) {
    storeId = window.Ecwid.storeId;
    if (storeId) {
      console.log('Store ID detected from Ecwid object:', storeId);
      return storeId;
    }
  }
  
  console.log('No store ID detected from any method');
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

// Debug function to help troubleshoot store ID detection
export const debugStoreDetection = () => {
  console.log('=== Store ID Detection Debug ===');
  console.log('Window location:', window.location.href);
  console.log('Document referrer:', document.referrer);
  console.log('Window parent:', window.parent !== window ? 'Different from current window' : 'Same as current window');
  console.log('Window name:', window.name);
  console.log('Document title:', document.title);
  
  console.log('=== Global Objects ===');
  console.log('window.Ecwid:', window.Ecwid);
  console.log('window.ECWID_STORE_ID:', window.ECWID_STORE_ID);
  
  console.log('=== URL Parameters ===');
  const urlParams = new URLSearchParams(window.location.search);
  console.log('URL params:', Object.fromEntries(urlParams.entries()));
  
  console.log('=== Storage ===');
  console.log('localStorage ecwid_store_id:', localStorage.getItem('ecwid_store_id'));
  console.log('sessionStorage ecwid_store_id:', sessionStorage.getItem('ecwid_store_id'));
  
  console.log('=== Cookies ===');
  console.log('Document cookies:', document.cookie);
  
  console.log('=== Script Tags ===');
  const scripts = document.querySelectorAll('script');
  scripts.forEach((script, index) => {
    if (script.src.includes('ecwid') || script.getAttribute('data-ecwid-store-id')) {
      console.log(`Script ${index}:`, script.src, script.getAttribute('data-ecwid-store-id'));
    }
  });
  
  console.log('=== Meta Tags ===');
  const metaTags = document.querySelectorAll('meta');
  metaTags.forEach((meta, index) => {
    if (meta.name && meta.name.includes('ecwid')) {
      console.log(`Meta ${index}:`, meta.name, meta.content);
    }
  });
  
  console.log('=== Window Properties ===');
  const windowProps = Object.keys(window);
  const storeProps = windowProps.filter(prop => 
    prop.toLowerCase().includes('store') || 
    prop.toLowerCase().includes('ecwid')
  );
  console.log('Store-related window properties:', storeProps);
  
  console.log('=== End Debug ===');
};

// Auto-detect and configure store on page load
export const autoConfigureStore = async () => {
  const storeParams = await detectStoreParameters();
  
  if (!storeParams || !storeParams.storeId) {
    console.warn('Could not auto-detect store parameters');
    return null;
  }
  
  console.log('Auto-detected store parameters:', storeParams);
  
  // Save configuration
  saveStoreConfiguration(storeParams);
  
  return storeParams;
};
