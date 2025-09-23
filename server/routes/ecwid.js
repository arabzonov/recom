import express from 'express';
import axios from 'axios';
import { StoreService, ProductService } from '../data/index.js';

const router = express.Router();

// Initialize services
const storeService = new StoreService();
const productService = new ProductService();

// Ecwid API base URL
const ECWID_API_BASE = 'https://app.ecwid.com/api/v3';

// Middleware to get store credentials
const getStoreCredentials = async (req, res, next) => {
  try {
    const storeId = req.params.storeId || req.body.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    const store = await storeService.findByStoreId(storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    req.store = store;
    next();
  } catch (error) {
    console.error('Error getting store credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get store information
router.get('/store/:storeId', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    
    // Check if store has access token
    if (!store.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
    // Fetch store info from Ecwid API
    const response = await axios.get(`${ECWID_API_BASE}/${store.store_id}/profile`, {
      headers: {
        'Authorization': `Bearer ${store.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching store info:', error);
    
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access token expired or invalid. Please re-authenticate.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch store information',
      details: error.response?.data || error.message
    });
  }
});


// Create or update store configuration
router.post('/store', async (req, res) => {
  try {
    const { storeId, storeName, accessToken, refreshToken, settings } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    // Create or update store
    const store = await storeService.createOrUpdate({
      storeId,
      storeName,
      accessToken,
      refreshToken,
      settings
    });

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('Error creating/updating store:', error);
    res.status(500).json({ error: 'Failed to create/update store' });
  }
});

// Get product block status
router.get('/store/:storeId/product-block', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    
    // Check if store has access token
    if (!store.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
    // Get the stored product block configuration
    const settings = store.settings || {};
    const productBlock = settings.productBlock || { enabled: false, html: null };
    
    res.json({
      success: true,
      data: {
        enabled: productBlock.enabled || false,
        html: productBlock.html || null,
        blockId: productBlock.blockId || null,
        createdAt: productBlock.createdAt || null
      }
    });
  } catch (error) {
    console.error('Error fetching product block status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch product block status',
      details: error.message
    });
  }
});

// Insert product block
router.post('/store/:storeId/product-block', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    
    // Check if store has access token
    if (!store.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
    // Create the automatic injection script using Ecwid Storefront JS API
    const blockScript = `
      <script>
        (function() {
          // 1recom Widget - Automatic Product Recommendations
          window.OneRecomWidget = {
            storeId: '${store.store_id}',
            apiBase: window.location.origin + '/api/ecwid/store/${store.store_id}',
            isInitialized: false,
            
            init: function() {
              if (this.isInitialized) return;
              this.isInitialized = true;
              
              // Wait for Ecwid to load
              if (typeof Ecwid !== 'undefined') {
                Ecwid.OnAPILoaded.add(function() {
                  // Listen for page changes in Ecwid SPA
                  Ecwid.OnPageLoaded.add(function(page) {
                    OneRecomWidget.handlePageChange(page);
                  });
                });
              }
            },
            
            handlePageChange: function(page) {
              // Only inject on product pages
              if (page.type === 'PRODUCT') {
                setTimeout(function() {
                  OneRecomWidget.injectWidget(page.productId);
                }, 500);
              } else {
                // Remove widget if not on product page
                OneRecomWidget.removeWidget();
              }
            },
            
            injectWidget: function(productId) {
              // Remove existing widget first
              this.removeWidget();
              
              // Find the best place to inject the widget
              var container = document.querySelector('.ecwid-productBrowser-productDetails') ||
                             document.querySelector('.ecwid-product') ||
                             document.querySelector('[data-ecwid-product]') ||
                             document.querySelector('.ecwid-productBrowser');
              
              if (!container) return;
              
              // Create the widget container
              var widgetDiv = document.createElement('div');
              widgetDiv.id = '1recom';
              widgetDiv.style.cssText = 'margin: 20px 0; padding: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;';
              
              // Add loading state
              widgetDiv.innerHTML = \`
                <div style="text-align: center; padding: 20px;">
                  <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                  <p style="margin-top: 10px; color: #666;">Loading recommendations...</p>
                </div>
                <style>
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                </style>
              \`;
              
              // Insert the widget
              container.appendChild(widgetDiv);
              
              // Load recommendations
              this.loadRecommendations(productId);
            },
            
            loadRecommendations: function(productId) {
              var self = this;
              fetch(this.apiBase + '/recommendations?productId=' + productId)
                .then(function(response) {
                  return response.json();
                })
                .then(function(data) {
                  if (data.success && data.products && data.products.length > 0) {
                    self.renderRecommendations(data.products);
                  } else {
                    self.renderPlaceholder();
                  }
                })
                .catch(function(error) {
                  console.error('1recom: Error loading recommendations:', error);
                  self.renderPlaceholder();
                });
            },
            
            renderRecommendations: function(products) {
              var widget = document.getElementById('1recom');
              if (!widget) return;
              
              var html = \`
                <div style="text-align: center; margin-bottom: 20px;">
                  <h3 style="color: #495057; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">Recommended Products</h3>
                  <p style="color: #6c757d; margin: 0; font-size: 14px;">Discover more products you might like!</p>
                </div>
                <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
              \`;
              
              products.forEach(function(product) {
                html += \`
                  <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; min-width: 180px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s;">
                    <div style="background: #e9ecef; height: 120px; border-radius: 6px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 12px;">
                      \${product.imageUrl ? 
                        \`<img src="\${product.imageUrl}" alt="\${product.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">\` : 
                        'Product Image'
                      }
                    </div>
                    <div style="font-weight: 600; margin-bottom: 6px; color: #333; font-size: 14px; line-height: 1.3;">\${product.name}</div>
                    <div style="color: #28a745; font-weight: bold; font-size: 16px;">\${product.price}</div>
                  </div>
                \`;
              });
              
              html += '</div>';
              widget.innerHTML = html;
            },
            
            renderPlaceholder: function() {
              var widget = document.getElementById('1recom');
              if (!widget) return;
              
              widget.innerHTML = \`
                <div style="text-align: center; margin-bottom: 20px;">
                  <h3 style="color: #495057; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">Recommended Products</h3>
                  <p style="color: #6c757d; margin: 0; font-size: 14px;">Discover more products you might like!</p>
                </div>
                <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                  <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; min-width: 180px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="background: #e9ecef; height: 120px; border-radius: 6px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 12px;">
                      Product Image
                    </div>
                    <div style="font-weight: 600; margin-bottom: 6px; color: #333; font-size: 14px;">Sample Product 1</div>
                    <div style="color: #28a745; font-weight: bold; font-size: 16px;">$29.99</div>
                  </div>
                  <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; min-width: 180px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="background: #e9ecef; height: 120px; border-radius: 6px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 12px;">
                      Product Image
                    </div>
                    <div style="font-weight: 600; margin-bottom: 6px; color: #333; font-size: 14px;">Sample Product 2</div>
                    <div style="color: #28a745; font-weight: bold; font-size: 16px;">$19.99</div>
                  </div>
                  <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; min-width: 180px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="background: #e9ecef; height: 120px; border-radius: 6px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 12px;">
                      Product Image
                    </div>
                    <div style="font-weight: 600; margin-bottom: 6px; color: #333; font-size: 14px;">Sample Product 3</div>
                    <div style="color: #28a745; font-weight: bold; font-size: 16px;">$39.99</div>
                  </div>
                </div>
              \`;
            },
            
            removeWidget: function() {
              var widget = document.getElementById('1recom');
              if (widget) {
                widget.remove();
              }
            }
          };
          
          // Initialize the widget
          OneRecomWidget.init();
        })();
      </script>
    `;
    
    // Store the block configuration in the database
    const blockConfig = {
      enabled: true,
      script: blockScript,
      blockId: `block_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    // Update store settings with the block configuration
    const currentSettings = store.settings || {};
    currentSettings.productBlock = blockConfig;
    await storeService.updateSettings(store.store_id, currentSettings);
    
    res.json({
      success: true,
      data: {
        enabled: true,
        html: blockScript,
        blockId: blockConfig.blockId,
        instructions: "The recommendation widget has been activated! It will automatically appear on your product pages. No manual integration needed - the widget works automatically with Ecwid's SPA navigation."
      }
    });
  } catch (error) {
    console.error('Error inserting product block:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to insert product block',
      details: error.message
    });
  }
});

// Delete product block
router.delete('/store/:storeId/product-block', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    
    // Check if store has access token
    if (!store.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
    // Remove the product block configuration from store settings
    const settings = store.settings || {};
    delete settings.productBlock;
    
    await storeService.updateSettings(store.store_id, settings);
    
    res.json({
      success: true,
      data: {
        enabled: false,
        html: null,
        blockId: null
      }
    });
  } catch (error) {
    console.error('Error deleting product block:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete product block',
      details: error.message
    });
  }
});

// Get product recommendations for the widget
router.get('/store/:storeId/recommendations', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    const { productId } = req.query;
    
    // Check if store has access token
    if (!store.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
    // Check if product block is enabled
    const settings = store.settings || {};
    const productBlock = settings.productBlock;
    
    if (!productBlock || !productBlock.enabled) {
      return res.json({
        success: false,
        error: 'Product block not enabled'
      });
    }
    
    // If productId is provided, try to get pre-built recommendations
    if (productId) {
      try {
        const recommendations = await productService.getProductRecommendations(store.store_id, productId);
        
        if (recommendations && recommendations.length > 0) {
          // Format recommendations for the widget
          const formattedRecommendations = recommendations.map(product => ({
            id: product.ecwid_product_id,
            name: product.name,
            price: product.price ? `$${product.price.toFixed(2)}` : 'Price not available',
            imageUrl: product.image_url || null,
            sku: product.sku || null
          }));
          
          return res.json({
            success: true,
            products: formattedRecommendations,
            source: 'pre-built'
          });
        }
      } catch (recError) {
        console.error('Error fetching pre-built recommendations:', recError);
        // Fall through to API fallback
      }
    }
    
    // Fallback: Fetch products from Ecwid API
    try {
      const response = await axios.get(`${ECWID_API_BASE}/${store.store_id}/products`, {
        headers: {
          'Authorization': `Bearer ${store.access_token}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 6, // Get 6 products for recommendations
          offset: 0
        }
      });
      
      const products = response.data.items || [];
      
      // Filter out the current product if productId is provided
      const filteredProducts = productId ? 
        products.filter(p => p.id.toString() !== productId.toString()) : 
        products;
      
      // Take first 3 products for recommendations
      const recommendations = filteredProducts.slice(0, 3).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price ? `$${product.price.toFixed(2)}` : 'Price not available',
        imageUrl: product.thumbnailUrl || product.imageUrl || null,
        url: product.url || null
      }));
      
      res.json({
        success: true,
        products: recommendations,
        source: 'api-fallback'
      });
      
    } catch (apiError) {
      console.error('Error fetching products from Ecwid API:', apiError);
      
      // Return placeholder data if API fails
      res.json({
        success: true,
        products: [
          {
            id: 'placeholder-1',
            name: 'Sample Product 1',
            price: '$29.99',
            imageUrl: null,
            url: null
          },
          {
            id: 'placeholder-2',
            name: 'Sample Product 2',
            price: '$19.99',
            imageUrl: null,
            url: null
          },
          {
            id: 'placeholder-3',
            name: 'Sample Product 3',
            price: '$39.99',
            imageUrl: null,
            url: null
          }
        ],
        source: 'placeholder'
      });
    }
    
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch recommendations',
      details: error.message
    });
  }
});

// Get JavaScript code for store integration
router.get('/store/:storeId/script', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    
    // Check if store has access token
    if (!store.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
    // Get the stored product block configuration
    const settings = store.settings || {};
    const productBlock = settings.productBlock;
    
    if (!productBlock || !productBlock.enabled) {
      return res.json({
        success: true,
        data: {
          script: null,
          instructions: "No product block is currently active. Please activate a product block first."
        }
      });
    }
    
    // Return the JavaScript code that should be added to the store
    res.json({
      success: true,
      data: {
        script: productBlock.script,
        instructions: `To activate the recommendation widget on your product pages:

1. Go to your Ecwid admin panel
2. Navigate to Settings → General → Custom Code
3. Add the following code to the "Footer code" section:
4. Save the changes
5. The recommendation widget will automatically appear on all your product pages

The widget works automatically with Ecwid's SPA navigation - no manual integration needed!`
      }
    });
  } catch (error) {
    console.error('Error fetching store script:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch store script',
      details: error.message
    });
  }
});


