import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StoreSetup from './components/StoreSetup';
import OAuthCallback from './components/OAuthCallback';
import Settings from './pages/Settings';
import { EcwidProvider, useEcwid } from './hooks/useEcwid';


function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [storeConfigured, setStoreConfigured] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);

  console.log('🚀 App component rendering...');
  console.log('🚀 App environment check:', {
    isEcwidAdmin: window.location.href.includes('ecwid.com'),
    isIframe: window.parent !== window,
    userAgent: navigator.userAgent,
    currentUrl: window.location.href
  });
  console.log('App state:', { isLoading, storeConfigured, storeInfo });


  useEffect(() => {
    console.log('📋 App useEffect running...');
    console.log('📋 App current state before check:', { isLoading, storeConfigured, storeInfo });
    
    // Add timeout to prevent eternal loading in Ecwid admin panel
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Loading timeout reached, forcing app to show');
      setIsLoading(false);
    }, 5000); // 5 second timeout
    
    // Check if store is already configured
    const checkStoreConfig = async () => {
      console.log('🔍 Checking store configuration...');
      const configured = localStorage.getItem('ecwid_store_configured');
      const storeId = localStorage.getItem('ecwid_store_id');
      console.log('LocalStorage ecwid_store_configured:', configured);
      console.log('LocalStorage ecwid_store_id:', storeId);
      
      if (configured === 'true') {
        console.log('✅ Store is configured, setting storeConfigured to true');
        setStoreConfigured(true);
        setIsLoading(false);
        console.log('✅ App state updated: storeConfigured=true, isLoading=false');
      } else {
        console.log('❌ Store not configured, setting storeConfigured to false');
        setIsLoading(false);
        console.log('✅ App state updated: storeConfigured=false, isLoading=false');
      }
      
      // Clear the timeout since we've handled the loading state
      clearTimeout(loadingTimeout);
    };

    console.log('🔄 Calling checkStoreConfig...');
    checkStoreConfig();
    console.log('🔄 checkStoreConfig completed');
    
    // Cleanup timeout on unmount
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Note: Product fetching is handled in the store configuration check above

  const handleStoreSetupComplete = (store) => {
    console.log('🎉 Store setup completed with store:', store);
    setStoreInfo(store);
    setStoreConfigured(true);
    localStorage.setItem('ecwid_store_configured', 'true');
  };

  console.log('🎯 App render decision:', { isLoading, storeConfigured });
  console.log('🎯 App render decision details:', {
    isLoading,
    storeConfigured,
    shouldShowLoading: isLoading,
    shouldShowStoreSetup: !storeConfigured,
    shouldShowMainApp: !isLoading && storeConfigured
  });

  if (isLoading) {
    console.log('⏳ Rendering loading screen...');
    console.log('⏳ Loading screen reason: isLoading=true');
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
    console.log('🔧 Rendering StoreSetup component...');
    console.log('🔧 StoreSetup reason: storeConfigured=false');
    return (
      <EcwidProvider>
        <StoreSetup onSetupComplete={handleStoreSetupComplete} />
      </EcwidProvider>
    );
  }

  console.log('🏠 Rendering main app with router...');
  console.log('🏠 Main app reason: isLoading=false, storeConfigured=true');
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
                        <Route path="/auth/callback" element={<OAuthCallback />} />
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
