import Wishlist from '../wishlist';
import { initRadioOptions } from './aria';
import { qsa } from './dom';
import toggleOption from './select-option-plugin';

const optionsTypesMap = {
    INPUT_FILE: 'input-file',
    INPUT_TEXT: 'input-text',
    INPUT_NUMBER: 'input-number',
    INPUT_CHECKBOX: 'input-checkbox',
    TEXTAREA: 'textarea',
    DATE: 'date',
    SET_SELECT: 'set-select',
    SET_RECTANGLE: 'set-rectangle',
    SET_RADIO: 'set-radio',
    SWATCH: 'swatch',
    PRODUCT_LIST: 'product-list',
};

// Helper to show/hide elements safely
function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }

export function optionChangeDecorator(areDefaultOptionsSet) {
    return (err, response) => {
        const attributesData = response.data || {};
        const attributesContent = response.content || {};

        this.updateProductAttributes(attributesData);
        if (areDefaultOptionsSet) {
            this.updateView(attributesData, attributesContent);
        } else {
            this.updateDefaultAttributesForOOS(attributesData);
        }
    };
}

export default class ProductDetailsBase {
    constructor(scope, context) {
        this.$scope = scope instanceof Element ? scope : document.querySelector(scope);
        this.context = context;
        this.initRadioAttributes();
        Wishlist.load(this.context);
        this.getTabRequests();

        document.querySelectorAll('[data-product-attribute]').forEach(value => {
            const type = value.getAttribute('data-product-attribute');

            this._makeProductVariantAccessible(value, type);
        });
    }

    _makeProductVariantAccessible(variantDomNode, variantType) {
        switch (variantType) {
        case optionsTypesMap.SET_RADIO:
        case optionsTypesMap.SWATCH: {
            initRadioOptions(variantDomNode, '[type=radio]');
            break;
        }

        default: break;
        }
    }

    /**
     * Allow radio buttons to get deselected
     */
    initRadioAttributes() {
        const scope = this.$scope || document;
        qsa('[data-product-attribute] input[type="radio"]', scope).forEach(radio => {
            // Only bind to click once
            if (radio.hasAttribute('data-state')) {
                radio.addEventListener('click', () => {
                    if (radio.dataset.state === 'true') {
                        radio.checked = false;
                        radio.dataset.state = 'false';

                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        radio.dataset.state = 'true';
                    }

                    this.initRadioAttributes();
                });
            }

            radio.dataset.state = String(radio.checked);
        });
    }

    /**
     * Hide or mark as unavailable out of stock attributes if enabled
     * @param  {Object} data Product attribute data
     */
    updateProductAttributes(data) {
        const behavior = data.out_of_stock_behavior;
        const inStockIds = data.in_stock_attributes;
        const outOfStockDefaultMessage = this.context.outOfStockDefaultMessage;
        let outOfStockMessage = data.out_of_stock_message;

        if (behavior !== 'hide_option' && behavior !== 'label_option') {
            return;
        }

        if (outOfStockMessage) {
            outOfStockMessage = ` (${outOfStockMessage})`;
        } else {
            outOfStockMessage = ` (${outOfStockDefaultMessage})`;
        }

        const scope = this.$scope || document;
        qsa('[data-product-attribute-value]', scope).forEach(attribute => {
            const attrId = parseInt(attribute.dataset.productAttributeValue, 10);

            if (inStockIds.indexOf(attrId) !== -1) {
                this.enableAttribute(attribute, behavior, outOfStockMessage);
            } else {
                this.disableAttribute(attribute, behavior, outOfStockMessage);
            }
        });
    }

