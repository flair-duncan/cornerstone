import utils from '@bigcommerce/stencil-utils';
import ProductDetailsBase from './product-details-base';
import ImageGallery from '../product/image-gallery';
import modalFactory, { alertModal, showAlertModal, ModalEvents } from '../global/modal';
import { isEmpty, isPlainObject } from 'lodash';
import nod from './nod';
import { announceInputErrorMessage } from './utils/form-utils';
import forms from './models/forms';
import { normalizeFormData } from './utils/api';
import { isBrowserIE, convertIntoArray } from './utils/ie-helpers';
import bannerUtils from './utils/banner-utils';
import currencySelector from '../global/currency-selector';
import { qsa, delegate } from './dom';

/**
 * Serialize form data as URL-encoded string (replaces jQuery .serialize())
 */
function serializeForm(form) {
    return new URLSearchParams(new FormData(form)).toString();
}

/**
 * Convert form data into array of {name, value} objects (replaces jQuery .serializeArray())
 */
function serializeFormArray(form) {
    const result = [];
    const formData = new FormData(form);
    formData.forEach((value, name) => {
        result.push({ name, value });
    });
    return result;
}

export default class ProductDetails extends ProductDetailsBase {
    constructor(scope, context, productAttributesData = {}) {
        super(scope, context);

        this.isCartPage = context.template === 'pages/cart';
        this.overlay = this.$scope ? this.$scope.querySelector('[data-cart-item-add] .loadingOverlay') : null;
        this.imageGallery = new ImageGallery(this.$scope ? this.$scope.querySelector('[data-image-gallery]') : null);
        this.imageGallery.init();
        this.listenQuantityChange();
        this.swatchOptionMessages = qsa('.swatch-option-message');
        this.swatchInitMessageStorage = {};
        this.swatchGroupIds = qsa('[id^="swatchGroup"]').map(el => el.id);
        this.storeInitMessagesForSwatches();
        this.updateDateSelector();

        const form = this.$scope ? this.$scope.querySelector('form[data-cart-item-add]') : null;

        if (form && form.checkValidity()) {
            this.updateProductDetailsData();
        } else {
            this.toggleWalletButtonsVisibility(false);
        }

        this.addToCartValidator = nod({
            submit: form ? form.querySelector('input#form-action-addToCart') : null,
            tap: announceInputErrorMessage,
        });

        const productOptionsElement = form ? form.querySelector('[data-product-option-change]') : null;
        const productSwatchGroups = form ? qsa('[id*="attribute_swatch"]', form) : [];
        const productSwatchLabels = form ? qsa('.form-option-swatch', form) : [];

        const placeSwatchLabelImage = (label) => {
            const optionImage = label.querySelector('.form-option-expanded');
            if (!optionImage) return;
            const optionImageWidth = optionImage.offsetWidth;
            const extendedOptionImageOffsetLeft = 55;
            const { right } = label.getBoundingClientRect();
            const emptySpaceToScreenRightBorder = window.screen.width - right;
            const shiftValue = optionImageWidth - emptySpaceToScreenRightBorder;

            if (emptySpaceToScreenRightBorder < (optionImageWidth + extendedOptionImageOffsetLeft)) {
                optionImage.style.left = `${shiftValue > 0 ? -shiftValue : shiftValue}px`;
            }
        };

        window.addEventListener('load', () => {
            this.registerAddToCartValidation();
            productSwatchLabels.forEach(placeSwatchLabelImage);
        });

        if (context.showSwatchNames) {
            this.swatchOptionMessages.forEach(el => el.classList.remove('u-hidden'));

            productSwatchGroups.forEach(group => {
                group.addEventListener('change', ({ target }) => {
                    const swatchGroupElement = target.parentNode.parentNode;
                    this.showSwatchNameOnOption(target, swatchGroupElement);
                });

                if (group.checked) {
                    const swatchGroupElement = group.parentNode.parentNode;
                    this.showSwatchNameOnOption(group, swatchGroupElement);
                }
            });
        }

        if (productOptionsElement) {
            productOptionsElement.addEventListener('change', event => {
                this.productOptionsChanged(event);
                this.setProductVariant();
            });
        }

        if (form) {
            form.addEventListener('submit', event => {
                this.addToCartValidator.performCheck();

                if (this.addToCartValidator.areAll('valid')) {
                    this.addProductToCart(event, form);
                }
            });
        }

        this.updateProductAttributes(productAttributesData);
        this.updateView(productAttributesData, null);
        bannerUtils.dispatchProductBannerEvent(productAttributesData);

        if (productOptionsElement) productOptionsElement.style.display = '';

        this.previewModal = modalFactory('#previewModal')[0];
    }

