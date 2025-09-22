const BaseDataAccess = require('./BaseDataAccess');

class ProductService extends BaseDataAccess {
  constructor() {
    super('products');
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
    const { limit, offset, orderBy = 'created_at DESC' } = options;
    let sql = 'SELECT * FROM products WHERE store_id = ?';
    const params = [storeId];

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset) {
      sql += ` OFFSET ?`;
      params.push(offset);
    }

    return await this.query(sql, params);
  }

  /**
   * Create or update product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} Product record
   */
  async createOrUpdate(productData) {
    const {
      storeId,
      ecwidProductId,
      name,
      price,
      sku,
      stock,
      imageUrl,
      categoryId
    } = productData;

    // Check if product already exists
    const existingProduct = await this.findByStoreAndEcwidId(storeId, ecwidProductId);

    if (existingProduct) {
      // Update existing product
      await this.execute(`
        UPDATE products 
        SET name = ?, price = ?, sku = ?, stock = ?, 
            image_url = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE store_id = ? AND ecwid_product_id = ?
      `, [
        name,
        price,
        sku,
        stock,
        imageUrl,
        categoryId,
        storeId,
        ecwidProductId
      ]);

      return await this.findByStoreAndEcwidId(storeId, ecwidProductId);
    } else {
      // Create new product
      await this.execute(`
        INSERT INTO products 
        (store_id, ecwid_product_id, name, price, sku, stock, image_url, category_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        storeId,
        ecwidProductId,
        name,
        price,
        sku,
        stock,
        imageUrl,
        categoryId
      ]);

      return await this.findByStoreAndEcwidId(storeId, ecwidProductId);
    }
  }

  /**
   * Bulk create or update products
   * @param {string} storeId - Store ID
   * @param {Array} products - Array of product data
   * @returns {Promise<Object>} Result summary
   */
  async bulkCreateOrUpdate(storeId, products) {
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const product of products) {
      try {
        const existing = await this.findByStoreAndEcwidId(storeId, product.id);
        
        if (existing) {
          updated++;
        } else {
          created++;
        }

        await this.createOrUpdate({
          storeId,
          ecwidProductId: product.id,
          name: product.name,
          price: product.price,
          sku: product.sku,
          stock: product.stock,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId
        });
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error.message);
        if (error.code === 'SQLITE_CONSTRAINT') {
          console.error(`  Foreign key constraint failed - store ${storeId} may not exist`);
        }
        errors++;
      }
    }

    return { created, updated, errors, total: products.length };
  }

  /**
   * Delete products for a store
   * @param {string} storeId - Store ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteByStoreId(storeId) {
    return await this.execute('DELETE FROM products WHERE store_id = ?', [storeId]);
  }

  /**
   * Bulk insert products (for fresh sync - no updates, only inserts)
   * @param {string} storeId - Store ID
   * @param {Array} products - Array of product data
   * @returns {Promise<Object>} Insert result
   */
  async bulkInsert(storeId, products) {
    let created = 0;
    let errors = 0;

    for (const product of products) {
      try {
        await this.execute(`
          INSERT INTO products 
          (store_id, ecwid_product_id, name, price, sku, stock, image_url, category_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          storeId,
          product.id,
          product.name,
          product.price,
          product.sku,
          product.stock,
          product.imageUrl,
          product.categoryId
        ]);
        created++;
      } catch (error) {
        console.error(`Error inserting product ${product.id}:`, error.message);
        if (error.code === 'SQLITE_CONSTRAINT') {
          console.error(`  Foreign key constraint failed - store ${storeId} may not exist`);
        }
        errors++;
      }
    }

    return { created, errors, total: products.length };
  }

  /**
   * Get product count for a store
   * @param {string} storeId - Store ID
   * @returns {Promise<number>} Product count
   */
  async countByStoreId(storeId) {
    const result = await this.get(
      'SELECT COUNT(*) as total FROM products WHERE store_id = ?',
      [storeId]
    );
    return result ? result.total : 0;
  }
}

module.exports = ProductService;
