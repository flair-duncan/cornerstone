import { CollapsibleEvents } from './collapsible';
import { qsa } from './dom';

const PLUGIN_KEY = 'collapsible-group';

// WeakMap for instance caching
const instanceCache = new WeakMap();

/*
 * Manage multiple instances of collapsibles. For example, if a collapsible is
 * about to open and there's one already open, close the latter first.
 * @param {Element} component
 */
export class CollapsibleGroup {
    constructor(component) {
        this.component = component;
        this.openCollapsible = null;

        // Auto bind
        this.onCollapsibleOpen = this.onCollapsibleOpen.bind(this);
        this.onCollapsibleClose = this.onCollapsibleClose.bind(this);

        // Listen
        this.bindEvents();
    }

    close() {
        if (this.openCollapsible && !this.openCollapsible.disabled) {
            this.openCollapsible.close();
        }
    }

    bindEvents() {
        this.component.addEventListener(CollapsibleEvents.open, this.onCollapsibleOpen);
        this.component.addEventListener(CollapsibleEvents.close, this.onCollapsibleClose);
    }

    unbindEvents() {
        this.component.removeEventListener(CollapsibleEvents.open, this.onCollapsibleOpen);
        this.component.removeEventListener(CollapsibleEvents.close, this.onCollapsibleClose);
    }

    onCollapsibleOpen(event) {
        const collapsibleInstance = event.detail;
        if (this.openCollapsible && this.openCollapsible.hasCollapsible(collapsibleInstance)) {
            return;
        }

        this.close();

        this.openCollapsible = collapsibleInstance;
    }

    onCollapsibleClose(event) {
        const collapsibleInstance = event.detail;
        if (this.openCollapsible && this.openCollapsible.hasCollapsible(collapsibleInstance)) {
            return;
        }

        this.openCollapsible = null;
    }
}

/**
 * Create new CollapsibleGroup instances
 * @param {string} [selector]
 * @param {Object} [options]
 * @param {Element} [options.$context]
 * @return {Array} array of CollapsibleGroup instances
 */
export default function collapsibleGroupFactory(selector = `[data-${PLUGIN_KEY}]`, options = {}) {
    const context = options.$context instanceof Element ? options.$context : document;
    const elements = qsa(selector, context);

    return elements.map(element => {
        const cached = instanceCache.get(element);

        if (cached instanceof CollapsibleGroup) {
            return cached;
        }

        const group = new CollapsibleGroup(element);

        instanceCache.set(element, group);

        return group;
    });
}
