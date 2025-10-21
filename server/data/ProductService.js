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
   * Find products by store ID and multiple Ecwid product IDs
   * @param {string} storeId - Store ID
   * @param {Array} ecwidProductIds - Array of Ecwid product IDs
   * @returns {Promise<Array>} Array of product records
   */
  async findByStoreAndEcwidIds(storeId, ecwidProductIds) {
    if (!ecwidProductIds || ecwidProductIds.length === 0) {
      return [];
    }

    const placeholders = ecwidProductIds.map(() => '?').join(',');
    const sql = `
      SELECT ecwid_product_id, name, price, compare_to_price, image_url, sku, stock, options
      FROM products 
      WHERE store_id = ? AND ecwid_product_id IN (${placeholders})
      ORDER BY price DESC
    `;

    return await this.query(sql, [storeId, ...ecwidProductIds]);
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
      // Validate ORDER BY clause to prevent SQL injection
      if (typeof orderBy !== 'string' || !this.isValidOrderByClause(orderBy)) {
        throw new Error('Invalid ORDER BY clause: must be a safe column name with optional ASC/DESC');
      }
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      // Validate LIMIT to prevent SQL injection
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 0 || limitNum > 10000) {
        throw new Error('Invalid LIMIT: must be a number between 0 and 10000');
      }
      sql += ` LIMIT ${limitNum}`;
    }
    if (offset) {
      // Validate OFFSET to prevent SQL injection
      const offsetNum = parseInt(offset);
      if (isNaN(offsetNum) || offsetNum < 0) {
        throw new Error('Invalid OFFSET: must be a non-negative number');
      }
      sql += ` OFFSET ${offsetNum}`;
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
      name,
      price,
      compareToPrice,
      stock,
      sku,
      imageUrl,
      categoryIds,
      productUrl,
      options
    } = productData;

    const categoryIdsJson = JSON.stringify(categoryIds || []);
    const optionsJson = options || '[]';
    
    console.log(`[ProductService] createOrUpdate options processing:`, {
      productId: ecwidProductId,
      productName: name,
      rawOptions: options,
      optionsType: typeof options,
      optionsJson: optionsJson,
      optionsJsonLength: optionsJson.length
    });

    // Check if product already exists
    const existingProduct = await this.findByStoreAndEcwidId(storeId, ecwidProductId);

    if (existingProduct) {
      // Update existing product
      await this.execute(`
        UPDATE products 
        SET name = ?, price = ?, compare_to_price = ?, stock = ?, sku = ?, image_url = ?, category_ids = ?, product_url = ?, options = ?
        WHERE store_id = ? AND ecwid_product_id = ?
      `, [
        name,
        price,
        compareToPrice,
        stock,
        sku,
        imageUrl,
        categoryIdsJson,
        productUrl,
        optionsJson,
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
        INSERT INTO products (store_id, ecwid_product_id, name, price, compare_to_price, stock, sku, image_url, category_ids, product_url, options)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        storeId,
        ecwidProductId,
        name,
        price,
        compareToPrice,
        stock,
        sku,
        imageUrl,
        categoryIdsJson,
        productUrl,
        optionsJson
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
        // Debug logging for compareToPrice field and options
        console.log(`[ProductService] Processing product ${product.id}:`, {
          id: product.id,
          name: product.name,
          price: product.price,
          compareToPrice: product.compareToPrice,
          hasCompareToPrice: product.compareToPrice !== undefined,
          compareToPriceValue: product.compareToPrice,
          options: product.options,
          hasOptions: product.options !== undefined,
          optionsType: typeof product.options,
          allKeys: Object.keys(product)
        });

        const productData = {
          storeId,
          ecwidProductId: product.id.toString(),
          name: product.name,
          price: product.price,
          compareToPrice: product.compareToPrice,
          stock: product.stock,
          sku: product.sku,
          imageUrl: product.imageUrl,
          categoryIds: JSON.parse(product.categoryId || '[]'),
          productUrl: product.productUrl,
          options: product.options
        };
        
        await this.createOrUpdate(productData, false);
        created++;
      } catch (error) {
        console.error(`❌ Error inserting product ${product.id} for store ${storeId}:`, error.message);
        if (error.stack) {
          console.error(`❌ Stack trace:`, error.stack);
        }
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