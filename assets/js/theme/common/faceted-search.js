import { hooks, api } from '@bigcommerce/stencil-utils';
import _ from 'lodash';
import Url from 'url';
import urlUtils from './utils/url-utils';
import modalFactory from '../global/modal';
import collapsibleFactory, { collapsibleInstanceCache } from './collapsible';
import { Validators } from './utils/form-utils';
import { qsa, delegate } from './dom';
import nod from './nod';

const defaultOptions = {
    accordionToggleSelector: '#facetedSearch .accordion-navigation, #facetedSearch .facetedSearch-toggle',
    blockerSelector: '#facetedSearch .blocker',
    clearFacetSelector: '#facetedSearch .facetedSearch-clearLink',
    componentSelector: '#facetedSearch-navList',
    facetNavListSelector: '#facetedSearch .navList',
    priceRangeErrorSelector: '#facet-range-form .form-inlineMessage',
    priceRangeFieldsetSelector: '#facet-range-form .form-fieldset',
    priceRangeFormSelector: '#facet-range-form',
    priceRangeMaxPriceSelector: document.getElementById('facetedSearch') ? '#facet-range-form [name=max_price]' : '#facet-range-form [name=price_max]',
    priceRangeMinPriceSelector: document.getElementById('facetedSearch') ? '#facet-range-form [name=min_price]' : '#facet-range-form [name=price_min]',
    showMoreToggleSelector: '#facetedSearch .accordion-content .toggleLink',
    facetedSearchFilterItems: '#facetedSearch-filterItems .form-input',
    modal: modalFactory('#modal')[0],
    modalOpen: false,
};

/**
 * Helper to serialize form data as a query string
 */
function serializeForm(form) {
    const formData = new FormData(form);
    return new URLSearchParams(formData).toString();
}

/**
 * Faceted search view component
 */
class FacetedSearch {
    constructor(requestOptions, callback, options) {
        // Private properties
        this.requestOptions = requestOptions;
        this.callback = callback;
        this.options = _.extend({}, defaultOptions, options);
        this.collapsedFacets = [];
        this.collapsedFacetItems = [];

        // Store cleanup functions for delegated events
        this._cleanups = [];

        // Init collapsibles
        collapsibleFactory();

        // Init price validator
        this.initPriceValidator();

        // Show limited items by default
        qsa(this.options.facetNavListSelector).forEach(navList => {
            this.collapseFacetItems(navList);
        });

        // Mark initially collapsed accordions
        qsa(this.options.accordionToggleSelector).forEach(accordionToggle => {
            const collapsible = collapsibleInstanceCache.get(accordionToggle);

            if (collapsible && collapsible.isCollapsed) {
                this.collapsedFacets.push(collapsible.targetId);
            }
        });

        // Collapse all facets if initially hidden
        // NOTE: Need to execute after Collapsible gets bootstrapped
        setTimeout(() => {
            const component = document.querySelector(this.options.componentSelector);
            if (component && (component.offsetParent === null && getComputedStyle(component).display === 'none')) {
                this.collapseAllFacets();
            }
        });

        // Observe user events
        this.onStateChange = this.onStateChange.bind(this);
        this.onPopState = this.onPopState.bind(this);
        this.onToggleClick = this.onToggleClick.bind(this);
        this.onAccordionToggle = this.onAccordionToggle.bind(this);
        this.onClearFacet = this.onClearFacet.bind(this);
        this.onFacetClick = this.onFacetClick.bind(this);
        this.onRangeSubmit = this.onRangeSubmit.bind(this);
        this.onSortBySubmit = this.onSortBySubmit.bind(this);
        this.filterFacetItems = this.filterFacetItems.bind(this);

        this.bindEvents();
    }

    // Public methods
    refreshView(content) {
        if (content) {
            this.callback(content);
        }

        // Init collapsibles
        collapsibleFactory();

        // Init price validator
        this.initPriceValidator();

        // Restore view state
        this.restoreCollapsedFacets();
        this.restoreCollapsedFacetItems();

        // Bind events
        this.bindEvents();
    }

