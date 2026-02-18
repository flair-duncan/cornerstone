import * as focusTrap from 'focus-trap';
import { qsa, trigger, delegate } from '../common/dom';
// eslint-disable-next-line import/no-cycle
import initFoundation from './foundation';

const bodyActiveClass = 'has-activeModal';
const loadingOverlayClass = 'loadingOverlay';
const modalBodyClass = 'modal-body';
const modalContentClass = 'modal-content';
const bgClass = 'modal-background';

const SizeClasses = {
    small: 'modal--small',
    large: 'modal--large',
    normal: '',
};

export const ModalEvents = {
    close: 'close.fndtn.reveal',
    closed: 'closed.fndtn.reveal',
    open: 'open.fndtn.reveal',
    opened: 'opened.fndtn.reveal',
    loaded: 'loaded.data.custom',
};

function getSizeFromModal(modal) {
    if (modal.classList.contains(SizeClasses.small)) {
        return 'small';
    }
    if (modal.classList.contains(SizeClasses.large)) {
        return 'large';
    }
    return 'normal';
}

function getViewportHeight(multiplier = 1) {
    return window.innerHeight * multiplier;
}

function wrapModalBody(content) {
    const body = document.createElement('div');
    body.className = modalBodyClass;
    body.innerHTML = content;
    return body;
}

function restrainContentHeight(contentEl) {
    if (!contentEl) return;

    const body = contentEl.querySelector(`.${modalBodyClass}`);
    if (!body) return;

    const bodyHeight = body.offsetHeight;
    const contentHeight = contentEl.offsetHeight;
    const viewportHeight = getViewportHeight(0.9);
    const maxHeight = viewportHeight - (contentHeight - bodyHeight);

    body.style.maxHeight = `${maxHeight}px`;
}

function createModalContent(modal) {
    let content = modal.querySelector(`.${modalContentClass}`);
    if (!content) {
        content = document.createElement('div');
        content.className = modalContentClass;
        while (modal.firstChild) {
            content.appendChild(modal.firstChild);
        }
        modal.appendChild(content);
    }
    return content;
}

function createLoadingOverlay(modal) {
    let overlay = modal.querySelector(`.${loadingOverlayClass}`);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = loadingOverlayClass;
        modal.appendChild(overlay);
    }
    return overlay;
}

function createBackground() {
    let bg = document.querySelector(`.${bgClass}`);
    if (!bg) {
        bg = document.createElement('div');
        bg.className = bgClass;
        bg.style.display = 'none';
        document.body.appendChild(bg);
    }
    return bg;
}

/**
 * Vanilla reveal modal, API-compatible with the former Foundation-based Modal.
 */
export class Modal {
    constructor(modal, { size = null } = {}) {
        this.$modal = modal;
        this.$content = createModalContent(this.$modal);
        this.$overlay = createLoadingOverlay(this.$modal);
        this.$bg = createBackground();
        this.defaultSize = size || getSizeFromModal(modal);
        this.size = this.defaultSize;
        this.pending = false;
        this.$preModalFocusedEl = null;
        this.focusTrap = null;

        this.onModalOpen = this.onModalOpen.bind(this);
        this.onModalOpened = this.onModalOpened.bind(this);
        this.onModalClose = this.onModalClose.bind(this);
        this.onModalClosed = this.onModalClosed.bind(this);
        this._onBgClick = this._onBgClick.bind(this);
        this._onKeydown = this._onKeydown.bind(this);

        this.bindEvents();

        // STRF-2471 - prevents double-firing of dropdown click events
        delegate(this.$modal, 'click', '.dropdown-menu-button', e => {
            e.stopPropagation();
        });
    }

    get pending() {
        return this._pending;
    }

    set pending(pending) {
        this._pending = pending;
        this.$overlay.style.display = pending ? '' : 'none';
    }

    get size() {
        return this._size;
    }

    set size(size) {
        this._size = size;
        this.$modal.classList.remove(SizeClasses.small, SizeClasses.large);
        const cls = SizeClasses[size];
        if (cls) {
            this.$modal.classList.add(cls);
        }
    }

    bindEvents() {
        this.$modal.addEventListener(ModalEvents.close, this.onModalClose);
        this.$modal.addEventListener(ModalEvents.closed, this.onModalClosed);
        this.$modal.addEventListener(ModalEvents.open, this.onModalOpen);
        this.$modal.addEventListener(ModalEvents.opened, this.onModalOpened);
    }

    open({ size, pending = true, clearContent = true } = {}) {
        this.pending = pending;

        if (size) {
            this.size = size;
        }

        if (clearContent) {
            this.clearContent();
        }

        // Fire open event
        trigger(this.$modal, ModalEvents.open);

        // Show modal + background
        this.$modal.classList.add('open');
        this.$modal.style.display = 'block';
        this.$bg.style.display = 'block';

        // Background click closes
        this.$bg.addEventListener('click', this._onBgClick);
        document.addEventListener('keydown', this._onKeydown);

        // Fire opened event asynchronously so listeners can attach
        requestAnimationFrame(() => {
            trigger(this.$modal, ModalEvents.opened);
        });
    }

