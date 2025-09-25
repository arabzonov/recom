/**
 * Ecwid SDK Integration Helper
 * 
 * This utility provides proper integration with the Ecwid SDK
 * for extracting store and product information.
 */

/**
 * Get store ID using proper Ecwid SDK method
 * @returns {Promise<number|null>} Store ID or null if not available
 */
export const getStoreId = () => {
  return new Promise((resolve) => {
    if (window.Ecwid && window.Ecwid.getStoreId) {
      // For storefront pages
      const storeId = window.Ecwid.getStoreId();
      resolve(storeId);
    } else if (window.EcwidApp && window.EcwidApp.getSettings) {
      // For admin iframe context
      window.EcwidApp.getSettings((settings) => {
        resolve(settings.storeId);
      });
    } else {
      resolve(null);
    }
  });
};

/**
 * Get product ID from current page using Ecwid SDK
 * @returns {Promise<number|null>} Product ID or null if not on product page
 */
export const getProductId = () => {
  return new Promise((resolve) => {
    if (window.Ecwid && window.Ecwid.OnAPILoaded) {
      window.Ecwid.OnAPILoaded.add(() => {
        if (window.Ecwid.OnPageLoaded) {
          window.Ecwid.OnPageLoaded.add((page) => {
            if (page.type === 'product' && page.product && page.product.id) {
              resolve(page.product.id);
            } else {
              resolve(null);
            }
          });
        } else {
          resolve(null);
        }
      });
    } else {
      resolve(null);
    }
  });
};

/**
 * Set up listener for product page changes
 * @param {Function} callback - Callback function to call when product page is loaded
 * @returns {Promise<boolean>} True if listener was set up successfully
 */
export const setupProductPageListener = (callback) => {
  return new Promise((resolve) => {
    if (window.Ecwid && window.Ecwid.OnAPILoaded) {
      window.Ecwid.OnAPILoaded.add(() => {
        if (window.Ecwid.OnPageLoaded) {
          window.Ecwid.OnPageLoaded.add((page) => {
            if (page.type === 'product' && page.product && page.product.id) {
              callback(page.product.id, page);
            }
          });
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } else {
      resolve(false);
    }
  });
};

/**
 * Navigate to a product page using Ecwid SDK
 * @param {number} productId - Product ID to navigate to
 */
export const navigateToProduct = (productId) => {
  if (window.Ecwid && window.Ecwid.openPage) {
    window.Ecwid.openPage(`product=${productId}`);
  } else {
    // Fallback to URL navigation
    window.location.href = `#product=${productId}`;
  }
};

/**
 * Check if we're in an Ecwid storefront context
 * @returns {boolean} True if in storefront context
 */
export const isStorefrontContext = () => {
  return !!(window.Ecwid && window.Ecwid.getStoreId);
};

/**
 * Check if we're in an Ecwid admin iframe context
 * @returns {boolean} True if in admin iframe context
 */
export const isAdminContext = () => {
  return !!(window.EcwidApp && window.EcwidApp.getSettings);
};

/**
 * Wait for Ecwid API to be loaded
 * @returns {Promise<boolean>} True when API is loaded
 */
export const waitForEcwidAPI = () => {
  return new Promise((resolve) => {
    if (window.Ecwid && window.Ecwid.OnAPILoaded) {
      window.Ecwid.OnAPILoaded.add(() => {
        resolve(true);
      });
    } else if (window.EcwidApp) {
      // Admin context - API is usually already loaded
      resolve(true);
    } else {
      // Fallback - assume API is loaded after a short delay
      setTimeout(() => resolve(true), 1000);
    }
  });
};

/**
 * Get current page type using Ecwid SDK
 * @returns {Promise<string|null>} Page type or null if not available
 */
export const getCurrentPageType = () => {
  return new Promise((resolve) => {
    if (window.Ecwid && window.Ecwid.OnAPILoaded) {
      window.Ecwid.OnAPILoaded.add(() => {
        if (window.Ecwid.OnPageLoaded) {
          window.Ecwid.OnPageLoaded.add((page) => {
            resolve(page.type);
          });
        } else {
          resolve(null);
        }
      });
    } else {
      resolve(null);
    }
  });
};

export default {
  getStoreId,
  getProductId,
  setupProductPageListener,
  navigateToProduct,
  isStorefrontContext,
  isAdminContext,
  waitForEcwidAPI,
  getCurrentPageType
};
