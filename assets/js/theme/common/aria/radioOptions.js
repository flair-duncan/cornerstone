import { ariaKeyCodes } from './constants';
import { delegate } from '../dom';

const setCheckedRadioItem = (items, itemIdx) => {
    items.forEach((item, idx) => {
        if (idx !== itemIdx) {
            item.setAttribute('aria-checked', 'false');
            item.checked = false;
            return;
        }

        item.setAttribute('aria-checked', 'true');
        item.checked = true;
        item.focus();
        item.dispatchEvent(new Event('change', { bubbles: true }));
    });
};

const calculateTargetItemPosition = (lastItemIdx, currentIdx) => {
    switch (true) {
    case currentIdx > lastItemIdx: return 0;
    case currentIdx < 0: return lastItemIdx;
    default: return currentIdx;
    }
};

const handleItemKeyDown = items => e => {
    const { keyCode } = e;
    const itemIdx = Array.from(items).indexOf(e.currentTarget);
    const lastCollectionItemIdx = items.length - 1;

    if (Object.values(ariaKeyCodes).includes(keyCode)) {
        e.preventDefault();
        e.stopPropagation();
    }

    switch (keyCode) {
    case ariaKeyCodes.LEFT:
    case ariaKeyCodes.UP: {
        const prevItemIdx = calculateTargetItemPosition(lastCollectionItemIdx, itemIdx - 1);
        items[prevItemIdx].focus();
        setCheckedRadioItem(items, prevItemIdx);
        break;
    }
    case ariaKeyCodes.RIGHT:
    case ariaKeyCodes.DOWN: {
        const nextItemIdx = calculateTargetItemPosition(lastCollectionItemIdx, itemIdx + 1);
        items[nextItemIdx].focus();
        setCheckedRadioItem(items, nextItemIdx);
        break;
    }

    default: break;
    }
};

export default (container, itemSelector) => {
    const el = container instanceof Element ? container : document.querySelector(container);
    if (!el) return;
    const items = Array.from(el.querySelectorAll(itemSelector));

    delegate(el, 'keydown', itemSelector, handleItemKeyDown(items));
};
