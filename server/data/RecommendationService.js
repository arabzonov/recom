import BaseDataAccess from './BaseDataAccess.js';

/**
 * Recommendation Service - Handles all product recommendation logic
 *
 * This service implements a hierarchical recommendation strategy:
 * 1. Cross-sell: Products frequently bought together based on order history
 * 2. Upsell: Products at least 20% more expensive in same category
 * 3. Category fallback: Most expensive product in same category if no upsells
 * 4. Global fallback: Most expensive product globally if no category matches
 */
class RecommendationService extends BaseDataAccess {
  constructor() {
    super('products');
  }

  /**
   * Configuration constants for recommendation logic
   */
  static get CONFIG() {
    return {
      UPSELL_PRICE_MULTIPLIER: 1.2, // 20% more expensive
      MAX_RECOMMENDATIONS: 3,
      MIN_PRICE_DIFFERENCE: 0.01 // Minimum price difference to consider
    };
  }

  /**
   * Generate upsell recommendations for a specific product
   * @param {string} storeId - Store ID
   * @param {string} productId - Product ID to generate recommendations for
   * @returns {Promise<Array>} Array of recommended product IDs
   */
  async generateUpsellRecommendations(storeId, productId) {
    try {
      // Get the source product
      const sourceProduct = await this.getSourceProduct(storeId, productId);
      if (!sourceProduct) {
        console.warn(`Source product not found: ${productId} in store ${storeId}`);
        return [];
      }

      // Execute recommendation strategy
      const recommendations = await this.executeRecommendationStrategy(sourceProduct, storeId);
      
      // Update the product with recommendations
      await this.updateProductRecommendations(storeId, productId, recommendations);
      
      // Return combined recommendations for backward compatibility
      return [...recommendations.crossSell, ...recommendations.upsell];
    } catch (error) {
      console.error(`Error generating upsell recommendations for product ${productId}:`, error);
      return [];
    }
  }

  /**
   * Get the source product for recommendations
   * @private
   * @param {string} storeId - Store ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object|null>} Source product or null
   */
  async getSourceProduct(storeId, productId) {
    return await this.get(
      'SELECT * FROM products WHERE store_id = ? AND ecwid_product_id = ?',
      [storeId, productId]
    );
  }

