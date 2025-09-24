import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EcwidProvider } from './hooks/useEcwid';
import StoreSetup from './components/StoreSetup';
import Settings from './pages/Settings';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [storeConfigured, setStoreConfigured] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);

  useEffect(() => {
    const checkStoreConfig = async () => {
      // Set a timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 3000);

      try {
        const configured = localStorage.getItem('ecwid_store_configured');
        const storeId = localStorage.getItem('ecwid_store_id');

        if (configured === 'true' && storeId) {
          setStoreConfigured(true);
          setIsLoading(false);
        } else {
          setStoreConfigured(false);
          setIsLoading(false);
        }
      } catch (error) {
        setStoreConfigured(false);
        setIsLoading(false);
      }

      clearTimeout(loadingTimeout);
    };

    checkStoreConfig();
  }, []);

  const handleStoreSetupComplete = (store) => {
    setStoreInfo(store);
    setStoreConfigured(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner w-8 h-8"></div>
        <p className="ml-3 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!storeConfigured) {
    return (
      <EcwidProvider>
        <StoreSetup onSetupComplete={handleStoreSetupComplete} />
      </EcwidProvider>
    );
  }

  return (
    <EcwidProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-6">
              <Routes>
                <Route path="/" element={<div>Dashboard</div>} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </EcwidProvider>
  );
};

export default App;