import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import StoreService from '../data/StoreService.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const storeService = new StoreService();

// Middleware to get store credentials
const getStoreCredentials = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: 'Store ID is required'
      });
    }

    const store = await storeService.findByStoreId(storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    if (!store.access_token) {
      return res.status(401).json({
        success: false,
        error: 'Store not authenticated. OAuth setup required.'
      });
    }

    req.store = store;
    next();
  } catch (error) {
    logger.error('Error in getStoreCredentials middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Check sync status for a store
 */
router.get('/status/:storeId', getStoreCredentials, async (req, res) => {
  try {
    const { storeId } = req.params;
    
    logger.info('Checking sync status for store', { storeId });
    
    const syncStatus = await storeService.checkSyncStatus(storeId);
    
    res.json({
      success: true,
      syncStatus
    });
  } catch (error) {
    logger.error('Error checking sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check sync status'
    });
  }
});

/**
 * Trigger sync for all stores
 */
router.post('/trigger', async (req, res) => {
  try {
    logger.info('Triggering sync for all stores');
    
    // Get the path to the sync script
    const syncScriptPath = path.join(__dirname, '../../scripts/background/sync-all-stores.js');
    
    // Spawn the sync script as a child process
    const syncProcess = spawn('node', [syncScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let output = '';
    let errorOutput = '';

    // Capture stdout
    syncProcess.stdout.on('data', (data) => {
      const message = data.toString();
      output += message;
      logger.info('Sync script output:', message.trim());
    });

    // Capture stderr
    syncProcess.stderr.on('data', (data) => {
      const message = data.toString();
      errorOutput += message;
      logger.error('Sync script error:', message.trim());
    });

    // Handle process completion
    syncProcess.on('close', (code) => {
      if (code === 0) {
        logger.info('Sync completed successfully');
        res.json({
          success: true,
          message: 'Sync completed successfully',
          output: output.trim()
        });
      } else {
        logger.error('Sync failed with exit code:', code);
        res.status(500).json({
          success: false,
          error: 'Sync failed',
          output: output.trim(),
          errorOutput: errorOutput.trim(),
          exitCode: code
        });
      }
    });

    // Handle process errors
    syncProcess.on('error', (error) => {
      logger.error('Error spawning sync process:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start sync process',
        details: error.message
      });
    });

    // Set a timeout for the sync process (30 minutes)
    const timeout = setTimeout(() => {
      if (!syncProcess.killed) {
        syncProcess.kill('SIGTERM');
        res.status(408).json({
          success: false,
          error: 'Sync process timed out after 30 minutes'
        });
      }
    }, 30 * 60 * 1000);

    // Clear timeout when process completes
    syncProcess.on('close', () => {
      clearTimeout(timeout);
    });

  } catch (error) {
    logger.error('Error triggering sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger sync'
    });
  }
});

export default router;
