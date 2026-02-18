import _ from 'lodash';
import nod from '../nod';
import forms from '../models/forms';

const inputTagNames = [
    'input',
    'select',
    'textarea',
];
/**
 * Set up Object with Error Messages on Password Validation. Please use messages in mentioned order
 * @param {string} empty defines error text for empty field
 * @param {string} confirm defines error text for empty confirmation field
 * @param {string} mismatch defines error text if confirm passford mismatches passford field
 * @param {string} invalid defines error text for invalid password charaters sequence
 * @return {object} messages or default texts if nothing is providing
 */
export const createPasswordValidationErrorTextObject = (empty, confirm, mismatch, invalid) => ({
    onEmptyPasswordErrorText: empty,
    onConfirmPasswordErrorText: confirm,
    onMismatchPasswordErrorText: mismatch,
    onNotValidPasswordErrorText: invalid,
});

/**
 * Apply class name to an input element on its type
 * @param {Element} input
 * @param {string} formFieldClass
 */
function classifyInput(input, formFieldClass) {
    const formField = input.closest(`.${formFieldClass}`);
    if (!formField) return;
    const tagName = input.tagName.toLowerCase();

    let className = `${formFieldClass}--${tagName}`;
    let specificClassName;

    // Input can be text/checkbox/radio etc...
    if (tagName === 'input') {
        const inputType = input.type;

        if (['radio', 'checkbox', 'submit'].includes(inputType)) {
            // ie: .form-field--checkbox, .form-field--radio
            className = `${formFieldClass}--${_.camelCase(inputType)}`;
        } else {
            // ie: .form-field--input .form-field--inputText
            specificClassName = `${className}${_.capitalize(inputType)}`;
        }
    }

    // Apply class modifier
    formField.classList.add(className);
    if (specificClassName) {
        formField.classList.add(specificClassName);
    }
}

/**
 * Apply class name to each input element in a form based on its type
 * @param {string|Element} formSelector - selector or element
 * @param {object} options
 */
export function classifyForm(formSelector, options = {}) {
    const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    if (!form) return;
    const inputs = form.querySelectorAll(inputTagNames.join(', '));

    // Obtain options
    const { formFieldClass = 'form-field' } = options;

    // Classify each input in a form
    inputs.forEach(input => {
        classifyInput(input, formFieldClass);
    });
}

/**
 * Get id from given field
 * @param {Element} field DOM element
 * @return {string}
 */
function getFieldId(field) {
    const fieldId = (field.name || '').match(/(\[.*\])/);

    if (fieldId && fieldId.length !== 0) {
        return fieldId[0];
    }

    return '';
}

/**
 * Insert hidden field after State/Province field
 * @param {Element} stateField DOM element
 */
function insertStateHiddenField(stateField) {
    const fieldId = getFieldId(stateField);
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = `FormFieldIsText${fieldId}`;
    hiddenInput.value = '1';

    stateField.insertAdjacentElement('afterend', hiddenInput);
}

/**
 * Announce form input error message by screen reader
 * @param {params.element} dom input element where checking is happened
 * @param {params.result} result of validation check
 */
function announceInputErrorMessage({ element, result }) {
    if (result) {
        return;
    }
    const activeInputContainer = element.parentElement;
    if (!activeInputContainer) return;
    // the reason for using span tag is nod-validate lib
    // which does not add error message class while initialising form.
    // specific class is added since it can be multiple spans
    const errorMessage = activeInputContainer.querySelector('span.form-inlineMessage');

    if (errorMessage) {
        if (!errorMessage.getAttribute('role')) {
            errorMessage.setAttribute('role', 'alert');
        }
    }
}

