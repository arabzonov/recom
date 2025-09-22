/**
 * Store Detection Utilities
 * Automatically detects store ID and other parameters from various sources
 */

export const detectStoreId = () => {
  let storeId = null;
  
  console.log('🔍 Detecting store ID...');
  console.log('Current URL:', window.location.href);
  
  // Method 1: From script tag data attribute
  const script = document.querySelector('script[data-ecwid-store-id]');
  if (script) {
    storeId = script.getAttribute('data-ecwid-store-id');
    console.log('Method 1 - Script tag storeId:', storeId);
    if (storeId && storeId !== 'YOUR_STORE_ID') {
      console.log('✅ Store ID found via script tag:', storeId);
      return storeId;
    }
  }
  
  // Method 2: From URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  storeId = urlParams.get('storeId') || urlParams.get('ecwid_store_id') || urlParams.get('store_id');
  console.log('Method 2 - URL params storeId:', storeId);
  if (storeId) {
    console.log('✅ Store ID found via URL params:', storeId);
    return storeId;
  }
  
  // Method 3: From URL hash (for app URLs)
  const hash = window.location.hash;
  console.log('Method 3 - URL hash:', hash);
  if (hash) {
    // Try to extract store ID from hash like #app:name=1faq-dev
    const hashParams = new URLSearchParams(hash.substring(1));
    storeId = hashParams.get('storeId') || hashParams.get('ecwid_store_id') || hashParams.get('store_id');
    if (storeId) {
      console.log('✅ Store ID found via hash params:', storeId);
      return storeId;
    }
  }
  
  // Method 4: Extract from referrer URL (when loaded from external source)
  if (document.referrer) {
    console.log('Method 4 - Referrer URL:', document.referrer);
    try {
      const referrerUrl = new URL(document.referrer);
      const referrerParams = new URLSearchParams(referrerUrl.search);
      storeId = referrerParams.get('storeId') || referrerParams.get('ecwid_store_id') || referrerParams.get('store_id');
      if (storeId) {
        console.log('✅ Store ID found via referrer params:', storeId);
        return storeId;
      }
    } catch (e) {
      console.log('Could not parse referrer URL');
    }
  }
  
  // Method 5: From localStorage
  storeId = localStorage.getItem('ecwid_store_id');
  console.log('Method 5 - localStorage storeId:', storeId);
  if (storeId) {
    console.log('✅ Store ID found in localStorage:', storeId);
    return storeId;
  }
  
  // Method 6: From parent window (if in iframe)
  if (window.parent && window.parent !== window) {
    console.log('Method 6 - Checking parent window...');
    try {
      const parentUrl = window.parent.location.href;
      const parentParams = new URLSearchParams(parentUrl.split('?')[1] || '');
      storeId = parentParams.get('storeId') || parentParams.get('ecwid_store_id') || parentParams.get('store_id');
      if (storeId) {
        console.log('✅ Store ID found via parent window:', storeId);
        return storeId;
      }
    } catch (e) {
      console.log('Could not access parent window (cross-origin)');
    }
  }
  
  // Method 7: From iframe src parameter
  if (window.location !== window.parent.location) {
    console.log('Method 7 - Checking iframe src...');
    try {
      const iframeParams = new URLSearchParams(window.location.search);
      storeId = iframeParams.get('storeId') || iframeParams.get('ecwid_store_id') || iframeParams.get('store_id');
      if (storeId) {
        console.log('✅ Store ID found via iframe src:', storeId);
        return storeId;
      }
    } catch (e) {
      console.log('Could not parse iframe src');
    }
  }
  
  // Method 8: PostMessage communication with parent
  if (window.parent && window.parent !== window) {
    console.log('Method 8 - Using postMessage...');
    
    // Listen for store ID from parent
    const messageHandler = (event) => {
      if (event.data && event.data.type === 'STORE_ID') {
        storeId = event.data.storeId;
        console.log('✅ Store ID received via postMessage:', storeId);
        window.removeEventListener('message', messageHandler);
        return storeId;
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Request store ID from parent
    window.parent.postMessage({ type: 'REQUEST_STORE_ID' }, '*');
    
    // Clean up listener after timeout
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
    }, 1000);
  }
  
  console.log('❌ No store ID found');
  return null;
};

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