// Generate recommendations for all products in a store
router.post('/store/:storeId/recommendations/generate', getStoreCredentials, async (req, res) => {
  try {
    const { store } = req;
    
    // Check if store has access token
    if (!store.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store not authenticated. Please complete OAuth setup first.' 
      });
    }
    
    console.log(`Starting recommendation generation for store ${store.store_id}`);
    
    // Generate recommendations for all products
    const summary = await productService.generateAllRecommendations(store.store_id);
    
    res.json({
      success: true,
      data: summary,
      message: 'Recommendation generation completed successfully'
    });
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate recommendations',
      details: error.message
    });
  }
});

// Custom JavaScript endpoint for Ecwid storefront
router.get('/ec.js', async (req, res) => {
  try {
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).send('// Store ID is required');
    }
    
    // Check if store exists and has product block enabled
    const store = await storeService.findByStoreId(storeId);
    if (!store || !store.access_token) {
      return res.status(404).send('// Store not found or not authenticated');
    }
    
    const settings = store.settings || {};
    const productBlock = settings.productBlock;
    
    if (!productBlock || !productBlock.enabled) {
      return res.status(404).send('// Product block not enabled');
    }
    
    // Set content type to JavaScript
    res.setHeader('Content-Type', 'application/javascript');
    
    // Return the custom JavaScript code
    res.send(productBlock.script || '// No custom script available');
    
  } catch (error) {
    console.error('Error serving custom JavaScript:', error);
    res.status(500).send('// Error loading custom script');
  }
});