    updateView() {
        qsa(this.options.blockerSelector).forEach(el => { el.style.display = ''; });

        api.getPage(urlUtils.getUrl(), this.requestOptions, (err, content) => {
            qsa(this.options.blockerSelector).forEach(el => { el.style.display = 'none'; });

            if (err) {
                throw new Error(err);
            }

            // Refresh view with new content
            this.refreshView(content);

            // Refresh range view when shop-by-price enabled
            const urlParams = new URLSearchParams(window.location.search);

            if (urlParams.has('search_query')) {
                qsa('.reset-filters').forEach(el => { el.style.display = ''; });
            }

            const priceMin = document.querySelector('input[name="price_min"]');
            const priceMax = document.querySelector('input[name="price_max"]');
            if (priceMin) priceMin.setAttribute('value', urlParams.get('price_min') || '');
            if (priceMax) priceMax.setAttribute('value', urlParams.get('price_max') || '');
        });
    }

    expandFacetItems(navList) {
        const id = navList.id;

        // Remove
        this.collapsedFacetItems = _.without(this.collapsedFacetItems, id);
    }

    collapseFacetItems(navList) {
        const id = navList.id;
        const hasMoreResults = navList.dataset.hasMoreResults;

        if (hasMoreResults) {
            this.collapsedFacetItems = _.union(this.collapsedFacetItems, [id]);
        } else {
            this.collapsedFacetItems = _.without(this.collapsedFacetItems, id);
        }
    }

    toggleFacetItems(navList) {
        const id = navList.id;

        // Toggle depending on `collapsed` flag
        if (this.collapsedFacetItems.includes(id)) {
            this.getMoreFacetResults(navList);

            return true;
        }

        this.collapseFacetItems(navList);

        return false;
    }

    getMoreFacetResults(navList) {
        const facet = navList.dataset.facet;
        const facetUrl = urlUtils.getUrl();

        if (this.requestOptions.showMore) {
            api.getPage(facetUrl, {
                template: this.requestOptions.showMore,
                params: {
                    list_all: facet,
                },
            }, (err, response) => {
                if (err) {
                    throw new Error(err);
                }

                this.options.modal.open();
                this.options.modalOpen = true;
                this.options.modal.updateContent(response);
            });
        }

        this.collapseFacetItems(navList);

        return false;
    }

