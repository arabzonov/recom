import express from 'express';
import { StoreService, ProductService } from '../data/index.js';
import RecommendationService from '../data/RecommendationService.js';

const router = express.Router();

// Initialize services
const storeService = new StoreService();
const productService = new ProductService();
const recommendationService = new RecommendationService();

// Middleware to get store credentials
const getStoreCredentials = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const store = await storeService.findByStoreId(storeId);
    
    if (!store) {
      return res.status(401).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
    req.store = store;
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Error getting store credentials',
      details: error.message
    });
  }
};

// Get recommendations for a specific product
router.get('/:storeId/:productId', getStoreCredentials, async (req, res) => {
  try {
    const { storeId, productId } = req.params;
    
    // Get product recommendations
    const recommendations = await recommendationService.getProductRecommendations(storeId, productId);
    
    res.json({
      success: true,
      recommendations: recommendations
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch recommendations',
      details: error.message
    });
  }
});

// Generate recommendations for a specific product
router.post('/:storeId/:productId/generate', getStoreCredentials, async (req, res) => {
  try {
    const { storeId, productId } = req.params;
    
    // Generate recommendations
    const recommendations = await recommendationService.generateUpsellRecommendations(storeId, productId);
    
    res.json({
      success: true,
      recommendations: recommendations,
      message: 'Recommendations generated successfully'
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate recommendations',
      details: error.message
    });
  }
});

// Generate recommendations for all products in a store
router.post('/:storeId/generate-all', getStoreCredentials, async (req, res) => {
  try {
    const { storeId } = req.params;
    
    // Generate recommendations for all products
    const summary = await recommendationService.generateAllRecommendations(storeId);
    
    res.json({
      success: true,
      summary: summary,
      message: 'Recommendations generated for all products'
    });
  } catch (error) {
    console.error('Error generating all recommendations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate recommendations',
      details: error.message
    });
  }
});

export default router;
