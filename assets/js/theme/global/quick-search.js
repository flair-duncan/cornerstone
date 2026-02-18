import _ from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import StencilDropDown from './stencil-dropdown';
import { qsa } from '../common/dom';

export default function () {
    const TOP_STYLING = 'top: 49px;';
    const quickSearchResults = qsa('.quickSearchResults');
    const quickSearchForms = qsa('[data-quick-search-form]');
    const quickSearchExpand = document.getElementById('quick-search-expand');
    const searchQueryInputs = quickSearchForms.reduce((acc, form) => {
        const input = form.querySelector('[data-search-quick]');
        if (input) acc.push(input);
        return acc;
    }, []);
    const stencilDropDownExtendables = {
        hide: () => {
            if (quickSearchExpand) quickSearchExpand.setAttribute('aria-expanded', 'false');
            searchQueryInputs.forEach(input => input.blur());
        },
        show: (event) => {
            if (quickSearchExpand) quickSearchExpand.setAttribute('aria-expanded', 'true');
            searchQueryInputs.forEach(input => input.focus());
            event.stopPropagation();
        },
    };
    const stencilDropDown = new StencilDropDown(stencilDropDownExtendables);
    const searchTrigger = document.querySelector('[data-search="quickSearch"]');
    const searchContainer = document.getElementById('quickSearch');
    if (searchTrigger && searchContainer) {
        stencilDropDown.bind(searchTrigger, searchContainer, TOP_STYLING);
    }

    stencilDropDownExtendables.onBodyClick = (e, dropdownContainer) => {
        if (!e.target.closest('[data-prevent-quick-search-close], .modal-background')) {
            stencilDropDown.hide(dropdownContainer);
        }
    };

    // stagger searching for 1200ms after last input
    const debounceWaitTime = 1200;
    const doSearch = _.debounce((searchQuery) => {
        utils.api.search.search(searchQuery, { template: 'search/quick-results' }, (err, response) => {
            if (err) {
                return false;
            }

            quickSearchResults.forEach(el => { el.innerHTML = response; });
            const visibleResults = quickSearchResults.filter(el => el.offsetParent !== null);

            visibleResults.forEach(resultEl => {
                const noResultsMessage = resultEl.querySelector('.quickSearchMessage');
                if (noResultsMessage) {
                    noResultsMessage.setAttribute('role', 'status');
                    noResultsMessage.setAttribute('aria-live', 'polite');
                } else {
                    const ariaMessage = resultEl.nextElementSibling;
                    if (ariaMessage) {
                        ariaMessage.classList.add('u-hidden');

                        const predefinedText = ariaMessage.dataset.searchAriaMessagePredefinedText;
                        const itemsFoundCount = resultEl.querySelectorAll('.product').length;

                        ariaMessage.textContent = `${itemsFoundCount} ${predefinedText} ${searchQuery}`;

                        setTimeout(() => {
                            ariaMessage.classList.remove('u-hidden');
                        }, 100);
                    }
                }
            });
        });
    }, debounceWaitTime);

    utils.hooks.on('search-quick', (event, currentTarget) => {
        const searchQuery = currentTarget.value;

        // server will only perform search with at least 3 characters
        if (searchQuery.length < 3) {
            return;
        }

        doSearch(searchQuery);
    });

    // Catch the submission of the quick-search forms
    quickSearchForms.forEach(form => {
        form.addEventListener('submit', event => {
            event.preventDefault();

            const input = event.currentTarget.querySelector('input');
            const searchQuery = input ? input.value : '';
            const searchUrl = event.currentTarget.dataset.url;

            if (searchQuery.length === 0) {
                return;
            }

            window.location.href = `${searchUrl}?search_query=${encodeURIComponent(searchQuery)}`;
        });
    });
}
