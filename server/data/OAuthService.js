import BaseDataAccess from './BaseDataAccess.js';

/**
 * OAuth data access service
 */
class OAuthService extends BaseDataAccess {
  constructor() {
    super('oauth_states');
  }

  /**
   * Create OAuth state
   * @param {string} state - OAuth state parameter
   * @param {string} storeId - Store ID
   * @returns {Promise<Object>} Created state record
   */
  async createState(state, storeId) {
    console.log('💾 OAuthService.createState - creating state:', state, 'for store:', storeId);
    const now = new Date();
    const utcTimestamp = now.toISOString().replace('T', ' ').replace('Z', '');
    console.log('💾 OAuthService.createState - using timestamp:', utcTimestamp);
    const result = await this.execute(
      'INSERT OR REPLACE INTO oauth_states (state, store_id, created_at) VALUES (?, ?, ?)',
      [state, storeId, utcTimestamp]
    );
    console.log('💾 OAuthService.createState - result:', result);
    return result;
  }

  /**
   * Find OAuth state
   * @param {string} state - OAuth state parameter
   * @returns {Promise<Object|null>} State record or null
   */
  async findByState(state) {
    return await this.get('SELECT * FROM oauth_states WHERE state = ?', [state]);
  }

  /**
   * Delete OAuth state
   * @param {string} state - OAuth state parameter
   * @returns {Promise<Object>} Delete result
   */
  async deleteState(state) {
    return await this.execute('DELETE FROM oauth_states WHERE state = ?', [state]);
  }

  /**
   * Clean up expired OAuth states (older than 1 hour)
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpiredStates() {
    return await this.execute(`
      DELETE FROM oauth_states 
      WHERE created_at < datetime('now', 'utc', '-1 hour')
    `);
  }

  /**
   * Generate secure OAuth state
   * @param {string} storeId - Store ID
   * @returns {string} Generated state parameter
   */
  generateState(storeId) {
    return `${storeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate OAuth state
   * @param {string} state - OAuth state parameter
   * @returns {Promise<Object|null>} Validated state record or null
   */
  async validateState(state) {
    console.log('🔍 OAuthService.validateState - looking for state:', state);
    const stateRecord = await this.findByState(state);
    console.log('🔍 OAuthService.validateState - found record:', stateRecord);
    
    if (!stateRecord) {
      console.log('❌ OAuthService.validateState - no record found');
      return null;
    }

    // Check if state is not expired (1 hour) - use consistent JavaScript Date objects
    const createdAt = new Date(stateRecord.created_at + 'Z'); // Force UTC interpretation
    const now = new Date();
    const diffInMs = now - createdAt;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    console.log('⏰ OAuthService.validateState - state age:', diffInHours, 'hours');
    console.log('⏰ OAuthService.validateState - created at:', createdAt.toISOString());
    console.log('⏰ OAuthService.validateState - current time:', now.toISOString());
    console.log('⏰ OAuthService.validateState - diff in ms:', diffInMs);

    if (diffInHours > 2) {
      // State expired, clean it up (temporarily increased to 2 hours for debugging)
      console.log('⏰ OAuthService.validateState - state expired, cleaning up');
      await this.deleteState(state);
      return null;
    }

    console.log('✅ OAuthService.validateState - state is valid');
    return stateRecord;
  }
}

export default OAuthService;
