# Ecwid SDK Setup

This document explains how to properly configure the Ecwid SDK for your app.

## Overview

The app now uses the official Ecwid SDK (`ecwid-app.js`) which is required for apps to function correctly within the Ecwid admin panel.

## Required Configuration

### 1. Set Your Client ID

You need to set your Ecwid app's client ID in the environment variables:

```bash
# In your .env file
ECWID_CLIENT_ID=your_actual_client_id_here
```

### 2. Update the HTML File

Run the following command to automatically update the HTML file with your client ID:

```bash
npm run update:ecwid-id
```

This will:
- Read the `ECWID_CLIENT_ID` from your `.env` file
- Update the `client/index.html` file with the correct app_id

### 3. Manual Configuration (Alternative)

If you prefer to set it manually, edit `client/index.html` and replace:

```javascript
app_id: "your-app-client-id"
```

with:

```javascript
app_id: "your_actual_client_id_here"
```

## How It Works

The Ecwid SDK integration includes:

1. **SDK Script**: Loads the official Ecwid SDK from `https://djqizrxa6f10j.cloudfront.net/ecwid-sdk/js/1.3.0/ecwid-app.js`

2. **App Initialization**: Calls `EcwidApp.init()` with:
   - `app_id`: Your app's client ID
   - `autoloadedflag: true`: Allows Ecwid to detect when your app is loaded
   - `autoheight: true`: Automatically adjusts the iframe height

3. **Automatic Detection**: The SDK handles all the communication with Ecwid's admin panel

## Troubleshooting

### App Still Shows Loading Spinner

1. **Check Client ID**: Ensure your `ECWID_CLIENT_ID` is correct in the `.env` file
2. **Run Update Script**: Run `npm run update:ecwid-id` to update the HTML
3. **Check Console**: Look for any JavaScript errors in the browser console
4. **Verify SDK Loading**: Check that the Ecwid SDK script loads without errors

### Common Issues

- **Wrong Client ID**: Make sure you're using the client_id from your Ecwid Developer Console, not the store ID
- **Network Issues**: Ensure the SDK script can load from the CDN
- **CORS Issues**: Check that your app domain is properly configured in your Ecwid app settings

## Development vs Production

- **Development**: Use your development client_id
- **Production**: Use your production client_id
- **Testing**: You can test with different client_ids by updating the `.env` file and running the update script

## Next Steps

After setting up the SDK:

1. Test your app in the Ecwid admin panel
2. Verify that the loading spinner disappears
3. Check that your app content displays correctly
4. Test all functionality to ensure everything works as expected
