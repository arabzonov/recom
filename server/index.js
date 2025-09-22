const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const ecwidRoutes = require('./routes/ecwid');
const oauthRoutes = require('./routes/oauth');

const app = express();

// Trust proxy for rate limiting and IP detection (required for ngrok/Render)
app.set('trust proxy', 1);

// Strict configuration validation - NO DEFAULTS
const PORT = process.env.PORT;
if (!PORT) {
  console.error('❌ PORT environment variable is required');
  process.exit(1);
}

// Main Application Server - Development Mode Only
console.log('🚀 Starting Main Application Server');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting - NO DEFAULTS
const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS;
const RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS;

if (!RATE_LIMIT_WINDOW_MS) {
  console.error('❌ RATE_LIMIT_WINDOW_MS environment variable is required');
  process.exit(1);
}

if (!RATE_LIMIT_MAX_REQUESTS) {
  console.error('❌ RATE_LIMIT_MAX_REQUESTS environment variable is required');
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
  console.error('❌ ALLOWED_ORIGINS environment variable is required');
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
  console.error('❌ LOG_LEVEL environment variable is required');
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

// Health check endpoint - NO DEFAULTS
const APP_VERSION = process.env.APP_VERSION;
if (!APP_VERSION) {
  console.error('❌ APP_VERSION environment variable is required');
  process.exit(1);
}

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: APP_VERSION
  });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
