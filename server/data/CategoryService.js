import BaseDataAccess from './BaseDataAccess.js';

/**
 * Category Service - Handles category-based recommendation logic
 *
 * This service implements category-based recommendations:
 * 1. Products from the specified category (or any products for "default")
 * 2. Ordered by frequency of appearance in orders
 * 3. Fallback to most expensive products if less than 3 results
 */
class CategoryService extends BaseDataAccess {
  constructor() {
    super('categories');
  }

  /**
   * Generate recommendations for a specific category
   * @param {string} storeId - Store ID
   * @param {string} categoryId - Category ID (or "default" for global)
   * @returns {Promise<Array>} Array of recommended product IDs
   */
  async generateCategoryRecommendations(storeId, categoryId) {
    try {
      // Get all orders for this store
      const orders = await this.query(`
        SELECT product_ids 
        FROM orders 
        WHERE store_id = ?
      `, [storeId]);

      if (orders.length === 0) {
        // No orders, fallback to most expensive products
        return await this.getMostExpensiveProducts(storeId, categoryId);
      }

      // Parse order data and count product appearances
      const productAppearances = {};
      
      for (const order of orders) {
        try {
          const orderProductIds = JSON.parse(order.product_ids || '[]');
          
          // Count appearances for each product
          for (const productId of orderProductIds) {
            productAppearances[productId] = (productAppearances[productId] || 0) + 1;
          }
        } catch (error) {
        }
      }

      // Get products from the category (or all products for "default")
      let categoryProducts = [];
      if (categoryId === 'default') {
        categoryProducts = await this.query(`
          SELECT ecwid_product_id, price
          FROM products 
          WHERE store_id = ? 
            AND stock > 0
            AND price IS NOT NULL
            AND price > 0
        `, [storeId]);
      } else {
        categoryProducts = await this.query(`
          SELECT ecwid_product_id, price
          FROM products 
          WHERE store_id = ? 
            AND category_ids LIKE ?
            AND stock > 0
            AND price IS NOT NULL
            AND price > 0
        `, [storeId, `%${categoryId}%`]);
      }

      // Filter to only products that exist in our database
      const validProducts = categoryProducts.map(p => p.ecwid_product_id);
      const filteredAppearances = {};
      
      for (const [productId, count] of Object.entries(productAppearances)) {
        if (validProducts.includes(productId)) {
          filteredAppearances[productId] = count;
        }
      }

      // Sort by frequency and get top products
      const sortedByFrequency = Object.entries(filteredAppearances)
        .sort(([,a], [,b]) => b - a) // Sort by frequency descending
        .map(([productId]) => productId);

      // If we have at least 3 products from order frequency, return them
      if (sortedByFrequency.length >= 3) {
        return sortedByFrequency.slice(0, 3);
      }

      // Fallback: Get most expensive products from category
      const mostExpensive = await this.getMostExpensiveProducts(storeId, categoryId);
      
      // Combine frequency-based and price-based recommendations, avoiding duplicates
      const combined = [...sortedByFrequency];
      for (const productId of mostExpensive) {
        if (!combined.includes(productId) && combined.length < 3) {
          combined.push(productId);
        }
      }

      return combined.slice(0, 3);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get the most expensive products from a category
   * @private
   * @param {string} storeId - Store ID
   * @param {string} categoryId - Category ID (or "default" for global)
   * @returns {Promise<Array>} Array of product IDs
   */
  async getMostExpensiveProducts(storeId, categoryId) {
    let sql, params;
    
    if (categoryId === 'default') {
      sql = `
        SELECT ecwid_product_id
        FROM products 
        WHERE store_id = ? 
          AND stock > 0
          AND price IS NOT NULL
          AND price > 0
        ORDER BY price DESC
        LIMIT 3
      `;
      params = [storeId];
    } else {
      sql = `
        SELECT ecwid_product_id
        FROM products 
        WHERE store_id = ? 
          AND category_ids LIKE ?
          AND stock > 0
          AND price IS NOT NULL
          AND price > 0
        ORDER BY price DESC
        LIMIT 3
      `;
      params = [storeId, `%${categoryId}%`];
    }

    const results = await this.query(sql, params);
    return results.map(row => row.ecwid_product_id);
  }

  /**
   * Update category with recommendation IDs
   * @param {string} storeId - Store ID
   * @param {string} categoryId - Category ID
   * @param {Array} recommendations - Array of recommended product IDs
   * @returns {Promise<void>}
   */
  async updateCategoryRecommendations(storeId, categoryId, recommendations) {
    const recommendationsJson = JSON.stringify(recommendations);
    
    // Check if category already exists
    const existing = await this.get(
      'SELECT * FROM categories WHERE store_id = ? AND category_id = ?',
      [storeId, categoryId]
    );

    if (existing) {
      // Update existing category
      await this.execute(
        'UPDATE categories SET recommended_products = ? WHERE store_id = ? AND category_id = ?',
        [recommendationsJson, storeId, categoryId]
      );
    } else {
      // Create new category
      await this.execute(
        'INSERT INTO categories (store_id, category_id, recommended_products) VALUES (?, ?, ?)',
        [storeId, categoryId, recommendationsJson]
      );
    }
  }

  /**
   * Generate recommendations for all categories in a store
   * @param {string} storeId - Store ID
   * @returns {Promise<Object>} Summary of category recommendation generation
   */
  async generateAllCategoryRecommendations(storeId) {
    try {

      // Get all unique categories from products
      const categoryResults = await this.query(`
        SELECT DISTINCT category_ids
        FROM products 
        WHERE store_id = ? 
          AND category_ids IS NOT NULL 
          AND category_ids != '[]'
      `, [storeId]);

      const categories = new Set(['default']); // Always include default category
      
      for (const result of categoryResults) {
        try {
          const categoryIds = JSON.parse(result.category_ids);
          categoryIds.forEach(id => categories.add(id.toString()));
        } catch (error) {
        }
      }

      let processed = 0;
      let successful = 0;
      let errors = 0;

      for (const categoryId of categories) {
        try {
          const recommendations = await this.generateCategoryRecommendations(storeId, categoryId);
          await this.updateCategoryRecommendations(storeId, categoryId, recommendations);
          
          successful++;
        } catch (error) {
          errors++;
        }
        processed++;
      }

      const completionRate = processed > 0 ? ((successful / processed) * 100).toFixed(2) + '%' : '0.00%';


      return {
        storeId,
        totalCategories: processed,
        processed,
        successful,
        errors,
        completionRate
      };
    } catch (error) {
      return {
        storeId,
        totalCategories: 0,
        processed: 0,
        successful: 0,
        errors: 1,
        completionRate: '0.00%'
      };
    }
  }

  /**
   * Get category recommendations
   * @param {string} storeId - Store ID
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} Array of recommended product IDs
   */
  async getCategoryRecommendations(storeId, categoryId) {
    const result = await this.get(
      'SELECT recommended_products FROM categories WHERE store_id = ? AND category_id = ?',
      [storeId, categoryId]
    );

    if (!result || !result.recommended_products) {
      return [];
    }

    try {
      return JSON.parse(result.recommended_products);
    } catch (error) {
      return [];
    }
  }
}

export default CategoryService;
