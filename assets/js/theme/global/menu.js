import collapsibleFactory from '../common/collapsible';
import collapsibleGroupFactory from '../common/collapsible-group';
import { qsa, delegate } from '../common/dom';

const PLUGIN_KEY = 'menu';

/*
 * Manage the behaviour of a menu
 * @param {Element} menuEl
 */
class Menu {
    constructor(menuEl) {
        this.menu = menuEl;
        this.body = document.body;
        this.hasMaxMenuDisplayDepth = !!document.querySelector('.navPages-list.navPages-list-depth-max');

        // Init collapsible
        this.collapsibles = collapsibleFactory('[data-collapsible]', { $context: this.menu });
        this.collapsibleGroups = collapsibleGroupFactory(this.menu);

        // Auto-bind
        this.onMenuClick = this.onMenuClick.bind(this);
        this.onDocumentClick = this.onDocumentClick.bind(this);

        // Listen
        this.bindEvents();
    }

    collapseAll() {
        this.collapsibles.forEach(collapsible => collapsible.close());
        this.collapsibleGroups.forEach(group => group.close());
    }

    collapseNeighbors(neighbors) {
        neighbors.forEach(neighbor => {
            const collapsibles = collapsibleFactory('[data-collapsible]', { $context: neighbor });
            collapsibles.forEach(c => c.close());
        });
    }

    bindEvents() {
        this.menu.addEventListener('click', this.onMenuClick);
        this.body.addEventListener('click', this.onDocumentClick);
    }

    unbindEvents() {
        this.menu.removeEventListener('click', this.onMenuClick);
        this.body.removeEventListener('click', this.onDocumentClick);
    }

    onMenuClick(event) {
        event.stopPropagation();

        if (this.hasMaxMenuDisplayDepth) {
            const parentEl = event.target.parentElement;
            if (parentEl) {
                const neighbors = Array.from(parentEl.parentElement.children).filter(c => c !== parentEl);
                this.collapseNeighbors(neighbors);
            }
        }
    }

    onDocumentClick() {
        this.collapseAll();
    }
}

const instanceMap = new WeakMap();

/*
 * Create a new Menu instance
 * @param {string} [selector]
 * @return {Menu}
 */
export default function menuFactory(selector = `[data-${PLUGIN_KEY}]`) {
    const menuEl = document.querySelector(selector);
    if (!menuEl) return null;

    const cached = instanceMap.get(menuEl);
    if (cached instanceof Menu) {
        return cached;
    }

    const menu = new Menu(menuEl);

    instanceMap.set(menuEl, menu);

    return menu;
}