    /**
     * Check for fragment identifier in URL requesting a specific tab
     */
    getTabRequests() {
        if (window.location.hash && window.location.hash.indexOf('#tab-') === 0) {
            const hash = window.location.hash;
            const tabsContainers = qsa('.tabs');
            const activeTabContainer = tabsContainers.find(tc => tc.querySelector(`[href='${hash}']`));
            const tabContent = document.querySelector(hash);

            if (activeTabContainer) {
                qsa('.tab', activeTabContainer).forEach(tab => tab.classList.remove('is-active'));
                const matchingTab = Array.from(activeTabContainer.querySelectorAll('.tab')).find(
                    tab => tab.querySelector(`[href='${hash}']`),
                );
                if (matchingTab) matchingTab.classList.add('is-active');

                if (tabContent) {
                    // Remove is-active from siblings
                    const parent = tabContent.parentElement;
                    if (parent) {
                        Array.from(parent.children).forEach(child => child.classList.remove('is-active'));
                    }
                    tabContent.classList.add('is-active');
                }
            }
        }
    }

    /**
     * Since $productView can be dynamically inserted using render_with,
     * We have to retrieve the respective elements
     *
     * @param {Element} scope
     */
    getViewModel(scope) {
        const el = scope instanceof Element ? scope : document;
        const q = (sel) => el.querySelector(sel);
        return {
            priceWithTax: {
                el: q('.price--withTax'),
                span: q('[data-product-price-with-tax]'),
            },
            priceWithoutTax: {
                el: q('.price--withoutTax'),
                span: q('[data-product-price-without-tax]'),
            },
            rrpWithTax: {
                el: q('.rrp-price--withTax'),
                span: q('[data-product-rrp-with-tax]'),
            },
            rrpWithoutTax: {
                el: q('.rrp-price--withoutTax'),
                span: q('[data-product-rrp-price-without-tax]'),
            },
            nonSaleWithTax: {
                el: q('.non-sale-price--withTax'),
                span: q('[data-product-non-sale-price-with-tax]'),
            },
            nonSaleWithoutTax: {
                el: q('.non-sale-price--withoutTax'),
                span: q('[data-product-non-sale-price-without-tax]'),
            },
            priceSaved: {
                el: q('.price-section--saving'),
                span: q('[data-product-price-saved]'),
            },
            priceNowLabel: {
                span: q('.price-now-label'),
            },
            priceLabel: {
                span: q('.price-label'),
            },
            weight: q('.productView-info [data-product-weight]'),
            increments: qsa('.form-field--increments :input', el),
            addToCart: q('#form-action-addToCart'),
            addToCartForm: q('form[data-cart-item-add]'),
            wishlistVariation: q('[data-wishlist-add] [name="variation_id"]'),
            stock: {
                container: q('.form-field--stock'),
                input: q('[data-product-stock]'),
            },
            sku: {
                label: q('dt.sku-label'),
                value: q('[data-product-sku]'),
            },
            upc: {
                label: q('dt.upc-label'),
                value: q('[data-product-upc]'),
            },
            quantity: {
                text: q('.incrementTotal'),
                input: q('[name="qty[]"]'),
            },
            bulkPricing: q('.productView-info-bulkPricing'),
            walletButtons: q('[data-add-to-cart-wallet-buttons]'),
        };
    }

    /**
     * Hide the pricing elements that will show up only when the price exists in API
     * @param viewModel
     */
    clearPricingNotFound(viewModel) {
        hide(viewModel.rrpWithTax.el);
        hide(viewModel.rrpWithoutTax.el);
        hide(viewModel.nonSaleWithTax.el);
        hide(viewModel.nonSaleWithoutTax.el);
        hide(viewModel.priceSaved.el);
        hide(viewModel.priceNowLabel.span);
        hide(viewModel.priceLabel.span);
        hide(viewModel.priceWithTax.el);
        hide(viewModel.priceWithoutTax.el);
    }