// Custom CSS endpoint for Ecwid storefront
router.get('/ec.css', async (req, res) => {
  try {
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).send('/* Store ID is required */');
    }
    
    // Check if store exists
    const store = await storeService.findByStoreId(storeId);
    if (!store) {
      return res.status(404).send('/* Store not found */');
    }
    
    const settings = store.settings || {};
    const customCSS = settings.customCSS || '';
    
    // Set content type to CSS
    res.setHeader('Content-Type', 'text/css');
    
    // Return custom CSS with default styling for recommendations
    const defaultCSS = `
/* 1recom Recommendation Widget Styles */
#1recom {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#1recom h3 {
  color: #495057;
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

#1recom p {
  color: #6c757d;
  margin: 0 0 20px 0;
  font-size: 14px;
  text-align: center;
}

#1recom .recommendations-grid {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

#1recom .recommendation-item {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  min-width: 180px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

#1recom .recommendation-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

#1recom .recommendation-image {
  background: #e9ecef;
  height: 120px;
  border-radius: 6px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  font-size: 12px;
  overflow: hidden;
}

#1recom .recommendation-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

#1recom .recommendation-name {
  font-weight: 600;
  margin-bottom: 6px;
  color: #333;
  font-size: 14px;
  line-height: 1.3;
}

#1recom .recommendation-price {
  color: #28a745;
  font-weight: bold;
  font-size: 16px;
}

#1recom .loading {
  text-align: center;
  padding: 20px;
}

#1recom .loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 768px) {
  #1recom .recommendations-grid {
    flex-direction: column;
    align-items: center;
  }
  
  #1recom .recommendation-item {
    width: 100%;
    max-width: 300px;
  }
}
`;
    
    res.send(defaultCSS + customCSS);
    
  } catch (error) {
    console.error('Error serving custom CSS:', error);
    res.status(500).send('/* Error loading custom styles */');
  }
});