  /**
   * Execute the hierarchical recommendation strategy
   * @private
   * @param {Object} sourceProduct - Source product data
   * @param {string} storeId - Store ID
   * @returns {Promise<Array>} Array of recommended product IDs
   */
  async executeRecommendationStrategy(sourceProduct, storeId) {
    const { price: sourcePrice, category_ids: sourceCategoryIds, ecwid_product_id: sourceProductId } = sourceProduct;
    
    // Parse category IDs from JSON string
    let sourceCategories = [];
    try {
      sourceCategories = sourceCategoryIds ? JSON.parse(sourceCategoryIds) : [];
    } catch (error) {
      console.warn(`Failed to parse category_ids for product ${sourceProductId}:`, error.message);
    }
    
    let crossSellRecommendations = [];
    let upsellRecommendations = [];
    let strategyUsed = [];
    
    // Strategy 1: Find cross-sell products (based on order history)
    crossSellRecommendations = await this.findCrossSellProducts(sourceProductId, storeId, []);
    if (crossSellRecommendations.length > 0) {
      strategyUsed.push(`cross-sell(${crossSellRecommendations.length})`);
    }

    // Cross-sell fallback: If we don't have 3 cross-sell recommendations, use upsell logic to fill the gap
    if (crossSellRecommendations.length < RecommendationService.CONFIG.MAX_RECOMMENDATIONS) {
      const crossSellFallback = await this.findUpsellProducts(sourcePrice, sourceCategories, sourceProductId, storeId, crossSellRecommendations);
      const needed = RecommendationService.CONFIG.MAX_RECOMMENDATIONS - crossSellRecommendations.length;
      const toAdd = crossSellFallback.slice(0, needed);
      crossSellRecommendations.push(...toAdd);
      if (toAdd.length > 0) {
        strategyUsed.push(`cross-sell-fallback(${toAdd.length})`);
      }
    }

    // Cross-sell category fallback: If we still need more cross-sell recommendations
    if (crossSellRecommendations.length < RecommendationService.CONFIG.MAX_RECOMMENDATIONS) {
      const crossSellCategoryFallback = await this.findMostExpensiveInCategory(sourceCategories, sourceProductId, storeId, crossSellRecommendations);
      const needed = RecommendationService.CONFIG.MAX_RECOMMENDATIONS - crossSellRecommendations.length;
      const toAdd = crossSellCategoryFallback.slice(0, needed);
      crossSellRecommendations.push(...toAdd);
      if (toAdd.length > 0) {
        strategyUsed.push(`cross-sell-category-fallback(${toAdd.length})`);
      }
    }

    // Cross-sell global fallback: If we still need more cross-sell recommendations
    if (crossSellRecommendations.length < RecommendationService.CONFIG.MAX_RECOMMENDATIONS) {
      const crossSellGlobalFallback = await this.findMostExpensiveGlobally(sourceProductId, storeId, crossSellRecommendations);
      const needed = RecommendationService.CONFIG.MAX_RECOMMENDATIONS - crossSellRecommendations.length;
      const toAdd = crossSellGlobalFallback.slice(0, needed);
      crossSellRecommendations.push(...toAdd);
      if (toAdd.length > 0) {
        strategyUsed.push(`cross-sell-global-fallback(${toAdd.length})`);
      }
    }

    // Strategy 2: Find upsell products (20%+ more expensive in same category)
    // Don't exclude cross-sell products from upsell - they should be separate
    const upsellCandidates = await this.findUpsellProducts(sourcePrice, sourceCategories, sourceProductId, storeId, []);
    upsellRecommendations.push(...upsellCandidates);
    if (upsellCandidates.length > 0) {
      strategyUsed.push(`upsell(${upsellCandidates.length})`);
    }

    // Strategy 3: Find most expensive product in same category (if we still need more upsells)
    if (upsellRecommendations.length < RecommendationService.CONFIG.MAX_RECOMMENDATIONS) {
      const categoryRecommendations = await this.findMostExpensiveInCategory(sourceCategories, sourceProductId, storeId, upsellRecommendations);
      const needed = RecommendationService.CONFIG.MAX_RECOMMENDATIONS - upsellRecommendations.length;
      const toAdd = categoryRecommendations.slice(0, needed);
      upsellRecommendations.push(...toAdd);
      if (toAdd.length > 0) {
        strategyUsed.push(`category(${toAdd.length})`);
      }
    }

    // Strategy 4: Find most expensive product globally (if we still need more upsells)
    if (upsellRecommendations.length < RecommendationService.CONFIG.MAX_RECOMMENDATIONS) {
      const globalRecommendations = await this.findMostExpensiveGlobally(sourceProductId, storeId, upsellRecommendations);
      const needed = RecommendationService.CONFIG.MAX_RECOMMENDATIONS - upsellRecommendations.length;
      const toAdd = globalRecommendations.slice(0, needed);
      upsellRecommendations.push(...toAdd);
      if (toAdd.length > 0) {
        strategyUsed.push(`global(${toAdd.length})`);
      }
    }
    
    console.log(`Found ${crossSellRecommendations.length} cross-sell + ${upsellRecommendations.length} upsell recommendations for product ${sourceProductId} using: ${strategyUsed.join(', ')}`);
    return {
      crossSell: crossSellRecommendations,
      upsell: upsellRecommendations
    };
  }

