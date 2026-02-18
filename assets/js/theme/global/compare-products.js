import { showAlertModal } from './modal';
import { qsa, delegate } from '../common/dom';

function decrementCounter(counter, item) {
    const index = counter.indexOf(item);

    if (index > -1) {
        counter.splice(index, 1);
    }
}

function incrementCounter(counter, item) {
    counter.push(item);
}

function updateCounterNav(counter, link, urls) {
    if (counter.length !== 0) {
        link.classList.add('show');
        link.setAttribute('href', `${urls.compare}/${counter.join('/')}`);
        const pill = link.querySelector('span.countPill');
        if (pill) pill.innerHTML = counter.length;
    } else {
        link.classList.remove('show');
    }
}

export default function ({ noCompareMessage, urls }) {
    let compareCounter = [];

    const compareLink = document.querySelector('a[data-compare-nav]');

    document.body.addEventListener('compareReset', () => {
        const checked = qsa('input[name="products[]"]:checked');
        compareCounter = checked.length ? checked.map(el => el.value) : [];
        if (compareLink) updateCounterNav(compareCounter, compareLink, urls);
    });

    // Trigger compareReset
    document.body.dispatchEvent(new CustomEvent('compareReset', { bubbles: true }));

    delegate(document.body, 'click', '[data-compare-id]', (event, el) => {
        const product = el.value;
        const clickedLink = document.querySelector('a[data-compare-nav]');

        if (el.checked) {
            incrementCounter(compareCounter, product);
        } else {
            decrementCounter(compareCounter, product);
        }

        if (clickedLink) updateCounterNav(compareCounter, clickedLink, urls);
    });

    delegate(document.body, 'click', 'a[data-compare-nav]', () => {
        const checkedInputs = qsa('input[name="products[]"]:checked');

        if (checkedInputs.length <= 1) {
            showAlertModal(noCompareMessage);
            return false;
        }
    });
}
