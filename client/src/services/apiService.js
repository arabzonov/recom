import PQueue from 'p-queue';

// Create a queue for API requests to handle rate limiting
const apiQueue = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 10 });

class ApiService {
  constructor() {
    this.baseURL = '/api';
    this.queue = apiQueue;
  }

  async request(url, options = {}) {
    return this.queue.add(async () => {
      const fullUrl = `${this.baseURL}${url}`;
      
      try {
        const response = await fetch(fullUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...options,
        });

        if (response.status === 429) {
          // Rate limited, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.request(url, options);
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      } catch (error) {
        throw error;
      }
    });
  }

  async get(url, options = {}) {
    return this.request(url, { method: 'GET', ...options });
  }

  async post(url, data, options = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(url, data, options = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete(url, options = {}) {
    return this.request(url, { method: 'DELETE', ...options });
  }

  clearQueue() {
    this.queue.clear();
  }
}

export default new ApiService();