const Validators = {
    /**
     * Sets up a new validation when the form is dirty
     * @param validator
     * @param field
     * @param {string} errorText describes errorMassage on email validation
     */
    setEmailValidation: (validator, field, errorText) => {
        if (field) {
            validator.add({
                selector: field,
                validate: (cb, val) => {
                    const result = forms.email(val);

                    cb(result);
                },
                errorMessage: errorText,
            });
        }
    },

    /**
     * Validate password fields
     * @param validator
     * @param passwordSelector
     * @param password2Selector
     * @param requirements
     * @param {object} errorTextsObject
     * @param isOptional
     */
    setPasswordValidation: (validator, passwordSelector, password2Selector, requirements, {
        onEmptyPasswordErrorText, onConfirmPasswordErrorText, onMismatchPasswordErrorText, onNotValidPasswordErrorText,
    }, isOptional) => {
        const passwordEl = document.querySelector(passwordSelector);
        const passwordValidations = [
            {
                selector: passwordSelector,
                validate: (cb, val) => {
                    const result = val.length;

                    if (isOptional) {
                        return cb(true);
                    }

                    cb(result);
                },
                errorMessage: onEmptyPasswordErrorText,
            },
            {
                selector: passwordSelector,
                validate: (cb, val) => {
                    const result = val.match(new RegExp(requirements.alpha))
                        && val.match(new RegExp(requirements.numeric))
                        && val.length >= requirements.minlength;

                    // If optional and nothing entered, it is valid
                    if (isOptional && val.length === 0) {
                        return cb(true);
                    }

                    cb(result);
                },
                errorMessage: onNotValidPasswordErrorText,
            },
            {
                selector: password2Selector,
                validate: (cb, val) => {
                    const result = val.length;

                    if (isOptional) {
                        return cb(true);
                    }

                    cb(result);
                },
                errorMessage: onConfirmPasswordErrorText,
            },
            {
                selector: password2Selector,
                validate: (cb, val) => {
                    const result = passwordEl ? val === passwordEl.value : false;

                    cb(result);
                },
                errorMessage: onMismatchPasswordErrorText,
            },
        ];

        validator.add(passwordValidations);
    },

    /**
     * Validate price range
     * @param {Nod} validator
     * @param {Object} selectors
     */
    setMinMaxPriceValidation: (validator, selectors, priceValidationErrorTexts = {}) => {
        const {
            errorSelector,
            fieldsetSelector,
            formSelector,
            maxPriceSelector,
            minPriceSelector,
        } = selectors;

        // eslint-disable-next-line object-curly-newline
        const { onMinPriceError, onMaxPriceError, minPriceNotEntered, maxPriceNotEntered, onInvalidPrice } = priceValidationErrorTexts;

        validator.configure({
            form: formSelector,
            preventSubmit: true,
            successClass: '_', // KLUDGE: Don't apply success class
        });

        validator.add({
            errorMessage: onMinPriceError,
            selector: minPriceSelector,
            validate: `min-max:${minPriceSelector}:${maxPriceSelector}`,
        });

        validator.add({
            errorMessage: onMaxPriceError,
            selector: maxPriceSelector,
            validate: `min-max:${minPriceSelector}:${maxPriceSelector}`,
        });

        validator.add({
            errorMessage: maxPriceNotEntered,
            selector: maxPriceSelector,
            validate: 'presence',
        });

        validator.add({
            errorMessage: minPriceNotEntered,
            selector: minPriceSelector,
            validate: 'presence',
        });

        validator.add({
            errorMessage: onInvalidPrice,
            selector: [minPriceSelector, maxPriceSelector],
            validate: 'min-number:0',
        });

        validator.setMessageOptions({
            selector: [minPriceSelector, maxPriceSelector],
            parent: fieldsetSelector,
            errorSpan: errorSelector,
        });
    },

    /**
     * Sets up a new validation when the form is dirty
     * @param validator
     * @param field
     */
    setStateCountryValidation: (validator, field, errorText) => {
        if (field) {
            validator.add({
                selector: field,
                validate: 'presence',
                errorMessage: errorText,
            });
        }
    },

    /**
     * Removes classes from dirty form if previously checked
     * @param {Element} field - DOM element with data-field-type attribute
     */
    cleanUpStateValidation: (field) => {
        const fieldType = field.dataset ? field.dataset.fieldType : '';
        const fieldClassElement = document.querySelector(`[data-type="${fieldType}"]`);

        if (fieldClassElement) {
            Object.keys(nod.classes).forEach((value) => {
                fieldClassElement.classList.remove(nod.classes[value]);
            });
        }
    },

    /**
     * Handles zip/postal code validation based on whether it's required
     * @param {Nod} validator - The nod validator instance
     * @param {Element} zipElement - The zip/postal code field element
     * @param {string} errorText - The error message to display if validation fails
     */
    handleZipValidation: (validator, zipElement, errorText) => {
        if (!zipElement) {
            return;
        }

        // Always try to remove existing validation first.
        // Note: Don't use getStatus() before remove() - getStatus() can corrupt the validator's
        // internal state by creating a checkHandler without a mediator if the element
        // wasn't previously registered. remove() is safe to call on unregistered elements.
        validator.remove(zipElement);

        const isZipRequired = zipElement.required;

        if (isZipRequired) {
            Validators.setStateCountryValidation(validator, zipElement, errorText);
        } else {
            Validators.cleanUpStateValidation(zipElement);
        }
    },
};

export { Validators, insertStateHiddenField, announceInputErrorMessage };
