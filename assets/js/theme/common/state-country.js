import utils from '@bigcommerce/stencil-utils';
import _ from 'lodash';
import { insertStateHiddenField } from './utils/form-utils';
import { showAlertModal } from '../global/modal';

/**
 * Extracts attributes from a DOM element into a plain object
 * @param {Element} element - The element to extract attributes from
 * @returns {Object} Plain object with attribute name-value pairs
 */
function getElementAttributes(element) {
    const result = {};
    Array.from(element.attributes).forEach(attr => {
        result[attr.name] = attr.value;
    });
    return result;
}

/**
 * Creates a replacement element with given attributes
 * @param {string} tagName - 'select' or 'input'
 * @param {Object} attrs - Attributes to set
 * @returns {Element}
 */
function createReplacementElement(tagName, attrs) {
    const el = document.createElement(tagName);
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'class') {
            el.className = value;
        } else {
            el.setAttribute(key, value);
        }
    });
    return el;
}

/**
 * Creates a select element for states when the country has states AND they are required
 * @param {Element} stateElement - The current state input element
 * @param {Object} context - Context object containing translated strings
 * @returns {Element} The new select element
 */
function makeStateSelectRequired(stateElement, context) {
    const attrs = getElementAttributes(stateElement);

    const replacementAttributes = {
        ...attrs,
        class: 'form-select',
        'aria-required': 'true',
    };

    const newSelect = createReplacementElement('select', replacementAttributes);
    stateElement.replaceWith(newSelect);

    const newElement = document.querySelector('[data-field-type="State"]');
    const hiddenInputs = document.querySelectorAll('[name*="FormFieldIsText"]');

    hiddenInputs.forEach(input => input.remove());

    if (newElement) {
        const prevEl = newElement.previousElementSibling;
        if (prevEl) {
            const small = prevEl.querySelector('small');
            if (!small) {
                // String is injected from localizer
                prevEl.insertAdjacentHTML('beforeend', `<small>${context.required}</small>`);
            } else {
                small.style.display = '';
            }
        }
    }

    return newElement;
}

/**
 * Creates a select element for states when the country has states but they are NOT required
 * @param {Element} stateElement - The current state input element
 * @returns {Element} The new select element
 */
function makeStateSelectOptional(stateElement) {
    const attrs = getElementAttributes(stateElement);

    const replacementAttributes = {
        ...attrs,
        class: 'form-select',
        'aria-required': 'false',
    };

    const newSelect = createReplacementElement('select', replacementAttributes);
    stateElement.replaceWith(newSelect);

    const newElement = document.querySelector('[data-field-type="State"]');
    const hiddenInputs = document.querySelectorAll('[name*="FormFieldIsText"]');

    hiddenInputs.forEach(input => input.remove());

    // Hide the required indicator since state is optional
    if (newElement) {
        const prevEl = newElement.previousElementSibling;
        if (prevEl) {
            const small = prevEl.querySelector('small');
            if (small) small.style.display = 'none';
        }
    }

    return newElement;
}

/**
 * Creates a text input for states when the country has no states list
 * @param {Element} stateElement - The current state element
 * @returns {Element} The new text input element
 */
function makeStateTextOptional(stateElement) {
    const attrs = getElementAttributes(stateElement);

    const replacementAttributes = {
        ...attrs,
        type: 'text',
        class: 'form-input',
    };

    const newInput = createReplacementElement('input', replacementAttributes);
    stateElement.replaceWith(newInput);

    const newElement = document.querySelector('[data-field-type="State"]');

    if (newElement) {
        insertStateHiddenField(newElement);
        const prevEl = newElement.previousElementSibling;
        if (prevEl) {
            const small = prevEl.querySelector('small');
            if (small) small.style.display = 'none';
        }
    }

    return newElement;
}

/**
 * Adds the array of options from the remote request to the newly created select box.
 * @param {Object} statesArray
 * @param {Element} selectElement
 * @param {Object} options
 */
