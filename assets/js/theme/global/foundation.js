import { qsa, delegate, trigger } from '../common/dom';
// eslint-disable-next-line import/no-cycle
import modalFactory from './modal';
import revealCloseFactory from './reveal-close';

/**
 * Vanilla replacements for Foundation 5 dropdown and tab behaviours.
 * Reveal (modal) is handled by modal.js.
 */

function initDropdowns(context) {
    // Toggle dropdowns on trigger click
    delegate(context, 'click', '[data-dropdown]', (event, el) => {
        event.preventDefault();
        event.stopPropagation();
        const targetId = el.getAttribute('data-dropdown');
        const dropdown = document.getElementById(targetId);
        if (!dropdown) return;

        const isOpen = dropdown.classList.contains('is-open');

        // Close all other open dropdowns first
        qsa('.f-dropdown.is-open, .is-open[data-dropdown-content]').forEach(d => {
            d.classList.remove('is-open', 'f-open-dropdown');
            d.setAttribute('aria-hidden', 'true');
            trigger(d, 'closed.fndtn.dropdown');
        });

        if (!isOpen) {
            dropdown.classList.add('is-open', 'f-open-dropdown');
            dropdown.setAttribute('aria-hidden', 'false');
            trigger(dropdown, 'opened.fndtn.dropdown');
        }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-dropdown], [data-dropdown-content], .f-dropdown')) {
            qsa('.f-dropdown.is-open, .is-open[data-dropdown-content]').forEach(d => {
                d.classList.remove('is-open', 'f-open-dropdown');
                d.setAttribute('aria-hidden', 'true');
                trigger(d, 'closed.fndtn.dropdown');
            });
        }
    });
}

function initTabs(context) {
    delegate(context, 'click', '.tabs a', (event, el) => {
        event.preventDefault();
        const tabContent = el.getAttribute('href');
        const tabsContainer = el.closest('.tabs');
        if (!tabsContainer) return;
        const contentContainer = tabsContainer.parentElement;

        // Deactivate all tabs
        qsa('dd, li', tabsContainer).forEach(t => t.classList.remove('is-active'));
        qsa('.tabs-content .content', contentContainer).forEach(c => c.classList.remove('is-active'));

        // Activate clicked tab
        const parentItem = el.closest('dd, li');
        if (parentItem) parentItem.classList.add('is-active');

        if (tabContent) {
            const panel = contentContainer.querySelector(tabContent);
            if (panel) panel.classList.add('is-active');
        }
    });
}

let initialized = false;

export default function initFoundation(context) {
    const el = context instanceof Element ? context : document;

    if (!initialized) {
        initDropdowns(el);
        initTabs(el);
        initialized = true;
    }

    modalFactory('[data-reveal]', { $context: el });
    revealCloseFactory('[data-reveal-close]', { $context: el });
}
