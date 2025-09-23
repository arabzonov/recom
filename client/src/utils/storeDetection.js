/**
 * Store Detection Utilities
 * Automatically detects store ID and other parameters from various sources
 */

export const detectStoreId = async () => {
  let storeId = null;

  console.log('🔍 Detecting store ID...');
  console.log('Current URL:', window.location.href);
  console.log('🔍 Window objects available:');
  console.log('  window.Ecwid:', window.Ecwid);
  console.log('  window.ecwid_store_id:', window.ecwid_store_id);
  console.log('  window.ec:', window.ec);

  // Method 1: From Ecwid global object (the official way)
  console.log('Method 1 - Checking Ecwid.getOwnerId()...');
  if (window.Ecwid) {
    console.log('  window.Ecwid exists:', typeof window.Ecwid);
    console.log('  window.Ecwid.getOwnerId:', typeof window.Ecwid.getOwnerId);
    if (typeof window.Ecwid.getOwnerId === 'function') {
      try {
        storeId = window.Ecwid.getOwnerId();
        console.log('Method 1 - Ecwid.getOwnerId() result:', storeId);
        if (storeId) {
          console.log('✅ Store ID found via Ecwid.getOwnerId():', storeId);
          return storeId;
        }
      } catch (error) {
        console.log('Method 1 - Error calling Ecwid.getOwnerId():', error.message);
      }
    } else {
      console.log('Method 1 - Ecwid.getOwnerId is not a function');
    }
  } else {
    console.log('Method 1 - window.Ecwid does not exist');
  }

  // Method 2: From Ecwid storefront object
  console.log('Method 2 - Checking Ecwid.storefront.storeId...');
  if (window.Ecwid && window.Ecwid.storefront) {
    console.log('  window.Ecwid.storefront exists:', window.Ecwid.storefront);
    if (window.Ecwid.storefront.storeId) {
      storeId = window.Ecwid.storefront.storeId;
      console.log('Method 2 - Ecwid.storefront.storeId:', storeId);
      if (storeId) {
        console.log('✅ Store ID found via Ecwid.storefront.storeId:', storeId);
        return storeId;
      }
    } else {
      console.log('Method 2 - Ecwid.storefront.storeId does not exist');
    }
  } else {
    console.log('Method 2 - window.Ecwid or window.Ecwid.storefront does not exist');
  }

  // Method 3: From global ecwid_store_id variable
  console.log('Method 3 - Checking window.ecwid_store_id...');
  if (window.ecwid_store_id) {
    storeId = window.ecwid_store_id;
    console.log('Method 3 - window.ecwid_store_id:', storeId);
    if (storeId) {
      console.log('✅ Store ID found via window.ecwid_store_id:', storeId);
      return storeId;
    }
  } else {
    console.log('Method 3 - window.ecwid_store_id does not exist');
  }

  // Method 4: From localStorage (fallback)
  storeId = localStorage.getItem('ecwid_store_id');
  console.log('Method 4 - localStorage storeId:', storeId);
  if (storeId) {
    console.log('✅ Store ID found in localStorage:', storeId);
    return storeId;
  }

  // Method 5: From URL parameters (fallback for development)
  const urlParams = new URLSearchParams(window.location.search);
  storeId = urlParams.get('storeId') || urlParams.get('ecwid_store_id') || urlParams.get('store_id');
  console.log('Method 5 - URL params storeId:', storeId);
  if (storeId) {
    console.log('✅ Store ID found via URL params:', storeId);
    return storeId;
  }

  // Method 6: From URL hash (fallback for development)
  const hash = window.location.hash;
  console.log('Method 6 - URL hash:', hash);
  if (hash) {
    // Try to extract store ID from hash like 124288251#app:name=1faq-dev:1
    const hashStoreIdMatch = hash.match(/^(\d+)#/);
    if (hashStoreIdMatch) {
      storeId = hashStoreIdMatch[1];
      console.log('✅ Store ID found in hash prefix:', storeId);
      return storeId;
    }
  }

  // Method 7: From current URL path (extract from full URL)
  const currentUrl = window.location.href;
  console.log('Method 7 - Current URL:', currentUrl);
  const urlStoreIdMatch = currentUrl.match(/(\d{6,})#/);
  if (urlStoreIdMatch) {
    storeId = urlStoreIdMatch[1];
    console.log('✅ Store ID found in URL path:', storeId);
    return storeId;
  }

  // Method 8: From URL path without hash (for cases like 124288251#app:name=1faq-dev:1)
  const pathStoreIdMatch = currentUrl.match(/(\d{6,})/);
  if (pathStoreIdMatch) {
    storeId = pathStoreIdMatch[1];
    console.log('✅ Store ID found in URL path (no hash):', storeId);
    return storeId;
  }

  // Method 9: From referrer URL (when app is loaded from Ecwid admin)
  if (document.referrer) {
    console.log('Method 9 - Referrer URL:', document.referrer);
    const referrerStoreIdMatch = document.referrer.match(/\/store\/(\d+)/);
    if (referrerStoreIdMatch) {
      storeId = referrerStoreIdMatch[1];
      console.log('✅ Store ID found in referrer URL:', storeId);
      return storeId;
    }
  }

  // Method 10: Server-side payload decryption (for Ecwid admin apps)
  const payload = urlParams.get('payload');
  if (payload) {
    console.log('Method 10 - Found payload parameter, attempting server-side decryption...');
    try {
      const response = await fetch('/api/ecwid/decrypt-payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.storeId) {
          storeId = result.data.storeId;
          console.log('✅ Store ID found via server-side payload decryption:', storeId);
          return storeId;
        }
      } else {
        console.log('Method 10 - Server-side decryption failed:', response.status);
      }
    } catch (error) {
      console.log('Method 10 - Error calling server-side decryption:', error.message);
    }
  }

  console.log('❌ No store ID found');
  return null;
};

/**
 * Wait for Ecwid to load and then detect store ID
 * This is useful when the app loads before Ecwid JS API is ready
 */
export const detectStoreIdWithRetry = (maxRetries = 10, delay = 500) => {
  return new Promise((resolve) => {
    let attempts = 0;
    
    const tryDetection = async () => {
      attempts++;
      console.log(`🔄 Store detection attempt ${attempts}/${maxRetries}`);
      
      const storeId = await detectStoreId();
      if (storeId) {
        console.log('✅ Store ID found on attempt', attempts);
        resolve(storeId);
        return;
      }
      
      if (attempts < maxRetries) {
        console.log(`⏳ Ecwid not ready yet, retrying in ${delay}ms...`);
        setTimeout(tryDetection, delay);
      } else {
        console.log('❌ Max retries reached, giving up');
        resolve(null);
      }
    };
    
    tryDetection();
  });
};

/**
 * Debug function to help extract store ID from payload
 * This can be called from browser console for troubleshooting
 */
export const debugEcwid = () => {
  console.log('🔍 Debug Ecwid Environment:');
  console.log('Current URL:', window.location.href);
  
  // Check for Ecwid global objects
  console.log('🔍 Ecwid Global Objects:');
  console.log('window.Ecwid:', window.Ecwid);
  console.log('window.ecwid_store_id:', window.ecwid_store_id);
  
  if (window.Ecwid) {
    console.log('🔍 Ecwid Object Details:');
    console.log('Ecwid.getOwnerId:', typeof window.Ecwid.getOwnerId);
    console.log('Ecwid.storefront:', window.Ecwid.storefront);
    
    // Try to get store ID using official methods
    try {
      const ownerId = window.Ecwid.getOwnerId();
      console.log('Ecwid.getOwnerId() result:', ownerId);
    } catch (error) {
      console.log('Error calling Ecwid.getOwnerId():', error.message);
    }
    
    if (window.Ecwid.storefront) {
      console.log('Ecwid.storefront.storeId:', window.Ecwid.storefront.storeId);
    }
  }
  
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  console.log('🔍 URL Parameters:', Object.fromEntries(urlParams.entries()));
  
  // Check URL hash
  console.log('🔍 URL Hash:', window.location.hash);
  
  // Check localStorage
  console.log('🔍 LocalStorage:');
  console.log('ecwid_store_id:', localStorage.getItem('ecwid_store_id'));
  console.log('ecwid_store_configured:', localStorage.getItem('ecwid_store_configured'));
  
  return {
    ecwid: window.Ecwid,
    ecwid_store_id: window.ecwid_store_id,
    urlParams: Object.fromEntries(urlParams.entries()),
    hash: window.location.hash
  };
};

// Make debug function available globally for troubleshooting
if (typeof window !== 'undefined') {
  window.debugEcwid = debugEcwid;
}

/**
 * Auto-configure store with detected parameters
 */
export const autoConfigureStore = (storeConfig) => {
  console.log('🔧 Auto-configuring store with:', storeConfig);
  
  // Store configuration in localStorage
  localStorage.setItem('ecwid_store_config', JSON.stringify(storeConfig));
  localStorage.setItem('ecwid_store_id', storeConfig.storeId);
  localStorage.setItem('ecwid_store_configured', 'true');
  
  console.log('✅ Store auto-configured successfully');
  return true;
};

/**
 * Get stored store configuration
 */
export const getStoredStoreConfig = () => {
  const config = localStorage.getItem('ecwid_store_config');
  if (config) {
    try {
      return JSON.parse(config);
    } catch (e) {
      console.error('Error parsing stored store config:', e);
    }
  }
  return null;
};

/**
 * Clear stored store configuration
 */
export const clearStoredStoreConfig = () => {
  localStorage.removeItem('ecwid_store_config');
  localStorage.removeItem('ecwid_store_id');
  localStorage.removeItem('ecwid_store_configured');
  console.log('🗑️ Stored store configuration cleared');
};