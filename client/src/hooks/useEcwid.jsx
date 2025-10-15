import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectStoreId, detectStoreIdWithRetry } from '../utils/storeDetection';
import { getStoreId, waitForEcwidAPI } from '../utils/ecwidSDK';
// Removed logger import

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
        // Removed logger.info('Initializing Ecwid store');
        
        // Set loaded immediately to show the app
        setIsLoaded(true);
        
        // Check if store is already configured
        const storedStoreId = localStorage.getItem('ecwid_store_id');
        
        if (storedStoreId) {
          // Removed logger.info('Using stored store ID', { storeId: storedStoreId });
          setStoreId(storedStoreId);
          return;
        }

        // Removed logger.info('No stored store ID, detecting...');
        
        // First try proper SDK method
        try {
          await waitForEcwidAPI();
          const sdkStoreId = await getStoreId();
          if (sdkStoreId) {
            // Removed logger.info('Store ID found using SDK', { storeId: sdkStoreId });
            setStoreId(sdkStoreId);
            localStorage.setItem('ecwid_store_id', sdkStoreId);
            return;
          }
        } catch (error) {
          // Removed logger.warn('SDK method failed, trying fallback methods', error);
        }
        
        // Fallback to legacy detection methods
        let detectedStoreId = await detectStoreId();
        
        if (!detectedStoreId) {
          // Removed logger.info('Store ID not found, trying retry mechanism');
          // If not found immediately, try with retry mechanism
          detectedStoreId = await detectStoreIdWithRetry();
        }

        if (detectedStoreId) {
          // Removed logger.info('Store ID detected successfully', { storeId: detectedStoreId });
          setStoreId(detectedStoreId);
          
        } else {
          // Removed logger.error('No store ID found using any detection method');
          setError('Store ID not found');
        }
      } catch (err) {
        // Removed logger.error('Store initialization error', err);
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
    // Removed logger.info('Manually setting store ID', { storeId: newStoreId });
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