// Payload decryption endpoint for Ecwid apps
router.post('/decrypt-payload', async (req, res) => {
  try {
    const { payload } = req.body;

    if (!payload) {
      return res.status(400).json({
        success: false,
        error: 'Payload is required'
      });
    }

    console.log('🔓 Payload decryption requested:', payload.substring(0, 50) + '...');
    console.log('🔓 Payload length:', payload.length);
    
    // Get the app's secret key from environment variables
    const appSecret = process.env.ECWID_CLIENT_SECRET;
    console.log('🔓 ECWID_CLIENT_SECRET exists:', !!appSecret);
    console.log('🔓 ECWID_CLIENT_SECRET length:', appSecret ? appSecret.length : 0);
    
    if (!appSecret) {
      console.error('❌ ECWID_CLIENT_SECRET not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'App secret key not configured'
      });
    }

    try {
      // Decrypt the payload using AES-256-CBC
      // The payload is base64 encoded, so decode it first
      const encryptedData = Buffer.from(payload, 'base64');
      
      // Extract IV (first 16 bytes) and encrypted data
      const iv = encryptedData.slice(0, 16);
      const encrypted = encryptedData.slice(16);
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(appSecret, 'hex'), iv);
      
      // Decrypt
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      console.log('🔓 Decrypted payload:', decrypted);
      
      // Parse the decrypted JSON
      const payloadData = JSON.parse(decrypted);
      console.log('🔓 Parsed payload data:', payloadData);
      
      // Extract store ID and other parameters
      const storeId = payloadData.storeId || payloadData.store_id;
      const userId = payloadData.userId || payloadData.user_id;
      const appId = payloadData.appId || payloadData.app_id;
      
      res.json({
        success: true,
        data: {
          storeId,
          userId,
          appId,
          rawData: payloadData
        }
      });

    } catch (decryptError) {
      console.error('❌ Error decrypting payload:', decryptError.message);
      console.error('❌ Decrypt error details:', {
        name: decryptError.name,
        message: decryptError.message,
        stack: decryptError.stack
      });
      
      // If decryption fails, try to extract store ID from the payload using patterns
      console.log('🔍 Attempting pattern extraction as fallback...');
      
      // Try to find store ID patterns in the raw payload
      const patterns = [
        /(\d{6,})/g,  // Look for 6+ digit numbers (typical store IDs)
        /store[_-]?id[":\s=]+(\d+)/i,
        /ecwid[_-]?store[_-]?id[":\s=]+(\d+)/i
      ];
      
      let extractedStoreId = null;
      for (let i = 0; i < patterns.length; i++) {
        const matches = payload.match(patterns[i]);
        if (matches) {
          for (const match of matches) {
            if (match.length >= 6 && /^\d+$/.test(match)) {
              extractedStoreId = match;
              break;
            }
          }
          if (extractedStoreId) break;
        }
      }
      
      if (extractedStoreId) {
        console.log('✅ Store ID extracted via pattern matching:', extractedStoreId);
        res.json({
          success: true,
          data: {
            storeId: extractedStoreId,
            method: 'pattern_extraction'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to decrypt payload and no store ID pattern found'
        });
      }
    }

  } catch (error) {
    console.error('Error processing payload decryption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payload decryption',
      details: error.message
    });
  }
});

