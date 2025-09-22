const BaseDataAccess = require('./BaseDataAccess');

/**
 * Store data access service
 */
class StoreService extends BaseDataAccess {
  constructor() {
    super('stores');
  }

  /**
   * Find store by store ID
   * @param {string} storeId - Ecwid store ID
   * @returns {Promise<Object|null>} Store record or null
   */
  async findByStoreId(storeId) {
    return await this.get('SELECT * FROM stores WHERE store_id = ?', [storeId]);
  }

  /**
   * Create or update store
   * @param {Object} storeData - Store data
   * @returns {Promise<Object>} Store record
   */
  async createOrUpdate(storeData) {
    const { storeId, storeName, accessToken, refreshToken, scopes, settings } = storeData;

    // Check if store already exists
    const existingStore = await this.findByStoreId(storeId);

    if (existingStore) {
      // Update existing store
      const updateData = {
        store_name: storeName || existingStore.store_name,
        access_token: accessToken || existingStore.access_token,
        refresh_token: refreshToken || existingStore.refresh_token,
        scopes: scopes || existingStore.scopes,
        settings: settings ? JSON.stringify(settings) : existingStore.settings
      };

      await this.execute(`
        UPDATE stores 
        SET store_name = ?, access_token = ?, refresh_token = ?, scopes = ?, settings = ?
        WHERE store_id = ?
      `, [
        updateData.store_name,
        updateData.access_token,
        updateData.refresh_token,
        updateData.scopes,
        updateData.settings,
        storeId
      ]);

      return await this.findByStoreId(storeId);
    } else {
      // Create new store
      await this.execute(`
        INSERT INTO stores (store_id, store_name, access_token, refresh_token, scopes, settings)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        storeId,
        storeName || 'Ecwid Store',
        accessToken || null,
        refreshToken || null,
        scopes || null,
        JSON.stringify(settings || {})
      ]);

      return await this.findByStoreId(storeId);
    }
  }

  /**
   * Update store tokens
   * @param {string} storeId - Store ID
   * @param {string} accessToken - Access token
   * @param {string} refreshToken - Refresh token
   * @param {string} scopes - OAuth scopes
   * @returns {Promise<Object>} Update result
   */
  async updateTokens(storeId, accessToken, refreshToken, scopes) {
    return await this.execute(`
      UPDATE stores 
      SET access_token = ?, refresh_token = ?, scopes = ?
      WHERE store_id = ?
    `, [accessToken, refreshToken, scopes, storeId]);
  }

  /**
   * Update store profile
   * @param {string} storeId - Store ID
   * @param {string} storeName - Store name
   * @returns {Promise<Object>} Update result
   */
  async updateProfile(storeId, storeName) {
    return await this.execute(`
      UPDATE stores 
      SET store_name = ?
      WHERE store_id = ?
    `, [storeName, storeId]);
  }

  /**
   * Update store settings
   * @param {string} storeId - Store ID
   * @param {Object} settings - Settings object
   * @returns {Promise<Object>} Update result
   */
  async updateSettings(storeId, settings) {
    return await this.execute(`
      UPDATE stores 
      SET settings = ?
      WHERE store_id = ?
    `, [JSON.stringify(settings), storeId]);
  }

  /**
   * Check if store is authenticated
   * @param {string} storeId - Store ID
   * @returns {Promise<boolean>} Authentication status
   */
  async isAuthenticated(storeId) {
    const store = await this.findByStoreId(storeId);
    return store && store.access_token;
  }

}

module.exports = StoreService;