function addOptions(statesArray, selectElement, options) {
    const container = [];

    container.push(`<option value="">${statesArray.prefix}</option>`);

    if (selectElement) {
        statesArray.states.forEach((stateObj) => {
            if (options.useIdForStates) {
                container.push(`<option value="${stateObj.id}">${stateObj.name}</option>`);
            } else {
                container.push(`<option value="${stateObj.name}">${stateObj.label ? stateObj.label : stateObj.name}</option>`);
            }
        });

        selectElement.innerHTML = container.join(' ');
    }
}

/**
 * Makes the zip/postal code field required and shows the required indicator
 * @param {Element} zipElement The zip/postal code field element
 * @param {Object} context The context object containing translated strings
 */
function makeZipRequired(zipElement, context) {
    zipElement.required = true;
    // since the attribute is set within templates/components/common/forms/*,
    // we explicitly set aria-required to ensure assistive technologies announce this field correctly after dynamic changes
    zipElement.setAttribute('aria-required', 'true');

    const prevEl = zipElement.previousElementSibling;
    if (prevEl) {
        const small = prevEl.querySelector('small');
        if (!small) {
            prevEl.insertAdjacentHTML('beforeend', `<small>${context.required}</small>`);
        } else {
            small.style.display = '';
        }
    }
}

/**
 * Makes the zip/postal code field optional and hides the required indicator
 *
 * DOM Structure Expectation:
 * The function assumes the following DOM structure:
 * <label>
 *   <span>Zip/Postal Code</span>
 *   <small>*</small> <!-- required indicator -->
 * </label>
 * <input data-field-type="Zip" />
 *
 * @param {Element} zipElement The zip/postal code field element
 */
function makeZipOptional(zipElement) {
    zipElement.required = false;
    // since the attribute is set within templates/components/common/forms/*,
    // we explicitly set aria-required to ensure assistive technologies announce this field correctly after dynamic changes
    zipElement.setAttribute('aria-required', 'false');

    const prevEl = zipElement.previousElementSibling;
    if (prevEl) {
        const small = prevEl.querySelector('small');
        if (small) {
            small.style.display = 'none';
        }
    }
}

/**
 *
 * @param {Element} stateElement
 * @param {Object} context
 * @param {Object} options
 * @param {Function} callback
 */
// eslint-disable-next-line default-param-last
export default function (stateElement, context = {}, options, callback) {
    /**
     * Backwards compatible for three parameters instead of four
     *
     * Available options:
     *
     * useIdForStates {Bool} - Generates states dropdown using id for values instead of strings
     */
    if (typeof options === 'function') {
        /* eslint-disable no-param-reassign */
        callback = options;
        options = {};
        /* eslint-enable no-param-reassign */
    }

    document.querySelectorAll('select[data-field-type="Country"]').forEach(countrySelect => {
        countrySelect.addEventListener('change', event => {
            const countryName = event.currentTarget.value;

            if (countryName === '') {
                return;
            }

            utils.api.country.getByName(countryName, (err, response) => {
                if (err) {
                    showAlertModal(context.state_error);
                    return callback(err);
                }

                const currentInput = document.querySelector('[data-field-type="State"]');
                const zipInput = document.querySelector('[data-field-type="Zip"]');

                const hasStates = !_.isEmpty(response.data.states);
                const requiresState = response.data.requiresSubdivision !== undefined
                    ? response.data.requiresSubdivision
                    : hasStates;

                let newElement;

                if (hasStates) {
                    if (requiresState) {
                        newElement = makeStateSelectRequired(currentInput, context);
                    } else {
                        newElement = makeStateSelectOptional(currentInput);
                    }
                    addOptions(response.data, newElement, options);
                } else {
                    newElement = makeStateTextOptional(currentInput);
                }

                if (zipInput) {
                    // Default to true when requiresPostalCodes is undefined to maintain original behavior
                    const requiresZip = response.data.requiresPostalCodes !== undefined
                        ? response.data.requiresPostalCodes
                        : true;

                    if (requiresZip) {
                        makeZipRequired(zipInput, context);
                    } else {
                        makeZipOptional(zipInput);
                    }
                }

                callback(null, newElement, requiresState);
            });
        });
    });
}
