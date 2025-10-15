import React, { useState, useEffect } from 'react';

const StoreStatsPage = () => {
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="spinner w-8 h-8"></div>
              <p className="ml-3 text-gray-600 text-lg">Loading store statistics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Statistics</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <button 
                onClick={fetchAllStats}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || !stats.stores || stats.stores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Stores Found</h2>
              <p className="text-gray-600">No stores are currently configured in the system.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatSettings = (settings) => {
    const lines = [];
    
    // Upsells
    lines.push(`Upsells: ${settings.showUpsells ? 'Enabled' : 'Disabled'}`);
    if (settings.showUpsells) {
      lines.push(`  • Product Page: ${settings.upsellLocations.productPage ? 'Yes' : 'No'}`);
      lines.push(`  • Cart Page: ${settings.upsellLocations.cartPage ? 'Yes' : 'No'}`);
    }
    
    // Cross-sells
    lines.push(`Cross-sells: ${settings.showCrossSells ? 'Enabled' : 'Disabled'}`);
    if (settings.showCrossSells) {
      lines.push(`  • Cart Page: ${settings.crossSellLocations.cartPage ? 'Yes' : 'No'}`);
      lines.push(`  • Checkout Page: ${settings.crossSellLocations.checkoutPage ? 'Yes' : 'No'}`);
    }
    
    // Recommendations
    lines.push(`Recommendations: ${settings.showRecommendations ? 'Enabled' : 'Disabled'}`);
    if (settings.showRecommendations) {
      lines.push(`  • Category Page: ${settings.recommendationLocations.categoryPage ? 'Yes' : 'No'}`);
      lines.push(`  • Product Page: ${settings.recommendationLocations.productPage ? 'Yes' : 'No'}`);
      lines.push(`  • Thank You Page: ${settings.recommendationLocations.thankYouPage ? 'Yes' : 'No'}`);
    }
    
    return lines.join('\n');
  };

  const generatePlainTextReport = () => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    let content = `1Recom Store Statistics Report\n`;
    content += `Generated: ${timestamp}\n`;
    content += `Total Stores: ${stats.total_stores}\n\n`;
    content += `${'='.repeat(60)}\n\n`;
    
    stats.stores.forEach((store, index) => {
      content += `STORE ${index + 1}: ${store.store_name.toUpperCase()}\n`;
      content += `${'='.repeat(60)}\n`;
      content += `Store ID: ${store.store_id}\n`;
      
      if (store.error) {
        content += `⚠️  ERROR: ${store.error}\n`;
      }
      
      content += `\nPRODUCT INVENTORY:\n`;
      content += `  • Total Products: ${store.product_count}\n`;
      content += `  • Products with Variants: ${store.products_with_variants}\n`;
      content += `  • Categories: ${store.category_count}\n`;
      
      content += `\nRECOMMENDATION SETTINGS:\n`;
      content += `${formatSettings(store.recommendation_settings)}\n`;
      
      content += `\n${'─'.repeat(60)}\n\n`;
    });
    
    return content;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Store Statistics Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive overview of all stores in the 1Recom system
          </p>
          <div className="mt-4 flex items-center space-x-4">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {stats.total_stores} Total Stores
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Stores</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_stores}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.stores.reduce((sum, store) => sum + store.product_count, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Categories</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.stores.reduce((sum, store) => sum + store.category_count, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Features</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.stores.reduce((sum, store) => {
                    let active = 0;
                    if (store.recommendation_settings.showUpsells) active++;
                    if (store.recommendation_settings.showCrossSells) active++;
                    if (store.recommendation_settings.showRecommendations) active++;
                    return sum + active;
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Store Cards */}
        <div className="space-y-6">
          {stats.stores.map((store, index) => (
            <div key={store.store_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {store.store_name}
                    </h3>
                    <p className="text-sm text-gray-600">Store ID: {store.store_id}</p>
                  </div>
                  {store.error ? (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium">
                      ⚠️ Error: {store.error}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                      ✓ Active
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-900">{store.product_count}</div>
                    <div className="text-sm font-medium text-blue-700">Products</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-900">{store.products_with_variants}</div>
                    <div className="text-sm font-medium text-green-700">With Variants</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-900">{store.category_count}</div>
                    <div className="text-sm font-medium text-purple-700">Categories</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recommendation Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Upsells</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        store.recommendation_settings.showUpsells 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {store.recommendation_settings.showUpsells ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cross-sells</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        store.recommendation_settings.showCrossSells 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {store.recommendation_settings.showCrossSells ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Recommendations</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        store.recommendation_settings.showRecommendations 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {store.recommendation_settings.showRecommendations ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Plain Text Report */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Plain Text Report</h3>
            <p className="text-sm text-gray-600">Copy-paste friendly format for documentation</p>
          </div>
          <div className="p-6">
            <pre className="bg-gray-900 text-green-400 p-6 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
{generatePlainTextReport()}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatePlainTextReport());
                  // You could add a toast notification here
                }}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
              >
                Copy Report
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="text-sm text-gray-500">
            Need help? Contact support at{' '}
            <a href="mailto:support@1n.ax" className="text-blue-600 hover:text-blue-800 underline">
              support@1n.ax
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreStatsPage;
