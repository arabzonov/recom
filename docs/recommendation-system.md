# Product Recommendation System

This document explains how to use the product recommendation system that can be auto-inserted on Ecwid store frontend product pages.

## Overview

The recommendation system provides intelligent product suggestions based on:
- **Cross-sell recommendations**: Products frequently bought together based on order history
- **Upsell recommendations**: Higher-priced products in the same category (20%+ more expensive)
- **Category fallback**: Most expensive products in the same category
- **Global fallback**: Most expensive products globally

## Features

- ✅ Toggle on/off from the app dashboard
- ✅ Configurable maximum number of recommendations (1-10)
- ✅ Enable/disable cross-sell and upsell recommendations separately
- ✅ Automatic store and product detection
- ✅ Responsive design that works on all devices
- ✅ Easy integration with any Ecwid store

## Setup Instructions

### 1. Database Migration

First, run the database migration to add the recommendation settings column:

```sql
-- Run this SQL command in your database
ALTER TABLE stores ADD COLUMN recommendation_settings TEXT DEFAULT '{}';
```

### 2. App Configuration

The recommendation system is automatically integrated into your app dashboard. Store owners can:

1. Navigate to the app dashboard
2. Use the "Recommendation Settings" section to:
   - Enable/disable recommendations
   - Configure maximum number of recommendations
   - Toggle cross-sell and upsell recommendations
   - Save settings

### 3. Store Integration

There are two ways to integrate the recommendation block into your Ecwid store:

#### Option A: HTML Block (Recommended)

Add this HTML block to your store's custom code or theme:

```html
<!-- Include the recommendation block -->
<script src="https://your-app-domain.com/ecwid-recommendation-script.js"></script>
```

#### Option B: Direct HTML

If you prefer to include the HTML directly, add this to your product page template:

```html
<iframe 
    src="https://your-app-domain.com/blocks/recommendation-block.html" 
    width="100%" 
    height="auto" 
    frameborder="0"
    style="border: none; min-height: 200px;">
</iframe>
```

## API Endpoints

### Get Recommendations
```
GET /api/ecwid/recommendations/{storeId}/{productId}
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "ecwid_product_id": "12345",
      "name": "Product Name",
      "price": 29.99,
      "image_url": "https://example.com/image.jpg",
      "sku": "SKU123"
    }
  ]
}
```

### Get Recommendation Settings
```
GET /api/ecwid/recommendation-settings/{storeId}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "enabled": true,
    "showOnProductPages": true,
    "maxRecommendations": 3,
    "showCrossSell": true,
    "showUpsell": true
  }
}
```

### Update Recommendation Settings
```
POST /api/ecwid/recommendation-settings/{storeId}
```

**Request Body:**
```json
{
  "enabled": true,
  "showOnProductPages": true,
  "maxRecommendations": 3,
  "showCrossSell": true,
  "showUpsell": true
}
```

## Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | false | Enable/disable recommendations globally |
| `showOnProductPages` | boolean | true | Show recommendations on product pages |
| `maxRecommendations` | number | 3 | Maximum number of recommendations (1-10) |
| `showCrossSell` | boolean | true | Enable cross-sell recommendations |
| `showUpsell` | boolean | true | Enable upsell recommendations |

## Recommendation Logic

The system uses a hierarchical approach to generate recommendations:

1. **Cross-sell Analysis**: Analyzes order history to find products frequently bought together
2. **Upsell Detection**: Finds products 20%+ more expensive in the same category
3. **Category Fallback**: Shows most expensive products in the same category
4. **Global Fallback**: Shows most expensive products globally

## Styling

The recommendation block uses modern CSS with:
- Responsive grid layout
- Hover effects
- Clean typography
- Consistent spacing
- Mobile-friendly design

You can customize the appearance by overriding the CSS classes:
- `.ecwid-recommendation-block`
- `.recommendation-item`
- `.product-name`
- `.product-price`

## Troubleshooting

### Recommendations Not Showing

1. Check if recommendations are enabled in the app dashboard
2. Verify the store ID is correctly detected
3. Ensure the product ID is available
4. Check browser console for errors

### Store ID Detection

The script uses proper Ecwid SDK methods to detect the store ID:

**For Storefront Pages:**
```javascript
// Get store ID using Ecwid SDK
const storeId = Ecwid.getStoreId();
```

**For Admin Iframe Context:**
```javascript
// Get store ID from SDK settings
EcwidApp.getSettings((settings) => {
  console.log(settings.storeId);
});
```

### Product ID Detection

The script uses proper Ecwid SDK methods to detect the product ID:

```javascript
// Listen for product page changes
Ecwid.OnAPILoaded.add(() => {
  Ecwid.OnPageLoaded.add((page) => {
    if (page.type === 'product') {
      console.log('Product ID:', page.product.id);
    }
  });
});
```

## Performance Considerations

- Recommendations are cached in the database
- API calls are optimized with retry logic
- CSS is injected only once per page
- Minimal JavaScript footprint

## Security

- All API endpoints require store authentication
- Settings are stored securely in the database
- No sensitive data is exposed to the frontend
- CORS is properly configured

## Support

For technical support or questions about the recommendation system, please contact the development team or check the application logs for detailed error information.