    filterFacetItems(event) {
        const items = qsa('.navList-item');
        const query = event.target.value.toLowerCase();

        items.forEach(element => {
            const text = element.textContent.toLowerCase();
            if (text.indexOf(query) !== -1) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
    }

    expandFacet(accordionToggle) {
        const collapsible = collapsibleInstanceCache.get(accordionToggle);

        if (collapsible) collapsible.open();
    }

    collapseFacet(accordionToggle) {
        const collapsible = collapsibleInstanceCache.get(accordionToggle);

        if (collapsible) collapsible.close();
    }

    collapseAllFacets() {
        qsa(this.options.accordionToggleSelector).forEach(accordionToggle => {
            this.collapseFacet(accordionToggle);
        });
    }

    expandAllFacets() {
        qsa(this.options.accordionToggleSelector).forEach(accordionToggle => {
            this.expandFacet(accordionToggle);
        });
    }

    // Private methods
    initPriceValidator() {
        if (!document.querySelector(this.options.priceRangeFormSelector)) {
            return;
        }

        const validator = nod();
        const selectors = {
            errorSelector: this.options.priceRangeErrorSelector,
            fieldsetSelector: this.options.priceRangeFieldsetSelector,
            formSelector: this.options.priceRangeFormSelector,
            maxPriceSelector: this.options.priceRangeMaxPriceSelector,
            minPriceSelector: this.options.priceRangeMinPriceSelector,
        };

        Validators.setMinMaxPriceValidation(validator, selectors, this.options.validationErrorMessages);

        this.priceRangeValidator = validator;
    }

    restoreCollapsedFacetItems() {
        const navLists = qsa(this.options.facetNavListSelector);

        // Restore collapsed state for each facet
        navLists.forEach(navList => {
            const id = navList.id;
            const shouldCollapse = this.collapsedFacetItems.includes(id);

            if (shouldCollapse) {
                this.collapseFacetItems(navList);
            } else {
                this.expandFacetItems(navList);
            }
        });
    }

    restoreCollapsedFacets() {
        qsa(this.options.accordionToggleSelector).forEach(accordionToggle => {
            const collapsible = collapsibleInstanceCache.get(accordionToggle);
            if (!collapsible) return;
            const id = collapsible.targetId;
            const shouldCollapse = this.collapsedFacets.includes(id);

            if (shouldCollapse) {
                this.collapseFacet(accordionToggle);
            } else {
                this.expandFacet(accordionToggle);
            }
        });
    }

    bindEvents() {
        // Clean-up
        this.unbindEvents();

        // DOM events
        window.addEventListener('statechange', this.onStateChange);
        window.addEventListener('popstate', this.onPopState);

        this._cleanups.push(
            delegate(document, 'click', this.options.showMoreToggleSelector, this.onToggleClick),
            delegate(document, 'toggle.collapsible', this.options.accordionToggleSelector, this.onAccordionToggle),
            delegate(document, 'keyup', this.options.facetedSearchFilterItems, this.filterFacetItems),
        );

        qsa(this.options.clearFacetSelector).forEach(el => {
            el.addEventListener('click', this.onClearFacet);
        });

        // Hooks
        hooks.on('facetedSearch-facet-clicked', this.onFacetClick);
        hooks.on('facetedSearch-range-submitted', this.onRangeSubmit);
        hooks.on('sortBy-submitted', this.onSortBySubmit);
    }

    unbindEvents() {
        // DOM events
        window.removeEventListener('statechange', this.onStateChange);
        window.removeEventListener('popstate', this.onPopState);

        // Clean up delegated event listeners
        this._cleanups.forEach(cleanup => cleanup());
        this._cleanups = [];

        qsa(this.options.clearFacetSelector).forEach(el => {
            el.removeEventListener('click', this.onClearFacet);
        });

        // Hooks
        hooks.off('facetedSearch-facet-clicked', this.onFacetClick);
        hooks.off('facetedSearch-range-submitted', this.onRangeSubmit);
        hooks.off('sortBy-submitted', this.onSortBySubmit);
    }

    onClearFacet(event) {
        const link = event.currentTarget;
        const url = link.getAttribute('href');

        event.preventDefault();
        event.stopPropagation();

        // Update URL
        urlUtils.goToUrl(url);
    }

    onToggleClick(event, el) {
        const href = el.getAttribute('href');
        const navList = href ? document.querySelector(href) : null;

        // Prevent default
        event.preventDefault();

        // Toggle visible items
        if (navList) this.toggleFacetItems(navList);
    }

    onFacetClick(event, currentTarget) {
        const link = currentTarget;
        const url = link.getAttribute('href');

        event.preventDefault();

        link.classList.toggle('is-selected');

        // Update URL
        urlUtils.goToUrl(url);

        if (this.options.modalOpen) {
            this.options.modal.close();
        }
    }

    onSortBySubmit(event, currentTarget) {
        const url = Url.parse(window.location.href, true);
        const formData = serializeForm(currentTarget);
        const queryParams = formData.split('=');

        url.query[queryParams[0]] = queryParams[1];
        delete url.query.page;

        // Url object `query` is not a traditional JavaScript Object on all systems, clone it instead
        const urlQueryParams = {};
        Object.assign(urlQueryParams, url.query);

        event.preventDefault();

        urlUtils.goToUrl(Url.format({ pathname: url.pathname, search: urlUtils.buildQueryString(urlQueryParams) }));
    }

    onRangeSubmit(event, currentTarget) {
        event.preventDefault();

        if (!this.priceRangeValidator.areAll(nod.constants.VALID)) {
            return;
        }

        const url = Url.parse(window.location.href, true);
        const formData = serializeForm(currentTarget);
        let queryParams = decodeURI(formData).split('&');
        queryParams = urlUtils.parseQueryParams(queryParams);

        for (const key in queryParams) {
            if (queryParams.hasOwnProperty(key)) {
                url.query[key] = queryParams[key];
            }
        }

        // Url object `query` is not a traditional JavaScript Object on all systems, clone it instead
        const urlQueryParams = {};
        Object.assign(urlQueryParams, url.query);

        urlUtils.goToUrl(Url.format({ pathname: url.pathname, search: urlUtils.buildQueryString(urlQueryParams) }));
    }

    onStateChange() {
        this.updateView();
    }

    onAccordionToggle(event, el) {
        const collapsible = collapsibleInstanceCache.get(el);
        if (!collapsible) return;
        const id = collapsible.targetId;

        if (collapsible.isCollapsed) {
            this.collapsedFacets = _.union(this.collapsedFacets, [id]);
        } else {
            this.collapsedFacets = _.without(this.collapsedFacets, id);
        }
    }

    onPopState() {
        if (document.location.hash !== '') return;

        window.dispatchEvent(new Event('statechange'));
    }
}

export default FacetedSearch;
