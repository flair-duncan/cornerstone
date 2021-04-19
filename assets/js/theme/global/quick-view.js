import utils from '@bigcommerce/stencil-utils';
import ProductDetails from '../common/product-details';

export default function (context) {
    const modal = $('.modal-content');

    $('body').on('click', '[data-launch-quickview]', event => {
        event.preventDefault();

        const productId = $(event.currentTarget).data('productId');

        utils.api.product.getById(productId, { template: 'products/quick-view' }, (err, response) => {
            modal.html(response);

            modal.find('.productView').addClass('productView--quickView');

            return new ProductDetails(modal.find('.quickView'), context);
        });
    });

    $('body').on('click', '[data-launch-quickview]', event => {
        event.preventDefault();
        modal.html('');
    });
}
