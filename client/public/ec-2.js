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
        maxRetries: 3,
        retryDelay: 1000,
        debug: true, // Enable debug for testing
        // Ecwid will inject this script, so we can use relative paths
        cssUrl: 'https://ec.1nax.app/ec.css'
    };

    class EcwidRecomRecommendationApp {
        constructor() {
            this.storeId = null;
            this.productId = null;
            this.isEnabled = false;
            this.retryCount = 0;
            this.initialized = false;
            this.init();
        }

        init() {
            this.log('Initializing Ecwid Recommendation App');
            this.loadStyles();
            this.initializeEcwidAPI();
        }

        log(message, data = null) {
            if (CONFIG.debug) {
                // Removed console.log(`[EcwidRecommendations] ${message}`, data);
            }
        }

        loadStyles() {
            // Load the custom CSS file
            if (!document.getElementById('ecwid-recommendation-styles')) {
                const link = document.createElement('link');
                link.id = 'ecwid-recommendation-styles';
                link.rel = 'stylesheet';
                link.href = CONFIG.cssUrl;
                document.head.appendChild(link);
            }
        }

        initializeEcwidAPI() {
            // Wait for Ecwid API to load
            if (window.Ecwid && window.Ecwid.OnAPILoaded) {
                window.Ecwid.OnAPILoaded.add(() => {
                    this.log('Ecwid API loaded');
                    this.extractStoreId();
                    this.setupProductListener();
                });
            } else {
                // Fallback: try to get store ID directly if API is already loaded
                this.extractStoreId();
                this.setupProductListener();
            }
        }

        extractStoreId() {
            // Get store ID using proper Ecwid SDK method ONLY
            if (window.Ecwid && window.Ecwid.getOwnerId) {
                this.storeId = window.Ecwid.getOwnerId();
                this.log('Store ID extracted from Ecwid.getOwnerId()', { storeId: this.storeId });
            } else {
                this.log('Ecwid.getOwnerId() not available - SDK not properly loaded');
            }
        }

        setupProductListener() {
            // Listen for page changes to detect product pages using proper SDK
            if (window.Ecwid && window.Ecwid.OnPageLoaded) {
                window.Ecwid.OnPageLoaded.add((page) => {
                    this.log('Page loaded', { type: page.type, page: page });
                    
                    // Always clear existing recommendations when navigating to any page
                    this.clearExistingRecommendations();
                    
                    // Check for both lowercase and uppercase page types
                    if (page.type === 'product' || page.type === 'PRODUCT') {
                        this.log('Product page detected');
                        
                        // Use proper SDK method to get product ID
                        if (page.productId) {
                            this.productId = page.productId;
                            this.log('Product ID extracted from SDK', { productId: this.productId });
                            
                            // Now we have both store ID and product ID, check settings
                            this.checkSettings();
                        } else {
                            this.log('No product ID found in page object', { page });
                        }
                    } else {
                        // Reset product ID when not on product page
                        this.productId = null;
                        this.log('Not a product page, cleared product ID');
                    }
                });
            } else {
                this.log('Ecwid.OnPageLoaded not available');
            }
        }

        async checkSettings() {
            if (!this.storeId) {
                this.log('No store ID found, skipping recommendations');
                return;
            }

            this.log('Checking settings for store', { storeId: this.storeId });

            try {
                const url = `${CONFIG.apiBase}/recommendations/${this.storeId}`;
                this.log('Fetching settings from', { url });
                
                const response = await this.fetchWithRetry(url);
                const data = await response.json();

                this.log('Settings response', { data });

                if (data.success && data.settings) {
                    const settings = data.settings;
                    this.log('Settings found', { settings });
                    
                    // Check if upsells are enabled for product pages
                    if (settings.showUpsells && settings.upsellLocations && settings.upsellLocations.productPage) {
                        this.isEnabled = true;
                        this.log('Upsells enabled for product pages');
                        this.showRecommendations();
                    } else {
                        this.log('Upsells not enabled for product pages', {
                            showUpsells: settings.showUpsells,
                            upsellLocations: settings.upsellLocations
                        });
                    }
                } else {
                    this.log('No settings found or recommendations disabled', { data });
                }
            } catch (error) {
                this.log('Error checking recommendation settings', error);
            }
        }

        async showRecommendations() {
            if (!this.storeId || !this.productId) {
                this.log('Missing store ID or product ID', { storeId: this.storeId, productId: this.productId });
                return;
            }

            this.log('Fetching recommendations', { storeId: this.storeId, productId: this.productId });

            try {
                const url = `${CONFIG.apiBase}/recommendations/${this.storeId}/${this.productId}`;
                this.log('Fetching recommendations from', { url });
                
                const response = await this.fetchWithRetry(url);
                const data = await response.json();

                this.log('Recommendations response', { data });

                if (data.success && data.recommendations && data.recommendations.length > 0) {
                    this.log('Found recommendations', { count: data.recommendations.length });
                    const enriched = await this.enrichRecommendationsWithOptions(data.recommendations);
                    this.renderRecommendations(enriched);
                } else {
                    this.log('No recommendations available', { data });
                }
            } catch (error) {
                this.log('Error fetching recommendations', error);
            }
        }

        async enrichRecommendationsWithOptions(recommendations) {
            try {
                const results = await Promise.all(recommendations.map(async (p) => {
                    try {
                        const url = `${CONFIG.apiBase}/product/${this.storeId}/${p.ecwid_product_id}`;
                        const resp = await this.fetchWithRetry(url);
                        const json = await resp.json();
                        if (json.success && json.product) {
                            return { ...p, options: json.product.options || [] };
                        }
                    } catch (_) {}
                    return p;
                }));
                return results;
            } catch (e) {
                this.log('Failed to enrich recommendations with options', e);
                return recommendations;
            }
        }

        async fetchWithRetry(url, options = {}) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;
            } catch (error) {
                if (this.retryCount < CONFIG.maxRetries) {
                    this.retryCount++;
                    this.log(`Retry ${this.retryCount}/${CONFIG.maxRetries} for ${url}`);
                    
                    await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
                    return this.fetchWithRetry(url, options);
                }
                throw error;
            }
        }

        renderRecommendations(recommendations) {
            this.log('Rendering recommendations', { count: recommendations.length, recommendations });

            // Create the recommendation block
            const block = this.createRecommendationBlock();
            this.log('Recommendation block created', { block });
            
            // Add recommendations to the block
            const grid = block.querySelector('.recom-grid');
            this.log('Grid element found', { grid });
            
            recommendations.forEach((product, index) => {
                this.log(`Creating item ${index}`, { product, productKeys: Object.keys(product) });
                const item = this.createRecommendationItem(product);
                this.log(`Item ${index} created`, { 
                    item, 
                    innerHTML: item.innerHTML,
                    outerHTML: item.outerHTML,
                    className: item.className,
                    childElementCount: item.childElementCount
                });
                grid.appendChild(item);
            });

            // Insert the block into the page
            this.log('Inserting recommendation block into page');
            this.log('Complete recommendation block HTML before insertion:', { 
                outerHTML: block.outerHTML,
                innerHTML: block.innerHTML,
                className: block.className,
                childElementCount: block.childElementCount
            });
            this.insertRecommendationBlock(block);
        }

        createRecommendationBlock() {
            this.log('Creating recommendation block');
            const block = document.createElement('div');
            block.className = 'recom-block';
            block.innerHTML = `
                <div class="recom-header">
                    <h3 class="recom-title">You might also like</h3>
                    <div class="recom-divider"></div>
                </div>
                <div class="recom-grid"></div>
            `;
            this.log('Recommendation block HTML created', { className: block.className, innerHTML: block.innerHTML });
            return block;
        }

        createRecommendationItem(product) {
            this.log('Creating recommendation item with product data:', product);
            
            const item = document.createElement('div');
            item.className = 'recom-item';
            this.log('Item element created', { className: item.className });
            
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
                this.log('Image HTML created', { imageUrl: product.image_url, imageHtml });
            } else {
                this.log('No image_url found', { productKeys: Object.keys(product) });
            }

            const priceHtml = product.price ? 
                `<div class="recom-price">$${parseFloat(product.price).toFixed(2)}</div>` : '';
            this.log('Price HTML created', { price: product.price, priceHtml });

            const nameHtml = `<h4 class="recom-name">${product.name}</h4>`;
            this.log('Name HTML created', { name: product.name, nameHtml });

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

                    this.log('Option values debug', { 
                        optionName, 
                        optionType,
                        values: values,
                        normalized: normalized.map(nv => ({ 
                            text: nv.text, 
                            value: nv.value, 
                            valueType: typeof nv.value,
                            isUndefined: nv.value === undefined
                        }))
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
                        
                        this.log('Creating select HTML', { 
                            optionName, 
                            placeholder,
                            optionsMarkup,
                            normalizedValues: normalized.map(nv => ({ text: nv.text, value: nv.value }))
                        });
                        
                        optionsHtml += `
                            <label class="recom-option-label">${optionName}${isRequired ? ' *' : ''}</label>
                            <select class="recom-option-input recom-option-select" data-option-name="${optionName}" ${isRequired ? 'data-required="true"' : ''}>${optionsMarkup}</select>
                        `;
                    }
                });
                optionsHtml += '</div></div>';
            }

            const cartButtonHtml = `<button class="recom-cart-btn" onclick="event.preventDefault(); event.stopPropagation(); window['recomEcwidRecommendationBlock'].addToCartFromItem(this)">Add to cart</button>`;
            this.log('Cart button HTML created', { productId, cartButtonHtml });

            item.innerHTML = `
                ${linkHtml}
                ${hasOptions ? optionsHtml : ''}
                ${cartButtonHtml}
            `;

            // Store the product data on the item element for later use
            try {
                item.setAttribute('data-product-data', JSON.stringify(product));
            } catch (error) {
                this.log('Error storing product data on item', error);
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
            }

            // Toggle options roll-down
            const optionsRoot = item.querySelector('.recom-options');
            const optionsHeader = item.querySelector('.recom-options-header');
            if (optionsHeader && optionsRoot) {
                optionsHeader.addEventListener('click', (e) => {
                    e.preventDefault();
                    optionsRoot.classList.toggle('collapsed');
                });
            }

            // After rendering, attach option change listeners to update price
            this.attachOptionListenersAndPrice(item, basePrice);
            this.log('Item innerHTML set', { innerHTML: item.innerHTML });
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
            inputs.forEach(inp => inp.addEventListener('change', update, { passive: true }));
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

        // Modal flow removed (reverted). Using inline options + addToCartFromItem.

        getProductDataFromItem(itemEl) {
            // Try to find the product data stored in the item element
            // This could be stored as a data attribute or in a parent container
            try {
                // Look for product data in the item element's data attributes
                const productDataStr = itemEl.getAttribute('data-product-data');
                if (productDataStr) {
                    return JSON.parse(productDataStr);
                }

                // If not found, try to find it in the recommendations array
                // This is a fallback - ideally the data should be stored with the item
                const allItems = document.querySelectorAll('.recom-item');
                for (let i = 0; i < allItems.length; i++) {
                    if (allItems[i] === itemEl) {
                        // We need access to the original recommendations array
                        // For now, return null and handle this in the calling method
                        return null;
                    }
                }

                return null;
            } catch (error) {
                this.log('Error getting product data from item', error);
                return null;
            }
        }

        addToCartFromItem(buttonEl) {
            try {
                const itemEl = buttonEl.closest('.recom-item');
                if (!itemEl) return;
                const linkEl = itemEl.querySelector('.recom-link');
                const productIdAttr = linkEl?.getAttribute('data-productid');
                const productId = productIdAttr ? parseInt(productIdAttr) : null;
                if (!productId) return;

                this.log('Starting add to cart process', { 
                    productId, 
                    itemEl: {
                        className: itemEl.className,
                        innerHTML: itemEl.innerHTML.substring(0, 200) + '...'
                    }
                });

                // Get the product data to access the original option names
                const productData = this.getProductDataFromItem(itemEl);
                if (!productData) {
                    this.log('No product data found for item, using fallback option names');
                } else {
                    this.log('Product data found', { 
                        productName: productData.name,
                        optionsCount: productData.options?.length || 0,
                        options: productData.options?.map(opt => ({
                            name: opt.name,
                            type: opt.type,
                            required: opt.required,
                            choicesCount: opt.choices?.length || 0
                        }))
                    });
                }

                const selectedOptions = [];
                const missingRequired = [];

                // Selects
                itemEl.querySelectorAll('select.recom-option-select').forEach(sel => {
                    const uiOptionName = sel.getAttribute('data-option-name') || '';
                    const isRequired = sel.hasAttribute('required') || sel.dataset.required === 'true';
                    this.log('Processing select element', { 
                        uiOptionName, 
                        selectedValue: sel.value, 
                        isRequired,
                        availableOptions: Array.from(sel.options).map(opt => ({ value: opt.value, text: opt.textContent }))
                    });

                    if (uiOptionName && sel.value) {
                        // Find the matching product option to get the exact name
                        const productOption = productData.options?.find(opt =>
                            opt.name?.toLowerCase() === uiOptionName.toLowerCase()
                        );

                        this.log('Product option lookup', { 
                            uiOptionName, 
                            found: !!productOption, 
                            productOptionName: productOption?.name,
                            productOptionChoices: productOption?.choices?.map(c => ({ text: c.text, value: c.value }))
                        });

                        if (!productOption) {
                            this.log('Product option not found for UI option name:', uiOptionName);
                            return;
                        }

                        // Since text always matches value (when value is undefined, we use text as value),
                        // we can directly use the selected value
                        const optionToAdd = { name: productOption.name, value: sel.value };
                        selectedOptions.push(optionToAdd);
                        this.log('Added option to selectedOptions', optionToAdd);
                    } else if (isRequired) {
                        missingRequired.push(sel);
                        this.log('Missing required select', { uiOptionName, selectedValue: sel.value });
                    }
                });

                // Radios
                const radioGroups = new Set();
                itemEl.querySelectorAll('input.recom-option-input[type="radio"]').forEach(r => {
                    if (r.name) radioGroups.add(r.name);
                });
                this.log('Radio groups found', { radioGroups: Array.from(radioGroups) });
                
                radioGroups.forEach(group => {
                    const checked = itemEl.querySelector(`input.recom-option-input[type="radio"][name="${group}"]:checked`);
                    this.log('Processing radio group', { group, checked: !!checked, checkedValue: checked?.value });
                    
                    if (checked) {
                        const uiOptionName = checked.getAttribute('data-option-name') || '';
                        if (uiOptionName) {
                            // Find the matching product option to get the exact name
                            const productOption = productData.options?.find(opt =>
                                opt.name?.toLowerCase() === uiOptionName.toLowerCase()
                            );

                            this.log('Radio product option lookup', { 
                                uiOptionName, 
                                found: !!productOption, 
                                productOptionName: productOption?.name,
                                productOptionChoices: productOption?.choices?.map(c => ({ text: c.text, value: c.value }))
                            });

                            if (!productOption) {
                                this.log('Product option not found for UI option name:', uiOptionName);
                                return;
                            }

                            // Since text always matches value, we can directly use the selected value
                            const optionToAdd = { name: productOption.name, value: checked.value };
                            selectedOptions.push(optionToAdd);
                            this.log('Added radio option to selectedOptions', optionToAdd);
                        }
                    } else {
                        const anyInGroup = itemEl.querySelector(`input.recom-option-input[type=radio][name="${group}"]`);
                        if (anyInGroup && (anyInGroup.hasAttribute('required') || anyInGroup.dataset.required === 'true')) {
                            missingRequired.push(anyInGroup.closest('.recom-option-line') || anyInGroup);
                            this.log('Missing required radio group', { group });
                        }
                    }
                });

                // Checkboxes
                itemEl.querySelectorAll('input.recom-option-input[type="checkbox"]').forEach(c => {
                    this.log('Processing checkbox', { 
                        checked: c.checked, 
                        value: c.value, 
                        name: c.getAttribute('data-option-name'),
                        required: c.hasAttribute('required') || c.dataset.required === 'true'
                    });
                    
                    if (c.checked) {
                        const uiOptionName = c.getAttribute('data-option-name') || '';
                        if (uiOptionName) {
                            // Find the matching product option to get the exact name
                            const productOption = productData.options?.find(opt =>
                                opt.name?.toLowerCase() === uiOptionName.toLowerCase()
                            );

                            this.log('Checkbox product option lookup', { 
                                uiOptionName, 
                                found: !!productOption, 
                                productOptionName: productOption?.name,
                                productOptionChoices: productOption?.choices?.map(c => ({ text: c.text, value: c.value }))
                            });

                            if (!productOption) {
                                this.log('Product option not found for UI option name:', uiOptionName);
                                return;
                            }

                            // Since text always matches value, we can directly use the selected value
                            const optionToAdd = { name: productOption.name, value: c.value };
                            selectedOptions.push(optionToAdd);
                            this.log('Added checkbox option to selectedOptions', optionToAdd);
                        }
                    } else if (c.hasAttribute('required') || c.dataset.required === 'true') {
                        missingRequired.push(c.closest('.recom-option-line') || c);
                        this.log('Missing required checkbox', { name: c.getAttribute('data-option-name') });
                    }
                });

                // Text inputs / textareas / date
                itemEl.querySelectorAll('.recom-option-text, .recom-option-date').forEach(inp => {
                    const uiOptionName = inp.getAttribute('data-option-name') || '';
                    const value = inp.value;
                    const isRequired = inp.hasAttribute('required') || inp.dataset.required === 'true';
                    
                    this.log('Processing text/date input', { 
                        uiOptionName, 
                        value, 
                        isRequired,
                        inputType: inp.type || inp.tagName
                    });
                    
                    if (uiOptionName && value) {
                        // Find the matching product option to get the exact name
                        const productOption = productData.options?.find(opt =>
                            opt.name?.toLowerCase() === uiOptionName.toLowerCase()
                        );

                        this.log('Text input product option lookup', { 
                            uiOptionName, 
                            found: !!productOption, 
                            productOptionName: productOption?.name
                        });

                        if (!productOption) {
                            this.log('Product option not found for UI option name:', uiOptionName);
                            return;
                        }

                        const optionToAdd = { name: productOption.name, value };
                        selectedOptions.push(optionToAdd);
                        this.log('Added text/date option to selectedOptions', optionToAdd);
                    } else if (isRequired) {
                        missingRequired.push(inp);
                        this.log('Missing required text/date input', { uiOptionName, value });
                    }
                });

                // Enforce selection even if API didn't mark required: any visible option must be chosen
                const optionsRoot = itemEl.querySelector('.recom-options');
                if (optionsRoot) {
                    // selects with empty value
                    optionsRoot.querySelectorAll('select.recom-option-select').forEach(sel => {
                        if (!sel.value && !missingRequired.includes(sel)) missingRequired.push(sel);
                    });
                    // radio groups with none checked
                    const allRadioGroups = new Set();
                    optionsRoot.querySelectorAll('input.recom-option-input[type="radio"]').forEach(r => { if (r.name) allRadioGroups.add(r.name); });
                    allRadioGroups.forEach(group => {
                        const checked = optionsRoot.querySelector(`input.recom-option-input[type="radio"][name="${group}"]:checked`);
                        if (!checked) {
                            const anyInGroup = optionsRoot.querySelector(`input.recom-option-input[type=radio][name="${group}"]`);
                            if (anyInGroup && !missingRequired.includes(anyInGroup)) missingRequired.push(anyInGroup.closest('.recom-option-line') || anyInGroup);
                        }
                    });
                    // checkbox groups require at least one
                    const checkboxByName = new Map();
                    optionsRoot.querySelectorAll('input.recom-option-input[type="checkbox"]').forEach(c => {
                        const name = c.getAttribute('data-option-name') || '';
                        if (!name) return;
                        if (!checkboxByName.has(name)) checkboxByName.set(name, []);
                        checkboxByName.get(name).push(c);
                    });
                    checkboxByName.forEach(list => {
                        if (!list.some(c => c.checked)) {
                            const any = list[0];
                            if (any && !missingRequired.includes(any)) missingRequired.push(any.closest('.recom-option-line') || any);
                        }
                    });
                    // text/date empty
                    optionsRoot.querySelectorAll('.recom-option-text, .recom-option-date').forEach(inp => {
                        if (!inp.value && !missingRequired.includes(inp)) missingRequired.push(inp);
                    });
                }

                // If missing required options, expand and blink; DO NOT add to cart
                if (missingRequired.length > 0) {
                    if (optionsRoot && optionsRoot.classList.contains('collapsed')) {
                        optionsRoot.classList.remove('collapsed');
                    }
                    missingRequired.forEach(el => {
                        el.classList.add('recom-option-blink');
                        setTimeout(() => el.classList.remove('recom-option-blink'), 1200);
                    });
                    return; // stop here
                }

                this.log('=== FINAL SUMMARY ===');
                this.log('Selected options collected:', selectedOptions);
                this.log('Missing required elements:', missingRequired.length);
                this.log('Product data available:', !!productData);
                this.log('Product data options:', productData ? productData.options?.map(opt => ({
                    name: opt.name,
                    type: opt.type,
                    required: opt.required,
                    choicesCount: opt.choices?.length || 0,
                    choices: opt.choices?.map(choice => ({ text: choice.text, value: choice.value }))
                })) : null);
                this.log('UI elements state:', {
                    selects: Array.from(itemEl.querySelectorAll('select.recom-option-select')).map(sel => ({
                        name: sel.getAttribute('data-option-name'),
                        value: sel.value,
                        options: Array.from(sel.options).map(opt => ({ value: opt.value, text: opt.textContent }))
                    })),
                    radios: Array.from(itemEl.querySelectorAll('input.recom-option-input[type="radio"]')).map(radio => ({
                        name: radio.getAttribute('data-option-name'),
                        value: radio.value,
                        checked: radio.checked,
                        groupName: radio.name
                    })),
                    checkboxes: Array.from(itemEl.querySelectorAll('input.recom-option-input[type="checkbox"]')).map(cb => ({
                        name: cb.getAttribute('data-option-name'),
                        value: cb.value,
                        checked: cb.checked
                    })),
                    textInputs: Array.from(itemEl.querySelectorAll('.recom-option-text, .recom-option-date')).map(inp => ({
                        name: inp.getAttribute('data-option-name'),
                        value: inp.value,
                        type: inp.type || inp.tagName
                    }))
                });
                this.log('=== END SUMMARY ===');

                if (window.Ecwid && window.Ecwid.Cart) {
                    try {
                        if (selectedOptions.length > 0) {
                            // Convert array of {name, value} objects to object format expected by Ecwid
                            const optionsObject = {};
                            selectedOptions.forEach(option => {
                                optionsObject[option.name] = option.value;
                            });
                            
                            window.Ecwid.Cart.addProduct({ id: productId, options: optionsObject });
                        } else {
                            window.Ecwid.Cart.addProduct(productId);
                        }
                    } catch (cartError) {
                        this.log('Error adding product to cart', cartError);
                    }
                } else {
                    this.log('Ecwid.Cart not available');
                }
            } catch (e) {
                this.log('Error adding to cart from item', e);
            }
        }

        navigateToProduct(productId, productUrl) {
            this.log('Navigating to product', { productId, productUrl });
            
            // Use product URL from API response if available
            if (productUrl) {
                window.location.href = productUrl;
                return;
            }
            
            // Use Ecwid SDK navigation with correct parameters
            if (productId && window.Ecwid && window.Ecwid.openPage) {
                window.Ecwid.openPage('product', {'id': parseInt(productId)});
            }
        }

        addToCart(productId) {
            this.log('Adding to cart', { productId });
            
            // Add product to cart using Ecwid SDK
            if (window.Ecwid && window.Ecwid.Cart) {
                window.Ecwid.Cart.addProduct(productId);
            }
        }

        clearExistingRecommendations() {
            this.log('Clearing existing recommendation blocks');
            
            // Remove all existing recommendation blocks
            const existingBlocks = document.querySelectorAll('.recom-block');
            existingBlocks.forEach((block, index) => {
                this.log(`Removing existing recommendation block ${index}`, { block });
                block.remove();
            });
            
            this.log('Cleared existing recommendation blocks', { count: existingBlocks.length });
        }

        insertRecommendationBlock(block) {
            this.log('Starting to insert recommendation block');
            
            // Try to find a good insertion point
            const insertionPoints = [
                document.querySelector('.ecwid-product-details'),
                document.querySelector('.ecwid-product'),
                document.querySelector('#ecwid-product'),
                document.querySelector('.product-details'),
                document.querySelector('.product-info'),
                document.querySelector('main'),
                document.querySelector('.content'),
                document.body
            ];

            this.log('Checking insertion points', { 
                insertionPoints: insertionPoints.map(p => p ? (p.className || p.tagName) : 'null'),
                foundPoints: insertionPoints.filter(p => p).length
            });

            let insertionPoint = null;
            for (const point of insertionPoints) {
                if (point) {
                    insertionPoint = point;
                    this.log('Found insertion point', { point: point.className || point.tagName });
                    break;
                }
            }

            if (insertionPoint) {
                this.log('Inserting recommendation block', { insertionPoint: insertionPoint.className || insertionPoint.tagName });
                insertionPoint.appendChild(block);
                this.log('Recommendation block inserted successfully');
                
                // Log the complete HTML after insertion
                this.log('Complete recommendation block HTML after insertion:', { 
                    outerHTML: block.outerHTML,
                    innerHTML: block.innerHTML,
                    className: block.className,
                    childElementCount: block.childElementCount,
                    gridItems: block.querySelectorAll('.recom-item').length,
                    gridHTML: block.querySelector('.recom-grid')?.innerHTML
                });
                
                // Log detailed structure of each item
                const items = block.querySelectorAll('.recom-item');
                items.forEach((item, index) => {
                    this.log(`Final item ${index} structure:`, {
                        outerHTML: item.outerHTML,
                        innerHTML: item.innerHTML,
                        hasImage: !!item.querySelector('.recom-image img'),
                        hasName: !!item.querySelector('.recom-name'),
                        hasPrice: !!item.querySelector('.recom-price'),
                        hasCartBtn: !!item.querySelector('.recom-cart-btn'),
                        imageSrc: item.querySelector('.recom-image img')?.src,
                        nameText: item.querySelector('.recom-name')?.textContent,
                        priceText: item.querySelector('.recom-price')?.textContent
                    });
                });
            } else {
                this.log('No suitable insertion point found');
            }
        }
    }

    // Initialize the recommendation app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window['recomEcwidRecommendationBlock'] = new EcwidRecomRecommendationApp();
        });
    } else {
        window['recomEcwidRecommendationBlock'] = new EcwidRecomRecommendationApp();
    }

})();
