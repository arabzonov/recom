import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EcwidProvider, useEcwid } from './hooks/useEcwid';
import StoreSetup from './components/StoreSetup';
import Settings from './pages/Settings';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import RecommendationSettings from './components/RecommendationSettings';
import StoreStats from './components/StoreStats';
// Removed logger import

const AppContent = () => {
  const { isLoaded, storeId, error } = useEcwid();
  const [storeConfigured, setStoreConfigured] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if store is already configured in localStorage
    const configured = localStorage.getItem('ecwid_store_configured');
    // Removed logger call
    
    if (configured === 'true') {
      // Removed logger call
      setStoreConfigured(true);
    } else {
      // Removed logger call
    }
  }, [storeId]); // Add storeId as dependency

  const handleStoreSetupComplete = (store) => {
    // Removed logger call
    setStoreInfo(store);
    setStoreConfigured(true);
    localStorage.setItem('ecwid_store_configured', 'true');
  };

  // Show loading while Ecwid context is initializing
  if (!isLoaded) {
    // Removed logger call
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner w-8 h-8"></div>
        <p className="ml-3 text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show store setup if not configured
  if (!storeConfigured) {
    // Removed logger call
    return <StoreSetup onSetupComplete={handleStoreSetupComplete} />;
  }

  // Show main app if configured
  // Removed logger call
  
  try {
    // Removed logger call
    
    // Removed logger call
    
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="p-6">
          <div className="space-y-6">
            <RecommendationSettings />
            <StoreStats />
          </div>
          
          {/* Support Notice */}
          <div className="mt-8 flex justify-center">
            <div className="text-center text-sm text-gray-600">
              Need help? Mail to: <a href="mailto:support@1n.ax" className="text-blue-600 hover:text-blue-800 underline">support@1n.ax</a>
            </div>
          </div>
        </main>
      </div>
    );
  } catch (error) {
    // Removed logger call
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
  // Removed logger call
  
  // Add error boundary
  try {
    return (
      <EcwidProvider>
        <AppContent />
      </EcwidProvider>
    );
  } catch (error) {
    // Removed logger call
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