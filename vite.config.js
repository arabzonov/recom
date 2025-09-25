import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './client',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      'ec.1nax.app',
      'localhost',
      '127.0.0.1'
    ],
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward all headers including CORS headers
            if (req.headers.origin) {
              proxyReq.setHeader('Origin', req.headers.origin);
            }
            if (req.headers['access-control-request-method']) {
              proxyReq.setHeader('Access-Control-Request-Method', req.headers['access-control-request-method']);
            }
            if (req.headers['access-control-request-headers']) {
              proxyReq.setHeader('Access-Control-Request-Headers', req.headers['access-control-request-headers']);
            }
          });
        }
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
});
