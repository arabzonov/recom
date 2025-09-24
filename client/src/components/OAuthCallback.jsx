import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const OAuthCallback = ({ onSuccess, onError }) => {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const storeId = urlParams.get('store_id');

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}`);
          if (onError) onError(error);
          return;
        }

        if (!code || !state || !storeId) {
          setStatus('error');
          setMessage('Missing required OAuth parameters');
          if (onError) onError('Missing required OAuth parameters');
          return;
        }

        // Exchange code for access token
        const response = await fetch('/api/oauth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
            storeId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage('Successfully connected to Ecwid!');
          if (onSuccess) onSuccess(data.store);
        } else {
          setStatus('error');
          setMessage(data.error || 'OAuth callback failed');
          if (onError) onError(data.error || 'OAuth callback failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage('OAuth callback error');
        if (onError) onError(error.message);
      }
    };

    handleOAuthCallback();
  }, [onSuccess, onError]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing OAuth</h2>
          <p className="text-gray-600">Completing your connection to Ecwid...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => window.close()}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => window.close()}
              className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default OAuthCallback;