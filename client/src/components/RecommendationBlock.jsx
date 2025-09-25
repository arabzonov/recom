import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';
import { getStoreId, getProductId, setupProductPageListener, waitForEcwidAPI } from '../utils/ecwidSDK';

/**
 * RecommendationBlock Component
 * 
 * This component creates an HTML block that can be auto-inserted on store frontend
 * product pages to display product recommendations using the "Upsells" logic.
 * The block can be toggled on/off from the app page.
 */
const RecommendationBlock = ({ storeId, productId, isEnabled = true }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEnabled) {
      initializeRecommendations();
    }
  }, [isEnabled, storeId, productId]);

  const initializeRecommendations = async () => {
    try {
      // Wait for Ecwid API to be available
      await waitForEcwidAPI();
      
      // Get store ID using proper Ecwid SDK method
      const extractedStoreId = storeId || await getStoreId();
      const extractedProductId = productId || await getProductId();
      
      if (extractedStoreId && extractedProductId) {
        // We have both IDs, fetch recommendations
        fetchRecommendations(extractedStoreId, extractedProductId);
      } else if (extractedStoreId) {
        // We have store ID but not product ID, set up listener for product pages
        setupProductPageListener((productId) => {
          fetchRecommendations(extractedStoreId, productId);
        });
      } else {
        logger.warn('Could not extract store ID from Ecwid SDK');
      }
    } catch (error) {
      logger.error('Error initializing recommendations', error);
    }
  };

  const fetchRecommendations = async (extractedStoreId, extractedProductId) => {
    const currentStoreId = extractedStoreId || storeId;
    const currentProductId = extractedProductId || productId;
    
    if (!currentStoreId || !currentProductId) return;

    setLoading(true);
    setError(null);

    try {
      logger.info('Fetching recommendations', { storeId: currentStoreId, productId: currentProductId });
      
      const response = await fetch(`/api/ecwid/recommendations/${currentStoreId}/${currentProductId}`);
      const data = await response.json();

      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
        logger.info('Recommendations fetched successfully', { 
          count: data.recommendations.length 
        });
      } else {
        setError(data.error || 'Failed to fetch recommendations');
        logger.error('Failed to fetch recommendations', data);
      }
    } catch (err) {
      setError('Network error while fetching recommendations');
      logger.error('Network error fetching recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if disabled
  if (!isEnabled) {
    return null;
  }

  // Don't render if no recommendations and not loading
  if (!loading && recommendations.length === 0 && !error) {
    return null;
  }

  return (
    <div className="ecwid-recommendation-block" style={{
      margin: '20px 0',
      padding: '20px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#f9fafb',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          You might also like
        </h3>
        <div style={{
          flex: 1,
          height: '1px',
          backgroundColor: '#e5e7eb',
          marginLeft: '12px'
        }} />
      </div>

      {loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          color: '#6b7280'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
          }} />
          Loading recommendations...
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {recommendations.map((product, index) => (
            <div key={product.ecwid_product_id || index} style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
            onClick={() => {
              // Navigate to product page
              if (product.ecwid_product_id) {
                window.location.href = `#product=${product.ecwid_product_id}`;
              }
            }}>
              {product.image_url && (
                <div style={{
                  width: '100%',
                  height: '120px',
                  marginBottom: '8px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: '#f3f4f6'
                }}>
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <h4 style={{
                margin: '0 0 4px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937',
                lineHeight: '1.4',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {product.name}
              </h4>
              
              {product.price && (
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#059669',
                  marginTop: '4px'
                }}>
                  ${parseFloat(product.price).toFixed(2)}
                </div>
              )}
              
              {product.sku && (
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '2px'
                }}>
                  SKU: {product.sku}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RecommendationBlock;
