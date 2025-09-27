import axios from 'axios';

/**
 * Service for Ecwid API interactions
 */
class EcwidApiService {
  static ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

  /**
   * Get store profile information
   * @param {string} storeId - Store ID
   * @param {string} accessToken - Access token
   * @returns {Object} Store profile data
   */
  static async getStoreProfile(storeId, accessToken) {
    const response = await axios.get(`${this.ECWID_API_BASE}/${storeId}/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  /**
   * Get product details including options
   * @param {string|number} storeId
   * @param {string} accessToken
   * @param {string|number} productId
   * @returns {Object} Product details
   */
  static async getProduct(storeId, accessToken, productId) {
    const response = await axios.get(`${this.ECWID_API_BASE}/${storeId}/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

}

export default EcwidApiService;
