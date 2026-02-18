import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from './common/utils/translations-utils';
import { qsa } from './common/dom';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes(element, roleType, ariaLiveStatus) {
        if (!element) return;
        element.setAttribute('role', roleType);
        element.setAttribute('aria-live', ariaLiveStatus);
    }

    makeShopByPriceFilterAccessible() {
        if (!document.querySelector('[data-shop-by-price]')) return;

        const activeLink = document.querySelector('.navList-action.is-active');
        if (activeLink) {
            activeLink.focus();
        }

        qsa('a.navList-action').forEach(link => {
            link.addEventListener('click', () => {
                this.setLiveRegionAttributes(document.querySelector('span.price-filter-message'), 'status', 'assertive');
            });
        });
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        qsa('[data-button-type="add-cart"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setLiveRegionAttributes(e.currentTarget.nextElementSibling, 'status', 'polite');
            });
        });

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        this.initFacetedSearch();

        if (!document.getElementById('facetedSearch')) {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);

            // Refresh range view when shop-by-price enabled
            const urlParams = new URLSearchParams(window.location.search);

            if (urlParams.has('search_query')) {
                qsa('.reset-filters').forEach(el => { el.style.display = ''; });
            }

            const priceMin = document.querySelector('input[name="price_min"]');
            const priceMax = document.querySelector('input[name="price_max"]');
            if (priceMin) priceMin.setAttribute('value', urlParams.get('price_min') || '');
            if (priceMax) priceMax.setAttribute('value', urlParams.get('price_max') || '');
        }

        qsa('a.reset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setLiveRegionAttributes(document.querySelector('span.reset-message'), 'status', 'polite');
            });
        });

        this.ariaNotifyNoProducts();
    }

    ariaNotifyNoProducts() {
        const noProductsMessage = document.querySelector('[data-no-products-notification]');
        if (noProductsMessage) {
            noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const productListingContainer = document.getElementById('product-listing-container');
        const facetedSearchContainer = document.getElementById('faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            if (productListingContainer) productListingContainer.innerHTML = content.productListing;
            if (facetedSearchContainer) facetedSearchContainer.innerHTML = content.sidebar;

            document.body.dispatchEvent(new Event('compareReset'));

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
