import express from 'express';

const app = express();

// Get configuration from environment variables
const PORT = process.env.PORT || 3001;
const NGROK_URL = process.env.NGROK_URL;

// Validate required environment variables
if (!PORT) {
  process.exit(1);
}

if (!NGROK_URL) {
  process.exit(1);
}

// Middleware to redirect all requests to ngrok
app.use('*', (req, res) => {
  const fullUrl = `${NGROK_URL}${req.originalUrl}`;
  res.redirect(302, fullUrl);
});

// Start the server
const server = app.listen(PORT, () => {
  // Server started successfully
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});