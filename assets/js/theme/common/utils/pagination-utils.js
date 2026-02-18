const changeWishlistPaginationLinks = (wishlistUrl, ...paginationItems) => {
    paginationItems.forEach(item => {
        if (!item) return;
        const paginationLink = item.querySelector('.pagination-link');

        if (paginationLink && !paginationLink.getAttribute('href').includes('page=')) {
            const pageNumber = paginationLink.getAttribute('href');
            paginationLink.setAttribute('href', `${wishlistUrl}page=${pageNumber}`);
        }
    });
};

/**
 * helps to withdraw differences in structures around the stencil resource pagination
 */
export const wishlistPaginatorHelper = () => {
    const paginationList = document.querySelector('.pagination-list');

    if (!paginationList) return;

    const nextItem = paginationList.querySelector('.pagination-item--next');
    const prevItem = paginationList.querySelector('.pagination-item--previous');
    const currentPageLink = document.querySelector('[data-pagination-current-page-link]');
    const currentHref = currentPageLink ? currentPageLink.getAttribute('href') : '';
    const partialPaginationUrl = currentHref.split('page=').shift();

    changeWishlistPaginationLinks(partialPaginationUrl, prevItem, nextItem);
};
