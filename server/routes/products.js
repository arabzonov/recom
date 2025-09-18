const express = require('express');
const { dbQuery, dbRun, dbGet } = require('../config/database');
const router = express.Router();

// Get all products from local database
router.get('/', async (req, res) => {
  try {
    const { storeId, limit = 20, offset = 0, search, categoryId } = req.query;

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR sku LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (categoryId) {
      sql += ' AND category_id = ?';
      params.push(categoryId);
    }

    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const products = await dbQuery(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const countParams = [];

    if (storeId) {
      countSql += ' AND store_id = ?';
      countParams.push(storeId);
    }

    if (search) {
      countSql += ' AND (name LIKE ? OR description LIKE ? OR sku LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (categoryId) {
      countSql += ' AND category_id = ?';
      countParams.push(categoryId);
    }

    const countResult = await dbGet(countSql, countParams);

    res.json({
      success: true,
      data: {
        items: products,
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId } = req.query;

    let sql = 'SELECT * FROM products WHERE id = ?';
    const params = [id];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    const product = await dbGet(sql, params);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId, name, description, price, compare_price, sku, quantity, enabled, custom_fields } = req.body;

    // Check if product exists
    let checkSql = 'SELECT * FROM products WHERE id = ?';
    const checkParams = [id];

    if (storeId) {
      checkSql += ' AND store_id = ?';
      checkParams.push(storeId);
    }

    const existingProduct = await dbGet(checkSql, checkParams);

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update product
    const updateSql = `
      UPDATE products 
      SET name = ?, description = ?, price = ?, compare_price = ?, sku = ?, 
          quantity = ?, enabled = ?, custom_fields = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const updateParams = [
      name || existingProduct.name,
      description || existingProduct.description,
      price !== undefined ? price : existingProduct.price,
      compare_price !== undefined ? compare_price : existingProduct.compare_price,
      sku || existingProduct.sku,
      quantity !== undefined ? quantity : existingProduct.quantity,
      enabled !== undefined ? enabled : existingProduct.enabled,
      custom_fields ? JSON.stringify(custom_fields) : existingProduct.custom_fields,
      id
    ];

    await dbRun(updateSql, updateParams);

    // Get updated product
    const updatedProduct = await dbGet('SELECT * FROM products WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId } = req.query;

    let sql = 'DELETE FROM products WHERE id = ?';
    const params = [id];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    const result = await dbRun(sql, params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get product analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId } = req.query;

    // Get product details
    let productSql = 'SELECT * FROM products WHERE id = ?';
    const productParams = [id];

    if (storeId) {
      productSql += ' AND store_id = ?';
      productParams.push(storeId);
    }

    const product = await dbGet(productSql, productParams);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get analytics for this product
    const analytics = await dbQuery(`
      SELECT event_type, COUNT(*) as count, DATE(created_at) as date
      FROM analytics 
      WHERE store_id = ? AND event_data LIKE ?
      GROUP BY event_type, DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [product.store_id, `%"productId":"${product.ecwid_product_id}"%`]);

    res.json({
      success: true,
      data: {
        product,
        analytics
      }
    });
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({ error: 'Failed to fetch product analytics' });
  }
});

// Bulk update products
router.put('/bulk', async (req, res) => {
  try {
    const { storeId, updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    const results = [];

    for (const update of updates) {
      const { id, ...updateData } = update;

      if (!id) {
        results.push({ id, error: 'Product ID is required' });
        continue;
      }

      try {
        // Check if product exists and belongs to store
        let checkSql = 'SELECT * FROM products WHERE id = ?';
        const checkParams = [id];

        if (storeId) {
          checkSql += ' AND store_id = ?';
          checkParams.push(storeId);
        }

        const existingProduct = await dbGet(checkSql, checkParams);

        if (!existingProduct) {
          results.push({ id, error: 'Product not found' });
          continue;
        }

        // Update product
        const updateSql = `
          UPDATE products 
          SET name = COALESCE(?, name), 
              description = COALESCE(?, description), 
              price = COALESCE(?, price),
              compare_price = COALESCE(?, compare_price),
              sku = COALESCE(?, sku),
              quantity = COALESCE(?, quantity),
              enabled = COALESCE(?, enabled),
              custom_fields = COALESCE(?, custom_fields),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        const updateParams = [
          updateData.name,
          updateData.description,
          updateData.price,
          updateData.compare_price,
          updateData.sku,
          updateData.quantity,
          updateData.enabled,
          updateData.custom_fields ? JSON.stringify(updateData.custom_fields) : null,
          id
        ];

        await dbRun(updateSql, updateParams);
        results.push({ id, success: true });
      } catch (error) {
        results.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating products:', error);
    res.status(500).json({ error: 'Failed to bulk update products' });
  }
});

module.exports = router;
