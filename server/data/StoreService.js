import BaseDataAccess from './BaseDataAccess.js';

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
<<<<<<< HEAD
    const { storeId, storeName, accessToken, refreshToken, scopes, settings } = storeData;
=======
    const { storeId, storeName, accessToken, refreshToken, scopes } = storeData;
>>>>>>> main

    // Check if store already exists
    const existingStore = await this.findByStoreId(storeId);

    if (existingStore) {
      // Update existing store
<<<<<<< HEAD
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
=======
      await this.execute(`
        UPDATE stores 
        SET store_name = ?, access_token = ?, refresh_token = ?, scopes = ?
        WHERE store_id = ?
      `, [
        storeName || existingStore.store_name,
        accessToken || existingStore.access_token,
        refreshToken || existingStore.refresh_token,
        scopes || existingStore.scopes,
>>>>>>> main
        storeId
      ]);

      return await this.findByStoreId(storeId);
    } else {
      // Create new store
      await this.execute(`
<<<<<<< HEAD
        INSERT INTO stores (store_id, store_name, access_token, refresh_token, scopes, settings)
        VALUES (?, ?, ?, ?, ?, ?)
=======
        INSERT INTO stores (store_id, store_name, access_token, refresh_token, scopes)
        VALUES (?, ?, ?, ?, ?)
>>>>>>> main
      `, [
        storeId,
        storeName || 'Ecwid Store',
        accessToken || null,
        refreshToken || null,
<<<<<<< HEAD
        scopes || null,
        JSON.stringify(settings || {})
=======
        scopes || null
>>>>>>> main
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
<<<<<<< HEAD
=======
   * Update access token only
   * @param {string} storeId - Store ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} Update result
   */
  async updateAccessToken(storeId, accessToken) {
    return await this.execute(`
      UPDATE stores 
      SET access_token = ?
      WHERE store_id = ?
    `, [accessToken, storeId]);
  }

  /**
>>>>>>> main
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

  /**
   * Find all authenticated stores (stores with access tokens)
   * @returns {Promise<Array>} Array of authenticated stores
   */
  async findAuthenticated() {
    return await this.query('SELECT * FROM stores WHERE access_token IS NOT NULL AND access_token != ""');
  }

}

export default StoreService;
