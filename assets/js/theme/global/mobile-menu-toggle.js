import * as focusTrap from 'focus-trap';
import _ from 'lodash';
import mediaQueryListFactory from '../common/media-query-list';
import { CartPreviewEvents } from './cart-preview';
import { qsa } from '../common/dom';

const PLUGIN_KEY = {
    CAMEL: 'mobileMenuToggle',
    SNAKE: 'mobile-menu-toggle',
};

function optionsFromData(element) {
    const mobileMenuId = element.dataset[PLUGIN_KEY.CAMEL];

    return {
        menuSelector: mobileMenuId && `#${mobileMenuId}`,
    };
}

/*
 * Manage the behaviour of a mobile menu
 * @param {Element} toggle
 * @param {Object} [options]
 * @param {Object} [options.headerSelector]
 * @param {Object} [options.menuSelector]
 * @param {Object} [options.scrollViewSelector]
 */
export class MobileMenuToggle {
    constructor(toggle, {
        headerSelector = '.header',
        menuSelector = '#menu',
        scrollViewSelector = '.navPages',
    } = {}) {
        this.body = document.body;
        this.menu = document.querySelector(menuSelector);
        this.navList = document.querySelector('.navPages-list.navPages-list-depth-max');
        this.header = document.querySelector(headerSelector);
        this.scrollView = this.menu ? this.menu.querySelector(scrollViewSelector) : null;
        this.subMenus = this.navList ? qsa('.navPages-action', this.navList) : [];
        this.toggle = toggle;
        this.mediumMediaQueryList = mediaQueryListFactory('medium');
        this.preModalFocusedEl = null;
        this.focusTrap = null;

        // Auto-bind
        this.onToggleClick = this.onToggleClick.bind(this);
        this.onCartPreviewOpen = this.onCartPreviewOpen.bind(this);
        this.onMediumMediaQueryMatch = this.onMediumMediaQueryMatch.bind(this);
        this.onSubMenuClick = this.onSubMenuClick.bind(this);

        // Listen
        this.bindEvents();

        // Assign DOM attributes
        if (this.menu) {
            this.toggle.setAttribute('aria-controls', this.menu.id);
        }

        // Hide by default
        this.hide();
    }

    get isOpen() {
        return this.menu && this.menu.classList.contains('is-open');
    }

    bindEvents() {
        this.toggle.addEventListener('click', this.onToggleClick);
        if (this.header) {
            this.header.addEventListener(CartPreviewEvents.open, this.onCartPreviewOpen);
        }
        this.subMenus.forEach(sub => sub.addEventListener('click', this.onSubMenuClick));

        if (this.mediumMediaQueryList && this.mediumMediaQueryList.addListener) {
            this.mediumMediaQueryList.addListener(this.onMediumMediaQueryMatch);
        }
    }

    unbindEvents() {
        this.toggle.removeEventListener('click', this.onToggleClick);
        if (this.header) {
            this.header.removeEventListener(CartPreviewEvents.open, this.onCartPreviewOpen);
        }

        if (this.mediumMediaQueryList && this.mediumMediaQueryList.addListener) {
            this.mediumMediaQueryList.removeListener(this.onMediumMediaQueryMatch);
        }
    }

    setupFocusTrap() {
        if (!this.preModalFocusedEl) this.preModalFocusedEl = document.activeElement;

        if (!this.focusTrap) {
            this.focusTrap = focusTrap.createFocusTrap(this.header, {
                escapeDeactivates: false,
                returnFocusOnDeactivate: false,
                allowOutsideClick: true,
                fallbackFocus: () => {
                    if (this.preModalFocusedEl) return this.preModalFocusedEl;
                    return document.querySelector('[data-mobile-menu-toggle="menu"]') || document.body;
                },
            });
        }

        this.focusTrap.deactivate();
        this.focusTrap.activate();
    }

    toggleMenu() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.body.classList.add('has-activeNavPages');

        this.toggle.classList.add('is-open');
        this.toggle.setAttribute('aria-expanded', 'true');

        if (this.menu) this.menu.classList.add('is-open');
        if (this.header) this.header.classList.add('is-open');
        if (this.scrollView) this.scrollView.scrollTop = 0;

        this.resetSubMenus();
        this.setupFocusTrap();
    }

    hide() {
        this.body.classList.remove('has-activeNavPages');

        this.toggle.classList.remove('is-open');
        this.toggle.setAttribute('aria-expanded', 'false');

        if (this.menu) this.menu.classList.remove('is-open');
        if (this.header) this.header.classList.remove('is-open');

        this.resetSubMenus();

        if (this.focusTrap) this.focusTrap.deactivate();
        if (this.preModalFocusedEl && this.preModalFocusedEl.focus) this.preModalFocusedEl.focus();

        this.preModalFocusedEl = null;
    }

    // Private
    onToggleClick(event) {
        event.preventDefault();
        this.toggleMenu();
    }

    onCartPreviewOpen() {
        if (this.isOpen) {
            this.hide();
        }
    }

    onMediumMediaQueryMatch(media) {
        if (!media.matches) {
            return;
        }
        this.hide();
    }

    onSubMenuClick(event) {
        const closestAction = event.target.closest('.navPages-action');
        if (!closestAction) return;

        const parentEl = closestAction.parentElement;
        const parentSiblings = parentEl ? Array.from(parentEl.parentElement.children).filter(c => c !== parentEl) : [];
        const horizontalSub = closestAction.closest('.navPage-subMenu-horizontal');
        const parentActions = horizontalSub ? Array.from(horizontalSub.parentElement.children).filter(c => c.classList.contains('navPages-action') && c !== horizontalSub) : [];

        const anyOpen = this.subMenus.some(s => s.classList.contains('is-open'));
        if (anyOpen) {
            if (this.navList) this.navList.classList.add('subMenu-is-open');
        } else if (this.navList) {
            this.navList.classList.remove('subMenu-is-open');
        }

        if (event.target.classList.contains('is-open')) {
            parentSiblings.forEach(s => s.classList.add('is-hidden'));
            parentActions.forEach(a => a.classList.add('is-hidden'));
        } else {
            parentSiblings.forEach(s => s.classList.remove('is-hidden'));
            parentActions.forEach(a => a.classList.remove('is-hidden'));
        }
    }

    resetSubMenus() {
        if (this.navList) {
            qsa('.is-hidden', this.navList).forEach(el => el.classList.remove('is-hidden'));
            this.navList.classList.remove('subMenu-is-open');
        }
    }
}

const instanceMap = new WeakMap();

/*
 * Create a new MobileMenuToggle instance
 * @param {string} [selector]
 * @param {Object} [options]
 * @return {MobileMenuToggle}
 */
export default function mobileMenuToggleFactory(selector = `[data-${PLUGIN_KEY.SNAKE}]`, overrideOptions = {}) {
    const toggle = document.querySelector(selector);
    if (!toggle) return null;

    const cached = instanceMap.get(toggle);
    if (cached instanceof MobileMenuToggle) {
        return cached;
    }

    const options = _.extend(optionsFromData(toggle), overrideOptions);
    const mobileMenu = new MobileMenuToggle(toggle, options);

    instanceMap.set(toggle, mobileMenu);

    return mobileMenu;
}
