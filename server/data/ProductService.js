import BaseDataAccess from './BaseDataAccess.js';
import RecommendationService from './RecommendationService.js';

class ProductService extends BaseDataAccess {
  constructor() {
    super('products');
    this.recommendationService = new RecommendationService();
  }

  /**
   * Find product by store ID and Ecwid product ID
   * @param {string} storeId - Store ID
   * @param {string} ecwidProductId - Ecwid product ID
   * @returns {Promise<Object|null>} Product record
   */
  async findByStoreAndEcwidId(storeId, ecwidProductId) {
    return await this.get(
      'SELECT * FROM products WHERE store_id = ? AND ecwid_product_id = ?',
      [storeId, ecwidProductId]
    );
  }

  /**
   * Find all products for a store
   * @param {string} storeId - Store ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of products
   */
  async findByStoreId(storeId, options = {}) {
    const { limit, offset, orderBy = 'id DESC' } = options;
    let sql = 'SELECT * FROM products WHERE store_id = ?';
    const params = [storeId];

    if (orderBy) {
<<<<<<< HEAD
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset) {
      sql += ` OFFSET ?`;
      params.push(offset);
=======
      // Validate orderBy clause to prevent SQL injection
      if (typeof orderBy !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*(\s+(ASC|DESC))?$/.test(orderBy.trim())) {
        throw new Error('Invalid orderBy clause format. Use format: "column ASC" or "column DESC"');
      }
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      // Validate limit to prevent SQL injection
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 0 || limitNum > 10000) {
        throw new Error('Invalid limit value. Must be a number between 0 and 10000');
      }
      sql += ` LIMIT ?`;
      params.push(limitNum);
    }
    if (offset) {
      // Validate offset to prevent SQL injection
      const offsetNum = parseInt(offset);
      if (isNaN(offsetNum) || offsetNum < 0) {
        throw new Error('Invalid offset value. Must be a non-negative number');
      }
      sql += ` OFFSET ?`;
      params.push(offsetNum);
>>>>>>> main
    }

    return await this.query(sql, params);
  }

  /**
   * Create or update product
   * @param {Object} productData - Product data
   * @param {boolean} generateRecommendations - Whether to generate recommendations (default: false)
   * @returns {Promise<Object>} Product record
   */
  async createOrUpdate(productData, generateRecommendations = false) {
    const {
      storeId,
      ecwidProductId,
<<<<<<< HEAD
      price,
      stock,
=======
      name,
      price,
      stock,
      sku,
      imageUrl,
>>>>>>> main
      categoryIds
    } = productData;

    const categoryIdsJson = JSON.stringify(categoryIds || []);

    // Check if product already exists
    const existingProduct = await this.findByStoreAndEcwidId(storeId, ecwidProductId);

    if (existingProduct) {
      // Update existing product
      await this.execute(`
        UPDATE products 
<<<<<<< HEAD
        SET price = ?, stock = ?, category_ids = ?
        WHERE store_id = ? AND ecwid_product_id = ?
      `, [
        price,
        stock,
=======
        SET name = ?, price = ?, stock = ?, sku = ?, image_url = ?, category_ids = ?
        WHERE store_id = ? AND ecwid_product_id = ?
      `, [
        name,
        price,
        stock,
        sku,
        imageUrl,
>>>>>>> main
        categoryIdsJson,
        storeId,
        ecwidProductId
      ]);

      const updatedProduct = await this.findByStoreAndEcwidId(storeId, ecwidProductId);
      
      // Generate recommendations if requested
      if (generateRecommendations) {
        await this.recommendationService.generateUpsellRecommendations(storeId, ecwidProductId);
      }
      
      return updatedProduct;
    } else {
      // Create new product
      await this.execute(`
<<<<<<< HEAD
        INSERT INTO products (store_id, ecwid_product_id, price, stock, category_ids)
        VALUES (?, ?, ?, ?, ?)
      `, [
        storeId,
        ecwidProductId,
        price,
        stock,
=======
        INSERT INTO products (store_id, ecwid_product_id, name, price, stock, sku, image_url, category_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        storeId,
        ecwidProductId,
        name,
        price,
        stock,
        sku,
        imageUrl,
>>>>>>> main
        categoryIdsJson
      ]);

      const newProduct = await this.findByStoreAndEcwidId(storeId, ecwidProductId);
      
      // Generate recommendations if requested
      if (generateRecommendations) {
        await this.recommendationService.generateUpsellRecommendations(storeId, ecwidProductId);
      }
      
      return newProduct;
    }
  }

  /**
   * Bulk create or update products
   * @param {Array} products - Array of product data objects
   * @param {boolean} generateRecommendations - Whether to generate recommendations (default: false)
   * @returns {Promise<Object>} Summary of operation
   */
  async bulkCreateOrUpdate(products, generateRecommendations = false) {
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const productData of products) {
      try {
        const existing = await this.findByStoreAndEcwidId(productData.storeId, productData.ecwidProductId);
        
        if (existing) {
          updated++;
        } else {
          created++;
        }
        
        await this.createOrUpdate(productData, generateRecommendations);
      } catch (error) {
        console.error(`Error processing product ${productData.ecwidProductId}:`, error.message);
        errors++;
      }
    }

    return { created, updated, errors, total: products.length };
  }

  /**
   * Get product recommendations
   * @param {string} storeId - Store ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Product recommendations
   */
  async getProductRecommendations(storeId, productId) {
    return await this.recommendationService.getProductRecommendations(storeId, productId);
  }

  /**
   * Generate recommendations for all products in a store
   * @param {string} storeId - Store ID
   * @returns {Promise<Object>} Summary of recommendation generation
   */
  async generateAllRecommendations(storeId) {
    return await this.recommendationService.generateAllRecommendations(storeId);
  }

  /**
   * Bulk insert products (used by sync script)
   * @param {string} storeId - Store ID
   * @param {Array} products - Array of product data objects
   * @returns {Promise<Object>} Summary of operation
   */
  async bulkInsert(storeId, products) {
    let created = 0;
    let errors = 0;

    for (const product of products) {
      try {
        const productData = {
          storeId,
          ecwidProductId: product.id.toString(),
<<<<<<< HEAD
          price: product.price,
          stock: product.stock,
=======
          name: product.name || 'Unnamed Product',
          price: product.price,
          stock: product.stock,
          sku: product.sku || null,
          imageUrl: product.imageUrl || null,
>>>>>>> main
          categoryIds: JSON.parse(product.categoryId || '[]')
        };
        
        await this.createOrUpdate(productData, false);
        created++;
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error.message);
        errors++;
      }
    }

    return { created, errors, total: products.length };
  }

  /**
   * Delete all products for a store
   * @param {string} storeId - Store ID
   * @returns {Promise<number>} Number of deleted products
   */
  async deleteByStoreId(storeId) {
    const result = await this.execute('DELETE FROM products WHERE store_id = ?', [storeId]);
    return result.changes;
  }
}

export default ProductService;