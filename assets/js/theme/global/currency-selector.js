import { showAlertModal } from './modal';
import utils from '@bigcommerce/stencil-utils';
import { qsa, delegate } from '../common/dom';

let currencySelectorCalled = false;

export default function (cartId) {
    if (!cartId) return;

    if (!currencySelectorCalled) {
        currencySelectorCalled = true;
    } else {
        return;
    }

    function changeCurrency(url, currencyCode) {
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currencyCode }),
        }).then(resp => {
            if (!resp.ok) {
                return resp.json().then(data => { throw new Error(data.error); });
            }
            window.location.reload();
        }).catch(e => {
            showAlertModal(e.message || String(e));
        });
    }

    delegate(document.body, 'click', '[data-cart-currency-switch-url]', (event, el) => {
        const currencySessionSwitcher = el.href;
        event.preventDefault();
        utils.api.cart.getCart({ cartId }, (err, response) => {
            if (err || response === undefined) {
                window.location.href = currencySessionSwitcher;
                return;
            }

            const showWarning = response.discounts.some(discount => discount.discountedAmount > 0)
                || response.coupons.length > 0
                || response.lineItems.giftCertificates.length > 0;

            if (showWarning) {
                const text = el.dataset.warning;
                const preModalFocusedEl = document.querySelector('.navUser-action--currencySelector');

                showAlertModal(text, {
                    icon: 'warning',
                    showCancelButton: true,
                    $preModalFocusedEl: preModalFocusedEl,
                    onConfirm: () => {
                        changeCurrency(el.dataset.cartCurrencySwitchUrl, el.dataset.currencyCode);
                    },
                });
            } else {
                changeCurrency(el.dataset.cartCurrencySwitchUrl, el.dataset.currencyCode);
            }
        });
    });
}
