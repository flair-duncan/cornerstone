import PageManager from './page-manager';
import { showAlertModal } from './global/modal';
import compareProducts from './global/compare-products';
import { delegate } from './common/dom';

export default class Compare extends PageManager {
    onReady() {
        compareProducts(this.context);

        const message = this.context.compareRemoveMessage;

        delegate(document.body, 'click', '[data-comparison-remove]', event => {
            if (this.context.comparisons.length <= 2) {
                showAlertModal(message);
                event.preventDefault();
            }
        });
    }
}
