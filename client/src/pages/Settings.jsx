import React, { useState, useEffect } from 'react';
import { useEcwid } from '../hooks/useEcwid';
import { 
  CogIcon,
  KeyIcon,
  BellIcon,
  ShieldCheckIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const { isLoaded, storeId, error, setStoreIdAndReload, trackEvent } = useEcwid();
  const [settings, setSettings] = useState({
    storeName: '',
    clientId: '',
    clientSecret: '',
    webhookSecret: '',
    notifications: {
      email: true,
      push: false,
      sms: false
    },
    features: {
      analytics: true,
      customFields: true,
      inventoryTracking: true,
      customerInsights: true
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
      ipWhitelist: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [storeIdInput, setStoreIdInput] = useState('');
  const [isConfiguringStore, setIsConfiguringStore] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // Fetch store settings
        const response = await fetch(`/api/ecwid/store/${storeId}`);
        const data = await response.json();
        
        if (data.success) {
          setSettings(prev => ({
            ...prev,
            storeName: data.data.name || '',
            clientId: data.data.clientId || '',
            clientSecret: data.data.clientSecret || '',
            webhookSecret: data.data.webhookSecret || ''
          }));
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

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');

      // Save settings to backend
      const response = await fetch(`/api/ecwid/store/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage('Settings saved successfully!');
        trackEvent('settings_updated', { storeId });
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error saving settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section, subsection, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const handleStoreIdConfiguration = async () => {
    if (!storeIdInput.trim()) {
      setMessage('Please enter a valid store ID');
      return;
    }

    try {
      setIsConfiguringStore(true);
      setMessage('');
      
      await setStoreIdAndReload(storeIdInput.trim());
      setMessage('Store ID configured successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error configuring store ID:', error);
      setMessage('Error configuring store ID');
    } finally {
      setIsConfiguringStore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your Ecwid plugin settings
        </p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('successfully') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Store ID Configuration */}
      {!storeId && (
        <div className="card border-yellow-200 bg-yellow-50">
          <div className="card-header">
            <div className="flex items-center">
              <CloudIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-medium text-yellow-800">Store Configuration Required</h3>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="bg-yellow-100 border border-yellow-300 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Ecwid Store ID Required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      To use this plugin, you need to configure your Ecwid Store ID. 
                      This allows the plugin to connect to your Ecwid store and access the API.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label className="form-label">Ecwid Store ID</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={storeIdInput}
                  onChange={(e) => setStoreIdInput(e.target.value)}
                  className="form-input flex-1"
                  placeholder="Enter your Ecwid Store ID (e.g., 12345678)"
                />
                <button
                  onClick={handleStoreIdConfiguration}
                  disabled={isConfiguringStore || !storeIdInput.trim()}
                  className="btn btn-primary"
                >
                  {isConfiguringStore ? (
                    <>
                      <div className="spinner w-4 h-4 mr-2"></div>
                      Configuring...
                    </>
                  ) : (
                    'Configure Store'
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                You can find your Store ID in your Ecwid admin panel under Settings → General.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ecwid API Status */}
      {storeId && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <CloudIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Ecwid API Status</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Store ID</p>
                <p className="text-sm text-gray-500">{storeId}</p>
              </div>
              <div className="flex items-center">
                {isLoaded ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    Connected
                  </span>
                ) : error ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    Error
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    Loading...
                  </span>
                )}
              </div>
            </div>
            {error && (
              <div className="mt-2 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store Configuration */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <CloudIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Store Configuration</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div>
            <label className="form-label">Store Name</label>
            <input
              type="text"
              value={settings.storeName}
              onChange={(e) => setSettings(prev => ({ ...prev, storeName: e.target.value }))}
              className="form-input"
              placeholder="Enter store name"
            />
          </div>
          
          <div>
            <label className="form-label">Client ID</label>
            <input
              type="text"
              value={settings.clientId}
              onChange={(e) => setSettings(prev => ({ ...prev, clientId: e.target.value }))}
              className="form-input"
              placeholder="Enter Ecwid Client ID"
            />
          </div>
          
          <div>
            <label className="form-label">Client Secret</label>
            <input
              type="password"
              value={settings.clientSecret}
              onChange={(e) => setSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
              className="form-input"
              placeholder="Enter Ecwid Client Secret"
            />
          </div>
          
          <div>
            <label className="form-label">Webhook Secret</label>
            <input
              type="password"
              value={settings.webhookSecret}
              onChange={(e) => setSettings(prev => ({ ...prev, webhookSecret: e.target.value }))}
              className="form-input"
              placeholder="Enter webhook secret for security"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Notifications</label>
              <p className="text-sm text-gray-500">Receive notifications via email</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={(e) => handleInputChange('notifications', 'email', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Push Notifications</label>
              <p className="text-sm text-gray-500">Receive push notifications in browser</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.push}
              onChange={(e) => handleInputChange('notifications', 'push', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
              <p className="text-sm text-gray-500">Receive notifications via SMS</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.sms}
              onChange={(e) => handleInputChange('notifications', 'sms', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <CogIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Features</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Analytics</label>
              <p className="text-sm text-gray-500">Enable detailed analytics tracking</p>
            </div>
            <input
              type="checkbox"
              checked={settings.features.analytics}
              onChange={(e) => handleInputChange('features', 'analytics', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Custom Fields</label>
              <p className="text-sm text-gray-500">Enable custom product fields</p>
            </div>
            <input
              type="checkbox"
              checked={settings.features.customFields}
              onChange={(e) => handleInputChange('features', 'customFields', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Inventory Tracking</label>
              <p className="text-sm text-gray-500">Track product inventory levels</p>
            </div>
            <input
              type="checkbox"
              checked={settings.features.inventoryTracking}
              onChange={(e) => handleInputChange('features', 'inventoryTracking', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Customer Insights</label>
              <p className="text-sm text-gray-500">Enable customer behavior analytics</p>
            </div>
            <input
              type="checkbox"
              checked={settings.features.customerInsights}
              onChange={(e) => handleInputChange('features', 'customerInsights', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Security</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
              <p className="text-sm text-gray-500">Require 2FA for admin access</p>
            </div>
            <input
              type="checkbox"
              checked={settings.security.twoFactor}
              onChange={(e) => handleInputChange('security', 'twoFactor', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="form-label">Session Timeout (minutes)</label>
            <input
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
              className="form-input"
              min="5"
              max="1440"
            />
          </div>
          
          <div>
            <label className="form-label">IP Whitelist</label>
            <textarea
              value={settings.security.ipWhitelist.join('\n')}
              onChange={(e) => handleInputChange('security', 'ipWhitelist', e.target.value.split('\n').filter(ip => ip.trim()))}
              className="form-input"
              rows="3"
              placeholder="Enter IP addresses, one per line"
            />
            <p className="text-sm text-gray-500 mt-1">
              Leave empty to allow all IPs
            </p>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <KeyIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  API Key Security
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Keep your API keys secure and never share them publicly. 
                    These keys provide access to your Ecwid store data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
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

export default Settings;
