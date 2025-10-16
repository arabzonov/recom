import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './config/database.js';

// Load environment variables from .env file
dotenv.config();

// Simple logger for server - NO CONSOLE.LOG
const logger = {
  info: (message, data) => {
    const timestamp = new Date().toISOString();
    if (data) {
      process.stdout.write(`[${timestamp}] [INFO] ${message} ${JSON.stringify(data)}\n`);
    } else {
      process.stdout.write(`[${timestamp}] [INFO] ${message}\n`);
    }
  },
  warn: (message, data) => {
    const timestamp = new Date().toISOString();
    if (data) {
      process.stdout.write(`[${timestamp}] [WARN] ${message} ${JSON.stringify(data)}\n`);
    } else {
      process.stdout.write(`[${timestamp}] [WARN] ${message}\n`);
    }
  },
  error: (message, data) => {
    const timestamp = new Date().toISOString();
    if (data) {
      process.stderr.write(`[${timestamp}] [ERROR] ${message} ${JSON.stringify(data)}\n`);
    } else {
      process.stderr.write(`[${timestamp}] [ERROR] ${message}\n`);
    }
  },
  debug: (message, data) => {
    const timestamp = new Date().toISOString();
    if (data) {
      process.stdout.write(`[${timestamp}] [DEBUG] ${message} ${JSON.stringify(data)}\n`);
    } else {
      process.stdout.write(`[${timestamp}] [DEBUG] ${message}\n`);
    }
  }
};

import ecwidRoutes from './routes/ecwid.js';
import oauthRoutes from './routes/oauth.js';
import recommendationRoutes from './routes/recommendations.js';
import recommendationSettingsRoutes from './routes/recommendation-settings.js';
import syncRoutes from './routes/sync.js';
import storeStatsRoutes from './routes/store-stats.js';
import publicStatsRoutes from './routes/public-stats.js';

// Configure dotenv
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// CORS middleware - MUST be first, before any other middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow all origins - Ecwid storefronts can be on any domain
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.removeHeader('Access-Control-Allow-Credentials');
  
  // Handle preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return; // Don't call next() - we're done
  }
  
  // For all other requests, continue to next middleware
  next();
});

// Strict configuration validation - NO DEFAULTS
const NODE_ENV = process.env.NODE_ENV;
if (!NODE_ENV) {
  console.error('ERROR: NODE_ENV environment variable is required');
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

// Serve ec.js and ec.css with CORS headers BEFORE security middleware
app.get('/ec.js', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, '../client/public/ec.js'));
});

