import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EcwidProvider, useEcwid } from './hooks/useEcwid';
import StoreSetup from './components/StoreSetup';
import Settings from './pages/Settings';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import RecommendationSettings from './components/RecommendationSettings';
import logger from './utils/logger';

const AppContent = () => {
  const { isLoaded, storeId, error } = useEcwid();
  const [storeConfigured, setStoreConfigured] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if store is already configured in localStorage
    const configured = localStorage.getItem('ecwid_store_configured');
    logger.componentLifecycle('App', 'checking store configuration', { configured, storeId });
    
    if (configured === 'true') {
      logger.info('Store is already configured');
      setStoreConfigured(true);
    } else {
      logger.info('Store not configured, will show setup');
    }
  }, [storeId]); // Add storeId as dependency

  const handleStoreSetupComplete = (store) => {
    logger.info('Store setup completed', { store });
    setStoreInfo(store);
    setStoreConfigured(true);
    localStorage.setItem('ecwid_store_configured', 'true');
  };

  // Show loading while Ecwid context is initializing
  if (!isLoaded) {
    logger.componentLifecycle('App', 'showing loading screen (Ecwid context not loaded)');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner w-8 h-8"></div>
        <p className="ml-3 text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show store setup if not configured
  if (!storeConfigured) {
    logger.componentLifecycle('App', 'showing store setup (store not configured)', { storeConfigured, storeId });
    return <StoreSetup onSetupComplete={handleStoreSetupComplete} />;
  }

  // Show main app if configured
  logger.componentLifecycle('App', 'showing main app (store configured)', { storeConfigured, storeId });
  
  try {
    logger.info('Rendering main app components');
    
    logger.info('About to render main app');
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
          <h1 className="text-xl font-semibold text-gray-900">Ecwid Plugin Dashboard</h1>
        </div>
        <div className="flex">
          <div className="w-64 bg-white shadow-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h2>
            <div className="space-y-2">
              <div className="p-2 bg-primary-100 text-primary-700 rounded">Dashboard</div>
              <div className="p-2 text-gray-600 hover:bg-gray-50 rounded">Settings</div>
            </div>
          </div>
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
                <p className="text-gray-600">Welcome to your Ecwid Plugin Dashboard!</p>
                <p className="text-sm text-gray-500 mt-2">Store ID: {storeId}</p>
              </div>
              
              <RecommendationSettings />
            </div>
          </main>
        </div>
      </div>
    );
  } catch (error) {
    logger.error('Error rendering main app', error);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading App</h2>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }
};

const App = () => {
  logger.info('App component rendering');
  
  // Add error boundary
  try {
    return (
      <EcwidProvider>
        <AppContent />
      </EcwidProvider>
    );
  } catch (error) {
    logger.error('App component error', error);
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'red',
        color: 'white',
        padding: '20px',
        fontSize: '18px',
        fontWeight: 'bold',
        zIndex: 10000
      }}>
        ❌ APP ERROR: {error.message}
      </div>
    );
  }
};

export default App;