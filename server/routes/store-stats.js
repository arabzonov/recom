import express from 'express';
import { StoreService } from '../data/index.js';
import { ProductService } from '../data/index.js';
import { CategoryService } from '../data/index.js';

const router = express.Router();

// Get store statistics
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
