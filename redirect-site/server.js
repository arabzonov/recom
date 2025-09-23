import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Redirect route that preserves all parameters
app.get('*', (req, res) => {
    const targetUrl = 'https://vigorously-loving-pug.ngrok-free.app/';
    
    // Preserve all query parameters
    const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    // Build the final URL
    const finalUrl = targetUrl + searchParams;
    
    console.log('Redirecting from:', req.url);
    console.log('Redirecting to:', finalUrl);
    
    // Perform the redirect
    res.redirect(302, finalUrl);
});

app.listen(PORT, () => {
    console.log(`Redirect server running on port ${PORT}`);
});
