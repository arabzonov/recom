import express from 'express';
import { StoreService } from '../data/index.js';

const router = express.Router();

// Initialize services
const storeService = new StoreService();

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

// Get recommendation settings for a store
router.get('/:storeId', getStoreCredentials, async (req, res) => {
  try {
    const { storeId } = req.params;
    
    // Default settings
    const defaultSettings = {
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
    };
    
    // Get settings from stores table
    const settings = await storeService.getRecommendationSettings(storeId) || defaultSettings;
    
    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('Error fetching recommendation settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch settings',
      details: error.message
    });
  }
});

// Update recommendation settings for a store
router.post('/:storeId', getStoreCredentials, async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = req.body;
    
    // Validate settings
    const validSettings = {
      showUpsells: Boolean(settings.showUpsells),
      showCrossSells: Boolean(settings.showCrossSells),
      showRecommendations: Boolean(settings.showRecommendations),
      upsellLocations: {
        productPage: Boolean(settings.upsellLocations?.productPage),
        cartPage: Boolean(settings.upsellLocations?.cartPage)
      },
      crossSellLocations: {
        cartPage: Boolean(settings.crossSellLocations?.cartPage),
        checkoutPage: Boolean(settings.crossSellLocations?.checkoutPage)
      },
      recommendationLocations: {
        categoryPage: Boolean(settings.recommendationLocations?.categoryPage),
        productPage: Boolean(settings.recommendationLocations?.productPage),
        thankYouPage: Boolean(settings.recommendationLocations?.thankYouPage)
      }
    };
    
    // Update store with new settings
    await storeService.updateRecommendationSettings(storeId, validSettings);
    
    res.json({
      success: true,
      settings: validSettings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating recommendation settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update settings',
      details: error.message
    });
  }
});

export default router;
