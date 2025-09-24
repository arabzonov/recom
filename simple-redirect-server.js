const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Server-side redirect - no JavaScript needed
app.get('*', (req, res) => {
  const targetUrl = process.env.NGROK_URL || 'https://YOUR-NEW-NGROK-URL.ngrok-free.app/';
  const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const finalUrl = targetUrl + searchParams;
  
  // Comprehensive logging for redirects
  console.log('=== EZWID REDIRECT DEBUG ===');
  console.log('Original URL:', req.url);
  console.log('Target URL:', targetUrl);
  console.log('Search params:', searchParams);
  console.log('Final URL:', finalUrl);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('User Agent:', req.get('User-Agent'));
  console.log('Referer:', req.get('Referer'));
  console.log('IP Address:', req.ip);
  console.log('Timestamp:', new Date().toISOString());
  
  // Check for Ecwid-specific parameters
  if (req.query.payload) {
    console.log('=== EZWID PAYLOAD IN REDIRECT ===');
    console.log('Payload length:', req.query.payload.length);
    console.log('Payload (first 100 chars):', req.query.payload.substring(0, 100));
  }
  
  if (req.query.lang) {
    console.log('Language parameter:', req.query.lang);
  }
  
  console.log('=== END EZWID REDIRECT DEBUG ===');
  
  // Server-side redirect (302)
  res.redirect(302, finalUrl);
});

app.listen(PORT, () => {
  console.log(`🚀 Simple redirect server running on port ${PORT}`);
});
