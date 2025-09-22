import React, { useState, useEffect } from 'react';
import { useEcwid } from '../hooks/useEcwid';
import OAuthButton from './OAuthButton';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CogIcon,
  CloudIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const StoreSetup = ({ onSetupComplete }) => {
  const { storeId, isLoaded, setStoreIdManually } = useEcwid();
  const [setupStatus, setSetupStatus] = useState('checking');
  const [storeInfo, setStoreInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [manualStoreId, setManualStoreId] = useState('');

  console.log('🔧 StoreSetup component rendering...');
  console.log('StoreSetup props:', { onSetupComplete });
  console.log('StoreSetup state:', { setupStatus, storeInfo, error, isConfiguring, manualStoreId });
  console.log('StoreSetup useEcwid:', { storeId, isLoaded });

  useEffect(() => {
    console.log('📋 StoreSetup useEffect running...');
    console.log('useEffect dependencies:', { isLoaded, storeId });
    
    if (isLoaded && storeId) {
      console.log('✅ Ecwid loaded and storeId found, checking store setup...');
      checkStoreSetup();
    } else if (isLoaded && !storeId) {
      console.log('⚠️ Ecwid loaded but no storeId detected, showing manual input...');
      // If Ecwid is loaded but no store ID detected, show manual input
      setSetupStatus('needs_manual_store_id');
    } else {
      console.log('⏳ Waiting for Ecwid to load...', { isLoaded, storeId });
    }
  }, [isLoaded, storeId]);

  const checkStoreSetup = async () => {
    try {
      console.log('🔍 checkStoreSetup called for storeId:', storeId);
      setSetupStatus('checking');
      
      // First check OAuth status
      console.log('📡 Checking OAuth status...');
      const oauthResponse = await fetch(`/api/oauth/status/${storeId}`);
      console.log('OAuth response status:', oauthResponse.status);
      const oauthData = await oauthResponse.json();
      console.log('OAuth response data:', oauthData);
      
      if (oauthData.success && oauthData.authenticated) {
        console.log('✅ OAuth authenticated, store is configured');
        setStoreInfo(oauthData.store);
        setSetupStatus('configured');
        onSetupComplete(oauthData.store);
        return;
      }
      
      // Check if store is already configured in our database (legacy)
      const response = await fetch(`/api/ecwid/store/${storeId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStoreInfo(data.data);
          setSetupStatus('configured');
          onSetupComplete(data.data);
          return;
        }
      }
      
      // Store not configured, show setup options
      setSetupStatus('needs_setup');
      
    } catch (error) {
      console.error('Error checking store setup:', error);
      setError('Failed to check store configuration');
      setSetupStatus('error');
    }
  };

  const autoConfigureStore = async () => {
    try {
      setIsConfiguring(true);
      setSetupStatus('configuring');
      
      // Try to get store info from Ecwid API
      let storeData = null;
      
      if (window.Ecwid && window.Ecwid.API) {
        try {
          // This would require proper authentication, but we'll simulate it
          storeData = {
            name: 'Auto-detected Store',
            storeId: storeId,
            currency: 'USD',
            timezone: 'UTC'
          };
        } catch (apiError) {
          console.log('Could not fetch from Ecwid API:', apiError);
        }
      }
      
      // Create store configuration in our database
      const response = await fetch('/api/ecwid/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeId: storeId,
          storeName: storeData?.name || 'Ecwid Store',
          settings: {
            autoConfigured: true,
            currency: storeData?.currency || 'USD',
            timezone: storeData?.timezone || 'UTC',
            configuredAt: new Date().toISOString()
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setStoreInfo(data.data);
        setSetupStatus('configured');
        onSetupComplete(data.data);
      } else {
        throw new Error('Failed to configure store');
      }
      
    } catch (error) {
      console.error('Error auto-configuring store:', error);
      setError('Failed to auto-configure store');
      setSetupStatus('error');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleManualSetup = () => {
    // Redirect to settings page for manual configuration
    window.location.href = '/settings';
  };

  console.log('🎯 StoreSetup render decision - setupStatus:', setupStatus);

  if (setupStatus === 'checking') {
    console.log('⏳ Rendering checking screen...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking store configuration...</p>
        </div>
      </div>
    );
  }

  if (setupStatus === 'configuring') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Configuring your store...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (setupStatus === 'configured') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Ready!</h2>
          <p className="text-gray-600 mb-4">
            Your store "{storeInfo?.name}" has been configured successfully.
          </p>
          <button 
            onClick={() => onSetupComplete(storeInfo)}
            className="btn btn-primary"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (setupStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Required</h2>
          <p className="text-gray-600 mb-4">
            {error || 'Your store needs to be configured before you can use the plugin.'}
          </p>
          <div className="space-y-3">
            <OAuthButton 
              storeId={storeId}
              onSuccess={(store) => {
                setStoreInfo(store);
                setSetupStatus('configured');
                onSetupComplete(store);
              }}
              onError={(error) => {
                setError(error);
                setSetupStatus('error');
              }}
              className="w-full"
            />
            <button 
              onClick={autoConfigureStore}
              disabled={isConfiguring}
              className="btn btn-outline w-full"
            >
              {isConfiguring ? (
                <>
                  <div className="spinner w-4 h-4 mr-2"></div>
                  Auto-Configure
                </>
              ) : (
                <>
                  <CloudIcon className="h-5 w-5 mr-2" />
                  Try Auto-Configuration
                </>
              )}
            </button>
            <button 
              onClick={handleManualSetup}
              className="btn btn-outline w-full"
            >
              <CogIcon className="h-5 w-5 mr-2" />
              Manual Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (setupStatus === 'needs_manual_store_id') {
    console.log('⚠️ Rendering manual store ID input screen...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store ID Required</h2>
          <p className="text-gray-600 mb-4">
            We couldn't automatically detect your Ecwid store ID. Please enter it manually.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ecwid Store ID
              </label>
              <input
                type="text"
                value={manualStoreId}
                onChange={(e) => setManualStoreId(e.target.value)}
                placeholder="e.g., 124288251"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={() => {
                if (manualStoreId) {
                  // Set the store ID and check setup
                  setStoreIdManually(manualStoreId);
                  // Trigger a re-check of store setup
                  setTimeout(() => {
                    checkStoreSetup();
                  }, 100);
                }
              }}
              disabled={!manualStoreId}
              className="w-full btn btn-primary"
            >
              Continue with Store ID: {manualStoreId || '...'}
            </button>
            <p className="text-xs text-gray-500">
              You can find your Store ID in your Ecwid admin panel URL: 
              <br />
              <code className="bg-gray-100 px-1 rounded">https://my.ecwid.com/store/YOUR_STORE_ID</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (setupStatus === 'needs_setup') {
    console.log('🔧 Rendering store setup screen...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <CogIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Setup</h2>
          <p className="text-gray-600 mb-4">
            We detected your store ID: <code className="bg-gray-100 px-2 py-1 rounded">{storeId}</code>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Let's configure your store to get started with the plugin.
          </p>
          <div className="space-y-3">
            <OAuthButton 
              storeId={storeId}
              onSuccess={(store) => {
                setStoreInfo(store);
                setSetupStatus('configured');
                onSetupComplete(store);
              }}
              onError={(error) => {
                setError(error);
                setSetupStatus('error');
              }}
              className="w-full"
            />
            <button 
              onClick={autoConfigureStore}
              disabled={isConfiguring}
              className="btn btn-outline w-full"
            >
              {isConfiguring ? (
                <>
                  <div className="spinner w-4 h-4 mr-2"></div>
                  Configuring...
                </>
              ) : (
                <>
                  <CloudIcon className="h-5 w-5 mr-2" />
                  Auto-Configure Store
                </>
              )}
            </button>
            <button 
              onClick={handleManualSetup}
              className="btn btn-outline w-full"
            >
              <CogIcon className="h-5 w-5 mr-2" />
              Manual Configuration
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('❌ StoreSetup: No matching setupStatus, returning null');
  return null;
};

export default StoreSetup;
