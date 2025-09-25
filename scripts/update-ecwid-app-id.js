#!/usr/bin/env node

/**
 * Script to update the Ecwid app_id in the HTML file
 * This reads the ECWID_CLIENT_ID from environment and updates the HTML file
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

const clientId = process.env.ECWID_CLIENT_ID;

if (!clientId) {
  console.error('❌ ECWID_CLIENT_ID not found in environment variables');
  console.log('Please set ECWID_CLIENT_ID in your .env file');
  process.exit(1);
}

const htmlPath = path.join(__dirname, '..', 'client', 'index.html');

try {
  // Read the HTML file
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // Replace the placeholder with the actual client_id
  htmlContent = htmlContent.replace(
    'app_id: "your-app-client-id"',
    `app_id: "${clientId}"`
  );
  
  // Write the updated content back
  fs.writeFileSync(htmlPath, htmlContent);
  
  console.log('✅ Successfully updated Ecwid app_id in HTML file');
  console.log(`   Client ID: ${clientId}`);
  
} catch (error) {
  console.error('❌ Error updating HTML file:', error.message);
  process.exit(1);
}
