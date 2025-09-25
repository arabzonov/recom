import React, { useState, useEffect } from 'react';
import { useEcwid } from '../hooks/useEcwid';
import logger from '../utils/logger';
import { 
  CogIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

/**
 * RecommendationSettings Component
 * 
 * This component provides settings to toggle the recommendation feature
 * on/off and configure other recommendation options.
 */
const RecommendationSettings = () => {
  const { storeId } = useEcwid();
  const [settings, setSettings] = useState({
    showUpsells: false,
    showCrossSells: false,
    showRecommendations: false,
    upsellLocations: {
      productPage: false,
      cartPage: false
    },
    crossSellLocations: {
      cartPage: false,
      checkoutPage: false
    },
    recommendationLocations: {
      categoryPage: false,
      productPage: false,
      thankYouPage: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    if (storeId) {
      fetchSettings();
    }
  }, [storeId]);

  const fetchSettings = async () => {
    if (!storeId) return;

    setLoading(true);
    setNeedsAuth(false);
    try {
      logger.info('Fetching recommendation settings', { storeId });
      
      const response = await fetch(`/api/ecwid/recommendation-settings/${storeId}`);
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        logger.info('Settings fetched successfully', data.settings);
      } else {
        if (response.status === 401 && data.error?.includes('OAuth setup')) {
          setNeedsAuth(true);
          logger.info('Store needs OAuth authentication');
        } else {
          logger.error('Failed to fetch settings', data);
        }
      }
    } catch (error) {
      logger.error('Error fetching settings', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!storeId) return;

    setSaving(true);
    setMessage(null);

    try {
      logger.info('Saving recommendation settings', { storeId, settings });
      
      const response = await fetch(`/api/ecwid/recommendation-settings/${storeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Settings saved successfully!'
        });
        logger.info('Settings saved successfully');
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to save settings'
        });
        logger.error('Failed to save settings', data);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error while saving settings'
      });
      logger.error('Error saving settings', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => {
      const newValue = !prev[key];
      const newSettings = {
        ...prev,
        [key]: newValue
      };
      
      // When enabling a type, enable all its locations by default
      if (newValue) {
        if (key === 'showUpsells') {
          newSettings.upsellLocations = {
            productPage: true,
            cartPage: true
          };
        } else if (key === 'showCrossSells') {
          newSettings.crossSellLocations = {
            cartPage: true,
            checkoutPage: true
          };
        } else if (key === 'showRecommendations') {
          newSettings.recommendationLocations = {
            categoryPage: true,
            productPage: true,
            thankYouPage: true
          };
        }
      }
      
      return newSettings;
    });
  };

  const handleLocationToggle = (type, location) => {
    setSettings(prev => ({
      ...prev,
      [`${type}Locations`]: {
        ...prev[`${type}Locations`],
        [location]: !prev[`${type}Locations`][location]
      }
    }));
  };

  const handleAuthorize = async () => {
    if (!storeId) return;

    try {
      logger.info('Starting OAuth authorization', { storeId });
      
      const response = await fetch(`/api/oauth/auth/${storeId}`);

      const data = await response.json();

      if (data.success && data.authUrl) {
        // Redirect to OAuth authorization URL
        window.location.href = data.authUrl;
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to start authorization'
        });
        logger.error('OAuth authorization failed', data);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error during authorization'
      });
      logger.error('Error starting OAuth authorization', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="spinner w-8 h-8"></div>
        <p className="ml-3 text-gray-600">Loading settings...</p>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <CogIcon className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Recommendation Settings</h2>
        </div>

        <div className="text-center py-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authorization Required</h3>
          <p className="text-gray-600 mb-6">
            Your store needs to be authorized to access recommendation settings. 
            Click the button below to complete the OAuth setup.
          </p>
          
          <button
            onClick={handleAuthorize}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Authorize Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <CogIcon className="h-6 w-6 text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Recommendation Settings</h2>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
          )}
          <span className={`text-sm ${
            message.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {message.text}
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* Upsells */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-md font-medium text-gray-900">Upsells</h4>
                  <p className="text-sm text-gray-600">
                    Show higher-priced products in the same category
                  </p>
                </div>
                <button
                  onClick={() => handleToggle('showUpsells')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.showUpsells ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.showUpsells ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.showUpsells && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Product Page</h5>
                      <p className="text-xs text-gray-600">Show upsells on product detail pages</p>
                    </div>
                    <button
                      onClick={() => handleLocationToggle('upsell', 'productPage')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.upsellLocations.productPage ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.upsellLocations.productPage ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Cart Page</h5>
                      <p className="text-xs text-gray-600">Show upsells on shopping cart page</p>
                    </div>
                    <button
                      onClick={() => handleLocationToggle('upsell', 'cartPage')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.upsellLocations.cartPage ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.upsellLocations.cartPage ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Cross-sells */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-md font-medium text-gray-900">Cross-sells</h4>
                  <p className="text-sm text-gray-600">
                    Show products frequently bought together
                  </p>
                </div>
                <button
                  onClick={() => handleToggle('showCrossSells')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.showCrossSells ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.showCrossSells ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.showCrossSells && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Cart Page</h5>
                      <p className="text-xs text-gray-600">Show cross-sells on shopping cart page</p>
                    </div>
                    <button
                      onClick={() => handleLocationToggle('crossSell', 'cartPage')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.crossSellLocations.cartPage ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.crossSellLocations.cartPage ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Checkout Page</h5>
                      <p className="text-xs text-gray-600">Show cross-sells on checkout page</p>
                    </div>
                    <button
                      onClick={() => handleLocationToggle('crossSell', 'checkoutPage')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.crossSellLocations.checkoutPage ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.crossSellLocations.checkoutPage ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-md font-medium text-gray-900">Recommendations</h4>
                  <p className="text-sm text-gray-600">
                    Show general product recommendations
                  </p>
                </div>
                <button
                  onClick={() => handleToggle('showRecommendations')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.showRecommendations ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.showRecommendations ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.showRecommendations && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Category Page</h5>
                      <p className="text-xs text-gray-600">Show recommendations on category pages</p>
                    </div>
                    <button
                      onClick={() => handleLocationToggle('recommendation', 'categoryPage')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.recommendationLocations.categoryPage ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.recommendationLocations.categoryPage ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Product Page</h5>
                      <p className="text-xs text-gray-600">Show recommendations on product pages</p>
                    </div>
                    <button
                      onClick={() => handleLocationToggle('recommendation', 'productPage')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.recommendationLocations.productPage ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.recommendationLocations.productPage ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Thank You Page</h5>
                      <p className="text-xs text-gray-600">Show recommendations after order completion</p>
                    </div>
                    <button
                      onClick={() => handleLocationToggle('recommendation', 'thankYouPage')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.recommendationLocations.thankYouPage ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.recommendationLocations.thankYouPage ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <div className="spinner w-4 h-4 mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
};

export default RecommendationSettings;
