import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const storeId = searchParams.get('store_id');

        console.log('🔄 OAuth callback received:', { code, state, error, storeId });

        if (error) {
          console.error('❌ OAuth error:', error);
          setStatus('error');
          setMessage(`OAuth error: ${error}`);
          setTimeout(() => navigate('/settings?error=oauth_failed'), 2000);
          return;
        }

        if (!code || !state || !storeId) {
          console.error('❌ Missing required OAuth parameters');
          setStatus('error');
          setMessage('Missing required OAuth parameters');
          setTimeout(() => navigate('/settings?error=oauth_invalid'), 2000);
          return;
        }

        // Redirect to server OAuth callback to process the authorization code
        setMessage('Processing OAuth callback...');
        
        // Build the server callback URL with query parameters
        const serverCallbackUrl = `/api/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        
        // Redirect to server callback - the server will handle the OAuth exchange and redirect back
        window.location.href = serverCallbackUrl;

      } catch (error) {
        console.error('❌ OAuth callback error:', error);
        setStatus('error');
        setMessage(`Authentication failed: ${error.message}`);
        setTimeout(() => navigate('/settings?error=oauth_callback_failed'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="mb-4">
          <div className="text-4xl mb-2">{getStatusIcon()}</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            OAuth Authentication
          </h2>
          <p className={`text-sm ${getStatusColor()}`}>
            {message}
          </p>
        </div>
        
        {status === 'processing' && (
          <div className="flex justify-center">
            <div className="spinner w-6 h-6"></div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="mt-4">
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
