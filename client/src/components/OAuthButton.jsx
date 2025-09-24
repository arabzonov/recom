import React, { useState } from 'react';
import { 
  ArrowRightOnRectangleIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

const OAuthButton = ({ 
  storeId, 
  onSuccess, 
  onError, 
  className = '',
  children = 'Connect to Ecwid'
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthClick = async () => {
    if (!storeId) {
      onError?.('Store ID is required');
      return;
    }

    try {
      setIsLoading(true);
      
      // Get OAuth authorization URL from server
      const response = await fetch(`/api/oauth/auth/${storeId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate OAuth flow');
      }

      // Store the success and error callbacks in sessionStorage
      // so they can be called after the OAuth redirect
      if (onSuccess) {
        sessionStorage.setItem('oauth_success_callback', JSON.stringify({
          storeId,
          timestamp: Date.now()
        }));
      }
      
      if (onError) {
        sessionStorage.setItem('oauth_error_callback', JSON.stringify({
          storeId,
          timestamp: Date.now()
        }));
      }

      // Redirect to Ecwid OAuth page
      window.location.href = data.authUrl;
      
    } catch (error) {
      onError?.(error.message || 'Failed to start OAuth flow');
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleOAuthClick}
      disabled={isLoading || !storeId}
      className={`btn btn-primary ${className} ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <>
          <div className="spinner w-4 h-4 mr-2"></div>
          Connecting...
        </>
      ) : (
        <>
          <CloudIcon className="h-5 w-5 mr-2" />
          {children}
        </>
      )}
    </button>
  );
};

export default OAuthButton;
