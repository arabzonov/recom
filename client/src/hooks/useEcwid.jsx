import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectStoreId, autoConfigureStore, debugStoreDetection } from '../utils/storeDetection';

const EcwidContext = createContext();

export function useEcwid() {
  const context = useContext(EcwidContext);
  if (!context) {
    throw new Error('useEcwid must be used within an EcwidProvider');
  }
  return context;
}

export function EcwidProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [storeId, setStoreId] = useState(null);
  const [api, setApi] = useState(null);
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEcwidScript = (storeId) => {
      return new Promise((resolve, reject) => {
        // Check if script is already loaded
        if (document.querySelector(`script[src*="app.ecwid.com/script.js?data_platform=code&data_store_id=${storeId}"]`)) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://app.ecwid.com/script.js?data_platform=code&data_store_id=${storeId}`;
        script.async = true;
        script.onload = () => {
          console.log('Ecwid script loaded successfully');
          resolve();
        };
        script.onerror = () => {
          console.error('Failed to load Ecwid script');
          reject(new Error('Failed to load Ecwid script'));
        };
        document.head.appendChild(script);
      });
    };

    const initializeEcwid = async () => {
      try {
        // Run debug function to help troubleshoot detection
        console.log('=== Ecwid Store ID Detection ===');
        debugStoreDetection();
        
        // First, try to detect store ID
        let detectedStoreId = await detectStoreId();
        
        // If no store ID detected, check localStorage for saved configuration
        if (!detectedStoreId) {
          const savedConfig = localStorage.getItem('ecwid_store_config');
          if (savedConfig) {
            const config = JSON.parse(savedConfig);
            detectedStoreId = config.storeId;
            console.log('Store ID loaded from saved configuration:', detectedStoreId);
          }
        }

        if (detectedStoreId) {
          setStoreId(detectedStoreId);
          console.log('✅ Store ID detected:', detectedStoreId);
          
          // Load Ecwid script with store ID
          await loadEcwidScript(detectedStoreId);
          
          // Wait for Ecwid to be available
          const checkEcwid = () => {
            if (window.Ecwid) {
              if (window.Ecwid.OnAPILoaded) {
                window.Ecwid.OnAPILoaded.add(() => {
                  console.log('✅ Ecwid API loaded successfully');
                  setIsLoaded(true);
                  setApi(window.Ecwid.API);
                  
                  // Listen for cart updates
                  if (window.Ecwid.Cart) {
                    window.Ecwid.Cart.addListener('cartUpdated', (cartData) => {
                      setCart(cartData);
                    });
                  }
                });
              } else if (window.Ecwid.API) {
                // API already loaded
                console.log('✅ Ecwid API already loaded');
                setIsLoaded(true);
                setApi(window.Ecwid.API);
              }
            } else {
              // Retry after a short delay
              setTimeout(checkEcwid, 100);
            }
          };
          
          checkEcwid();
        } else {
          console.warn('❌ No store ID detected. Ecwid API will not be available.');
          console.log('💡 This is normal when running outside of Ecwid admin or when no store ID is configured.');
          setError('No store ID detected. Please configure your store in settings.');
        }
      } catch (error) {
        console.error('❌ Error initializing Ecwid:', error);
        setError('Failed to load Ecwid API');
      }
    };

    // Initialize Ecwid
    initializeEcwid();
  }, []);

  const addToCart = (productId, quantity = 1, options = {}) => {
    if (window.Ecwid && window.Ecwid.Cart) {
      window.Ecwid.Cart.addProduct(productId, quantity, options);
    } else {
      console.warn('Ecwid Cart API not available');
    }
  };

  const getCart = () => {
    if (window.Ecwid && window.Ecwid.Cart) {
      return window.Ecwid.Cart.getCart();
    }
    return null;
  };

  const openCart = () => {
    if (window.Ecwid && window.Ecwid.Cart) {
      window.Ecwid.Cart.open();
    }
  };

  const getProduct = (productId) => {
    if (api) {
      return api.getProduct(productId);
    }
    return null;
  };

  const getProducts = (params = {}) => {
    if (api) {
      return api.getProducts(params);
    }
    return null;
  };

  const getCategories = () => {
    if (api) {
      return api.getCategories();
    }
    return null;
  };

  const setStoreIdAndReload = async (newStoreId) => {
    try {
      // Save store ID to localStorage
      localStorage.setItem('ecwid_store_id', newStoreId);
      
      // Update state
      setStoreId(newStoreId);
      setIsLoaded(false);
      setApi(null);
      setError(null);
      
      // Remove existing Ecwid script
      const existingScript = document.querySelector('script[src*="app.ecwid.com/script.js"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Clear existing Ecwid global object
      if (window.Ecwid) {
        delete window.Ecwid;
      }
      
      // Load new script with new store ID
      const script = document.createElement('script');
      script.src = `https://app.ecwid.com/script.js?data_platform=code&data_store_id=${newStoreId}`;
      script.async = true;
      
      script.onload = () => {
        console.log('Ecwid script reloaded with new store ID:', newStoreId);
        
        // Wait for Ecwid to be available
        const checkEcwid = () => {
          if (window.Ecwid) {
            if (window.Ecwid.OnAPILoaded) {
              window.Ecwid.OnAPILoaded.add(() => {
                console.log('Ecwid API loaded successfully with new store ID');
                setIsLoaded(true);
                setApi(window.Ecwid.API);
                
                // Listen for cart updates
                if (window.Ecwid.Cart) {
                  window.Ecwid.Cart.addListener('cartUpdated', (cartData) => {
                    setCart(cartData);
                  });
                }
              });
            } else if (window.Ecwid.API) {
              // API already loaded
              console.log('Ecwid API already loaded with new store ID');
              setIsLoaded(true);
              setApi(window.Ecwid.API);
            } else {
              // Retry after a short delay
              setTimeout(checkEcwid, 100);
            }
          } else {
            // Retry after a short delay
            setTimeout(checkEcwid, 100);
          }
        };
        
        checkEcwid();
      };
      
      script.onerror = () => {
        console.error('Failed to reload Ecwid script');
        setError('Failed to load Ecwid API with new store ID');
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error setting store ID:', error);
      setError('Failed to set store ID');
    }
  };

  const trackEvent = (eventName, eventData = {}) => {
    // Send analytics event to our backend
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId,
        eventType: eventName,
        eventData,
        userAgent: navigator.userAgent,
        ipAddress: null // Will be set by server
      })
    }).catch(error => {
      console.error('Error tracking event:', error);
    });
  };

  const value = {
    isLoaded,
    storeId,
    api,
    cart,
    error,
    addToCart,
    getCart,
    openCart,
    getProduct,
    getProducts,
    getCategories,
    trackEvent,
    setStoreIdAndReload
  };

  return (
    <EcwidContext.Provider value={value}>
      {children}
    </EcwidContext.Provider>
  );
}

// Default export for backward compatibility
export default useEcwid;
