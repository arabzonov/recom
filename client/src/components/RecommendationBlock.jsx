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
    <div className="recom-block">
      <div className="recom-header">
        <h3 className="recom-title">
          You might also like
        </h3>
        <div className="recom-divider" />
      </div>

      {loading && (
        <div className="recom-loading">
          <div className="recom-spinner" />
          Loading recommendations...
        </div>
      )}

      {error && (
        <div className="recom-error">
          {error}
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <div className="recom-grid">
          {recommendations.map((product, index) => (
            <div 
              key={product.ecwid_product_id || index} 
              className="recom-item"
              onClick={() => {
                // Navigate to product page
                if (product.ecwid_product_id) {
                  window.location.href = `#product=${product.ecwid_product_id}`;
                }
              }}
            >
              {product.image_url && (
                <div className="recom-image">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <h4 className="recom-name">
                {product.name}
              </h4>
              
              {product.price && (
                <div className="recom-price">
                  ${parseFloat(product.price).toFixed(2)}
                </div>
              )}
              
              <button 
                className="recom-cart-btn"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent tile click
                  // Add to cart functionality
                  if (window.Ecwid && window.Ecwid.Cart && product.ecwid_product_id) {
                    window.Ecwid.Cart.addProduct(product.ecwid_product_id);
                  }
                }}
              >
                Add to cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendationBlock;
