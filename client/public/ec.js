/**
 * Ecwid Custom App Script - STOREFRONT ONLY
 * 
 * This script is automatically injected by Ecwid into STOREFRONT pages only
 * when the custom app is installed. It provides product recommendations
 * using the proper Ecwid JS API methods.
 * 
 * NOTE: This script only runs on customer-facing storefront pages,
 * NOT in the admin backend area.
 * 
 * URL: https://ec.1nax.app/ec.js
 */


(function() {
    'use strict';
    

    // Configuration
    const CONFIG = {
        apiBase: 'https://ec.1nax.app/api/proxy',
        cssUrl: 'https://ec.1nax.app/ec.css'
    };

    /**
     * EcwidSDK Layer
     * Handles all interactions with Ecwid JavaScript API
     * Provides a clean interface for cart, page, and product operations
     * 
     * Only includes methods that actually exist in the Ecwid JavaScript API
     */
    class EcwidSDK {
        constructor() {
            this.isInitialized = false;
            this.storeId = null;
            this.currentPage = null;
            this.currentPageType = null;
            this.currentProductId = null;
            this.currentCategoryId = null;
            
            this.initPromise = null;
            this.pageLoadCallbacks = [];
            this.apiLoadCallbacks = [];
        }

        /**
         * Initialize the Ecwid SDK
         * @returns {Promise} Promise that resolves when SDK is ready
         */
        async init() {
            if (this.initPromise) {
                return this.initPromise;
            }

            this.initPromise = new Promise((resolve) => {
            if (window.Ecwid && window.Ecwid.OnAPILoaded) {
                window.Ecwid.OnAPILoaded.add(() => {
                        this.isInitialized = true;
                        this.storeId = window.Ecwid.getOwnerId();
                        
                        // Execute all API load callbacks
                        this.apiLoadCallbacks.forEach(callback => callback());
                        this.apiLoadCallbacks = [];
                        
                        resolve();
                });
            } else {
                    // Removed console.warn('[SDK] Ecwid API not available');
                    resolve();
                }
            });

            return this.initPromise;
        }

        /**
         * Add callback for when Ecwid API is loaded
         * @param {Function} callback 
         */
        onAPILoaded(callback) {
            if (this.isInitialized) {
                callback();
            } else {
                this.apiLoadCallbacks.push(callback);
            }
        }

        /**
         * Add callback for when page is loaded
         * @param {Function} callback 
         */
        onPageLoaded(callback) {
            this.pageLoadCallbacks.push(callback);
            
            if (window.Ecwid && window.Ecwid.OnPageLoaded) {
                window.Ecwid.OnPageLoaded.add((page) => {
                    this.currentPage = page;
                    this.currentPageType = page.type;
                    this.currentProductId = page.productId || null;
                    this.currentCategoryId = page.categoryId || null;
                    
                    // Execute all page load callbacks
                    this.pageLoadCallbacks.forEach(cb => cb(page));
                });
                    } else {
                // Removed console.warn('[SDK] OnPageLoaded not available');
            }
        }

        /**
         * Get the store ID
         * @returns {string|null}
         */
        getStoreId() {
            return this.storeId;
        }

        /**
         * Get current page type
         * @returns {string|null}
         */
        getCurrentPageType() {
            return this.currentPageType;
        }

        /**
         * Get current product ID
         * @returns {string|null}
         */
        getCurrentProductId() {
            return this.currentProductId;
        }

        /**
         * Get current category ID
         * @returns {string|null}
         */
        getCurrentCategoryId() {
            return this.currentCategoryId;
        }

        /**
         * Get current page data
         * @returns {Object|null}
         */
        getCurrentPage() {
            return this.currentPage;
        }

        /**
         * Get cart items using Ecwid Cart API
         * @returns {Promise<Array>} Array of cart items
         */
        async getCartItems() {
            
            if (!this.isInitialized || !window.Ecwid || !window.Ecwid.Cart) {
                // Removed console.warn('[SDK] Cannot get cart items - SDK not initialized or Cart API not available');
                return [];
            }

            try {
                // Try getItems first (synchronous)
                if (window.Ecwid.Cart.getItems) {
                    const items = window.Ecwid.Cart.getItems();
                    return items || [];
                }
                
                // Fallback to get method (asynchronous)
                if (window.Ecwid.Cart.get) {
                    return new Promise((resolve) => {
                        window.Ecwid.Cart.get((cart) => {
                            resolve(cart.items || []);
                        });
                    });
                }
                
                // Removed console.warn('[SDK] No cart methods available');
            } catch (error) {
                // Removed console.error('[SDK] Error getting cart items:', error);
            }
            
            return [];
        }

        /**
         * Add product to cart using Ecwid Cart API
         * @param {string|number} productId 
         * @param {Object} options - Product options
         * @returns {boolean} Success status
         */
        addToCart(productId, options = null) {
            
            if (!this.isInitialized || !window.Ecwid || !window.Ecwid.Cart) {
                // Removed console.warn('[SDK] Cannot add to cart - SDK not initialized or Cart API not available');
                return false;
            }

            try {
                if (options) {
                    window.Ecwid.Cart.addProduct({ id: productId, options: options });
                } else {
                    window.Ecwid.Cart.addProduct(productId);
                }
                return true;
            } catch (error) {
                // Removed console.error('[SDK] Error adding product to cart:', error);
                return false;
            }
        }

        /**
         * Open a page using Ecwid navigation API
         * @param {string} pageType - Type of page to open
         * @param {Object} params - Parameters for the page
         */
        openPage(pageType, params = {}) {
            
            if (!this.isInitialized || !window.Ecwid || !window.Ecwid.openPage) {
                // Removed console.warn('[SDK] Cannot open page - SDK not initialized or openPage API not available');
                        return;
                    }
                    
            try {
                window.Ecwid.openPage(pageType, params);
            } catch (error) {
                // Removed console.error('[SDK] Error opening page:', error);
            }
        }

        /**
         * Open product page using Ecwid navigation API
         * @param {string|number} productId 
         */
        openProductPage(productId) {
            this.openPage('product', { id: parseInt(productId) });
        }

        /**
         * Check if SDK is initialized
         * @returns {boolean}
         */
        isReady() {
            return this.isInitialized;
        }

        /**
         * Wait for SDK to be ready
         * @returns {Promise}
         */
        async waitForReady() {
            if (this.isInitialized) {
                return Promise.resolve();
            }
            return this.initPromise || this.init();
        }
    }

    /**
     * API Layer
     * Handles all backend API calls
     * Provides a clean interface for recommendation and product data
     */
    class RecommendationAPI {
        constructor(config) {
            this.config = config;
            this.apiBase = config.apiBase;
            this.storeId = null;
        }

        /**
         * Set the store ID
         * @param {string} storeId 
         */
        setStoreId(storeId) {
            this.storeId = storeId;
        }

        /**
         * Make API request with retry logic
         * @param {string} url 
         * @param {Object} options 
         * @returns {Promise<Response>}
         */
        async fetchWithRetry(url, options = {}) {
            const maxRetries = 3;
            let lastError;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });


                    if (response.ok) {
                        return response;
                    }

                    // If it's a server error (5xx), retry
                    if (response.status >= 500 && attempt < maxRetries) {
                        // Removed console.warn(`[API] Attempt ${attempt} failed with status ${response.status}, retrying...`);
                        await this.delay(1000 * attempt); // Exponential backoff
                        continue;
                    }

                    // If it's a client error (4xx), don't retry
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            } catch (error) {
                    lastError = error;
                    // Removed console.warn(`[API] Attempt ${attempt} failed:`, error.message);
                    
                    if (attempt < maxRetries) {
                        await this.delay(1000 * attempt);
                    }
                }
            }

            // Removed console.error('[API] All attempts failed, throwing error:', lastError);
            throw lastError;
        }

        /**
         * Delay utility with performance optimization
         * @param {number} ms 
         * @returns {Promise}
         */
        delay(ms) {
            return new Promise(resolve => {
                // Use requestIdleCallback if available for better performance
                if (window.requestIdleCallback) {
                    requestIdleCallback(() => setTimeout(resolve, ms));
                } else {
                    setTimeout(resolve, ms);
                }
            });
        }

        /**
         * Get recommendation settings
         * @returns {Promise<Object>}
         */
        async getRecommendationSettings() {
            
            if (!this.storeId) {
                // Removed // Removed console.error
                throw new Error('Store ID not set');
            }

            const url = `${this.apiBase}/recommendations/${this.storeId}`;
            
                const response = await this.fetchWithRetry(url);
                const data = await response.json();

            
            if (!data.success) {
                // Removed console.error('[API] Failed to get recommendation settings');
                throw new Error('Failed to get recommendation settings');
            }
            
            return data.settings;
        }

        /**
         * Get product recommendations
         * @param {string} productId 
         * @param {string} type - 'upsells' or 'crosssells'
         * @returns {Promise<Array>}
         */
        async getProductRecommendations(productId, type) {
            
            if (!this.storeId) {
                // Removed // Removed console.error
                throw new Error('Store ID not set');
            }

            const url = `${this.apiBase}/recommendations/${this.storeId}/${productId}?type=${type}`;
            
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            
            if (!data.success) {
                // Removed console.error(`[API] Failed to get ${type} recommendations`);
                throw new Error(`Failed to get ${type} recommendations`);
            }
            
            return data.recommendations || [];
        }

        /**
         * Get category recommendations
         * @param {string} categoryId 
         * @returns {Promise<Array>}
         */
        async getCategoryRecommendations(categoryId) {
            
            if (!this.storeId) {
                // Removed // Removed console.error
                throw new Error('Store ID not set');
            }

            const url = `${this.apiBase}/recommendations/category/${this.storeId}/${categoryId}`;
            
                const response = await this.fetchWithRetry(url);
                const data = await response.json();

            
            if (!data.success) {
                // Removed console.error('[API] Failed to get category recommendations');
                throw new Error('Failed to get category recommendations');
            }
            
            return data.recommendations || [];
        }

        /**
         * Get all products (fallback)
         * @returns {Promise<Array>}
         */
        async getAllProducts() {
            
            if (!this.storeId) {
                // Removed // Removed console.error
                throw new Error('Store ID not set');
            }

            const url = `${this.apiBase}/products/${this.storeId}`;
            
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            
            if (!data.success) {
                // Removed console.error('[API] Failed to get all products');
                throw new Error('Failed to get all products');
            }
            
            return data.products || [];
        }

        /**
         * Get product data
         * @param {string} productId 
         * @returns {Promise<Object>}
         */
        async getProduct(productId) {
            
            if (!this.storeId) {
                // Removed // Removed console.error
                throw new Error('Store ID not set');
            }

            const url = `${this.apiBase}/product/${this.storeId}/${productId}`;
            
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            
            if (!data.success) {
                // Removed console.error('[API] Failed to get product data');
                throw new Error('Failed to get product data');
            }
            
            return data.product;
        }

        /**
         * Enrich recommendations with product options
         * @param {Array} recommendations 
         * @returns {Promise<Array>}
         */
        async enrichRecommendationsWithOptions(recommendations) {
            
            try {
                const results = await Promise.all(recommendations.map(async (p, index) => {
                    try {
                        const productData = await this.getProduct(p.ecwid_product_id);
                        if (productData && productData.options) {
                            return { ...p, options: productData.options };
                        }
                    } catch (error) {
                        // Removed console.warn(`[API] Error getting product options for ${p.ecwid_product_id}:`, error);
                    }
                    return p;
                }));
                
                return results;
            } catch (error) {
                // Removed console.error('[API] Error enriching recommendations:', error);
                return recommendations;
            }
        }
    }

    class RecomApp {
        constructor() {
            this.isEnabled = false;
            this.initialized = false;
            this.recommendationBlockShown = false;
            this.upsellBlockShown = false;
            this.crossSellBlockShown = false;
            
            // Initialize layers
            this.sdk = new EcwidSDK();
            this.api = new RecommendationAPI(CONFIG);
            
            this.init();
        }

        async init() {
            this.loadStyles();
            await this.initializeLayers();
        }

        loadStyles() {
            if (!document.getElementById('ecwid-recommendation-styles')) {
                const link = document.createElement('link');
                link.id = 'ecwid-recommendation-styles';
                link.rel = 'stylesheet';
                link.href = CONFIG.cssUrl;
                document.head.appendChild(link);
            }
        }

        async initializeLayers() {
            try {
                // Initialize SDK
                await this.sdk.init();
                
                // Set store ID for API
                const storeId = this.sdk.getStoreId();
                if (storeId) {
                    this.api.setStoreId(storeId);
                }

                // Set up page load listener
                this.sdk.onPageLoaded((page) => {
                    this.handlePageLoad(page);
                });

                this.initialized = true;
            } catch (error) {
                // Removed console.error('[RECOM] Error initializing layers:', error);
            }
        }

        handlePageLoad(page) {
            
            // Check settings and show appropriate blocks based on page type
            this.checkPageSettings();
        }

        async checkPageSettings() {
            if (!this.initialized) {
                    return;
                }
                
            try {
                const settings = await this.api.getRecommendationSettings();
                const pageType = this.sdk.getCurrentPageType();
                

                if (pageType === 'CART') {
                    await this.checkCartSettings(settings);
                } else if (pageType === 'CHECKOUT') {
                    await this.checkCheckoutSettings(settings);
                } else if (pageType === 'PRODUCT') {
                    await this.checkProductSettings(settings);
                } else if (pageType === 'CATEGORY' || pageType === 'ORDER_CONFIRMATION') {
                    await this.checkRecommendationSettings(settings);
                    } else {
                }
            } catch (error) {
                // Removed console.error('[RECOM] Error checking page settings:', error);
            }
        }

        async checkCartSettings(settings) {
            const cartUpsellsEnabled = settings.showUpsells && settings.upsellLocations?.cartPage;
            const cartCrossSellsEnabled = settings.showCrossSells && settings.crossSellLocations?.cartPage;
            
            if (cartUpsellsEnabled || cartCrossSellsEnabled) {
                this.isEnabled = true;
                await this.showCartRecommendations(cartUpsellsEnabled, cartCrossSellsEnabled);
            }
        }

        async checkCheckoutSettings(settings) {
            const checkoutCrossSellsEnabled = settings.showCrossSells && settings.crossSellLocations?.checkoutPage;
            
            if (checkoutCrossSellsEnabled) {
                this.isEnabled = true;
                await this.showCrossSellRecommendations();
            }
        }

        async checkProductSettings(settings) {
            const productUpsellsEnabled = settings.showUpsells && settings.upsellLocations?.productPage;
            const productCrossSellsEnabled = settings.showCrossSells && settings.crossSellLocations?.productPage;
            
            if (productUpsellsEnabled) {
                this.isEnabled = true;
                await this.showRecommendations();
            }
            
            if (productCrossSellsEnabled) {
                await this.showCrossSellRecommendations();
            }
            
            // Also check for general recommendations on product page
            await this.checkRecommendationSettings(settings);
        }

        async checkRecommendationSettings(settings) {
            const recommendationsEnabled = settings.showRecommendations;
            const categoryPageEnabled = settings.recommendationLocations?.categoryPage;
            const productPageEnabled = settings.recommendationLocations?.productPage;
            const thankYouPageEnabled = settings.recommendationLocations?.thankYouPage;
            
            if (recommendationsEnabled) {
                const locationSettings = {
                    categoryPageEnabled,
                    productPageEnabled,
                    thankYouPageEnabled
                };
                await this.showRecommendationBlock(locationSettings);
            }
        }

        async showRecommendations() {
            const productId = this.sdk.getCurrentProductId();
            if (!productId) return;

            if (this.upsellBlockShown) return;

            try {
                const recommendations = await this.api.getProductRecommendations(productId, 'upsells');
                if (recommendations && recommendations.length > 0) {
                    const enriched = await this.api.enrichRecommendationsWithOptions(recommendations);
                    this.renderRecommendations(enriched);
                }
            } catch (error) {
                // Removed console.error('[RECOM] Error getting upsell recommendations:', error);
            }
        }

        async showCartRecommendations(upsellsEnabled, crossSellsEnabled) {
            
            try {
                const cartItems = await this.sdk.getCartItems();
                
                if (!cartItems || cartItems.length === 0) {
                    return;
                }

                const mostExpensiveProduct = this.findMostExpensiveProduct(cartItems);

                if (upsellsEnabled) {
                    const productId = mostExpensiveProduct.product.id;
                    const recommendations = await this.api.getProductRecommendations(productId, 'upsells');
                    
                    if (recommendations && recommendations.length > 0) {
                        const enriched = await this.api.enrichRecommendationsWithOptions(recommendations);
                        this.renderRecommendations(enriched);
                    }
                }

                if (crossSellsEnabled) {
                    const productId = mostExpensiveProduct.product.id;
                    const recommendations = await this.api.getProductRecommendations(productId, 'crosssells');
                    
                    if (recommendations && recommendations.length > 0) {
                        const enriched = await this.api.enrichRecommendationsWithOptions(recommendations);
                        this.renderCrossSellRecommendations(enriched);
                    }
                }
            } catch (error) {
                // Removed console.error('[RECOM] Error getting cart recommendations:', error);
            }
        }

        async showCrossSellRecommendations() {
            if (this.crossSellBlockShown) return;

            try {
                let productId = this.sdk.getCurrentProductId();
                
                if (!productId) {
                    const cartItems = await this.sdk.getCartItems();
                    if (!cartItems || cartItems.length === 0) return;
                    const mostExpensiveProduct = this.findMostExpensiveProduct(cartItems);
                    productId = mostExpensiveProduct.product.id;
                }
                
                const recommendations = await this.api.getProductRecommendations(productId, 'crosssells');
                if (recommendations && recommendations.length > 0) {
                    const enriched = await this.api.enrichRecommendationsWithOptions(recommendations);
                    this.renderCrossSellRecommendations(enriched);
                }
            } catch (error) {
                // Removed console.error('[RECOM] Error getting cross-sell recommendations:', error);
            }
        }

        async showRecommendationBlock(locationSettings) {
            const pageType = this.sdk.getCurrentPageType();
            let categoryId = null;


            if (pageType === 'ORDER_CONFIRMATION') {
                if (locationSettings.thankYouPageEnabled) {
                    categoryId = null; // Force fallback
                } else {
                    return; // Don't show recommendations if disabled
                }
            } else if (pageType === 'CATEGORY' && locationSettings.categoryPageEnabled) {
                categoryId = this.sdk.getCurrentCategoryId();
                if (!categoryId || categoryId === 0) {
                    categoryId = null;
                }
            } else if (pageType === 'CATEGORY') {
                return;
            } else if (pageType === 'PRODUCT' && locationSettings.productPageEnabled) {
                const productId = this.sdk.getCurrentProductId();
                if (productId) {
                    try {
                        const productData = await this.api.getProduct(productId);
                        if (productData.categoryIds && productData.categoryIds.length > 0) {
                            categoryId = productData.categoryIds[0];
                        } else if (productData.defaultCategoryId && productData.defaultCategoryId !== 0) {
                            categoryId = productData.defaultCategoryId;
                        }
                    } catch (error) {
                        // Removed console.error('[RECOM] Error getting product data:', error);
                    }
                }
            } else {
                return; // Don't show recommendations for unhandled page types
            }

            if (!categoryId) {
                try {
                    const products = await this.api.getAllProducts();
                    if (products && products.length > 0) {
                        const enriched = await this.api.enrichRecommendationsWithOptions(products);
                        this.renderRecommendationBlock(enriched);
                        this.recommendationBlockShown = true;
                    }
                } catch (error) {
                    // Removed console.error('[RECOM] Error in fallback:', error);
                }
                return;
            }

            try {
                const recommendations = await this.api.getCategoryRecommendations(categoryId);
                if (recommendations && recommendations.length > 0) {
                    const enriched = await this.api.enrichRecommendationsWithOptions(recommendations);
                    this.renderRecommendationBlock(enriched);
                    this.recommendationBlockShown = true;
                }
            } catch (error) {
                // Removed console.error('[RECOM] Error getting category recommendations:', error);
            }
        }

        findMostExpensiveProduct(cartItems) {
            
            let mostExpensive = null;
            let highestPrice = 0;

            cartItems.forEach(item => {
                
                // Handle different cart item structures
                let price = 0;
                if (item.price) {
                    price = parseFloat(item.price) || 0;
                } else if (item.product && item.product.price) {
                    price = parseFloat(item.product.price) || 0;
                }
                
                
                if (price > highestPrice) {
                    highestPrice = price;
                    mostExpensive = item;
                }
            });

            // If no price was found, just return the first item
            if (!mostExpensive && cartItems.length > 0) {
                mostExpensive = cartItems[0];
            }

            return mostExpensive;
        }

        renderRecommendations(recommendations) {
            if (this.upsellBlockShown) return;
            

            // Create the recommendation block
            const block = this.createRecommendationBlock(recommendations, 'You might also like');
            
            // Add recommendations to the block
            const grid = block.querySelector('.recom-grid');
            
            recommendations.forEach((product, index) => {
                const item = this.createRecommendationItem(product);
                grid.appendChild(item);
            });

            // Insert the block into the page
            this.insertRecommendationBlock(block, 'upsells');
            this.upsellBlockShown = true;
        }

        renderCrossSellRecommendations(recommendations) {
            if (this.crossSellBlockShown) return;
            

            // Create the recommendation block
            const block = this.createRecommendationBlock(recommendations, 'Frequently bought together');
            
            // Add recommendations to the block
            const grid = block.querySelector('.recom-grid');
            
            // Populate the grid with recommendation items
            recommendations.forEach((product, index) => {
                const item = this.createRecommendationItem(product);
                grid.appendChild(item);
            });
            
            this.insertRecommendationBlock(block, 'crosssells');
            this.crossSellBlockShown = true;
        }

        renderRecommendationBlock(recommendations) {
            if (this.recommendationBlockShown) return;
            

            // Create the recommendation block
            const block = this.createRecommendationBlock(recommendations, 'Recommended products');
            
            // Add recommendations to the block
            const grid = block.querySelector('.recom-grid');
            
            recommendations.forEach((product, index) => {
                const item = this.createRecommendationItem(product);
                grid.appendChild(item);
            });

            // Insert the block into the page
            this.insertRecommendationBlock(block, 'recommendations');
            this.recommendationBlockShown = true;
        }

        createRecommendationBlock(recommendations, title) {
            const block = document.createElement('div');
            block.className = 'recom-block';
            
            // Add page type data attribute for CSS targeting
            const pageType = this.sdk.getCurrentPageType();
            if (pageType) {
                block.setAttribute('data-page-type', pageType);
            }
            
            block.innerHTML = `
                <div class="recom-header">
                    <h3 class="recom-title">${title}</h3>
                    <div class="recom-divider"></div>
                </div>
                <div class="recom-grid"></div>
            `;
            return block;
        }


        createRecommendationItem(product) {
            
            const item = document.createElement('div');
            item.className = 'recom-item';
            
            // Use correct field names from API response
            const productId = product.ecwid_product_id;

            let imageHtml = '';
            if (product.image_url) {
                imageHtml = `
                    <div class="recom-image">
                        <img src="${product.image_url}" alt="${product.name}" 
                             onerror="this.style.display='none'">
                    </div>
                `;
            }

            const priceHtml = product.price ? 
                `<div class="recom-price">$${parseFloat(product.price).toFixed(2)}</div>` : '';

            const nameHtml = `<h4 class="recom-name">${product.name}</h4>`;

            const linkHtml = `
                <a class="recom-link" href="#" data-productid="${productId || ''}" data-productname="${product.name || ''}">
                    ${imageHtml}
                    ${nameHtml}
                    ${priceHtml}
                </a>
            `;

            // Render option selectors according to option type (inline)
            const basePrice = (typeof product.price === 'number') ? product.price : parseFloat(product.price || '0');
            let optionsHtml = '';
            const hasOptions = Array.isArray(product.options) && product.options.length > 0;
            if (hasOptions) {
                optionsHtml = '<div class="recom-options collapsed">\n  <div class="recom-options-header">Select options</div>\n  <div class="recom-options-body">';
                product.options.forEach((opt, idx) => {
                    const optionName = opt.name || `Option ${idx + 1}`;
                    const optionType = (opt.type || 'SELECT').toUpperCase();
                    const isRequired = !!opt.required;
                    const values = Array.isArray(opt.values) && opt.values.length > 0
                        ? opt.values
                        : (Array.isArray(opt.choices) ? opt.choices : []);

                    // Normalize values to objects { text, value, priceModifier, priceModifierType }
                    const normalized = values.map(v => {
                        if (typeof v === 'string') return { text: v, value: v };
                        return {
                            text: v.text,
                            value: v.value || v.text, // Use text as value if value is undefined
                            priceModifier: (typeof v.priceModifier === 'number') ? v.priceModifier : parseFloat(v.priceModifier || '0') || 0,
                            priceModifierType: (v.priceModifierType || '').toUpperCase() // 'ABSOLUTE' | 'PERCENT'
                        };
                    });


                    if (optionType === 'RADIO' || optionType === 'RADIO_BUTTONS') {
                        const nameAttr = `recom-option-${productId}-${idx}`;
                        optionsHtml += `<label class="recom-option-label">${optionName}${isRequired ? ' *' : ''}</label>`;
                        normalized.forEach((nv) => {
                            optionsHtml += `
                                <label class="recom-option-line">
                                  <input type="radio" class="recom-option-input" name="${nameAttr}" data-option-name="${optionName}" value="${nv.value}" ${isRequired ? 'data-required="true"' : ''}
                                    data-modifier-type="${nv.priceModifierType}" data-modifier-value="${isNaN(nv.priceModifier) ? '' : nv.priceModifier}">
                                  <span class="recom-option-text">${nv.text}</span>
                                </label>
                            `;
                        });
                    } else if (optionType === 'CHECKBOX' || optionType === 'CHECKBOXES') {
                        optionsHtml += `<label class="recom-option-label">${optionName}${isRequired ? ' *' : ''}</label>`;
                        normalized.forEach((nv) => {
                            optionsHtml += `
                                <label class="recom-option-line">
                                  <input type="checkbox" class="recom-option-input" data-option-name="${optionName}" value="${nv.value}" ${isRequired ? 'data-required="true"' : ''}
                                    data-modifier-type="${nv.priceModifierType}" data-modifier-value="${isNaN(nv.priceModifier) ? '' : nv.priceModifier}">
                                  <span class="recom-option-text">${nv.text}</span>
                                </label>
                            `;
                        });
                    } else if (optionType === 'TEXTFIELD' || optionType === 'TEXT') {
                        optionsHtml += `
                            <label class="recom-option-label">${optionName}${isRequired ? ' *' : ''}</label>
                            <input type="text" class="recom-option-input recom-option-text" data-option-name="${optionName}" ${isRequired ? 'data-required="true"' : ''}>
                        `;
                    } else if (optionType === 'TEXTAREA') {
                        optionsHtml += `
                            <label class="recom-option-label">${optionName}${isRequired ? ' *' : ''}</label>
                            <textarea class="recom-option-input recom-option-text" data-option-name="${optionName}" ${isRequired ? 'data-required="true"' : ''}></textarea>
                        `;
                    } else if (optionType === 'DATE' || optionType === 'DATETIME') {
                        optionsHtml += `
                            <label class="recom-option-label">${optionName}${isRequired ? ' *' : ''}</label>
                            <input type="date" class="recom-option-input recom-option-date" data-option-name="${optionName}" ${isRequired ? 'data-required="true"' : ''}>
                        `;
                    } else {
                        // Default to SELECT
                        const placeholder = `<option value="" selected>${isRequired ? 'Select...' : '—'}</option>`;
                        const optionsMarkup = placeholder + normalized.map(nv => `
                            <option value="${nv.value}" data-modifier-type="${nv.priceModifierType}" data-modifier-value="${isNaN(nv.priceModifier) ? '' : nv.priceModifier}">${nv.text}</option>
                        `).join('');
                        
                        optionsHtml += `
                            <label class="recom-option-label">${optionName}${isRequired ? ' *' : ''}</label>
                            <select class="recom-option-input recom-option-select" data-option-name="${optionName}" ${isRequired ? 'data-required="true"' : ''}>${optionsMarkup}</select>
                        `;
                    }
                });
                optionsHtml += '</div></div>';
            }

            const cartButtonHtml = `<button class="recom-cart-btn" onclick="event.preventDefault(); event.stopPropagation(); window['recomEcwidRecommendationBlock'].addToCartFromItem(this)">Add to cart</button>`;

            item.innerHTML = `
                    ${linkHtml}
                    ${hasOptions ? optionsHtml : ''}
                ${cartButtonHtml}
            `;

            // Store the product data on the item element for later use
            try {
                item.setAttribute('data-product-data', JSON.stringify(product));
            } catch (error) {
                // Removed console.error('[RECOM] Error storing product data on item', error);
            }

            // Attach SDK navigation to product page
            const linkEl = item.querySelector('.recom-link');
            if (linkEl && productId) {
                linkEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.Ecwid && window.Ecwid.openPage) {
                        window.Ecwid.openPage('product', { id: parseInt(productId) });
                    }
                }, { passive: false });
                
                // Add passive touchstart listener to prevent scroll blocking
                linkEl.addEventListener('touchstart', (e) => {
                    // Passive touchstart listener to prevent scroll blocking
                }, { passive: true });
            }

            // Toggle options roll-down
            const optionsRoot = item.querySelector('.recom-options');
            const optionsHeader = item.querySelector('.recom-options-header');
            if (optionsHeader && optionsRoot) {
                optionsHeader.addEventListener('click', (e) => {
                    e.preventDefault();
                    optionsRoot.classList.toggle('collapsed');
                }, { passive: false });
                
                // Add passive touchstart listener
                optionsHeader.addEventListener('touchstart', (e) => {
                    // Passive touchstart listener to prevent scroll blocking
                }, { passive: true });
            }

            // After rendering, attach option change listeners to update price
            this.attachOptionListenersAndPrice(item, basePrice);
            return item;
        }

        attachOptionListenersAndPrice(itemEl, basePrice) {
            const priceEl = itemEl.querySelector('.recom-price');
            if (!priceEl || isNaN(basePrice)) return;
            const update = () => {
                const newPrice = this.calculatePriceWithOptions(itemEl, basePrice);
                priceEl.textContent = `$${newPrice.toFixed(2)}`;
            };
            const inputs = itemEl.querySelectorAll('.recom-option-input');
            inputs.forEach(inp => {
                inp.addEventListener('change', update, { passive: true });
                inp.addEventListener('input', update, { passive: true });
            });
            update();
        }

        calculatePriceWithOptions(containerEl, basePrice) {
            let total = Number(basePrice) || 0;
            const applyModifier = (type, value) => {
                const val = parseFloat(value);
                if (isNaN(val)) return;
                const t = (type || '').toUpperCase();
                if (t === 'PERCENT') {
                    total += (Number(basePrice) * (val / 100));
                } else if (t === 'ABSOLUTE') {
                    total += val;
                }
            };
            // Selects
            containerEl.querySelectorAll('select.recom-option-select').forEach(sel => {
                const opt = sel.options[sel.selectedIndex];
                if (!opt) return;
                applyModifier(opt.dataset.modifierType, opt.dataset.modifierValue);
            });
            // Radios
            containerEl.querySelectorAll('input.recom-option-input[type="radio"]').forEach(r => {
                if (r.checked) applyModifier(r.dataset.modifierType, r.dataset.modifierValue);
            });
            // Checkboxes
            containerEl.querySelectorAll('input.recom-option-input[type="checkbox"]').forEach(c => {
                if (c.checked) applyModifier(c.dataset.modifierType, c.dataset.modifierValue);
            });
            return total;
        }

        insertRecommendationBlock(block, type) {
            
            const pageType = this.sdk.getCurrentPageType();
            
            // Look for footer elements first - insert before footer on all pages
            const footer = document.querySelector('footer, .footer, .ec-footer, .ecwid-footer');
            
            // Look for continue shopping button (specific to thank you page)
            const continueShoppingBtn = document.querySelector('a[href*="continue"], .continue-shopping, [data-testid*="continue"]');
            
            let inserted = false;
            
            // Try to insert before footer on all pages
            if (footer) {
                footer.parentNode.insertBefore(block, footer);
                inserted = true;
            } 
            // For thank you page, try to insert after continue shopping button if no footer
            else if (pageType === 'ORDER_CONFIRMATION' && continueShoppingBtn) {
                continueShoppingBtn.parentNode.insertBefore(block, continueShoppingBtn.nextSibling);
                inserted = true;
            }
            // Fallback insertion strategies
            else {
                const insertionPoints = [
                    document.querySelector('.ec-wrapper'),
                    document.querySelector('.ecwid-product-details'),
                    document.querySelector('.ecwid-product'),
                    document.querySelector('#ecwid-product'),
                    document.querySelector('.product-details'),
                    document.querySelector('.product-info'),
                    document.querySelector('main'),
                    document.querySelector('.content'),
                    document.body
                ];

                for (const point of insertionPoints) {
                    if (point) {
                        point.appendChild(block);
                        inserted = true;
                        break;
                    }
                }
            }
            
            if (inserted) {
                
                // Log the complete HTML after insertion
                
                // Log detailed structure of each item
                const items = block.querySelectorAll('.recom-item');
                items.forEach((item, index) => {
                    // Items are now properly structured
                });
            }
        }

        addToCartFromItem(button) {
            const itemElement = button.closest('.recom-item');
            if (!itemElement) return;

            const productData = JSON.parse(itemElement.dataset.productData);
            const productId = productData.ecwid_product_id;
            const hasOptions = Array.isArray(productData.options) && productData.options.length > 0;

            // Check if product has options
            if (hasOptions) {
                const optionsContainer = itemElement.querySelector('.recom-options');
                // Validate ALL options - every option must be selected
                const allOptionInputs = itemElement.querySelectorAll('.recom-option-input');
                let isValid = true;
                const invalidInputs = [];
                const processedGroups = new Set();

                allOptionInputs.forEach(input => {
                    if (input.type === 'radio') {
                        const name = input.name;
                        if (processedGroups.has(name)) return; // Skip if we already processed this radio group
                        processedGroups.add(name);
                        
                        const anyChecked = itemElement.querySelector(`input[name="${name}"]:checked`);
                        if (!anyChecked) {
                            isValid = false;
                            // Add the first input of this group to invalidInputs for highlighting
                            const firstInput = itemElement.querySelector(`input[name="${name}"]`);
                            if (firstInput) invalidInputs.push(firstInput);
                        }
                    } else if (input.type === 'checkbox') {
                        const optionName = input.dataset.optionName;
                        if (processedGroups.has(optionName)) return; // Skip if we already processed this checkbox group
                        processedGroups.add(optionName);
                        
                        const anyChecked = itemElement.querySelector(`input[data-option-name="${optionName}"]:checked`);
                        if (!anyChecked) {
                            isValid = false;
                            // Add the first checkbox of this group to invalidInputs for highlighting
                            const firstCheckbox = itemElement.querySelector(`input[data-option-name="${optionName}"]`);
                            if (firstCheckbox) invalidInputs.push(firstCheckbox);
                        }
                    } else if (input.tagName === 'SELECT') {
                        if (!input.value) {
                            isValid = false;
                            invalidInputs.push(input);
                        }
                    } else if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                        if (!input.value.trim()) {
                            isValid = false;
                            invalidInputs.push(input);
                        }
                    }
                });

                // If invalid, expand options and highlight invalid fields
                if (!isValid) {
                    // Expand options if collapsed
                    if (optionsContainer && optionsContainer.classList.contains('collapsed')) {
                        optionsContainer.classList.remove('collapsed');
                    }

                    // Apply red border + shake animation with performance optimization
                    invalidInputs.forEach(input => {
                        input.classList.add('recom-option-blink');
                        // Use requestAnimationFrame for smoother animation removal
                        setTimeout(() => {
                            requestAnimationFrame(() => input.classList.remove('recom-option-blink'));
                        }, 600);
                    });

                    return; // Don't add to cart
                }
            }

            // Collect selected options
            let options = null;
            const optionSelects = itemElement.querySelectorAll('.recom-option-select');
            const optionRadios = itemElement.querySelectorAll('input[type="radio"]:checked');
            const optionCheckboxes = itemElement.querySelectorAll('input[type="checkbox"]:checked');
            const optionTexts = itemElement.querySelectorAll('.recom-option-text');
            const optionDates = itemElement.querySelectorAll('.recom-option-date');

            if (optionSelects.length > 0 || optionRadios.length > 0 || optionCheckboxes.length > 0 || optionTexts.length > 0 || optionDates.length > 0) {
                options = {};
                
                optionSelects.forEach(select => {
                    if (select.value) {
                        options[select.dataset.optionName] = select.value;
                    }
                });
                
                optionRadios.forEach(radio => {
                    options[radio.dataset.optionName] = radio.value;
                });
                
                optionCheckboxes.forEach(checkbox => {
                    if (!options[checkbox.dataset.optionName]) {
                        options[checkbox.dataset.optionName] = [];
                    }
                    options[checkbox.dataset.optionName].push(checkbox.value);
                });
                
                optionTexts.forEach(text => {
                    if (text.value.trim()) {
                        options[text.dataset.optionName] = text.value.trim();
                    }
                });
                
                optionDates.forEach(date => {
                    if (date.value) {
                        options[date.dataset.optionName] = date.value;
                    }
                });
            }

            // Add to cart
            this.sdk.addToCart(productId, options);

            // Visual feedback - change button to green "Added" for 3 seconds
            const originalText = button.textContent;
            const originalClass = button.className;
            
            button.textContent = 'Added';
            button.classList.add('recom-cart-btn-success');
            
            // Use requestAnimationFrame for better performance
            const resetButton = () => {
                button.textContent = originalText;
                button.className = originalClass;
            };
            
            // Use setTimeout with a shorter delay and requestAnimationFrame for smoother performance
            setTimeout(() => {
                requestAnimationFrame(resetButton);
            }, 3000);
        }

        openProductPage(productId) {
            this.sdk.openProductPage(productId);
        }
    }

    // Initialize the app

    // Try immediate initialization first
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
            window.recomEcwidRecommendationBlock = new RecomApp();
        });
    } else {
        window.recomEcwidRecommendationBlock = new RecomApp();
    }

})();
