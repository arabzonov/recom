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
            this.loadStyles();
            this.initializeEcwidAPI();
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

        initializeEcwidAPI() {
            if (window.Ecwid && window.Ecwid.OnAPILoaded) {
                window.Ecwid.OnAPILoaded.add(() => {
                    this.extractStoreId();
                    this.setupProductListener();
                });
            } else {
                this.extractStoreId();
                this.setupProductListener();
            }
        }

        extractStoreId() {
            if (window.Ecwid && window.Ecwid.getOwnerId) {
                this.storeId = window.Ecwid.getOwnerId();
            }
        }

        setupProductListener() {
            if (window.Ecwid && window.Ecwid.OnPageLoaded) {
                window.Ecwid.OnPageLoaded.add((page) => {
                    this.clearExistingRecommendations();
                    
                    if (page.type === 'product' || page.type === 'PRODUCT') {
                        if (page.productId) {
                            this.productId = page.productId;
                            this.checkSettings();
                        }
                    } else {
                        this.productId = null;
                    }
                });
            }
        }

        async checkSettings() {
            if (!this.storeId) return;

            try {
                const url = `${CONFIG.apiBase}/recommendations/${this.storeId}`;
                const response = await this.fetchWithRetry(url);
                const data = await response.json();

                if (data.success && data.settings) {
                    const settings = data.settings;
                    
                    if (settings.showUpsells && settings.upsellLocations && settings.upsellLocations.productPage) {
                        this.isEnabled = true;
                        this.showRecommendations();
                    }
                }
            } catch (error) {
                // Silently handle errors
            }
        }

        async showRecommendations() {
            if (!this.storeId || !this.productId) return;

            try {
                const url = `${CONFIG.apiBase}/recommendations/${this.storeId}/${this.productId}`;
                const response = await this.fetchWithRetry(url);
                const data = await response.json();

                if (data.success && data.recommendations && data.recommendations.length > 0) {
                    const enriched = await this.enrichRecommendationsWithOptions(data.recommendations);
                    this.renderRecommendations(enriched);
                }
            } catch (error) {
                // Silently handle errors
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
                    await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
                    return this.fetchWithRetry(url, options);
                }
                throw error;
            }
        }

        renderRecommendations(recommendations) {
            const block = this.createRecommendationBlock();
            const grid = block.querySelector('.recom-grid');
            
            recommendations.forEach((product, index) => {
                const item = this.createRecommendationItem(product);
                grid.appendChild(item);
            });

            this.insertRecommendationBlock(block);
        }

        createRecommendationBlock() {
            const block = document.createElement('div');
            block.className = 'recom-block';
            block.innerHTML = `
                <div class="recom-header">
                    <h3 class="recom-title">You might also like</h3>
                    <div class="recom-divider"></div>
                </div>
                <div class="recom-grid"></div>
            `;
            return block;
        }

        createRecommendationItem(product) {
            const item = document.createElement('div');
            item.className = 'recom-item';
            
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

                    const normalized = values.map(v => {
                        if (typeof v === 'string') return { text: v, value: v };
                        return {
                            text: v.text,
                            value: v.value || v.text,
                            priceModifier: (typeof v.priceModifier === 'number') ? v.priceModifier : parseFloat(v.priceModifier || '0') || 0,
                            priceModifierType: (v.priceModifierType || '').toUpperCase()
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
                <div class="recom-content-wrapper">
                    ${linkHtml}
                    ${hasOptions ? optionsHtml : ''}
                </div>
                ${cartButtonHtml}
            `;

            try {
                item.setAttribute('data-product-data', JSON.stringify(product));
            } catch (error) {
                // Silently handle errors
            }

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

            const optionsRoot = item.querySelector('.recom-options');
            const optionsHeader = item.querySelector('.recom-options-header');
            if (optionsHeader && optionsRoot) {
                optionsHeader.addEventListener('click', (e) => {
                    e.preventDefault();
                    optionsRoot.classList.toggle('collapsed');
                });
            }

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
            
            containerEl.querySelectorAll('select.recom-option-select').forEach(sel => {
                const opt = sel.options[sel.selectedIndex];
                if (!opt) return;
                applyModifier(opt.dataset.modifierType, opt.dataset.modifierValue);
            });
            
            containerEl.querySelectorAll('input.recom-option-input[type="radio"]').forEach(r => {
                if (r.checked) applyModifier(r.dataset.modifierType, r.dataset.modifierValue);
            });
            
            containerEl.querySelectorAll('input.recom-option-input[type="checkbox"]').forEach(c => {
                if (c.checked) applyModifier(c.dataset.modifierType, c.dataset.modifierValue);
            });
            
            return total;
        }

        getProductDataFromItem(itemEl) {
            try {
                const productDataStr = itemEl.getAttribute('data-product-data');
                if (productDataStr) {
                    return JSON.parse(productDataStr);
                }
                return null;
            } catch (error) {
                return null;
            }
        }

        addToCartFromItem(buttonEl) {
            try {
                const itemEl = buttonEl.closest('.recom-item');
                if (!itemEl) {
                    console.log('[DEBUG] No item element found');
                    return;
                }
                
                const linkEl = itemEl.querySelector('.recom-link');
                const productIdAttr = linkEl?.getAttribute('data-productid');
                const productId = productIdAttr ? parseInt(productIdAttr) : null;
                if (!productId) {
                    console.log('[DEBUG] No product ID found');
                    return;
                }

                const productData = this.getProductDataFromItem(itemEl);
                if (!productData) {
                    console.log('[DEBUG] No product data found');
                    return;
                }
                
                console.log('[DEBUG] Starting add to cart', { productId, productName: productData.name });

                const selectedOptions = [];
                const missingRequired = [];

                itemEl.querySelectorAll('select.recom-option-select').forEach(sel => {
                    const uiOptionName = sel.getAttribute('data-option-name') || '';
                    const isRequired = sel.hasAttribute('required') || sel.dataset.required === 'true';

                    if (uiOptionName && sel.value) {
                        const productOption = productData.options?.find(opt =>
                            opt.name?.toLowerCase() === uiOptionName.toLowerCase()
                        );

                        if (productOption) {
                            const optionToAdd = { name: productOption.name, value: sel.value };
                            selectedOptions.push(optionToAdd);
                        }
                    } else if (isRequired) {
                        missingRequired.push(sel);
                    }
                });

                const radioGroups = new Set();
                itemEl.querySelectorAll('input.recom-option-input[type="radio"]').forEach(r => {
                    if (r.name) radioGroups.add(r.name);
                });
                
                radioGroups.forEach(group => {
                    const checked = itemEl.querySelector(`input.recom-option-input[type="radio"][name="${group}"]:checked`);
                    
                    if (checked) {
                        const uiOptionName = checked.getAttribute('data-option-name') || '';
                        if (uiOptionName) {
                            const productOption = productData.options?.find(opt =>
                                opt.name?.toLowerCase() === uiOptionName.toLowerCase()
                            );

                            if (productOption) {
                                const optionToAdd = { name: productOption.name, value: checked.value };
                                selectedOptions.push(optionToAdd);
                            }
                        }
                    } else {
                        const anyInGroup = itemEl.querySelector(`input.recom-option-input[type=radio][name="${group}"]`);
                        if (anyInGroup && (anyInGroup.hasAttribute('required') || anyInGroup.dataset.required === 'true')) {
                            missingRequired.push(anyInGroup.closest('.recom-option-line') || anyInGroup);
                        }
                    }
                });

                itemEl.querySelectorAll('input.recom-option-input[type="checkbox"]').forEach(c => {
                    if (c.checked) {
                        const uiOptionName = c.getAttribute('data-option-name') || '';
                        if (uiOptionName) {
                            const productOption = productData.options?.find(opt =>
                                opt.name?.toLowerCase() === uiOptionName.toLowerCase()
                            );

                            if (productOption) {
                                const optionToAdd = { name: productOption.name, value: c.value };
                                selectedOptions.push(optionToAdd);
                            }
                        }
                    } else if (c.hasAttribute('required') || c.dataset.required === 'true') {
                        missingRequired.push(c.closest('.recom-option-line') || c);
                    }
                });

                itemEl.querySelectorAll('.recom-option-text, .recom-option-date').forEach(inp => {
                    const uiOptionName = inp.getAttribute('data-option-name') || '';
                    const value = inp.value;
                    const isRequired = inp.hasAttribute('required') || inp.dataset.required === 'true';
                    
                    if (uiOptionName && value) {
                        const productOption = productData.options?.find(opt =>
                            opt.name?.toLowerCase() === uiOptionName.toLowerCase()
                        );

                        if (productOption) {
                            const optionToAdd = { name: productOption.name, value };
                            selectedOptions.push(optionToAdd);
                        }
                    } else if (isRequired) {
                        missingRequired.push(inp);
                    }
                });

                const optionsRoot = itemEl.querySelector('.recom-options');
                if (optionsRoot) {
                    optionsRoot.querySelectorAll('select.recom-option-select').forEach(sel => {
                        if (!sel.value && !missingRequired.includes(sel)) missingRequired.push(sel);
                    });
                    
                    const allRadioGroups = new Set();
                    optionsRoot.querySelectorAll('input.recom-option-input[type="radio"]').forEach(r => { if (r.name) allRadioGroups.add(r.name); });
                    allRadioGroups.forEach(group => {
                        const checked = optionsRoot.querySelector(`input.recom-option-input[type="radio"][name="${group}"]:checked`);
                        if (!checked) {
                            const anyInGroup = optionsRoot.querySelector(`input.recom-option-input[type=radio][name="${group}"]`);
                            if (anyInGroup && !missingRequired.includes(anyInGroup)) missingRequired.push(anyInGroup.closest('.recom-option-line') || anyInGroup);
                        }
                    });
                    
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
                    
                    optionsRoot.querySelectorAll('.recom-option-text, .recom-option-date').forEach(inp => {
                        if (!inp.value && !missingRequired.includes(inp)) missingRequired.push(inp);
                    });
                }

                if (missingRequired.length > 0) {
                    if (optionsRoot && optionsRoot.classList.contains('collapsed')) {
                        optionsRoot.classList.remove('collapsed');
                    }
                    missingRequired.forEach(el => {
                        el.classList.add('recom-option-blink');
                        setTimeout(() => el.classList.remove('recom-option-blink'), 1200);
                    });
                    return;
                }

                console.log('[DEBUG] Selected options:', selectedOptions);
                console.log('[DEBUG] Missing required:', missingRequired.length);

                if (window.Ecwid && window.Ecwid.Cart) {
                    try {
                        if (selectedOptions.length > 0) {
                            const optionsObject = {};
                            selectedOptions.forEach(option => {
                                optionsObject[option.name] = option.value;
                            });
                            
                            console.log('[DEBUG] Adding to cart with options:', { id: productId, options: optionsObject });
                            window.Ecwid.Cart.addProduct({ id: productId, options: optionsObject });
                        } else {
                            console.log('[DEBUG] Adding to cart without options:', productId);
                            window.Ecwid.Cart.addProduct(productId);
                        }
                        console.log('[DEBUG] Product added to cart successfully');
                        
                        // Add visual feedback
                        this.showCartSuccessFeedback(buttonEl);
                    } catch (cartError) {
                        console.log('[DEBUG] Error adding to cart:', cartError);
                    }
                } else {
                    console.log('[DEBUG] Ecwid.Cart not available');
                }
            } catch (e) {
                // Silently handle errors
            }
        }

        showCartSuccessFeedback(buttonEl) {
            // Store original text
            const originalText = buttonEl.textContent;
            
            // Add success class immediately (no blinking)
            buttonEl.classList.add('recom-cart-btn-success');
            
            // Change text to "Added!"
            buttonEl.textContent = 'Added!';
            
            // Revert text and styling after 3 seconds
            setTimeout(() => {
                buttonEl.textContent = originalText;
                buttonEl.classList.remove('recom-cart-btn-success');
            }, 3000);
        }

        navigateToProduct(productId, productUrl) {
            if (productUrl) {
                window.location.href = productUrl;
                return;
            }
            
            if (productId && window.Ecwid && window.Ecwid.openPage) {
                window.Ecwid.openPage('product', {'id': parseInt(productId)});
            }
        }

        addToCart(productId) {
            if (window.Ecwid && window.Ecwid.Cart) {
                window.Ecwid.Cart.addProduct(productId);
            }
        }

        clearExistingRecommendations() {
            const existingBlocks = document.querySelectorAll('.recom-block');
            existingBlocks.forEach(block => block.remove());
        }

        insertRecommendationBlock(block) {
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

            let insertionPoint = null;
            for (const point of insertionPoints) {
                if (point) {
                    insertionPoint = point;
                    break;
                }
            }

            if (insertionPoint) {
                insertionPoint.appendChild(block);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window['recomEcwidRecommendationBlock'] = new EcwidRecomRecommendationApp();
        });
    } else {
        window['recomEcwidRecommendationBlock'] = new EcwidRecomRecommendationApp();
    }

})();