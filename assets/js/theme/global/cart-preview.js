import utils from '@bigcommerce/stencil-utils';
import { qsa, trigger } from '../common/dom';

export const CartPreviewEvents = {
    close: 'closed.fndtn.dropdown',
    open: 'opened.fndtn.dropdown',
};

export default function (secureBaseUrl, cartId) {
    const loadingClass = 'is-loading';
    const cart = document.querySelector('[data-cart-preview]');
    const cartDropdown = document.getElementById('cart-preview-dropdown');
    const cartLoading = document.createElement('div');
    cartLoading.className = 'loadingOverlay';

    if (window.ApplePaySession && cartDropdown) {
        cartDropdown.classList.add('apple-pay-supported');
    }

    document.body.addEventListener('cart-quantity-update', (event) => {
        const quantity = event.detail;

        if (cart) {
            const label = cart.getAttribute('aria-label') || '';
            cart.setAttribute('aria-label', label.replace(/\d+/, quantity));

            if (!quantity) {
                cart.classList.add('navUser-item--cart__hidden-s');
            } else {
                cart.classList.remove('navUser-item--cart__hidden-s');
            }
        }

        qsa('.cart-quantity').forEach(el => {
            el.textContent = quantity;
            el.classList.toggle('countPill--positive', quantity > 0);
        });
        if (utils.tools.storage.localStorageAvailable()) {
            localStorage.setItem('cart-quantity', quantity);
        }
    });

    if (cart) {
        cart.addEventListener('click', event => {
            const options = {
                template: 'common/cart-preview',
            };

            // Redirect to full cart page on mobile
            if (/Mobi/i.test(navigator.userAgent)) {
                return event.stopPropagation();
            }

            event.preventDefault();

            if (cartDropdown) {
                cartDropdown.classList.add(loadingClass);
                cartDropdown.innerHTML = '';
                cartDropdown.appendChild(cartLoading);
                cartLoading.style.display = '';
            }

            utils.api.cart.getContent(options, (err, response) => {
                if (cartDropdown) {
                    cartDropdown.classList.remove(loadingClass);
                    cartDropdown.innerHTML = response;
                }
            });
        });
    }

    let quantity = 0;

    if (cartId) {
        // Get existing quantity from localStorage if found
        if (utils.tools.storage.localStorageAvailable()) {
            if (localStorage.getItem('cart-quantity')) {
                quantity = Number(localStorage.getItem('cart-quantity'));
                trigger(document.body, 'cart-quantity-update', quantity);
            }
        }

        // Get updated cart quantity from the Cart API
        const cartQtyPromise = new Promise((resolve, reject) => {
            utils.api.cart.getCartQuantity({ baseUrl: secureBaseUrl, cartId }, (err, qty) => {
                if (err) {
                    if (err === 'Not Found') {
                        resolve(0);
                    } else {
                        reject(err);
                    }
                }
                resolve(qty);
            });
        });

        // If the Cart API gives us a different quantity number, update it
        cartQtyPromise.then(qty => {
            quantity = qty;
            trigger(document.body, 'cart-quantity-update', quantity);
        });
    } else {
        trigger(document.body, 'cart-quantity-update', quantity);
    }
}