  /**
   * Find cross-sell products based on order history
   * @private
   * @param {string} sourceProductId - Source product ID
   * @param {string} storeId - Store ID
   * @param {Array} excludeList - Additional product IDs to exclude
   * @returns {Promise<Array>} Array of product IDs
   */
  async findCrossSellProducts(sourceProductId, storeId, excludeList = []) {
    // Get all orders for this store
    const orders = await this.query(`
      SELECT product_ids 
      FROM orders 
      WHERE store_id = ?
    `, [storeId]);

    if (orders.length === 0) {
      return [];
    }

    // Parse order data and find products that were bought together with the source product
    const productCoOccurrences = {};
    
    for (const order of orders) {
      try {
        const orderProductIds = JSON.parse(order.product_ids || '[]');
        
        // If the source product is in this order, count co-occurrences with other products
        if (orderProductIds.includes(sourceProductId)) {
          for (const productId of orderProductIds) {
            if (productId !== sourceProductId && !excludeList.includes(productId)) {
              productCoOccurrences[productId] = (productCoOccurrences[productId] || 0) + 1;
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to parse order data for cross-sell analysis:`, error.message);
      }
    }

    // Sort by frequency and return top products
    const sortedProducts = Object.entries(productCoOccurrences)
      .sort(([,a], [,b]) => b - a) // Sort by frequency descending
      .map(([productId]) => productId)
      .slice(0, RecommendationService.CONFIG.MAX_RECOMMENDATIONS);

    return sortedProducts;
  }

  /**
   * Find products that are at least 20% more expensive in the same category
   * @private
   * @param {number} sourcePrice - Source product price
   * @param {Array} sourceCategories - Array of category IDs
   * @param {string} excludeProductId - Product ID to exclude
   * @param {string} storeId - Store ID
   * @param {Array} excludeList - Additional product IDs to exclude
   * @returns {Promise<Array>} Array of product IDs
   */
  async findUpsellProducts(sourcePrice, sourceCategories, excludeProductId, storeId, excludeList = []) {
    if (!sourcePrice || sourcePrice <= 0 || !sourceCategories || sourceCategories.length === 0) {
      return [];
    }

    const minUpsellPrice = sourcePrice * RecommendationService.CONFIG.UPSELL_PRICE_MULTIPLIER;
    
    // Create a condition to check if any category matches using simple LIKE patterns
    // Numbers in JSON arrays are not quoted, so search without quotes
    const categoryConditions = sourceCategories.map(() => 'category_ids LIKE ?').join(' OR ');
    const categoryParams = sourceCategories.map(catId => `%${catId}%`);
    
    
    // Build exclusion conditions
    const allExclusions = [excludeProductId, ...excludeList];
    const exclusionConditions = allExclusions.map(() => 'ecwid_product_id != ?').join(' AND ');

    const sql = `
      SELECT ecwid_product_id 
      FROM products 
      WHERE store_id = ? 
        AND (${categoryConditions})
        AND price >= ? 
        AND price > ?
        AND ${exclusionConditions}
        AND stock > 0
      ORDER BY price ASC
      LIMIT ?
    `;

    const results = await this.query(sql, [
      storeId,
      ...categoryParams,
      minUpsellPrice,
      sourcePrice + RecommendationService.CONFIG.MIN_PRICE_DIFFERENCE,
      ...allExclusions,
      RecommendationService.CONFIG.MAX_RECOMMENDATIONS
    ]);

    return results.map(row => row.ecwid_product_id);
  }

  /**
   * Find the most expensive product in the same category
   * @private
   * @param {Array} sourceCategories - Array of category IDs
   * @param {string} excludeProductId - Product ID to exclude
   * @param {string} storeId - Store ID
   * @param {Array} excludeList - Additional product IDs to exclude
   * @returns {Promise<Array>} Array of product IDs
   */
  async findMostExpensiveInCategory(sourceCategories, excludeProductId, storeId, excludeList = []) {
    if (!sourceCategories || sourceCategories.length === 0) {
      return [];
    }

    // Create a condition to check if any category matches using simple LIKE patterns
    // Numbers in JSON arrays are not quoted, so search without quotes
    const categoryConditions = sourceCategories.map(() => 'category_ids LIKE ?').join(' OR ');
    const categoryParams = sourceCategories.map(catId => `%${catId}%`);

    // Build exclusion conditions
    const allExclusions = [excludeProductId, ...excludeList];
    const exclusionConditions = allExclusions.map(() => 'ecwid_product_id != ?').join(' AND ');

    const sql = `
      SELECT ecwid_product_id 
      FROM products 
      WHERE store_id = ? 
        AND (${categoryConditions})
        AND ${exclusionConditions}
        AND stock > 0
        AND price IS NOT NULL
        AND price > 0
      ORDER BY price DESC
      LIMIT ?
    `;

    const results = await this.query(sql, [
      storeId,
      ...categoryParams,
      ...allExclusions,
      RecommendationService.CONFIG.MAX_RECOMMENDATIONS
    ]);

    return results.map(row => row.ecwid_product_id);
  }

  /**
   * Find the most expensive product globally
   * @private
   * @param {string} excludeProductId - Product ID to exclude
   * @param {string} storeId - Store ID
   * @param {Array} excludeList - Additional product IDs to exclude
   * @returns {Promise<Array>} Array of product IDs
   */
  async findMostExpensiveGlobally(excludeProductId, storeId, excludeList = []) {
    // Build exclusion conditions
    const allExclusions = [excludeProductId, ...excludeList];
    const exclusionConditions = allExclusions.map(() => 'ecwid_product_id != ?').join(' AND ');

    const sql = `
      SELECT ecwid_product_id 
      FROM products 
      WHERE store_id = ? 
        AND ${exclusionConditions}
        AND stock > 0
        AND price IS NOT NULL
        AND price > 0
      ORDER BY price DESC
      LIMIT ?
    `;

    const results = await this.query(sql, [
      storeId,
      ...allExclusions,
      RecommendationService.CONFIG.MAX_RECOMMENDATIONS
    ]);

    return results.map(row => row.ecwid_product_id);
  }

  /**
   * Update product with recommendation IDs
   * @private
   * @param {string} storeId - Store ID
   * @param {string} productId - Product ID
   * @param {Object} recommendations - Object with crossSell and upsell arrays
   * @returns {Promise<void>}
   */
  async updateProductRecommendations(storeId, productId, recommendations) {
    const crossSellJson = JSON.stringify(recommendations.crossSell || []);
    const upsellJson = JSON.stringify(recommendations.upsell || []);
    
    await this.execute(
      'UPDATE products SET cross_sells = ?, upsells = ? WHERE store_id = ? AND ecwid_product_id = ?',
      [crossSellJson, upsellJson, storeId, productId]
    );
  }

  /**
   * Generate recommendations for all products in a store
   * @param {string} storeId - Store ID
   * @returns {Promise<Object>} Summary of recommendation generation
   */
  async generateAllRecommendations(storeId) {
    console.log(`Starting recommendation generation for store ${storeId}`);
    
    // Get all products for the store
    const products = await this.query(
      'SELECT ecwid_product_id FROM products WHERE store_id = ?',
      [storeId]
    );

    let processed = 0;
    let successful = 0;
    let errors = 0;

    for (const product of products) {
      try {
        processed++;
        const recommendations = await this.generateUpsellRecommendations(storeId, product.ecwid_product_id);
        
        if (recommendations.length > 0) {
          successful++;
        }
        
        // Log progress every 10 products
        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${products.length} products for store ${storeId}`);
        }
      } catch (error) {
        console.error(`Error processing product ${product.ecwid_product_id}:`, error);
        errors++;
      }
    }

    const summary = {
      storeId,
      totalProducts: products.length,
      processed,
      successful,
      errors,
      completionRate: products.length > 0 ? (successful / products.length * 100).toFixed(2) + '%' : '0%'
    };

    console.log(`Recommendation generation completed for store ${storeId}:`, summary);
    return summary;
  }

  /**
   * Get recommendations for a specific product
   * @param {string} storeId - Store ID
   * @param {string} productId - Product ID
   * @returns {Promise<Array>} Array of recommended product details
   */
  async getProductRecommendations(storeId, productId) {
    const product = await this.get(
      'SELECT upsell_recommendations FROM products WHERE store_id = ? AND ecwid_product_id = ?',
      [storeId, productId]
    );

    if (!product || !product.upsell_recommendations) {
      return [];
    }

    const recommendationIds = JSON.parse(product.upsell_recommendations);
    
    if (recommendationIds.length === 0) {
      return [];
    }

    // Get full product details for recommendations
    const placeholders = recommendationIds.map(() => '?').join(',');
    const sql = `
      SELECT ecwid_product_id, name, price, image_url, sku
      FROM products 
      WHERE store_id = ? AND ecwid_product_id IN (${placeholders})
      ORDER BY price DESC
    `;

    return await this.query(sql, [storeId, ...recommendationIds]);
  }

}

export default RecommendationService;
