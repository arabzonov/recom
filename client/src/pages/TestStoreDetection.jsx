import React, { useState, useEffect } from 'react';
import { detectStoreId, detectStoreParameters, autoConfigureStore } from '../utils/storeDetection';

const TestStoreDetection = () => {
  const [detectedStoreId, setDetectedStoreId] = useState(null);
  const [storeParameters, setStoreParameters] = useState(null);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    runDetectionTests();
  }, []);

  const runDetectionTests = () => {
    const results = [];
    
    // Test 1: Basic store ID detection
    const storeId = detectStoreId();
    setDetectedStoreId(storeId);
    results.push({
      test: 'Store ID Detection',
      result: storeId ? `Found: ${storeId}` : 'Not found',
      success: !!storeId
    });
    
    // Test 2: Full parameter detection
    const params = detectStoreParameters();
    setStoreParameters(params);
    results.push({
      test: 'Parameter Detection',
      result: params ? `Found ${Object.keys(params).length} parameters` : 'No parameters found',
      success: !!params
    });
    
    // Test 3: Auto-configuration
    autoConfigureStore().then(config => {
      results.push({
        test: 'Auto-Configuration',
        result: config ? 'Successfully configured' : 'Configuration failed',
        success: !!config
      });
      setTestResults(results);
    });
    
    setTestResults(results);
  };

  const addTestStoreId = () => {
    // Add a test store ID to localStorage for testing
    localStorage.setItem('ecwid_store_id', 'test-store-123');
    runDetectionTests();
  };

  const clearTestData = () => {
    localStorage.removeItem('ecwid_store_id');
    localStorage.removeItem('ecwid_store_config');
    localStorage.removeItem('ecwid_store_configured');
    runDetectionTests();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Store Detection Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detection Results */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold">Detection Results</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Detected Store ID:</label>
                <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                  {detectedStoreId || 'None detected'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Store Parameters:</label>
                <pre className="mt-1 text-xs text-gray-900 bg-gray-100 p-2 rounded overflow-auto">
                  {storeParameters ? JSON.stringify(storeParameters, null, 2) : 'None detected'}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold">Test Controls</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <button 
                onClick={addTestStoreId}
                className="btn btn-primary w-full"
              >
                Add Test Store ID
              </button>
              
              <button 
                onClick={clearTestData}
                className="btn btn-secondary w-full"
              >
                Clear Test Data
              </button>
              
              <button 
                onClick={runDetectionTests}
                className="btn btn-outline w-full"
              >
                Run Tests Again
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="text-xl font-semibold">Test Results</h2>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{result.test}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{result.result}</span>
                  <span className={`badge ${result.success ? 'badge-success' : 'badge-danger'}`}>
                    {result.success ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="text-xl font-semibold">How to Test</h2>
        </div>
        <div className="card-body">
          <div className="prose max-w-none">
            <p>To test the store detection functionality:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Add a store ID to localStorage using the "Add Test Store ID" button</li>
              <li>Add URL parameters like <code>?storeId=your-store-id</code> to the URL</li>
              <li>Add a script tag with <code>data-ecwid-store-id="your-store-id"</code></li>
              <li>Set the store ID in the Ecwid global object</li>
            </ol>
            <p className="mt-4">
              The system will automatically detect the store ID from multiple sources and configure the store accordingly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestStoreDetection;
