import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StoreSetup from './components/StoreSetup';
import Settings from './pages/Settings';
import { EcwidProvider } from './hooks/useEcwid';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [storeConfigured, setStoreConfigured] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);

  useEffect(() => {
    // Check if store is already configured
    const checkStoreConfig = () => {
      const configured = localStorage.getItem('ecwid_store_configured');
      if (configured === 'true') {
        setStoreConfigured(true);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };

    checkStoreConfig();
  }, []);

  const handleStoreSetupComplete = (store) => {
    setStoreInfo(store);
    setStoreConfigured(true);
    localStorage.setItem('ecwid_store_configured', 'true');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Ecwid Plugin...</p>
        </div>
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
          <Header 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
          />
          
          <div className="flex">
            <Sidebar 
              sidebarOpen={sidebarOpen} 
              setSidebarOpen={setSidebarOpen} 
            />
            
            <main className="flex-1 lg:ml-64">
              <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <Routes>
                    <Route path="/" element={<Settings />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </div>
              </div>
            </main>
          </div>
        </div>
      </Router>
    </EcwidProvider>
  );
}

export default App;