    registerAddToCartValidation() {
        this.addToCartValidator.add([{
            selector: '[data-quantity-change] > .form-input--incrementTotal',
            validate: (cb, val) => {
                const result = forms.numbersOnly(val);
                cb(result);
            },
            errorMessage: this.context.productQuantityErrorMessage,
        }]);

        return this.addToCartValidator;
    }

    storeInitMessagesForSwatches() {
        if (this.swatchGroupIds.length && isEmpty(this.swatchInitMessageStorage)) {
            this.swatchGroupIds.forEach(swatchGroupId => {
                if (!this.swatchInitMessageStorage[swatchGroupId]) {
                    const msgEl = document.querySelector(`#${swatchGroupId} ~ .swatch-option-message`);
                    this.swatchInitMessageStorage[swatchGroupId] = msgEl ? msgEl.textContent.trim() : '';
                }
            });
        }
    }

    setProductVariant() {
        const unsatisfiedRequiredFields = [];
        const options = [];

        document.querySelectorAll('[data-product-attribute]').forEach(value => {
            const optionLabel = value.children[0].innerText;
            const optionTitle = optionLabel.split(':')[0].trim();
            const required = optionLabel.toLowerCase().includes('required');
            const type = value.getAttribute('data-product-attribute');

            if ((type === 'input-file' || type === 'input-text' || type === 'input-number') && value.querySelector('input').value === '' && required) {
                unsatisfiedRequiredFields.push(value);
            }

            if (type === 'textarea' && value.querySelector('textarea').value === '' && required) {
                unsatisfiedRequiredFields.push(value);
            }

            if (type === 'date') {
                const isSatisfied = Array.from(value.querySelectorAll('select')).every((select) => select.selectedIndex !== 0);

                if (isSatisfied) {
                    const dateString = Array.from(value.querySelectorAll('select')).map((x) => x.value).join('-');
                    options.push(`${optionTitle}:${dateString}`);

                    return;
                }

                if (required) {
                    unsatisfiedRequiredFields.push(value);
                }
            }

            if (type === 'set-select') {
                const select = value.querySelector('select');
                const selectedIndex = select.selectedIndex;

                if (selectedIndex !== 0) {
                    options.push(`${optionTitle}:${select.options[selectedIndex].innerText}`);

                    return;
                }

                if (required) {
                    unsatisfiedRequiredFields.push(value);
                }
            }

            if (type === 'set-rectangle' || type === 'set-radio' || type === 'swatch' || type === 'input-checkbox' || type === 'product-list') {
                const checked = value.querySelector(':checked');
                if (checked) {
                    const getSelectedOptionLabel = () => {
                        const productVariantslist = convertIntoArray(value.children);
                        const matchLabelForCheckedInput = inpt => inpt.dataset.productAttributeValue === checked.value;
                        return productVariantslist.filter(matchLabelForCheckedInput)[0];
                    };
                    if (type === 'set-rectangle' || type === 'set-radio' || type === 'product-list') {
                        const label = isBrowserIE ? getSelectedOptionLabel().innerText.trim() : checked.labels[0].innerText;
                        if (label) {
                            options.push(`${optionTitle}:${label}`);
                        }
                    }

                    if (type === 'swatch') {
                        const label = isBrowserIE ? getSelectedOptionLabel().children[0] : checked.labels[0].children[0];
                        if (label) {
                            options.push(`${optionTitle}:${label.title}`);
                        }
                    }

                    if (type === 'input-checkbox') {
                        options.push(`${optionTitle}:Yes`);
                    }

                    return;
                }

                if (type === 'input-checkbox') {
                    options.push(`${optionTitle}:No`);
                }

                if (required) {
                    unsatisfiedRequiredFields.push(value);
                }
            }
        });

        let productVariant = unsatisfiedRequiredFields.length === 0 ? options.sort().join(', ') : 'unsatisfied';
        const view = document.querySelector('.productView');

        if (productVariant && view) {
            productVariant = productVariant === 'unsatisfied' ? '' : productVariant;
            if (view.getAttribute('data-event-type')) {
                view.setAttribute('data-product-variant', productVariant);
            } else {
                const titleEl = view.querySelector('.productView-title');
                if (titleEl) {
                    const productName = titleEl.innerText.replace(/"/g, '\\$&');
                    const card = document.querySelector(`[data-name="${productName}"]`);
                    if (card) card.setAttribute('data-product-variant', productVariant);
                }
            }
        }
    }

    /**
     * Checks if the current window is being run inside an iframe
     * @returns {boolean}
     */
    isRunningInIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    /**
     * Handle product options changes
     */
    productOptionsChanged(event) {
        const changedOption = event.target;
        const form = changedOption.closest('form');
        const productIdInput = form ? form.querySelector('[name="product_id"]') : null;
        const productId = productIdInput ? productIdInput.value : '';

        // Do not trigger an ajax request if it's a file or if the browser doesn't support FormData
        if (changedOption.type === 'file' || window.FormData === undefined) {
            return;
        }

        utils.api.productAttributes.optionChange(productId, serializeForm(form), 'products/bulk-discount-rates', (err, response) => {
            const productAttributesData = response.data || {};
            const productAttributesContent = response.content || {};
            this.updateProductAttributes(productAttributesData);
            this.updateView(productAttributesData, productAttributesContent);
            this.updateProductDetailsData();
            bannerUtils.dispatchProductBannerEvent(productAttributesData);

            if (!this.checkIsQuickViewChild(form)) {
                const productView = form.closest('.productView');
                const infoContext = productView ? productView.querySelector('.productView-info') : null;
                if (infoContext) modalFactory('[data-reveal]', { $context: infoContext });
            }

            document.dispatchEvent(new CustomEvent('onProductOptionsChanged', {
                bubbles: true,
                detail: {
                    content: productAttributesData,
                    data: productAttributesContent,
                },
            }));
        });
    }

    /**
     * if this setting is enabled in Page Builder
     * show name for swatch option
     */
    showSwatchNameOnOption(swatch, swatchGroup) {
        const swatchName = swatch.getAttribute('aria-label');
        const activeSwatchGroupId = swatchGroup.getAttribute('aria-labelledby');
        const swatchOptionMessage = document.querySelector(`#${activeSwatchGroupId} ~ .swatch-option-message`);

        const optionValueEl = swatchGroup.querySelector('[data-option-value]');
        if (optionValueEl) optionValueEl.textContent = swatchName;
        if (swatchOptionMessage) {
            swatchOptionMessage.textContent = `${this.swatchInitMessageStorage[activeSwatchGroupId]} ${swatchName}`;
            this.setLiveRegionAttributes(swatchOptionMessage, 'status', 'assertive');
        }
    }

    setLiveRegionAttributes(element, roleType, ariaLiveStatus) {
        element.setAttribute('role', roleType);
        element.setAttribute('aria-live', ariaLiveStatus);
    }

    checkIsQuickViewChild(element) {
        return !!element.closest('.quickView');
    }

    showProductImage(image) {
        if (isPlainObject(image)) {
            const zoomImageUrl = utils.tools.imageSrcset.getSrcset(
                image.data,
                { '1x': this.context.zoomSize },
            );

            const mainImageUrl = utils.tools.imageSrcset.getSrcset(
                image.data,
                { '1x': this.context.productSize },
            );

            const mainImageSrcset = utils.tools.imageSrcset.getSrcset(image.data);

            this.imageGallery.setAlternateImage({
                mainImageUrl,
                zoomImageUrl,
                mainImageSrcset,
            });
        } else {
            this.imageGallery.restoreImage();
        }
    }

    /**
     * Handle action when the shopper clicks on + / - for quantity
     */
    listenQuantityChange() {
        if (!this.$scope) return;

        delegate(this.$scope, 'click', '[data-quantity-change] button', (event) => {
            event.preventDefault();
            const target = event.target.closest('button');
            const viewModel = this.getViewModel(this.$scope);
            const input = viewModel.quantity.input;
            if (!input) return;
            const quantityMin = parseInt(input.dataset.quantityMin, 10);
            const quantityMax = parseInt(input.dataset.quantityMax, 10);

            let qty = forms.numbersOnly(input.value) ? parseInt(input.value, 10) : quantityMin;
            // If action is incrementing
            if (target && target.dataset.action === 'inc') {
                qty = forms.validateIncreaseAgainstMaxBoundary(qty, quantityMax);
            } else if (qty > 1) {
                qty = forms.validateDecreaseAgainstMinBoundary(qty, quantityMin);
            }

            // update hidden input
            input.value = qty;
            // update text
            if (viewModel.quantity.text) viewModel.quantity.text.textContent = qty;
            // perform validation after updating product quantity
            this.addToCartValidator.performCheck();

            this.updateProductDetailsData();
        });

        // Prevent triggering quantity change when pressing enter
        this.$scope.addEventListener('keypress', event => {
            if (event.target.matches('.form-input--incrementTotal')) {
                const x = event.which || event.keyCode;
                if (x === 13) {
                    event.preventDefault();
                }
            }
        });

        this.$scope.addEventListener('keyup', event => {
            if (event.target.matches('.form-input--incrementTotal')) {
                this.updateProductDetailsData();
            }
        });
    }

    /**
     * Add a product to cart
     */
    addProductToCart(event, form) {
        const addToCartBtn = form.querySelector('#form-action-addToCart');
        if (!addToCartBtn) return;
        const originalBtnVal = addToCartBtn.value;
        const waitMessage = addToCartBtn.dataset.waitMessage;

        // Do not do AJAX if browser doesn't support FormData
        if (window.FormData === undefined) {
            return;
        }

        // Prevent default
        event.preventDefault();

        addToCartBtn.value = waitMessage;
        addToCartBtn.disabled = true;

        if (this.overlay) this.overlay.style.display = '';

        // Add item to cart
        utils.api.cart.itemAdd(normalizeFormData(new FormData(form)), (err, response) => {
            currencySelector(response.data.cart_id);
            const errorMessage = err || response.data.error;

            addToCartBtn.value = originalBtnVal;
            addToCartBtn.disabled = false;

            if (this.overlay) this.overlay.style.display = 'none';

            // Guard statement
            if (errorMessage) {
                // Strip the HTML from the error message
                const tmp = document.createElement('DIV');
                tmp.innerHTML = errorMessage;

                if (!this.checkIsQuickViewChild(addToCartBtn)) {
                    alertModal().$preModalFocusedEl = addToCartBtn;
                }

                return showAlertModal(tmp.textContent || tmp.innerText);
            }

            // Open preview modal and update content
            if (this.previewModal) {
                this.previewModal.open();

                if (window.ApplePaySession) {
                    this.previewModal.modal.classList.add('apple-pay-supported');
                }

                if (!this.checkIsQuickViewChild(addToCartBtn)) {
                    this.previewModal.$preModalFocusedEl = addToCartBtn;
                }

                this.updateCartContent(this.previewModal, response.data.cart_item.id);
            } else {
                if (this.overlay) this.overlay.style.display = '';
                // if no modal, redirect to the cart page
                this.redirectTo(response.data.cart_item.cart_url || this.context.urls.cart);
            }
        });

        const nextSibling = addToCartBtn.nextElementSibling;
        if (nextSibling) this.setLiveRegionAttributes(nextSibling, 'status', 'polite');
    }

    /**
     * Get cart contents
     */
    getCartContent(cartItemId, onComplete) {
        const options = {
            template: 'cart/preview',
            params: {
                suggest: cartItemId,
            },
            config: {
                cart: {
                    suggestions: {
                        limit: 4,
                    },
                },
            },
        };

        utils.api.cart.getContent(options, onComplete);
    }

    /**
     * Redirect to url
     */
    redirectTo(url) {
        if (this.isRunningInIframe() && !window.iframeSdk) {
            window.top.location = url;
        } else {
            window.location = url;
        }
    }

    /**
     * Update cart content
     */
    updateCartContent(modal, cartItemId, onComplete) {
        this.getCartContent(cartItemId, (err, response) => {
            if (err) {
                return;
            }

            modal.updateContent(response);

            // Update cart counter
            const body = document.body;
            const modalContent = modal.modal;
            const cartQuantityEl = modalContent ? modalContent.querySelector('[data-cart-quantity]') : null;
            const cartCounter = document.querySelector('.navUser-action .cart-count');
            const quantity = cartQuantityEl ? cartQuantityEl.dataset.cartQuantity || 0 : 0;
            const promotionBanner = document.querySelector('[data-promotion-banner]');
            const backToShoppingBtn = modalContent ? modalContent.querySelector('.previewCartCheckout > [data-reveal-close]') : null;
            const modalCloseBtn = document.querySelector('#previewModal > .modal-close');
            const bannerUpdateHandler = () => {
                const productContainer = document.querySelector('#main-content > .container');

                if (productContainer) {
                    const overlay = document.createElement('div');
                    overlay.className = 'loadingOverlay pdp-update';
                    productContainer.appendChild(overlay);
                    overlay.style.display = '';
                }
                window.location.reload();
            };

            if (cartCounter) cartCounter.classList.add('cart-count--positive');
            body.dispatchEvent(new CustomEvent('cart-quantity-update', { detail: quantity, bubbles: true }));

            if (onComplete) {
                onComplete(response);
            }

            if (this.isCartPage) {
                // Listen for modal close once
                const closedHandler = () => {
                    // Close quick search overlay if it's open
                    const searchContainer = document.getElementById('quickSearch');
                    if (searchContainer && searchContainer.classList.contains('is-open')) {
                        searchContainer.classList.remove('is-open');
                        searchContainer.setAttribute('aria-hidden', 'true');
                    }
                    bannerUpdateHandler();
                    modal.modal.removeEventListener(ModalEvents.closed, closedHandler);
                };
                modal.modal.addEventListener(ModalEvents.closed, closedHandler);
            } else if (promotionBanner && backToShoppingBtn) {
                backToShoppingBtn.addEventListener('click', bannerUpdateHandler);
                if (modalCloseBtn) modalCloseBtn.addEventListener('click', bannerUpdateHandler);
            }
        });
    }

    /**
     * Hide or mark as unavailable out of stock attributes if enabled
     * @param  {Object} data Product attribute data
     */
    updateProductAttributes(data) {
        super.updateProductAttributes(data);
        this.showProductImage(data.image);
    }

    updateProductDetailsData() {
        const form = document.querySelector('form[data-cart-item-add]');
        if (!form) return;
        const formDataItems = serializeFormArray(form);

        const productDetails = {};

        for (const formDataItem of formDataItems) {
            const { name, value } = formDataItem;

            if (name === 'product_id') {
                productDetails.productId = Number(value);
            }

            if (name === 'qty[]') {
                productDetails.quantity = Number(value);
            }

            if (name.match(/attribute/)) {
                const productOption = {
                    optionId: Number(name.match(/\d+/g)[0]),
                    optionValue: value,
                };

                productDetails.optionSelections = productDetails?.optionSelections
                    ? [...productDetails.optionSelections, productOption]
                    : [productOption];
            }
        }

        document.dispatchEvent(new CustomEvent('onProductUpdate', {
            bubbles: true,
            detail: { productDetails },
        }));
    }

    updateDateSelector() {
        if (!this.$scope) return;

        function updateDays(dateOption) {
            const monthSelector = dateOption.querySelector('select[name$="[month]"]');
            const daySelector = dateOption.querySelector('select[name$="[day]"]');
            const yearSelector = dateOption.querySelector('select[name$="[year]"]');
            const month = parseInt(monthSelector.value, 10);
            const year = parseInt(yearSelector.value, 10);
            let daysInMonth;

            if (!Number.isNaN(month) && !Number.isNaN(year)) {
                switch (month) {
                case 2:
                    daysInMonth = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0) ? 29 : 28;
                    break;
                case 4: case 6: case 9: case 11:
                    daysInMonth = 30;
                    break;
                default:
                    daysInMonth = 31;
                }

                for (let day = 29; day <= 31; day++) {
                    const option = daySelector.querySelector(`option[value="${day}"]`);
                    if (day <= daysInMonth && !option) {
                        daySelector.options.add(new Option(day, day));
                    } else if (day > daysInMonth && option) {
                        option.remove();
                    }
                }
            }
        }

        this.$scope.addEventListener('change', (e) => {
            const dateOption = e.target && e.target.closest && e.target.closest('[data-product-attribute=date]');

            if (dateOption) {
                updateDays(dateOption);
            }
        });

        this.$scope.querySelectorAll('[data-product-attribute=date]').forEach(dateOption => {
            updateDays(dateOption);
        });
    }
}