// Webhook endpoint for Ecwid events
router.post('/webhooks', async (req, res) => {
  try {
    const { storeId, eventType, data } = req.body;
    
    console.log('🔔 Webhook received:', { storeId, eventType, data });
    
    if (!storeId || !eventType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: storeId and eventType' 
      });
    }
    
    // Check if store exists
    const store = await storeService.findByStoreId(storeId);
    if (!store) {
      console.log('❌ Webhook: Store not found:', storeId);
      return res.status(404).json({ 
        success: false, 
        error: 'Store not found' 
      });
    }
    
    // Process different webhook events
    switch (eventType) {
      case 'order.created':
        console.log('📦 Order created webhook:', data);
        // Handle new order - could trigger recommendation updates
        if (data && data.orderId) {
          // Store order data for recommendation analysis
          await orderService.createOrUpdate({
            storeId,
            ecwidOrderId: data.orderId,
            orderNumber: data.orderNumber,
            productIds: data.items ? data.items.map(item => item.productId) : []
          });
        }
        break;
        
      case 'product.updated':
        console.log('🛍️ Product updated webhook:', data);
        // Handle product updates - refresh recommendations
        if (data && data.productId) {
          // Update product data and regenerate recommendations
          await productService.updateProduct(storeId, data.productId, data);
          // Regenerate recommendations for this product
          await productService.generateProductRecommendations(storeId, data.productId);
        }
        break;
        
      case 'product.created':
        console.log('🆕 Product created webhook:', data);
        // Handle new product - add to database and generate recommendations
        if (data && data.productId) {
          await productService.createOrUpdate({
            storeId,
            ecwidProductId: data.productId,
            name: data.name,
            price: data.price,
            stock: data.stock,
            categoryIds: data.categories || []
          });
          // Generate recommendations for the new product
          await productService.generateProductRecommendations(storeId, data.productId);
        }
        break;
        
      case 'product.deleted':
        console.log('🗑️ Product deleted webhook:', data);
        // Handle product deletion - remove from database
        if (data && data.productId) {
          await productService.deleteProduct(storeId, data.productId);
        }
        break;
        
      default:
        console.log('❓ Unknown webhook event type:', eventType);
    }
    
    res.json({
      success: true,
      message: 'Webhook processed successfully',
      eventType,
      storeId
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process webhook',
      details: error.message
    });
  }
});

export default router;
