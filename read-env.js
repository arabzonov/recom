import fs from 'fs';
import path from 'path';

console.log('Reading .env file...');

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log('=== .env file content ===');
  console.log(envContent);
  
  // Parse the .env file
  const envLines = envContent.split('\n');
  const envVars = {};
  
  for (const line of envLines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
  
  console.log('\n=== Parsed environment variables ===');
  console.log('ECWID_CLIENT_SECRET:', envVars.ECWID_CLIENT_SECRET);
  console.log('ECWID_CLIENT_ID:', envVars.ECWID_CLIENT_ID);
  console.log('ECWID_STORE_ID:', envVars.ECWID_STORE_ID);
  
  // Now test the payload with the actual client secret
  if (envVars.ECWID_CLIENT_SECRET) {
    console.log('\n=== Testing payload with actual client secret ===');
    const payload = '4hy1id9Lkfzoj9vhE0OZ6gCVNNhw5DFUcDOBdAd80uY704sAC3nN5yDe28GMK8LfSj9GtQYrdb7yQIi_Lld3LgWgZLKbByR81SRTHqDkHkKXNNJ0svhaUENhJyzRe18FxDkgwllQZqyTsrBkR8-4sXE6WgHK7bbJptQYpCj3QPtXEs5jZ-b8JxzESweFcfPguEUhLXz5IBQ6oVhSJ196jL-YGnr4rzy8txXZda9cJo-BXS4sTiran2urdeolxnkdD1BrO45GhF8dpbsuRJmAqXN5CT_D43OElpGcUEEeue5A6wF3nz3eGdTm8iBhRECf2NGJbzBKsEAFj8g258Hx9A';
    
    console.log('Payload length:', payload.length);
    console.log('Client secret length:', envVars.ECWID_CLIENT_SECRET.length);
    
    // Try URL-safe base64 decoding first
    try {
      const urlSafePayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = urlSafePayload + '='.repeat((4 - urlSafePayload.length % 4) % 4);
      
      const decoded = Buffer.from(paddedPayload, 'base64').toString('utf8');
      console.log('✅ URL-safe base64 decoded successfully');
      console.log('Decoded (first 200 chars):', decoded.substring(0, 200));
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(decoded);
        console.log('✅ JSON parsed successfully');
        console.log('JSON data:', JSON.stringify(jsonData, null, 2));
        
        if (jsonData.storeId || jsonData.store_id) {
          console.log('🎯 Store ID found in JSON:', jsonData.storeId || jsonData.store_id);
        }
      } catch (jsonError) {
        console.log('❌ Not valid JSON');
        
        // Try to extract store ID with regex
        const storeIdMatch = decoded.match(/(\d{6,})/);
        if (storeIdMatch) {
          console.log('🎯 Store ID extracted:', storeIdMatch[1]);
        }
      }
    } catch (error) {
      console.log('❌ URL-safe base64 failed:', error.message);
    }
  } else {
    console.log('❌ ECWID_CLIENT_SECRET not found in .env file');
  }
  
} catch (error) {
  console.log('❌ Error reading .env file:', error.message);
}
