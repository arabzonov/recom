import React, { useState, useEffect } from 'react';
import { useEcwid } from '../hooks/useEcwid';
import OAuthButton from '../components/OAuthButton';
import { 
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const { isLoaded, storeId, trackEvent } = useEcwid();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [oauthStatus, setOauthStatus] = useState(null);

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
    </div>
  );
};

export default Settings;