    /**
     * Update the view of price, messages, SKU and stock options when a product option changes
     * @param  {Object} data Product attribute data
     */
    updateView(data, content = null) {
        const viewModel = this.getViewModel(this.$scope);

        this.showMessageBox(data.stock_message || data.purchasing_message);

        if (data.price instanceof Object) {
            this.updatePriceView(viewModel, data.price);
        } else {
            this.clearPricingNotFound(viewModel);
        }

        if (data.weight instanceof Object && viewModel.weight) {
            viewModel.weight.innerHTML = data.weight.formatted;
        }

        // Set variation_id if it exists for adding to wishlist
        if (data.variantId && viewModel.wishlistVariation) {
            viewModel.wishlistVariation.value = data.variantId;
        }

        // If SKU is available
        if (data.sku) {
            if (viewModel.sku.value) viewModel.sku.value.textContent = data.sku;
            show(viewModel.sku.label);
        } else {
            hide(viewModel.sku.label);
            if (viewModel.sku.value) viewModel.sku.value.textContent = '';
        }

        // If UPC is available
        if (data.upc) {
            if (viewModel.upc.value) viewModel.upc.value.textContent = data.upc;
            show(viewModel.upc.label);
        } else {
            hide(viewModel.upc.label);
            if (viewModel.upc.value) viewModel.upc.value.textContent = '';
        }

        // if stock view is on (CP settings)
        if (viewModel.stock.container && typeof data.stock === 'number') {
            // if the stock container is hidden, show
            viewModel.stock.container.classList.remove('u-hiddenVisually');

            if (viewModel.stock.input) viewModel.stock.input.textContent = data.stock;
        } else if (viewModel.stock.container) {
            viewModel.stock.container.classList.add('u-hiddenVisually');
            if (viewModel.stock.input) viewModel.stock.input.textContent = data.stock;
        }

        this.updateDefaultAttributesForOOS(data);
        this.updateWalletButtonsView(data);

        // If Bulk Pricing rendered HTML is available
        if (data.bulk_discount_rates && content && viewModel.bulkPricing) {
            viewModel.bulkPricing.innerHTML = content;
        } else if (typeof (data.bulk_discount_rates) !== 'undefined' && viewModel.bulkPricing) {
            viewModel.bulkPricing.innerHTML = '';
        }

        const addToCartWrapper = document.getElementById('add-to-cart-wrapper');

        if (addToCartWrapper && addToCartWrapper.offsetParent === null && data.purchasable) {
            show(addToCartWrapper);
        }
    }

    /**
     * Update the view of price, messages, SKU and stock options when a product option changes
     * @param  {Object} data Product attribute data
     */
    updatePriceView(viewModel, price) {
        this.clearPricingNotFound(viewModel);

        if (price.with_tax) {
            const updatedPrice = price.price_range
                ? `${price.price_range.min.with_tax.formatted} - ${price.price_range.max.with_tax.formatted}`
                : price.with_tax.formatted;
            show(viewModel.priceLabel.span);
            show(viewModel.priceWithTax.el);
            if (viewModel.priceWithTax.span) viewModel.priceWithTax.span.innerHTML = updatedPrice;
        }

        if (price.without_tax) {
            const updatedPrice = price.price_range
                ? `${price.price_range.min.without_tax.formatted} - ${price.price_range.max.without_tax.formatted}`
                : price.without_tax.formatted;
            show(viewModel.priceLabel.span);
            show(viewModel.priceWithoutTax.el);
            if (viewModel.priceWithoutTax.span) viewModel.priceWithoutTax.span.innerHTML = updatedPrice;
        }

        if (price.rrp_with_tax) {
            show(viewModel.rrpWithTax.el);
            if (viewModel.rrpWithTax.span) viewModel.rrpWithTax.span.innerHTML = price.rrp_with_tax.formatted;
        }

        if (price.rrp_without_tax) {
            show(viewModel.rrpWithoutTax.el);
            if (viewModel.rrpWithoutTax.span) viewModel.rrpWithoutTax.span.innerHTML = price.rrp_without_tax.formatted;
        }

        if (price.saved) {
            show(viewModel.priceSaved.el);
            if (viewModel.priceSaved.span) viewModel.priceSaved.span.innerHTML = price.saved.formatted;
        }

        if (price.non_sale_price_with_tax) {
            hide(viewModel.priceLabel.span);
            show(viewModel.nonSaleWithTax.el);
            show(viewModel.priceNowLabel.span);
            if (viewModel.nonSaleWithTax.span) viewModel.nonSaleWithTax.span.innerHTML = price.non_sale_price_with_tax.formatted;
        }

        if (price.non_sale_price_without_tax) {
            hide(viewModel.priceLabel.span);
            show(viewModel.nonSaleWithoutTax.el);
            show(viewModel.priceNowLabel.span);
            if (viewModel.nonSaleWithoutTax.span) viewModel.nonSaleWithoutTax.span.innerHTML = price.non_sale_price_without_tax.formatted;
        }
    }

