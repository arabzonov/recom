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

  // Do not render in storefront: ec.js injects the full block there
  if (typeof window !== 'undefined' && window.Ecwid) {
    return null;
  }

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

  return null;
};

export default RecommendationBlock;
