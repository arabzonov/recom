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
  const [error, setError] = useState(null);

  console.log('🏗️ EcwidProvider rendering with state:', { isLoaded, storeId, error });

  useEffect(() => {
    console.log('🔄 EcwidProvider useEffect triggered');
    
    const initializeStore = () => {
      console.log('🔍 Initializing store detection...');
      console.log('🔍 Current localStorage state:', {
        ecwid_store_id: localStorage.getItem('ecwid_store_id'),
        ecwid_store_configured: localStorage.getItem('ecwid_store_configured'),
        ecwid_store_config: localStorage.getItem('ecwid_store_config')
      });
      
      // Try to detect store ID using utility function
      console.log('🔍 Calling detectStoreId()...');
      const detectedStoreId = detectStoreId();
      console.log('🔍 detectStoreId() returned:', detectedStoreId);
      
      if (detectedStoreId) {
        console.log('✅ Store ID detected via detectStoreId:', detectedStoreId);
        setStoreId(detectedStoreId);
        setIsLoaded(true);
        setError(null);
        console.log('✅ State updated: isLoaded=true, storeId=' + detectedStoreId);
      } else {
        // Check localStorage for manually set store ID
        const storedStoreId = localStorage.getItem('ecwid_store_id');
        console.log('🔍 Checking localStorage for storeId:', storedStoreId);
        
        if (storedStoreId) {
          console.log('✅ Store ID found in localStorage:', storedStoreId);
          setStoreId(storedStoreId);
          setIsLoaded(true);
          setError(null);
          console.log('✅ State updated: isLoaded=true, storeId=' + storedStoreId);
        } else {
          console.log('❌ No store ID found anywhere');
          setIsLoaded(true);
          setError('No store ID found. Please configure your store.');
          console.log('✅ State updated: isLoaded=true, error set');
        }
      }
    };

    console.log('🔄 Calling initializeStore...');
    initializeStore();
    console.log('🔄 initializeStore completed');
  }, []);

  console.log('🏗️ EcwidProvider about to render with final state:', { isLoaded, storeId, error });


  const trackEvent = (eventName, eventData = {}) => {
    console.log('📊 trackEvent called:', { eventName, eventData, storeId });
    // Analytics tracking removed - no longer storing analytics data
  };


  const value = {
    isLoaded,
    storeId,
    error,
    trackEvent
  };

  console.log('🏗️ EcwidProvider providing value:', value);

  return (
    <EcwidContext.Provider value={value}>
      {children}
    </EcwidContext.Provider>
  );
};