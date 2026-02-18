export default class PageManager {
    constructor(context) {
        this.context = context;
    }

    type() {
        return this.constructor.name;
    }

    onReady() {
    }

    static load(context) {
        const page = new this(context);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => page.onReady());
        } else {
            page.onReady();
        }
    }
}
