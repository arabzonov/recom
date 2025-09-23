#!/usr/bin/env node

/**
 * Redirect Server - Pure redirect proxy for Render deployment
 * This server has NO business logic, NO database, NO app dependencies
 * It only redirects all requests to the ngrok URL
 */

import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Strict configuration validation - NO DEFAULTS
const PORT = process.env.PORT;
const NGROK_URL = process.env.NGROK_URL;

if (!PORT) {
  console.error('❌ PORT environment variable is required');
  process.exit(1);
}

if (!NGROK_URL) {
  console.error('❌ NGROK_URL environment variable is required');
  process.exit(1);
}

console.log('🔄 Starting Redirect Server');
console.log(`📡 Redirecting all requests to: ${NGROK_URL}`);

// Basic logging
app.use(morgan('combined'));

// Redirect ALL requests to ngrok URL
app.all('*', (req, res) => {
  const fullUrl = `${NGROK_URL}${req.originalUrl}`;
  console.log(`🔄 Redirecting ${req.method} ${req.originalUrl} to ${fullUrl}`);
  res.redirect(301, fullUrl);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Redirect Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔄 All requests will be forwarded to: ${NGROK_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down redirect server gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down redirect server gracefully');
  process.exit(0);
});
