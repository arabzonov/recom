import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectStoreId, detectStoreIdWithRetry } from '../utils/storeDetection';
import logger from '../utils/logger';

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
        logger.info('Initializing Ecwid store');
        
        // Set loaded immediately to show the app
        setIsLoaded(true);
        
        // Check if store is already configured
        const storedStoreId = localStorage.getItem('ecwid_store_id');
        
        if (storedStoreId) {
          logger.info('Using stored store ID', { storeId: storedStoreId });
          setStoreId(storedStoreId);
          return;
        }

        logger.info('No stored store ID, detecting...');
        // Try to detect store ID
        let detectedStoreId = await detectStoreId();
        
        if (!detectedStoreId) {
          logger.info('Store ID not found, trying retry mechanism');
          // If not found immediately, try with retry mechanism
          detectedStoreId = await detectStoreIdWithRetry();
        }

        if (detectedStoreId) {
          logger.info('Store ID detected successfully', { storeId: detectedStoreId });
          setStoreId(detectedStoreId);
          
        } else {
          logger.error('No store ID found using any detection method');
          setError('Store ID not found');
        }
      } catch (err) {
        logger.error('Store initialization error', err);
        setError(err.message);
        // Still set loaded to true even if there's an error
        setIsLoaded(true);
      }
    };

    initializeStore();
  }, []);

  const trackEvent = (eventName, eventData = {}) => {
    // Event tracking logic can be added here
    // For now, just a placeholder
  };

  const setStoreIdManually = (newStoreId) => {
    logger.info('Manually setting store ID', { storeId: newStoreId });
    setStoreId(newStoreId);
    localStorage.setItem('ecwid_store_id', newStoreId);
  };

  const value = {
    isLoaded,
    storeId,
    error,
    trackEvent,
    setStoreIdManually
  };

  return (
    <EcwidContext.Provider value={value}>
      {children}
    </EcwidContext.Provider>
  );
};