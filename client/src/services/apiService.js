import PQueue from 'p-queue';

// Create a rate-limited queue that processes 10 requests per second
const apiQueue = new PQueue({
  interval: 1000, // 1 second
  intervalCap: 10, // 10 requests per interval
  concurrency: 10, // Allow up to 10 concurrent requests
});

/**
 * Rate-limited fetch function that ensures we don't exceed 10 API requests per second
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - The fetch response
 */
export const rateLimitedFetch = async (url, options = {}) => {
  return apiQueue.add(async () => {
    console.log(`🔄 API Request: ${url}`);
    
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        console.log('⏳ Rate limited by server, waiting...');
        // Wait a bit longer if we get rate limited
        await new Promise(resolve => setTimeout(resolve, 2000));
        throw new Error('Rate limited by server');
      }
      
      console.log(`✅ API Response: ${response.status} ${url}`);
      return response;
    } catch (error) {
      console.error(`❌ API Error: ${error.message} ${url}`);
      throw error;
    }
  });
};

/**
 * Rate-limited fetch with JSON parsing
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - The parsed JSON response
 */
export const rateLimitedFetchJson = async (url, options = {}) => {
  const response = await rateLimitedFetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Get queue status for debugging
 * @returns {object} - Queue status information
 */
export const getQueueStatus = () => {
  return {
    pending: apiQueue.pending,
    size: apiQueue.size,
    isPaused: apiQueue.isPaused,
  };
};

/**
 * Clear the queue (useful for testing or reset)
 */
export const clearQueue = () => {
  apiQueue.clear();
  console.log('🧹 API queue cleared');
};
