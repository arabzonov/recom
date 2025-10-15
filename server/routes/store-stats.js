import express from 'express';
import { StoreService } from '../data/index.js';
import { ProductService } from '../data/index.js';
import { CategoryService } from '../data/index.js';

const router = express.Router();

// Get statistics for all stores
router.get('/all', async (req, res) => {
  try {
    const storeService = new StoreService();
    const productService = new ProductService();
    const categoryService = new CategoryService();

    // Get all stores from database
    const allStores = await storeService.query('SELECT * FROM stores');
    
    const storesStats = [];

    for (const store of allStores) {
      try {
        const storeId = store.store_id;

        // Get product count and variants
        const productCount = await productService.count({ 
          where: 'store_id = ?', 
          params: [storeId] 
        });

        // Count products with variants (options)
        const productsWithVariants = await productService.query(`
          SELECT COUNT(*) as count 
          FROM products 
          WHERE store_id = ? 
            AND options IS NOT NULL 
            AND options != '[]' 
            AND options != ''
        `, [storeId]);

        // Get category count
        const categoryCount = await categoryService.count({ 
          where: 'store_id = ?', 
          params: [storeId] 
        });

        // Get recommendation settings
        const settings = await storeService.getRecommendationSettings(storeId);
        
        // Get store profile from Ecwid if authenticated
        let storeProfile = null;
        if (store.access_token) {
          try {
            const response = await fetch(`https://app.ecwid.com/api/v3/${storeId}/profile`, {
              headers: {
                'Authorization': `Bearer ${store.access_token}`
              }
            });
            
            if (response.ok) {
              storeProfile = await response.json();
            }
          } catch (error) {
            // Store profile fetch failed, continue without it
          }
        }

        storesStats.push({
          store_id: storeId,
          store_name: store.store_name || storeProfile?.name || 'Unknown Store',
          product_count: productCount,
          products_with_variants: productsWithVariants[0]?.count || 0,
          category_count: categoryCount,
          recommendation_settings: settings || {
            showUpsells: false,
            showCrossSells: false,
            showRecommendations: false,
            upsellLocations: { productPage: false, cartPage: false },
            crossSellLocations: { cartPage: false, checkoutPage: false },
            recommendationLocations: { categoryPage: false, productPage: false, thankYouPage: false }
          }
        });
      } catch (error) {
        // If individual store fails, add error info but continue
        storesStats.push({
          store_id: store.store_id,
          store_name: store.store_name || 'Unknown Store',
          error: error.message,
          product_count: 0,
          products_with_variants: 0,
          category_count: 0,
          recommendation_settings: {
            showUpsells: false,
            showCrossSells: false,
            showRecommendations: false,
            upsellLocations: { productPage: false, cartPage: false },
            crossSellLocations: { cartPage: false, checkoutPage: false },
            recommendationLocations: { categoryPage: false, productPage: false, thankYouPage: false }
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        total_stores: allStores.length,
        stores: storesStats
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch all stores statistics',
      details: error.message
    });
  }
});

// Get store statistics for a specific store (keep for backward compatibility)
router.get('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store ID is required' 
      });
    }

    // Get store information
    const storeService = new StoreService();
    const store = await storeService.findByStoreId(storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    // Get product count and variants
    const productService = new ProductService();
    const productCount = await productService.count({ 
      where: 'store_id = ?', 
      params: [storeId] 
    });

    // Count products with variants (options)
    const productsWithVariants = await productService.query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE store_id = ? 
        AND options IS NOT NULL 
        AND options != '[]' 
        AND options != ''
    `, [storeId]);

    // Get category count
    const categoryService = new CategoryService();
    const categoryCount = await categoryService.count({ 
      where: 'store_id = ?', 
      params: [storeId] 
    });

    // Get recommendation settings
    const settings = await storeService.getRecommendationSettings(storeId);
    
    // Get store profile from Ecwid if authenticated
    let storeProfile = null;
    if (store.access_token) {
      try {
        const response = await fetch(`https://app.ecwid.com/api/v3/${storeId}/profile`, {
          headers: {
            'Authorization': `Bearer ${store.access_token}`
          }
        });
        
        if (response.ok) {
          storeProfile = await response.json();
        }
      } catch (error) {
        // Store profile fetch failed, continue without it
      }
    }

    res.json({
      success: true,
      data: {
        store_id: storeId,
        store_name: store.store_name || storeProfile?.name || 'Unknown Store',
        product_count: productCount,
        products_with_variants: productsWithVariants[0]?.count || 0,
        category_count: categoryCount,
        recommendation_settings: settings || {
          showUpsells: false,
          showCrossSells: false,
          showRecommendations: false,
          upsellLocations: { productPage: false, cartPage: false },
          crossSellLocations: { cartPage: false, checkoutPage: false },
          recommendationLocations: { categoryPage: false, productPage: false, thankYouPage: false }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch store statistics',
      details: error.message
    });
  }
});

export default router;
