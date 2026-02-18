/**
 * Visually hides the option from user by moving option to an invisible
 * and disabled select placeholder element.
 *
 * This approach is required rather than simply hiding the option because
 * hidden option can still be included when form serialization is called and
 * cause wrong value to be submitted.
 * (eg. if you have option 1, 2, 3 and 2 is hidden, when you select 3,
 * serialization will use the value of 2 instead of 3)
 */

// WeakMaps to store linked select references and option indices (replaces jQuery .data())
const linkedSelectMap = new WeakMap();
const optionIndexMap = new WeakMap();

/**
 * Toggle visibility of a select option by moving it between the real select
 * and a hidden disabled select.
 * @param {Element} optionEl - The <option> element to toggle
 * @param {boolean} show - true to show, false to hide
 */
export default function toggleOption(optionEl, show) {
    const currentSelectElement = optionEl.closest('select');
    if (!currentSelectElement) return;

    let disabledSelectElement;
    let selectElement;

    if (currentSelectElement.disabled) {
        disabledSelectElement = currentSelectElement;
        selectElement = linkedSelectMap.get(disabledSelectElement);
    } else {
        selectElement = currentSelectElement;
        disabledSelectElement = linkedSelectMap.get(selectElement);
        if (!disabledSelectElement) {
            // create the disabled placeholder select element
            disabledSelectElement = document.createElement('select');
            disabledSelectElement.disabled = true;
            disabledSelectElement.style.display = 'none';
            disabledSelectElement.name = selectElement.name;
            disabledSelectElement.className = selectElement.className;

            linkedSelectMap.set(disabledSelectElement, selectElement);
            linkedSelectMap.set(selectElement, disabledSelectElement);

            selectElement.insertAdjacentElement('afterend', disabledSelectElement);
        }
    }

    // save the selected option
    const selectedValue = selectElement.value;

    // move the option to the correct select element if required
    if (currentSelectElement.disabled && show) {
        const previousIndex = optionIndexMap.get(optionEl) || 0;
        const options = Array.from(selectElement.options);
        const elementAtPreviousIndex = options[previousIndex];

        if (elementAtPreviousIndex) {
            selectElement.insertBefore(optionEl, elementAtPreviousIndex);
        } else {
            selectElement.appendChild(optionEl);
        }
    } else if (!currentSelectElement.disabled && !show) {
        optionIndexMap.set(optionEl, Array.from(currentSelectElement.options).indexOf(optionEl));
        disabledSelectElement.insertBefore(optionEl, disabledSelectElement.firstChild);
    }

    // make sure the previously selected option is still selected
    selectElement.value = selectedValue;
}