app.get('/ec.css', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, '../client/public/ec.css'));
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://connect.facebook.net", "https://www.googletagmanager.com", "https://app.ecwid.com", "https://*.ecwid.com", "https://*.cloudfront.net", "https://djqizrxa6f10j.cloudfront.net", "https://ec.1nax.app"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://*.ecwid.com", "https://fonts.googleapis.com", "https://ec.1nax.app"],
      imgSrc: ["'self'", "data:", "https://*.ecwid.com", "https://images-cdn.ecwid.com"],
      connectSrc: ["'self'", "https://*.ecwid.com", "https://ec.1nax.app", "https://*.cloudfront.net"],
      frameSrc: ["'self'", "https://app.ecwid.com", "https://*.ecwid.com"],
      frameAncestors: ["'self'", "https://app.ecwid.com", "https://*.ecwid.com", "https://*.1nax.app"],
      fontSrc: ["'self'", "https://*.ecwid.com", "https://fonts.gstatic.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Rate limiting - NO DEFAULTS
const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS;
if (!RATE_LIMIT_WINDOW_MS) {
  console.error('ERROR: RATE_LIMIT_WINDOW_MS environment variable is required');
  process.exit(1);
}

const RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS;
if (!RATE_LIMIT_MAX_REQUESTS) {
  console.error('ERROR: RATE_LIMIT_MAX_REQUESTS environment variable is required');
  process.exit(1);
}

const limiter = rateLimit({
  windowMs: parseInt(RATE_LIMIT_WINDOW_MS),
  max: parseInt(RATE_LIMIT_MAX_REQUESTS),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration - NO DEFAULTS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;
if (!ALLOWED_ORIGINS) {
  console.error('ERROR: ALLOWED_ORIGINS environment variable is required');
  process.exit(1);
}


// Logging - NO DEFAULTS
const LOG_LEVEL = process.env.LOG_LEVEL;
if (!LOG_LEVEL) {
  console.error('ERROR: LOG_LEVEL environment variable is required');
  process.exit(1);
}
app.use(morgan(LOG_LEVEL));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/ecwid', ecwidRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/ecwid/recommendations', recommendationRoutes);
app.use('/api/ecwid/recommendation-settings', recommendationSettingsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/store-stats', storeStatsRoutes);
app.use('/stats', publicStatsRoutes);

// Proxy endpoint to fetch product details (including options)
app.get('/api/proxy/product/:storeId/:productId', async (req, res) => {
  try {
    const { storeId, productId } = req.params;
    const { StoreService } = await import('./data/index.js');
    const storeService = new StoreService();
    const store = await storeService.findByStoreId(storeId);
    if (!store || !store.access_token) {
      return res.status(404).json({ success: false, error: 'Store not found or not authenticated' });
    }
    const EcwidApiService = (await import('./services/EcwidApiService.js')).default;
    const product = await EcwidApiService.getProduct(storeId, store.access_token, productId);
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch product details' });
  }
});

// Proxy endpoint to handle CORS for frontend - get settings
app.get('/api/proxy/recommendations/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    logger.info(`[PROXY] Request received for store ${storeId}`);
    logger.info(`[PROXY] Origin: ${req.headers.origin}`);
    logger.info(`[PROXY] User-Agent: ${req.headers['user-agent']}`);
    logger.info(`[PROXY] Headers: ${JSON.stringify(req.headers)}`);
    
    // Import StoreService to fetch actual settings
    const { StoreService } = await import('./data/index.js');
    const storeService = new StoreService();
    
    // Default settings
    const defaultSettings = {
      showUpsells: false,
      showCrossSells: false,
      showRecommendations: false,
      upsellLocations: {
        productPage: false,
        cartPage: false
      },
      crossSellLocations: {
        cartPage: false,
        checkoutPage: false
      },
      recommendationLocations: {
        categoryPage: false,
        productPage: false,
        thankYouPage: false
      }
    };
    
    // Get settings from database
    let settings = defaultSettings;
    try {
      const dbSettings = await storeService.getRecommendationSettings(storeId);
      
      if (dbSettings) {
        settings = dbSettings;
        logger.info(`[PROXY] Found settings for store ${storeId}`, settings);
      } else {
        logger.info(`[PROXY] No settings found for store ${storeId}, using defaults`);
      }
    } catch (dbError) {
      logger.error(`[PROXY] Error fetching settings for store ${storeId}`, dbError);
      // Continue with default settings
    }
    
    const response = {
      success: true,
      settings: settings
    };
    
    logger.info(`[PROXY] Returning settings for store ${storeId}`, response);
    
    // Return JSON response with CORS headers already set by middleware
    res.json(response);
    
  } catch (error) {
    logger.error('[PROXY] Proxy request failed', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Proxy endpoint to handle CORS for frontend - get recommendations
app.get('/api/proxy/recommendations/:storeId/:productId', async (req, res) => {
  try {
    const { storeId, productId } = req.params;
    
    logger.info(`[PROXY] Recommendations request received for store ${storeId}, product ${productId}`);
    logger.info(`[PROXY] Origin: ${req.headers.origin}`);
    logger.info(`[PROXY] User-Agent: ${req.headers['user-agent']}`);
    
    // Import services to fetch recommendations
    const { StoreService } = await import('./data/index.js');
    const RecommendationService = (await import('./data/RecommendationService.js')).default;
    
    const storeService = new StoreService();
    const recommendationService = new RecommendationService();
    
    // Check if store exists and is authenticated
    const store = await storeService.findByStoreId(storeId);
    if (!store) {
      logger.warn(`[PROXY] Store ${storeId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    if (!store.access_token) {
      logger.warn(`[PROXY] Store ${storeId} not authenticated`);
      return res.status(401).json({
        success: false,
        error: 'Store not authenticated'
      });
    }
    
    // Get product recommendations
    const recommendations = await recommendationService.getProductRecommendations(storeId, productId);
    
    const response = {
      success: true,
      recommendations: recommendations
    };
    
    logger.info(`[PROXY] Returning recommendations for store ${storeId}, product ${productId}`, { count: recommendations.length });
    
    // Return JSON response with CORS headers already set by middleware
    res.json(response);
    
  } catch (error) {
    logger.error('[PROXY] Recommendations request failed', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check endpoint - NO DEFAULTS
const APP_VERSION = process.env.APP_VERSION;
if (!APP_VERSION) {
  console.error('ERROR: APP_VERSION environment variable is required');
  process.exit(1);
}

// Proxy endpoint to handle CORS for frontend - get all products for store
app.get('/api/proxy/products/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    logger.info(`[PROXY] All products request received for store ${storeId}`);
    
    // Import services
    const { StoreService } = await import('./data/index.js');
    const ProductService = (await import('./data/ProductService.js')).default;
    
    const storeService = new StoreService();
    const productService = new ProductService();
    
    // Check if store exists and is authenticated
    const store = await storeService.findByStoreId(storeId);
    if (!store) {
      logger.warn(`[PROXY] Store ${storeId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    if (!store.access_token) {
      logger.warn(`[PROXY] Store ${storeId} not authenticated`);
      return res.status(401).json({
        success: false,
        error: 'Store not authenticated'
      });
    }
    
    // Get all products for the store (limited to 3 for recommendations)
    const products = await productService.findByStoreId(storeId, { limit: 3 });
    logger.info(`[PROXY] Returning ${products.length} products for store ${storeId}`);
    
    const response = {
      success: true,
      products: products
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('[PROXY] All products request failed', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Proxy endpoint to handle CORS for frontend - get category recommendations
app.get('/api/proxy/recommendations/category/:storeId/:categoryId', async (req, res) => {
  try {
    const { storeId, categoryId } = req.params;
    
    logger.info(`[PROXY] Category recommendations request received for store ${storeId}, category ${categoryId}`);
    
    // Import services to fetch category recommendations
    const { StoreService } = await import('./data/index.js');
    const CategoryService = (await import('./data/CategoryService.js')).default;
    const ProductService = (await import('./data/ProductService.js')).default;
    
    const storeService = new StoreService();
    const categoryService = new CategoryService();
    const productService = new ProductService();
    
    // Check if store exists and is authenticated
    const store = await storeService.findByStoreId(storeId);
    if (!store) {
      logger.warn(`[PROXY] Store ${storeId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    if (!store.access_token) {
      logger.warn(`[PROXY] Store ${storeId} not authenticated`);
      return res.status(401).json({
        success: false,
        error: 'Store not authenticated'
      });
    }
    
    // Get category recommendations
    const recommendationIds = await categoryService.getCategoryRecommendations(storeId, categoryId);
    logger.info(`[PROXY] Found ${recommendationIds.length} recommendation IDs for category ${categoryId}`);
    
    let recommendations = [];
    if (recommendationIds.length > 0) {
      recommendations = await productService.findByStoreAndEcwidIds(storeId, recommendationIds);
      logger.info(`[PROXY] Returning ${recommendations.length} category recommendations for store ${storeId}, category ${categoryId}`);
    }
    
    const response = {
      success: true,
      recommendations: recommendations
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('[PROXY] Category recommendations request failed', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: APP_VERSION
  });
});

// Serve React app for all other non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    console.log('🔧 Starting server initialization...');
    console.log('🔧 Checking database imports...');
    console.log('🔧 initializeDatabase function:', typeof initializeDatabase);
    console.log('🔧 closeDatabase function:', typeof closeDatabase);
    
    if (typeof initializeDatabase !== 'function') {
      throw new Error('initializeDatabase is not a function');
    }
    
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 1Recom Application Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 API Base URL: ${process.env.NODE_ENV === 'production' ? process.env.API_BASE_URL || 'https://recom-mqxd.onrender.com' : `http://localhost:${PORT}`}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

startServer();