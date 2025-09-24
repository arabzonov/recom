import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import ecwidRoutes from './routes/ecwid.js';

// Configure dotenv
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for rate limiting and IP detection (required for ngrok/Render)
app.set('trust proxy', 1);

// Strict configuration validation - NO DEFAULTS
const PORT = process.env.PORT;
if (!PORT) {
  process.exit(1);
}

// Main Application Server - Development Mode Only

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://connect.facebook.net", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.ecwid.com", "https://images-cdn.ecwid.com"],
      connectSrc: ["'self'", "https://*.ecwid.com", "https://vigorously-loving-pug.ngrok-free.app"],
      frameSrc: ["'self'", "https://app.ecwid.com"],
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
const RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS;

if (!RATE_LIMIT_WINDOW_MS) {
  process.exit(1);
}

if (!RATE_LIMIT_MAX_REQUESTS) {
  process.exit(1);
}

const limiter = rateLimit({
  windowMs: parseInt(RATE_LIMIT_WINDOW_MS),
  max: parseInt(RATE_LIMIT_MAX_REQUESTS),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy is already set above, so this will work correctly
});
app.use('/api/', limiter);

// CORS configuration - NO DEFAULTS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;
if (!ALLOWED_ORIGINS) {
  process.exit(1);
}

const allowedOrigins = ALLOWED_ORIGINS.split(',');
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Logging - NO DEFAULTS
const LOG_LEVEL = process.env.LOG_LEVEL;
if (!LOG_LEVEL) {
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

// Redirect route for ec.1nax.app to preserve Ecwid context
app.get('/redirect', (req, res) => {
  const targetUrl = 'https://vigorously-loving-pug.ngrok-free.app/';
  
  // Preserve all query parameters
  const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  
  // Build the final URL
  const finalUrl = targetUrl + searchParams;
  
  
  // Perform the redirect
  res.redirect(302, finalUrl);
});

// Root redirect for ec.1nax.app (when accessed directly)
app.get('/', (req, res) => {
  // Check if this is a request from Ecwid (has payload parameter)
  if (req.query.payload || req.query.lang) {
    const targetUrl = 'https://vigorously-loving-pug.ngrok-free.app/';
    
    // Preserve all query parameters
    const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    // Build the final URL
    const finalUrl = targetUrl + searchParams;
    
    
    // Perform the redirect
    res.redirect(302, finalUrl);
  } else {
    // For other requests, serve the normal React app
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

// Health check endpoint - NO DEFAULTS
const APP_VERSION = process.env.APP_VERSION;
if (!APP_VERSION) {
  process.exit(1);
}

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
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    app.listen(PORT, () => {
      // Server started
    });
  } catch (error) {
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

startServer();
