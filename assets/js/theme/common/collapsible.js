import _ from 'lodash';
import mediaQueryListFactory from './media-query-list';
import { qsa, trigger } from './dom';

const PLUGIN_KEY = 'collapsible';

export const CollapsibleEvents = {
    open: 'open.collapsible',
    close: 'close.collapsible',
    toggle: 'toggle.collapsible',
    click: 'click',
};

const CollapsibleState = {
    closed: 'closed',
    open: 'open',
};

function prependHash(id) {
    if (id && id.indexOf('#') === 0) {
        return id;
    }

    return `#${id}`;
}

function optionsFromData(element) {
    return {
        disabledBreakpoint: element.dataset[`${PLUGIN_KEY}DisabledBreakpoint`],
        disabledState: element.dataset[`${PLUGIN_KEY}DisabledState`],
        enabledState: element.dataset[`${PLUGIN_KEY}EnabledState`],
        openClassName: element.dataset[`${PLUGIN_KEY}OpenClassName`],
    };
}

// WeakMap for instance caching (replaces jQuery .data())
const instanceCache = new WeakMap();

function isHidden(el) {
    return !el || el.offsetParent === null && getComputedStyle(el).display === 'none';
}

/**
 * Collapse/Expand toggle
 */
export class Collapsible {
    /**
     * @param {Element} toggle - Trigger button
     * @param {Element} target - Content to collapse / expand
     * @param {Object} [options] - Configurable options
     * @param {String} [options.disabledBreakpoint]
     * @param {Object} [options.disabledState]
     * @param {Object} [options.enabledState]
     * @param {String} [options.openClassName]
     */
    constructor(toggle, target, {
        disabledBreakpoint,
        disabledState,
        enabledState,
        openClassName = 'is-open',
    } = {}) {
        this.toggle = toggle;
        this.target = target;
        this.targetId = target ? target.id : '';
        this.openClassName = openClassName;
        this.disabledState = disabledState;
        this.enabledState = enabledState;

        // Backwards compat: expose as $toggle/$target for consumers reading these
        this.$toggle = toggle;
        this.$target = target;

        if (disabledBreakpoint) {
            this.disabledMediaQueryList = mediaQueryListFactory(disabledBreakpoint);
        }

        if (this.disabledMediaQueryList) {
            this.disabled = this.disabledMediaQueryList.matches;
        } else {
            this.disabled = false;
        }

        // Auto-bind
        this.onClicked = this.onClicked.bind(this);
        this.onDisabledMediaQueryListMatch = this.onDisabledMediaQueryListMatch.bind(this);

        // Assign DOM attributes
        if (this.target) {
            this.target.setAttribute('aria-hidden', String(this.isCollapsed));
        }
        if (this.toggle) {
            this.toggle.setAttribute('aria-label', this._getToggleAriaLabelText(this.toggle));
            this.toggle.setAttribute('aria-controls', this.targetId);
            this.toggle.setAttribute('aria-expanded', String(this.isOpen));
        }

        // Listen
        this.bindEvents();
    }

    get isCollapsed() {
        return isHidden(this.target) && (!this.target || !this.target.classList.contains(this.openClassName));
    }

    get isOpen() {
        return !this.isCollapsed;
    }

    set disabled(disabled) {
        this._disabled = disabled;

        if (disabled) {
            this.toggleByState(this.disabledState);
        } else {
            this.toggleByState(this.enabledState);
        }
    }

    get disabled() {
        return this._disabled;
    }

    _getToggleAriaLabelText(el) {
        const textChildren = Array.from(el.children).filter(child => child.textContent.trim());
        const labelTarget = textChildren.length ? textChildren[0] : el;

        return labelTarget.textContent.trim();
    }

    open({ notify = true } = {}) {
        this.toggle.classList.add(this.openClassName);
        this.toggle.setAttribute('aria-expanded', 'true');

        if (this.target) {
            this.target.classList.add(this.openClassName);
            this.target.setAttribute('aria-hidden', 'false');
        }

        if (notify) {
            trigger(this.toggle, CollapsibleEvents.open, this);
            trigger(this.toggle, CollapsibleEvents.toggle, this);
        }
    }

    close({ notify = true } = {}) {
        this.toggle.classList.remove(this.openClassName);
        this.toggle.setAttribute('aria-expanded', 'false');

        if (this.target) {
            this.target.classList.remove(this.openClassName);
            this.target.setAttribute('aria-hidden', 'true');
        }

        if (notify) {
            trigger(this.toggle, CollapsibleEvents.close, this);
            trigger(this.toggle, CollapsibleEvents.toggle, this);
        }
    }

    toggleState() {
        if (this.isCollapsed) {
            this.open();
        } else {
            this.close();
        }
    }

    toggleByState(state, ...args) {
        switch (state) {
        case CollapsibleState.open:
            return this.open.apply(this, args);

        case CollapsibleState.closed:
            return this.close.apply(this, args);

        default:
            return undefined;
        }
    }

    hasCollapsible(collapsibleInstance) {
        return this.target && this.target.contains(collapsibleInstance.target);
    }

    bindEvents() {
        this.toggle.addEventListener('click', this.onClicked);

        if (this.disabledMediaQueryList && this.disabledMediaQueryList.addListener) {
            this.disabledMediaQueryList.addListener(this.onDisabledMediaQueryListMatch);
        }
    }

    unbindEvents() {
        this.toggle.removeEventListener('click', this.onClicked);

        if (this.disabledMediaQueryList && this.disabledMediaQueryList.removeListener) {
            this.disabledMediaQueryList.removeListener(this.onDisabledMediaQueryListMatch);
        }
    }

    onClicked(event) {
        if (this.disabled) {
            return;
        }

        event.preventDefault();

        this.toggleState();
    }

    onDisabledMediaQueryListMatch(media) {
        this.disabled = media.matches;
    }
}

/**
 * Convenience method for constructing Collapsible instance
 *
 * @param {string} [selector]
 * @param {Object} [overrideOptions]
 * @param {Element} [overrideOptions.$context]
 * @param {String} [overrideOptions.disabledBreakpoint]
 * @param {Object} [overrideOptions.disabledState]
 * @param {Object} [overrideOptions.enabledState]
 * @param {String} [overrideOptions.openClassName]
 * @return {Array} array of Collapsible instances
 */
export default function collapsibleFactory(selector = `[data-${PLUGIN_KEY}]`, overrideOptions = {}) {
    const context = overrideOptions.$context || document;
    const elements = qsa(selector, context instanceof Element ? context : document);

    return elements.map(element => {
        const cached = instanceCache.get(element);

        if (cached instanceof Collapsible) {
            return cached;
        }

        const targetId = prependHash(
            element.dataset[PLUGIN_KEY]
            || element.dataset[`${PLUGIN_KEY}Target`]
            || element.getAttribute('href'),
        );
        const options = _.extend(optionsFromData(element), overrideOptions);
        const targetContext = context instanceof Element ? context : document;
        const target = targetContext.querySelector(targetId);
        const collapsible = new Collapsible(element, target, options);

        instanceCache.set(element, collapsible);

        return collapsible;
    });
}

// Export instance cache for consumers that need to access cached instances
export { instanceCache as collapsibleInstanceCache };