    /**
     * Show variant-level error message box if a message is passed
     * Hide the box if the message is empty or if product-level error message box is already present
     * @param  {String} message
     */
    showMessageBox(message) {
        const scope = this.$scope || document;
        const variantErrorBox = scope.querySelector('.productAttributes-message');
        const productErrorBoxes = qsa('.alertBox--error', scope).filter(el => !el.classList.contains('productAttributes-message'));

        if (!message || productErrorBoxes.length) {
            hide(variantErrorBox);
            return;
        }

        const alertMsg = variantErrorBox ? variantErrorBox.querySelector('.alertBox-message') : null;
        if (alertMsg) alertMsg.textContent = message;
        show(variantErrorBox);
    }

    updateDefaultAttributesForOOS(data) {
        const viewModel = this.getViewModel(this.$scope);
        if (!data.purchasable || !data.instock) {
            if (viewModel.addToCart) viewModel.addToCart.disabled = true;
            viewModel.increments.forEach(el => { el.disabled = true; });
        } else {
            if (viewModel.addToCart) viewModel.addToCart.disabled = false;
            viewModel.increments.forEach(el => { el.disabled = false; });
        }
    }

    updateWalletButtonsView(data) {
        const viewModel = this.getViewModel(this.$scope);
        const isValidForm = viewModel.addToCartForm ? viewModel.addToCartForm.checkValidity() : false;

        this.toggleWalletButtonsVisibility(isValidForm && data.purchasable && data.instock);
    }

    toggleWalletButtonsVisibility(shouldShow) {
        const viewModel = this.getViewModel(this.$scope);

        if (shouldShow) {
            show(viewModel.walletButtons);
        } else {
            hide(viewModel.walletButtons);
        }
    }

    enableAttribute(attribute, behavior, outOfStockMessage) {
        if (this.getAttributeType(attribute) === 'set-select') {
            return this.enableSelectOptionAttribute(attribute, behavior, outOfStockMessage);
        }

        if (behavior === 'hide_option') {
            show(attribute);
        } else {
            attribute.classList.remove('unavailable');
        }
    }

    disableAttribute(attribute, behavior, outOfStockMessage) {
        if (this.getAttributeType(attribute) === 'set-select') {
            return this.disableSelectOptionAttribute(attribute, behavior, outOfStockMessage);
        }

        if (behavior === 'hide_option') {
            hide(attribute);
        } else {
            attribute.classList.add('unavailable');
        }
    }

    getAttributeType(attribute) {
        const parent = attribute.closest('[data-product-attribute]');

        return parent ? parent.dataset.productAttribute : null;
    }

    disableSelectOptionAttribute(attribute, behavior, outOfStockMessage) {
        const select = attribute.parentElement;

        if (behavior === 'hide_option') {
            toggleOption(attribute, false);
            // If the attribute is the selected option in a select dropdown, select the first option (MERC-639)
            if (select && select.value === attribute.getAttribute('value')) {
                select.selectedIndex = 0;
            }
        } else {
            attribute.innerHTML = attribute.innerHTML.replace(outOfStockMessage, '') + outOfStockMessage;
        }
    }

    enableSelectOptionAttribute(attribute, behavior, outOfStockMessage) {
        if (behavior === 'hide_option') {
            toggleOption(attribute, true);
        } else {
            attribute.innerHTML = attribute.innerHTML.replace(outOfStockMessage, '');
        }
    }
}
