import React, { useState, useEffect } from 'react';
import { useEcwid } from '../hooks/useEcwid';

const StoreStats = () => {
  const { storeId } = useEcwid();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (storeId) {
      fetchStats();
    }
  }, [storeId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/store-stats/${storeId}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to fetch store statistics');
      }
    } catch (err) {
      setError('Network error while fetching statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Store Statistics</h2>
        <div className="flex items-center justify-center py-8">
          <div className="spinner w-6 h-6"></div>
          <p className="ml-3 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Store Statistics</h2>
        <div className="text-center py-8">
          <p className="text-red-600">Error: {error}</p>
          <button 
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Store Statistics</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">No statistics available</p>
        </div>
      </div>
    );
  }

  const formatSettings = (settings) => {
    const lines = [];
    
    // Upsells
    lines.push(`Upsells: ${settings.showUpsells ? 'Enabled' : 'Disabled'}`);
    if (settings.showUpsells) {
      lines.push(`  - Product Page: ${settings.upsellLocations.productPage ? 'Yes' : 'No'}`);
      lines.push(`  - Cart Page: ${settings.upsellLocations.cartPage ? 'Yes' : 'No'}`);
    }
    
    // Cross-sells
    lines.push(`Cross-sells: ${settings.showCrossSells ? 'Enabled' : 'Disabled'}`);
    if (settings.showCrossSells) {
      lines.push(`  - Cart Page: ${settings.crossSellLocations.cartPage ? 'Yes' : 'No'}`);
      lines.push(`  - Checkout Page: ${settings.crossSellLocations.checkoutPage ? 'Yes' : 'No'}`);
    }
    
    // Recommendations
    lines.push(`Recommendations: ${settings.showRecommendations ? 'Enabled' : 'Disabled'}`);
    if (settings.showRecommendations) {
      lines.push(`  - Category Page: ${settings.recommendationLocations.categoryPage ? 'Yes' : 'No'}`);
      lines.push(`  - Product Page: ${settings.recommendationLocations.productPage ? 'Yes' : 'No'}`);
      lines.push(`  - Thank You Page: ${settings.recommendationLocations.thankYouPage ? 'Yes' : 'No'}`);
    }
    
    return lines.join('\n');
  };

  const plainTextContent = `Store Name: ${stats.store_name}
Store ID: ${stats.store_id}

Products: ${stats.product_count}
Products with Variants: ${stats.products_with_variants}
Categories: ${stats.category_count}

Recommendation Display Settings:
${formatSettings(stats.recommendation_settings)}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Store Statistics</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Store Name</h3>
            <p className="text-lg font-semibold text-gray-900">{stats.store_name}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Store ID</h3>
            <p className="text-lg font-semibold text-gray-900">{stats.store_id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600 uppercase tracking-wide">Products</h3>
            <p className="text-2xl font-bold text-blue-900">{stats.product_count}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 uppercase tracking-wide">With Variants</h3>
            <p className="text-2xl font-bold text-green-900">{stats.products_with_variants}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600 uppercase tracking-wide">Categories</h3>
            <p className="text-2xl font-bold text-purple-900">{stats.category_count}</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-3">Recommendation Display Settings</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="font-medium text-gray-700">Upsells:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                stats.recommendation_settings.showUpsells 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {stats.recommendation_settings.showUpsells ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {stats.recommendation_settings.showUpsells && (
              <div className="ml-4 space-y-1">
                <div className="flex items-center">
                  <span className="text-gray-600">Product Page:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    stats.recommendation_settings.upsellLocations.productPage 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {stats.recommendation_settings.upsellLocations.productPage ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600">Cart Page:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    stats.recommendation_settings.upsellLocations.cartPage 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {stats.recommendation_settings.upsellLocations.cartPage ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <span className="font-medium text-gray-700">Cross-sells:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                stats.recommendation_settings.showCrossSells 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {stats.recommendation_settings.showCrossSells ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {stats.recommendation_settings.showCrossSells && (
              <div className="ml-4 space-y-1">
                <div className="flex items-center">
                  <span className="text-gray-600">Cart Page:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    stats.recommendation_settings.crossSellLocations.cartPage 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {stats.recommendation_settings.crossSellLocations.cartPage ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600">Checkout Page:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    stats.recommendation_settings.crossSellLocations.checkoutPage 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {stats.recommendation_settings.crossSellLocations.checkoutPage ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <span className="font-medium text-gray-700">Recommendations:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                stats.recommendation_settings.showRecommendations 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {stats.recommendation_settings.showRecommendations ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {stats.recommendation_settings.showRecommendations && (
              <div className="ml-4 space-y-1">
                <div className="flex items-center">
                  <span className="text-gray-600">Category Page:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    stats.recommendation_settings.recommendationLocations.categoryPage 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {stats.recommendation_settings.recommendationLocations.categoryPage ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600">Product Page:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    stats.recommendation_settings.recommendationLocations.productPage 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {stats.recommendation_settings.recommendationLocations.productPage ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600">Thank You Page:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    stats.recommendation_settings.recommendationLocations.thankYouPage 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {stats.recommendation_settings.recommendationLocations.thankYouPage ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-3">Plain Text Version</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
{plainTextContent}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default StoreStats;
