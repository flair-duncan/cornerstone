import { qsa } from '../common/dom';

/**
 * Language Selector - renders native language names using Intl.DisplayNames API
 */

export default function languageSelector() {
    qsa('[data-locale-code]').forEach(element => {
        const languageCode = element.dataset.localeCode;

        if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined') {
            try {
                const displayNames = new Intl.DisplayNames([languageCode], {
                    type: 'language',
                });
                const nativeName = displayNames.of(languageCode);
                const activeLanguage = element.querySelector('strong');

                if (activeLanguage) {
                    activeLanguage.textContent = nativeName;
                } else {
                    element.textContent = nativeName;
                }

                if (element.getAttribute('aria-label')) {
                    element.setAttribute('aria-label', nativeName);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn(`Failed to get language name for ${languageCode}:`, error);
            }
        }
    });
}
