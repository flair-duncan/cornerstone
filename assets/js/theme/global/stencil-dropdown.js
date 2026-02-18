import { qsa, trigger } from '../common/dom';
import { ModalEvents } from './modal';

export default class StencilDropdown {
    constructor(extendables) {
        this.extendables = extendables;
    }

    hide(container, style) {
        if (style) {
            container.setAttribute('style', style);
        }

        if (this.extendables && this.extendables.hide) {
            this.extendables.hide();
        }

        container.classList.remove('is-open', 'f-open-dropdown');
        container.setAttribute('aria-hidden', 'true');
    }

    show(container, event, style) {
        if (style) {
            container.setAttribute('style', style);
            container.setAttribute('aria-hidden', 'false');
        }

        container.classList.add('is-open', 'f-open-dropdown');
        container.setAttribute('aria-hidden', 'false');

        if (this.extendables && this.extendables.show) {
            this.extendables.show(event);
        }
    }

    bind(dropDownTrigger, container, style) {
        let modalOpened = false;

        dropDownTrigger.addEventListener('click', event => {
            const openCart = document.querySelector('.is-open[data-cart-preview]');
            if (openCart) {
                openCart.click();
            }

            if (container.classList.contains('is-open')) {
                this.hide(container, event);
            } else {
                this.show(container, event, style);
            }
        });

        document.body.addEventListener('click', e => {
            if (this.extendables && this.extendables.onBodyClick) {
                this.extendables.onBodyClick(e, container);
            }
        });

        document.body.addEventListener('keyup', (e) => {
            if (e.which === 27 && !modalOpened) {
                this.hide(container);
            }
        });

        document.body.addEventListener(ModalEvents.open, () => {
            modalOpened = true;
        });

        document.body.addEventListener(ModalEvents.close, () => {
            modalOpened = false;
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-drop-down-close]')) {
                modalOpened = false;
                this.hide(container);
            }
        });
    }
}
