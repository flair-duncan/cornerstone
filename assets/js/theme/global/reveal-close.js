import { qsa } from '../common/dom';

const revealCloseAttr = 'revealClose';
const revealCloseSelector = `[data-${revealCloseAttr}]`;
const revealSelector = '[data-reveal]';

const buttonInstanceMap = new WeakMap();

class RevealClose {
    constructor(button) {
        this.button = button;
        this.modalId = button.dataset[revealCloseAttr] || '';

        this.onClick = this.onClick.bind(this);
        this.bindEvents();
    }

    get modal() {
        let modalEl;

        if (this.modalId) {
            modalEl = document.getElementById(this.modalId);
        } else {
            modalEl = this.button.closest(revealSelector);
        }

        // Modal instances are stored via the modalFactory WeakMap
        // We access .modalInstance which the Modal constructor sets on the element
        return modalEl && modalEl._modalInstance;
    }

    bindEvents() {
        this.button.addEventListener('click', this.onClick);
    }

    unbindEvents() {
        this.button.removeEventListener('click', this.onClick);
    }

    onClick(event) {
        const { modal } = this;

        if (modal) {
            event.preventDefault();
            modal.close();
        }
    }
}

export default function revealCloseFactory(selector = revealCloseSelector, options = {}) {
    const context = options.$context || document;
    const buttons = qsa(selector, context);

    return buttons.map(button => {
        const cached = buttonInstanceMap.get(button);
        if (cached instanceof RevealClose) {
            return cached;
        }

        const rc = new RevealClose(button);
        buttonInstanceMap.set(button, rc);
        return rc;
    });
}
