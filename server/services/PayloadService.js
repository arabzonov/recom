import crypto from 'crypto';

/**
 * Service for handling Ecwid payload decryption
 */
class PayloadService {
  /**
   * Decode and decrypt Ecwid payload
   * @param {string} payload - Base64 encoded payload
   * @returns {Object} Decrypted payload data
   */
  static decodePayload(payload) {
    // Get client secret from environment
    const clientSecret = process.env.ECWID_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error('ECWID_CLIENT_SECRET not found in environment');
    }

    // Step 1: Get encryption key (first 16 characters of client secret)
    const encryptionKey = Buffer.from(clientSecret.substring(0, 16), 'utf8');

    // Step 2: Convert URL-safe base64 to standard base64
    let base64Payload = payload.replace(/-/g, '+').replace(/_/g, '/');

    // Step 3: Add padding if needed
    while (base64Payload.length % 4) {
      base64Payload += '=';
    }

    // Step 4: Decode base64 to binary
    const encryptedData = Buffer.from(base64Payload, 'base64');

    // Step 5: Extract IV (first 16 bytes)
    const iv = encryptedData.subarray(0, 16);

    // Step 6: Extract payload (remaining bytes)
    const encryptedPayload = encryptedData.subarray(16);

    // Step 7: Decrypt using AES-128-CBC
    const decipher = crypto.createDecipheriv('aes-128-cbc', encryptionKey, iv);
    let decrypted = decipher.update(encryptedPayload, null, 'utf8');
    decrypted += decipher.final('utf8');

    // Step 8: Parse JSON
    return JSON.parse(decrypted);
  }
}

export default PayloadService;
