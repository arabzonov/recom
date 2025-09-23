const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Server-side redirect - no JavaScript needed
app.get('*', (req, res) => {
  const targetUrl = process.env.NGROK_URL || 'https://vigorously-loving-pug.ngrok-free.app/';
  const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const finalUrl = targetUrl + searchParams;
  
  console.log('🔄 Server redirect from:', req.url);
  console.log('🔄 Server redirect to:', finalUrl);
  
  // Server-side redirect (302)
  res.redirect(302, finalUrl);
});

app.listen(PORT, () => {
  console.log(`🚀 Simple redirect server running on port ${PORT}`);
});
