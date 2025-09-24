import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectStoreId, detectStoreIdWithRetry } from '../utils/storeDetection';

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
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeStore = async () => {
      try {
        // Check if store is already configured
        const storedStoreId = localStorage.getItem('ecwid_store_id');
        if (storedStoreId) {
          setStoreId(storedStoreId);
          setIsLoaded(true);
          return;
        }

        // Try to detect store ID
        let detectedStoreId = await detectStoreId();
        
        if (!detectedStoreId) {
          // If not found immediately, try with retry mechanism
          detectedStoreId = await detectStoreIdWithRetry();
        }

        if (detectedStoreId) {
          setStoreId(detectedStoreId);
          setIsLoaded(true);
        } else {
          setError('Store ID not found');
          setIsLoaded(true);
        }
      } catch (err) {
        setError(err.message);
        setIsLoaded(true);
      }
    };

    initializeStore();
  }, []);

  const trackEvent = (eventName, eventData = {}) => {
    // Event tracking logic can be added here
    // For now, just a placeholder
  };

  const value = {
    isLoaded,
    storeId,
    error,
    trackEvent
  };

  return (
    <EcwidContext.Provider value={value}>
      {children}
    </EcwidContext.Provider>
  );
};