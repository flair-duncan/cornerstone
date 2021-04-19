import 'focus-within-polyfill';

import './global/jquery-migrate';
import './common/select-option-plugin';
import PageManager from './page-manager';
import quickSearch from './global/quick-search';
import currencySelector from './global/currency-selector';
import toggle from 'easy-toggle-state';
// import mobileMenuToggle from './global/mobile-menu-toggle';
// import menu from './global/menu';
import quickView from './global/quick-view';
import sticky from './global/sticky-listener';
import cartPreview from './global/cart-preview';
import adminBar from './global/adminBar';
import svgInjector from './global/svg-injector';

export default class Global extends PageManager {
    onReady() {
        const {
            channelId, cartId, productId, categoryId, secureBaseUrl, maintenanceModeSettings, adminBarLanguage, showAdminBar,
        } = this.context;
        cartPreview(secureBaseUrl, cartId);
        quickSearch();
        currencySelector(cartId);
        toggle();
        quickView(this.context);
        sticky();
        // menu();
        // mobileMenuToggle();
        if (showAdminBar) {
            adminBar(secureBaseUrl, channelId, maintenanceModeSettings, JSON.parse(adminBarLanguage), productId, categoryId);
        }
        svgInjector();
    }
}

window.toggle = toggle;
