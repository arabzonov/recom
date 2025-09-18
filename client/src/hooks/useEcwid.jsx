import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectStoreId, autoConfigureStore } from '../utils/storeDetection';

const EcwidContext = createContext();

export const useEcwid = () => {
  const context = useContext(EcwidContext);
  if (!context) {
    throw new Error('useEcwid must be used within an EcwidProvider');
  }
  return context;
};

export const EcwidProvider = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [storeId, setStoreId] = useState(null);
  const [api, setApi] = useState(null);
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeEcwid = () => {
      if (window.Ecwid) {
        window.Ecwid.OnAPILoaded.add(() => {
          console.log('Ecwid API loaded successfully');
          setIsLoaded(true);
          setApi(window.Ecwid.API);
          
          // Auto-detect store ID using utility function
          const detectedStoreId = detectStoreId();
          
          if (detectedStoreId) {
            setStoreId(detectedStoreId);
            console.log('Store ID detected:', detectedStoreId);
          } else {
            console.warn('Could not auto-detect store ID. Please set it manually in settings.');
          }
        });

        // Listen for cart updates
        if (window.Ecwid.Cart) {
          window.Ecwid.Cart.addListener('cartUpdated', (cartData) => {
            setCart(cartData);
          });
        }
      } else {
        setError('Ecwid API not available');
        console.warn('Ecwid API not found. Make sure the Ecwid script is loaded.');
      }
    };

    // Initialize immediately if Ecwid is already loaded
    if (window.Ecwid && window.Ecwid.API) {
      setIsLoaded(true);
      setApi(window.Ecwid.API);
    } else {
      initializeEcwid();
    }
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
    trackEvent
  };

  return (
    <EcwidContext.Provider value={value}>
      {children}
    </EcwidContext.Provider>
  );
};
