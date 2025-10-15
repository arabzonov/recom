# 🚀 Production Deployment Guide for Render

## Quick Fix for "simple-redirect-server.js" Error

If you're getting the error about `simple-redirect-server.js`, follow these steps:

### 1. Clear Render Cache
1. Go to your Render dashboard
2. Click on your service
3. Go to "Settings" tab
4. Click "Clear Build Cache"
5. Deploy again

### 2. Verify Configuration Files
Make sure these files exist in your repository root:
- ✅ `render.yaml` - Render service configuration
- ✅ `Procfile` - Specifies start command
- ✅ `.renderignore` - Excludes unnecessary files

### 3. Update Render Service Settings
In your Render dashboard, verify these settings:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm run start:production
```

**Environment Variables:**
```bash
NODE_ENV=production
PORT=10000
```

### 4. Environment Variables Setup
Set these in your Render dashboard (Environment tab):

```bash
# Required
NODE_ENV=production
PORT=10000
APP_VERSION=1.0.0

# Ecwid Configuration (replace with your values)
ECWID_CLIENT_ID=your_actual_client_id
ECWID_CLIENT_SECRET=your_actual_client_secret
ECWID_STORE_ID=your_actual_store_id

# OAuth (CRITICAL - update with your Render URL)
ECWID_REDIRECT_URI=https://your-app-name.onrender.com/api/oauth/callback
ECWID_SCOPES=read_catalog,read_orders,read_store_profile,update_catalog

# Database
DB_PATH=/opt/render/project/src/data/ecwid_plugin.db

# CORS (update with your Render URL)
ALLOWED_ORIGINS=https://your-app-name.onrender.com,https://ec.1nax.app

# Custom URLs (update with your Render URL)
CUSTOM_JS_URL=https://your-app-name.onrender.com/ec.js
CUSTOM_CSS_URL=https://your-app-name.onrender.com/ec.css

# Rate Limiting
RATE_LIMIT_WINDOW_MS=1000
RATE_LIMIT_MAX_REQUESTS=10

# Logging
LOG_LEVEL=combined
```

### 5. Update Ecwid App Configuration
In your Ecwid Developer Dashboard:
1. **App URL**: `https://your-app-name.onrender.com`
2. **Redirect URI**: `https://your-app-name.onrender.com/api/oauth/callback`
3. **Custom JS URL**: `https://your-app-name.onrender.com/ec.js`
4. **Custom CSS URL**: `https://your-app-name.onrender.com/ec.css`

### 6. Deploy Steps
1. **Push all changes to Git**
2. **Clear Render build cache**
3. **Trigger new deployment**
4. **Check logs** for any errors
5. **Test the application**

### 7. Troubleshooting

**If still getting redirect server error:**
1. Check if there's an old `simple-redirect-server.js` file in your repo
2. Verify your `package.json` start scripts
3. Ensure `Procfile` exists and is correct
4. Check Render service settings match the configuration

**Common Issues:**
- ❌ Wrong start command in Render settings
- ❌ Missing environment variables
- ❌ Cached build with old files
- ❌ Incorrect redirect URI in Ecwid

**Success Indicators:**
- ✅ Server starts with "🚀 1Recom Application Server running"
- ✅ Database initializes successfully
- ✅ No mention of "simple redirect server"
- ✅ OAuth flow works correctly

### 8. Monitoring
After deployment:
1. **Check Render logs** for startup messages
2. **Test OAuth flow** with a store
3. **Verify API endpoints** respond correctly
4. **Monitor database** creation and sync functionality

## Production Checklist
- [ ] Repository pushed to Git
- [ ] Render service configured correctly
- [ ] Environment variables set
- [ ] Build cache cleared
- [ ] Ecwid app URLs updated
- [ ] OAuth flow tested
- [ ] Database working
- [ ] API endpoints responding
- [ ] Sync functionality working
