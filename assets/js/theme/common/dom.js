/**
 * Minimal DOM helpers to replace common jQuery patterns.
 */

/**
 * querySelectorAll as an Array, with optional context.
 * @param {string} selector
 * @param {Element|Document} [context=document]
 * @returns {Element[]}
 */
export function qsa(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

/**
 * Delegated event listener.
 * @param {Element} parent
 * @param {string} eventName
 * @param {string} selector  - CSS selector to match against
 * @param {Function} handler - receives (event, matchedElement)
 * @param {boolean|AddEventListenerOptions} [options]
 * @returns {Function} cleanup function that removes the listener
 */
export function delegate(parent, eventName, selector, handler, options) {
    const listener = (event) => {
        const target = event.target.closest(selector);
        if (target && parent.contains(target)) {
            handler.call(target, event, target);
        }
    };
    parent.addEventListener(eventName, listener, options);
    return () => parent.removeEventListener(eventName, listener, options);
}

/**
 * Trigger a custom event on an element.
 * @param {Element} el
 * @param {string} eventName
 * @param {*} [detail]
 */
export function trigger(el, eventName, detail) {
    el.dispatchEvent(new CustomEvent(eventName, { bubbles: true, cancelable: true, detail }));
}
