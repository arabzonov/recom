import express from 'express';

const router = express.Router();

// Simple public stats page - no authentication required
router.get('/', async (req, res) => {
  try {
    const { StoreService, ProductService, CategoryService } = await import('../data/index.js');
    
    const storeService = new StoreService();
    const productService = new ProductService();
    const categoryService = new CategoryService();

    // Get all stores from database
    const allStores = await storeService.query('SELECT * FROM stores');
    
    const storesStats = [];
    let totalProducts = 0;
    let totalCategories = 0;
    let totalVariants = 0;
    let activeFeatures = 0;

    for (const store of allStores) {
      try {
        const storeId = store.store_id;

        // Get product count and variants
        const productCount = await productService.count({ 
          where: 'store_id = ?', 
          params: [storeId] 
        });

        // Count products with variants (options)
        const productsWithVariants = await productService.query(`
          SELECT COUNT(*) as count 
          FROM products 
          WHERE store_id = ? 
            AND options IS NOT NULL 
            AND options != '[]' 
            AND options != ''
        `, [storeId]);

        // Get category count
        const categoryCount = await categoryService.count({ 
          where: 'store_id = ?', 
          params: [storeId] 
        });

        // Get recommendation settings
        const settings = await storeService.getRecommendationSettings(storeId);
        
        // Get store profile from Ecwid if authenticated
        let storeProfile = null;
        if (store.access_token) {
          try {
            const response = await fetch(`https://app.ecwid.com/api/v3/${storeId}/profile`, {
              headers: {
                'Authorization': `Bearer ${store.access_token}`
              }
            });
            
            if (response.ok) {
              storeProfile = await response.json();
            }
          } catch (error) {
            // Store profile fetch failed, continue without it
          }
        }

        const storeStats = {
          store_id: storeId,
          store_name: store.store_name || storeProfile?.name || `Ecwid Store ${storeId}`,
          product_count: productCount,
          products_with_variants: productsWithVariants[0]?.count || 0,
          category_count: categoryCount,
          recommendation_settings: settings || {
            showUpsells: false,
            showCrossSells: false,
            showRecommendations: false
          }
        };

        storesStats.push(storeStats);

        // Update totals
        totalProducts += productCount;
        totalCategories += categoryCount;
        totalVariants += productsWithVariants[0]?.count || 0;
        
        // Count active features
        if (settings) {
          if (settings.showUpsells) activeFeatures++;
          if (settings.showCrossSells) activeFeatures++;
          if (settings.showRecommendations) activeFeatures++;
        }
      } catch (error) {
        // If individual store fails, add error info but continue
        storesStats.push({
          store_id: store.store_id,
          store_name: store.store_name || `Ecwid Store ${store.store_id}`,
          error: error.message,
          product_count: 0,
          products_with_variants: 0,
          category_count: 0,
          recommendation_settings: {
            showUpsells: false,
            showCrossSells: false,
            showRecommendations: false
          }
        });
      }
    }

    // Generate HTML page
    const html = generateStatsHTML({
      totalStores: allStores.length,
      totalProducts,
      totalCategories,
      totalVariants,
      activeFeatures,
      stores: storesStats
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>1Recom Store Statistics - Error</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Error Loading Statistics</h1>
          <p>Failed to fetch store statistics: ${error.message}</p>
          <p><a href="/">Return to main app</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

function generateStatsHTML(data) {
  const timestamp = new Date().toLocaleString();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>1Recom Store Statistics</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #64748b;
            font-size: 1.1rem;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
            text-align: center;
        }
        
        .summary-card h3 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .summary-card.blue h3 { color: #2563eb; }
        .summary-card.green h3 { color: #059669; }
        .summary-card.purple h3 { color: #7c3aed; }
        .summary-card.orange h3 { color: #ea580c; }
        
        .summary-card p {
            color: #64748b;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 0.9rem;
        }
        
        .stores {
            display: grid;
            gap: 20px;
        }
        
        .store-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        
        .store-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 25px;
        }
        
        .store-header h3 {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .store-header p {
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        .store-content {
            padding: 25px;
        }
        
        .store-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            border-radius: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }
        
        .stat-number {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.8rem;
            color: #64748b;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .features {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .features h4 {
            margin-bottom: 15px;
            color: #374151;
            font-weight: 600;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
        }
        
        .feature-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .feature-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .feature-status.enabled {
            background: #dcfce7;
            color: #166534;
        }
        
        .feature-status.disabled {
            background: #f3f4f6;
            color: #6b7280;
        }
        
        .error-badge {
            background: #fef2f2;
            color: #dc2626;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
            font-weight: 500;
            border: 1px solid #fecaca;
            display: inline-block;
            margin-top: 10px;
        }
        
        .plain-text {
            margin-top: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        
        .plain-text-header {
            background: #1e293b;
            color: white;
            padding: 20px 25px;
        }
        
        .plain-text-header h3 {
            font-size: 1.2rem;
            font-weight: 600;
        }
        
        .plain-text-content {
            padding: 25px;
        }
        
        .plain-text pre {
            background: #0f172a;
            color: #10b981;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .copy-btn {
            background: #1e293b;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            margin-top: 15px;
            transition: background 0.2s;
        }
        
        .copy-btn:hover {
            background: #334155;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #64748b;
        }
        
        .footer a {
            color: #2563eb;
            text-decoration: none;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .summary {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .store-stats {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 1Recom Store Statistics</h1>
            <p>Comprehensive overview of all stores in the 1Recom system</p>
            <p style="margin-top: 10px; font-size: 0.9rem; color: #94a3b8;">
                Generated: ${timestamp} | Total Stores: ${data.totalStores}
            </p>
        </div>
        
        <div class="summary">
            <div class="summary-card blue">
                <h3>${data.totalStores}</h3>
                <p>Total Stores</p>
            </div>
            <div class="summary-card green">
                <h3>${data.totalProducts}</h3>
                <p>Total Products</p>
            </div>
            <div class="summary-card purple">
                <h3>${data.totalCategories}</h3>
                <p>Total Categories</p>
            </div>
            <div class="summary-card orange">
                <h3>${data.activeFeatures}</h3>
                <p>Active Features</p>
            </div>
        </div>
        
        <div class="stores">
            ${data.stores.map((store, index) => `
                <div class="store-card">
                    <div class="store-header">
                        <h3>${store.store_name}</h3>
                        <p>Store ID: ${store.store_id}</p>
                    </div>
                    <div class="store-content">
                        ${store.error ? `
                            <div class="error-badge">
                                ⚠️ Error: ${store.error}
                            </div>
                        ` : ''}
                        
                        <div class="store-stats">
                            <div class="stat-item">
                                <div class="stat-number" style="color: #2563eb;">${store.product_count}</div>
                                <div class="stat-label">Products</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number" style="color: #059669;">${store.products_with_variants}</div>
                                <div class="stat-label">With Variants</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number" style="color: #7c3aed;">${store.category_count}</div>
                                <div class="stat-label">Categories</div>
                            </div>
                        </div>
                        
                        <div class="features">
                            <h4>Recommendation Features</h4>
                            <div class="feature-grid">
                                <div class="feature-item">
                                    <span>Upsells</span>
                                    <span class="feature-status ${store.recommendation_settings.showUpsells ? 'enabled' : 'disabled'}">
                                        ${store.recommendation_settings.showUpsells ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div class="feature-item">
                                    <span>Cross-sells</span>
                                    <span class="feature-status ${store.recommendation_settings.showCrossSells ? 'enabled' : 'disabled'}">
                                        ${store.recommendation_settings.showCrossSells ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div class="feature-item">
                                    <span>Recommendations</span>
                                    <span class="feature-status ${store.recommendation_settings.showRecommendations ? 'enabled' : 'disabled'}">
                                        ${store.recommendation_settings.showRecommendations ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="plain-text">
            <div class="plain-text-header">
                <h3>📋 Plain Text Report</h3>
                <p style="margin-top: 5px; opacity: 0.9; font-size: 0.9rem;">Copy-paste friendly format</p>
            </div>
            <div class="plain-text-content">
                <pre id="plainTextContent">${generatePlainTextReport(data)}</pre>
                <button class="copy-btn" onclick="copyToClipboard()">📋 Copy Report</button>
            </div>
        </div>
        
        <div class="footer">
            <p>Need help? Contact support at <a href="mailto:support@1n.ax">support@1n.ax</a></p>
        </div>
    </div>
    
    <script>
        function copyToClipboard() {
            const content = document.getElementById('plainTextContent').textContent;
            navigator.clipboard.writeText(content).then(() => {
                const btn = document.querySelector('.copy-btn');
                const originalText = btn.textContent;
                btn.textContent = '✅ Copied!';
                btn.style.background = '#059669';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#1e293b';
                }, 2000);
            });
        }
    </script>
</body>
</html>
  `;
}

function generatePlainTextReport(data) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  let content = `1Recom Store Statistics Report\n`;
  content += `Generated: ${timestamp}\n`;
  content += `Total Stores: ${data.totalStores}\n\n`;
  content += `${'='.repeat(60)}\n\n`;
  
  data.stores.forEach((store, index) => {
    content += `STORE ${index + 1}: ${store.store_name.toUpperCase()}\n`;
    content += `${'='.repeat(60)}\n`;
    content += `Store ID: ${store.store_id}\n`;
    
    if (store.error) {
      content += `⚠️  ERROR: ${store.error}\n`;
    }
    
    content += `\nPRODUCT INVENTORY:\n`;
    content += `  • Total Products: ${store.product_count}\n`;
    content += `  • Products with Variants: ${store.products_with_variants}\n`;
    content += `  • Categories: ${store.category_count}\n`;
    
    content += `\nRECOMMENDATION SETTINGS:\n`;
    content += `  • Upsells: ${store.recommendation_settings.showUpsells ? 'Enabled' : 'Disabled'}\n`;
    content += `  • Cross-sells: ${store.recommendation_settings.showCrossSells ? 'Enabled' : 'Disabled'}\n`;
    content += `  • Recommendations: ${store.recommendation_settings.showRecommendations ? 'Enabled' : 'Disabled'}\n`;
    
    content += `\n${'─'.repeat(60)}\n\n`;
  });
  
  return content;
}

export default router;
