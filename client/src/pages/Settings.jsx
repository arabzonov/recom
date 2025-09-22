import React, { useState, useEffect } from 'react';
import { useEcwid } from '../hooks/useEcwid';
import OAuthButton from '../components/OAuthButton';
import { 
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const { isLoaded, storeId, trackEvent } = useEcwid();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [oauthStatus, setOauthStatus] = useState(null);
  const [productBlock, setProductBlock] = useState({ enabled: false, html: null });
  const [blockLoading, setBlockLoading] = useState(false);
  const [integrationInstructions, setIntegrationInstructions] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // Check for OAuth callback parameters
        const urlParams = new URLSearchParams(window.location.search);
        const oauthSuccess = urlParams.get('success');
        const oauthError = urlParams.get('error');
        
        if (oauthSuccess === 'oauth_complete') {
          setMessage('Successfully connected to Ecwid!');
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (oauthError) {
          setMessage(`OAuth error: ${decodeURIComponent(oauthError)}`);
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Check OAuth status first
        const oauthResponse = await fetch(`/api/oauth/status/${storeId}`);
        const oauthData = await oauthResponse.json();
        
        if (oauthData.success) {
          setOauthStatus(oauthData);
          
          // If authenticated, fetch product block status
          if (oauthData.authenticated) {
            try {
              const blockResponse = await fetch(`/api/ecwid/store/${storeId}/product-block`);
              const blockData = await blockResponse.json();
              if (blockData.success) {
                setProductBlock(blockData.data);
              }
            } catch (error) {
              console.error('Error fetching product block status:', error);
            }
          }
        }

        trackEvent('settings_viewed', { storeId });
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && storeId) {
      fetchSettings();
    }
  }, [isLoaded, storeId, trackEvent]);

  const handleInsertProductBlock = async () => {
    try {
      setBlockLoading(true);
      const response = await fetch(`/api/ecwid/store/${storeId}/product-block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProductBlock(data.data);
        setMessage('Product block inserted successfully!');
        setIntegrationInstructions(data.data.instructions || '');
        trackEvent('product_block_inserted', { storeId });
      } else {
        setMessage(`Failed to insert product block: ${data.error}`);
      }
    } catch (error) {
      console.error('Error inserting product block:', error);
      setMessage('Failed to insert product block');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleDeleteProductBlock = async () => {
    try {
      setBlockLoading(true);
      const response = await fetch(`/api/ecwid/store/${storeId}/product-block`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProductBlock(data.data);
        setMessage('Product block removed successfully!');
        setIntegrationInstructions('');
        trackEvent('product_block_deleted', { storeId });
      } else {
        setMessage(`Failed to remove product block: ${data.error}`);
      }
    } catch (error) {
      console.error('Error removing product block:', error);
      setMessage('Failed to remove product block');
    } finally {
      setBlockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
        <p className="ml-3 text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      
      {message && (
        <div className="alert alert-info">
          {message}
        </div>
      )}

      {/* OAuth Authentication */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Authentication</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          {oauthStatus && oauthStatus.authenticated ? (
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span>Connected to Ecwid Store ID: {oauthStatus.store?.storeId}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-600">
                Your store is not yet connected to Ecwid via OAuth. Please connect to enable full plugin functionality.
              </p>
              <OAuthButton 
                storeId={storeId}
                onSuccess={(store) => {
                  setOauthStatus({ success: true, authenticated: true, store });
                  setMessage('Successfully connected to Ecwid!');
                }}
                onError={(error) => {
                  setMessage(`Failed to connect: ${error}`);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Product Block Management */}
      {oauthStatus && oauthStatus.authenticated && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <PlusIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Product Block Management</h3>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="space-y-3">
              <p className="text-gray-600">
                Manage HTML blocks that will be inserted at the bottom of all product pages.
              </p>
              
              <div className="flex items-center space-x-4">
                {productBlock.enabled ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center text-green-600">
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      <span>Product block is active</span>
                    </div>
                    <button
                      onClick={handleDeleteProductBlock}
                      disabled={blockLoading}
                      className="btn btn-danger flex items-center"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      {blockLoading ? 'Removing...' : 'Delete Product Block'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleInsertProductBlock}
                    disabled={blockLoading}
                    className="btn btn-primary flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {blockLoading ? 'Inserting...' : 'Insert Product Block'}
                  </button>
                )}
              </div>
              
              {productBlock.enabled && productBlock.html && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2">✅ Widget Activated Successfully!</h4>
                    <p className="text-sm text-green-700 mb-3">
                      The recommendation widget is now active and will automatically appear on your product pages. 
                      The widget works seamlessly with Ecwid's single-page application navigation.
                    </p>
                    <div className="text-sm text-green-700">
                      <p className="font-medium mb-2">Features:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Automatic detection of product pages using Ecwid's Storefront JS API</li>
                        <li>Creates a div with id="1recom" for the widget container</li>
                        <li>Fetches real product data from your store via our API</li>
                        <li>Works with Ecwid's SPA navigation (no page refreshes needed)</li>
                        <li>Responsive design that matches your store's styling</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Integration Instructions:</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      To activate the widget on your store, add the generated code to your Ecwid store:
                    </p>
                    <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                      <li>Go to your Ecwid admin panel</li>
                      <li>Navigate to Settings → General → Custom Code</li>
                      <li>Add the code below to the "Footer code" section</li>
                      <li>Save the changes</li>
                      <li>Visit any product page to see the widget in action</li>
                    </ol>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Code to Add to Your Store:</h4>
                    <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto max-h-96">
                      <code>{productBlock.html}</code>
                    </pre>
                    <p className="text-xs text-gray-500 mt-2">
                      This code creates a fully automatic recommendation widget that integrates with Ecwid's SPA architecture.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;