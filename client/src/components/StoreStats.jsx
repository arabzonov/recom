import React, { useState, useEffect } from 'react';

const StoreStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/store-stats/all');
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
            onClick={fetchAllStats}
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Stores Statistics</h2>
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

  const generatePlainTextContent = () => {
    let content = `Total Stores: ${stats.total_stores}\n\n`;
    
    stats.stores.forEach((store, index) => {
      content += `=== Store ${index + 1} ===\n`;
      content += `Store Name: ${store.store_name}\n`;
      content += `Store ID: ${store.store_id}\n`;
      
      if (store.error) {
        content += `Error: ${store.error}\n`;
      }
      
      content += `\nProducts: ${store.product_count}\n`;
      content += `Products with Variants: ${store.products_with_variants}\n`;
      content += `Categories: ${store.category_count}\n\n`;
      
      content += `Recommendation Display Settings:\n`;
      content += `${formatSettings(store.recommendation_settings)}\n\n`;
    });
    
    return content;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        All Stores Statistics ({stats.total_stores} stores)
      </h2>
      
      <div className="space-y-6">
        {stats.stores.map((store, index) => (
          <div key={store.store_id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {store.store_name} (ID: {store.store_id})
              </h3>
              {store.error && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                  Error: {store.error}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-blue-600 uppercase tracking-wide">Products</h4>
                <p className="text-xl font-bold text-blue-900">{store.product_count}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-green-600 uppercase tracking-wide">With Variants</h4>
                <p className="text-xl font-bold text-green-900">{store.products_with_variants}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-purple-600 uppercase tracking-wide">Categories</h4>
                <p className="text-xl font-bold text-purple-900">{store.category_count}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Recommendation Settings</h4>
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  store.recommendation_settings.showUpsells 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  Upsells: {store.recommendation_settings.showUpsells ? 'Enabled' : 'Disabled'}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  store.recommendation_settings.showCrossSells 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  Cross-sells: {store.recommendation_settings.showCrossSells ? 'Enabled' : 'Disabled'}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  store.recommendation_settings.showRecommendations 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  Recommendations: {store.recommendation_settings.showRecommendations ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-3">Plain Text Version</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap max-h-96">
{generatePlainTextContent()}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default StoreStats;
