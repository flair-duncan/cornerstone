import documentReady from './global/document-ready';

export default class PageManager {
    constructor(context) {
        this.context = context;
    }

    type() {
        return this.constructor.name;
    }

    onReady() {}

    static load(context) {
        const page = new this(context);

        documentReady(() => {
            page.onReady.bind(page)();
        });
    }
}
