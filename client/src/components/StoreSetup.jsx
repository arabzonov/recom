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

  useEffect(() => {
    if (isLoaded && storeId) {
      checkStoreSetup();
    } else if (isLoaded && !storeId) {
      setSetupStatus('needs_manual_store_id');
    }
  }, [isLoaded, storeId]);

  const checkStoreSetup = async () => {
    try {
      setSetupStatus('checking');
      
      // First check OAuth status
      const oauthResponse = await fetch(`/api/oauth/status/${storeId}`);
      const oauthData = await oauthResponse.json();

      if (oauthData.success && oauthData.authenticated) {
        setStoreInfo(oauthData.store);
        setSetupStatus('configured');
        onSetupComplete(oauthData.store);
        return;
      }

      // If not OAuth authenticated, check if we can get store info directly
      try {
        const storeResponse = await fetch(`/api/ecwid/store/${storeId}`);
        const storeData = await storeResponse.json();
        
        if (storeData.success) {
          setStoreInfo(storeData.data);
          setSetupStatus('configured');
          onSetupComplete(storeData.data);
          return;
        }
      } catch (apiError) {
        // Continue to OAuth setup
      }

      // If we get here, store needs OAuth setup
      setSetupStatus('needs_oauth');
    } catch (error) {
      setError('Failed to check store setup');
      setSetupStatus('error');
    }
  };

  const handleManualStoreIdSubmit = async (e) => {
    e.preventDefault();
    if (!manualStoreId.trim()) return;

    setIsConfiguring(true);
    try {
      // Try to auto-configure with the manual store ID
      const response = await fetch('/api/ecwid/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: manualStoreId.trim(),
          storeName: `Store ${manualStoreId}`,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStoreInfo(result.data);
          setSetupStatus('configured');
          onSetupComplete(result.data);
        } else {
          setError('Failed to configure store');
        }
      } else {
        setError('Failed to configure store');
      }
    } catch (error) {
      setError('Error configuring store');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleOAuthSuccess = (store) => {
    setStoreInfo(store);
    setSetupStatus('configured');
    onSetupComplete(store);
  };

  const handleOAuthError = (error) => {
    setError(`OAuth failed: ${error}`);
    setSetupStatus('error');
  };

  if (setupStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking Store Setup</h2>
          <p className="text-gray-600">Verifying your store configuration...</p>
        </div>
      </div>
    );
  }

  if (setupStatus === 'needs_manual_store_id') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Store ID Required</h2>
            <p className="text-gray-600">
              We couldn't automatically detect your store ID. Please enter it manually.
            </p>
          </div>

          <form onSubmit={handleManualStoreIdSubmit} className="space-y-4">
            <div>
              <label htmlFor="storeId" className="block text-sm font-medium text-gray-700 mb-1">
                Store ID
              </label>
              <input
                type="text"
                id="storeId"
                value={manualStoreId}
                onChange={(e) => setManualStoreId(e.target.value)}
                placeholder="Enter your Ecwid store ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isConfiguring || !manualStoreId.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfiguring ? 'Configuring...' : 'Configure Store'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (setupStatus === 'needs_oauth') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <CloudIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect to Ecwid</h2>
            <p className="text-gray-600">
              Connect your Ecwid store to enable the plugin functionality.
            </p>
          </div>

          <OAuthButton
            storeId={storeId}
            onSuccess={handleOAuthSuccess}
            onError={handleOAuthError}
          />

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (setupStatus === 'configured') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Store Connected</h2>
            <p className="text-gray-600 mb-4">
              Your store is successfully connected and configured.
            </p>
            {storeInfo && (
              <div className="bg-gray-50 rounded-md p-3 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Store ID:</strong> {storeInfo.store_id || storeInfo.storeId}
                </p>
                {storeInfo.store_name && (
                  <p className="text-sm text-gray-600">
                    <strong>Store Name:</strong> {storeInfo.store_name}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Continue to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (setupStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Setup Error</h2>
            <p className="text-gray-600 mb-4">
              {error || 'An error occurred during store setup.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StoreSetup;