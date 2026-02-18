import utils from '@bigcommerce/stencil-utils';
import Review from '../product/reviews';
import ProductDetails from '../common/product-details';
import { defaultModal, ModalEvents } from './modal';
import { setCarouselState, onSlickCarouselChange, onUserCarouselChange } from '../common/carousel';
import { delegate, qsa } from '../common/dom';

export default function (context) {
    const modal = defaultModal();

    delegate(document.body, 'click', '.quickview', (event, el) => {
        event.preventDefault();

        const productId = el.dataset.productId;

        modal.open({ size: 'large' });

        utils.api.product.getById(productId, { template: 'products/quick-view' }, (err, response) => {
            if (err) return;

            modal.updateContent(response);

            const productView = modal.$content.querySelector('.productView');
            if (productView) productView.classList.add('productView--quickView');

            const carousel = modal.$content.querySelector('[data-slick]');
            if (carousel) {
                carousel.addEventListener('init', e => setCarouselState(e));
                carousel.addEventListener('breakpoint', e => setCarouselState(e));
                carousel.addEventListener('swipe', e => setCarouselState(e));

                delegate(carousel, 'click', '.slick-arrow, .slick-dots', () => setCarouselState({ target: carousel }));

                carousel.addEventListener('init', e => onSlickCarouselChange(e, null, context));
                carousel.addEventListener('afterChange', e => onSlickCarouselChange(e, null, context));
                delegate(carousel, 'click', '.slick-arrow, .slick-dots', e => onUserCarouselChange(e, context));
                carousel.addEventListener('swipe', e => onUserCarouselChange(e, context));

                // Initialize carousel via our vanilla carousel module
                if (typeof carousel.initCarousel === 'function') {
                    carousel.initCarousel();
                }
            }

            /* eslint-disable no-new */
            new Review({ $context: modal.$content });

            const quickViewEl = modal.$content.querySelector('.quickView');
            if (quickViewEl) {
                return new ProductDetails(quickViewEl, context);
            }
        });
    });
}