    close() {
        trigger(this.$modal, ModalEvents.close);

        this.$modal.classList.remove('open');
        this.$modal.style.display = 'none';
        this.$bg.style.display = 'none';

        this.$bg.removeEventListener('click', this._onBgClick);
        document.removeEventListener('keydown', this._onKeydown);

        trigger(this.$modal, ModalEvents.closed);
    }

    updateContent(content, { wrap = false } = {}) {
        if (wrap) {
            const body = wrapModalBody(content);
            this.$content.innerHTML = '';
            this.$content.appendChild(body);
        } else {
            this.$content.innerHTML = typeof content === 'string' ? content : '';
            if (typeof content !== 'string' && content instanceof Node) {
                this.$content.innerHTML = '';
                this.$content.appendChild(content);
            }
        }

        this.pending = false;
        trigger(this.$modal, ModalEvents.loaded);

        restrainContentHeight(this.$content);
        initFoundation(this.$content);
    }

    clearContent() {
        this.$content.innerHTML = '';
    }

    setupFocusTrap() {
        if (!this.$preModalFocusedEl) this.$preModalFocusedEl = document.activeElement;

        if (!this.focusTrap) {
            this.focusTrap = focusTrap.createFocusTrap(this.$modal, {
                escapeDeactivates: false,
                returnFocusOnDeactivate: false,
                allowOutsideClick: true,
                fallbackFocus: () => {
                    if (this.$preModalFocusedEl) return this.$preModalFocusedEl;
                    return document.querySelector('[data-header-logo-link]') || document.body;
                },
            });
        }

        this.focusTrap.deactivate();
        this.focusTrap.activate();
    }

    onModalClose() {
        document.body.classList.remove(bodyActiveClass);
    }

    onModalClosed() {
        this.size = this.defaultSize;

        if (this.focusTrap) this.focusTrap.deactivate();
        if (this.$preModalFocusedEl && this.$preModalFocusedEl.focus) {
            this.$preModalFocusedEl.focus();
        }

        this.$preModalFocusedEl = null;
    }

    onModalOpen() {
        document.body.classList.add(bodyActiveClass);
    }

    onModalOpened() {
        if (this.pending) {
            const onLoaded = () => {
                this.$modal.removeEventListener(ModalEvents.loaded, onLoaded);
                if (this.$modal.classList.contains('open')) this.setupFocusTrap();
            };
            this.$modal.addEventListener(ModalEvents.loaded, onLoaded);
        } else {
            this.setupFocusTrap();
        }

        restrainContentHeight(this.$content);
    }

    _onBgClick() {
        this.close();
    }

    _onKeydown(e) {
        if (e.key === 'Escape') {
            this.close();
        }
    }
}

const instanceMap = new WeakMap();

/**
 * Return an array of modals
 * @param {string} selector
 * @param {Object} [options]
 * @param {string} [options.size]
 * @returns {Modal[]}
 */
export default function modalFactory(selector = '[data-reveal]', options = {}) {
    const context = options.$context || document;
    const elements = qsa(selector, context);

    return elements.map(element => {
        const cached = instanceMap.get(element);
        if (cached instanceof Modal) {
            return cached;
        }

        const modal = new Modal(element, options);
        instanceMap.set(element, modal);
        element._modalInstance = modal;
        return modal;
    });
}

/*
 * Return the default page modal
 */
export function defaultModal() {
    return modalFactory('#modal')[0];
}

/*
 * Return the default alert modal
 */
export function alertModal() {
    return modalFactory('#alert-modal')[0];
}

/*
 * Display the given message in the default alert modal
 */
export function showAlertModal(message, options = {}) {
    const modal = alertModal();
    const cancelBtn = modal.$modal.querySelector('.cancel');
    const confirmBtn = modal.$modal.querySelector('.confirm');
    const {
        icon = 'error',
        $preModalFocusedEl = null,
        showCancelButton,
        onConfirm,
    } = options;

    if ($preModalFocusedEl) {
        modal.$preModalFocusedEl = $preModalFocusedEl;
    }

    modal.open();
    qsa('.alert-icon', modal.$modal).forEach(el => { el.style.display = 'none'; });

    if (icon === 'error') {
        const errorIcon = modal.$modal.querySelector('.error-icon');
        if (errorIcon) errorIcon.style.display = '';
    } else if (icon === 'warning') {
        const warningIcon = modal.$modal.querySelector('.warning-icon');
        if (warningIcon) warningIcon.style.display = '';
    }

    modal.updateContent(`<span>${message}</span>`);

    if (onConfirm && confirmBtn) {
        confirmBtn.addEventListener('click', onConfirm);

        const onClosed = () => {
            modal.$modal.removeEventListener(ModalEvents.closed, onClosed);
            confirmBtn.removeEventListener('click', onConfirm);
        };
        modal.$modal.addEventListener(ModalEvents.closed, onClosed);
    }

    if (cancelBtn) {
        cancelBtn.style.display = showCancelButton ? '' : 'none';
    }
}
