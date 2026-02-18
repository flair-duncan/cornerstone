import _ from 'lodash';

export default class TextTruncate {
    constructor(element) {
        this.element = element;
        this.contentClass = 'textTruncate--visible';
        const dataVal = element.dataset.textTruncate;
        this.options = dataVal ? JSON.parse(dataVal) : {
            css: {},
            text: {
                viewMore: '',
                viewLess: '',
            },
        };
        this.defaultCssOptions = {
            'max-height': '',
            'text-overflow': 'ellipsis',
        };
    }

    init() {
        this.setupAnchor();
        this.parseDataAttributes();
    }

    setupAnchor() {
        this.createViewAnchor();
        this.appendViewAnchor();
        this.bindAnchor();
    }

    createViewAnchor() {
        this.viewAnchor = document.createElement('a');
        this.viewAnchor.href = '#';
        this.viewAnchor.className = 'textTruncate-viewMore';
        this.viewAnchor.textContent = this.options.open ? this.options.text.viewLess : this.options.text.viewMore;
    }

    appendViewAnchor() {
        this.element.appendChild(this.viewAnchor);
    }

    bindAnchor() {
        this.viewAnchor.addEventListener('click', e => {
            e.preventDefault();
            this.toggleState();
        });
    }

    toggleState() {
        this.element.classList.toggle(this.contentClass);

        if (this.element.classList.contains(this.contentClass)) {
            this.showText();
        } else {
            this.hideText();
        }
    }

    showText() {
        if (this.options.css['max-height']) {
            this.element.style.maxHeight = '';
        }
        this.viewAnchor.textContent = this.options.text.viewLess;
    }

    hideText() {
        if (this.options.css['max-height']) {
            this.element.style.maxHeight = this.options.css['max-height'];
        }
        this.viewAnchor.textContent = this.options.text.viewMore;
    }

    parseDataAttributes() {
        _.forOwn(this.defaultCssOptions, (value, key) => {
            this.element.style[key] = value;
        });
    }
}
