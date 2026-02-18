# Plan: Remove jQuery from Cornerstone

## Current State

jQuery 3.6.1 is deeply embedded in the Cornerstone theme:
- **673 jQuery call-site occurrences** across **66 source/test files**
- **5 jQuery plugins** that must be replaced: Foundation 5.5, Slick Carousel, JSTree, Nod-Validate, EasyZoom
- jQuery is globally injected via Webpack `ProvidePlugin` and `expose-loader`
- Custom `jquery-migrate` polyfills exist to keep Foundation 5.5 working with jQuery 3.x
- `@bigcommerce/stencil-utils` does **not** depend on jQuery (uses fetch + eventemitter3), so the API layer is safe

## Strategy

Phased approach, from infrastructure outward to application code. Each phase is independently testable.

---

## Phase 1: Replace jQuery Plugins with Vanilla/Modern Alternatives

These are the hardest constraints — each plugin locks us into jQuery. Replace them first.

### 1a. Foundation 5.5 → Vanilla replacements
**Files affected:** `global/foundation.js`, `global/modal.js`, `global/reveal-close.js`, `global/stencil-dropdown.js`, all modal specs
**Foundation features used:**
- `reveal` (modals) — Replace with a lightweight vanilla modal (e.g., Micromodal ~1KB, or custom implementation using `<dialog>` element)
- `dropdown` — Replace with custom vanilla dropdown using CSS + JS toggle
- `tab` — Replace with vanilla tab switcher (aria-based)

**Action:**
- Remove `foundation-sites` dependency
- Remove `assets/js/theme/global/jquery-migrate/` directory entirely (exists only for Foundation 5 compat)
- Remove `assets/js/theme/global/jquery-migrate.js`
- Rewrite `global/foundation.js` to initialize vanilla replacements
- Rewrite `global/modal.js` (~23 jQuery calls) to use vanilla modal (dialog element or Micromodal)
- Update `global/reveal-close.js` to use vanilla event listeners
- Update `global/stencil-dropdown.js` to use vanilla JS

### 1b. Slick Carousel → Vanilla carousel
**Files affected:** `common/carousel/index.js`, `common/carousel/utils/*` (7 util files), `global/quick-view.js`, carousel spec
**Options:**
- **Swiper** (vanilla, no jQuery, widely used, ~40KB)
- **Splide** (vanilla, lightweight, ~29KB, accessible)
- **Custom implementation** using CSS scroll-snap (lightest, but more work for edge cases)

**Action:**
- Remove `slick-carousel` dependency
- Rewrite `common/carousel/index.js` and all carousel utils to use chosen replacement
- Update `global/quick-view.js` carousel initialization
- Update carousel spec

### 1c. JSTree → Vanilla tree component
**Files affected:** `search.js` (2 call sites)
**Usage:** Category tree filtering on search page only
**Options:**
- Custom vanilla tree using `<details>`/`<summary>` + checkboxes (simplest, best for this limited use case)
- **treejs** (vanilla, lightweight)

**Action:**
- Remove `jstree` dependency and its webpack alias
- Rewrite tree initialization and `get_selected()` calls in `search.js`

### 1d. Nod-Validate → Vanilla form validation
**Files affected:** `common/nod.js`, `common/form-validation.js`, `common/nod-functions/min-max-validate.js`, min-max-validate spec
**Options:**
- **Native HTML5 Constraint Validation API** + custom validation layer (zero dependencies)
- **Pristine.js** (~5KB, vanilla)

**Action:**
- Remove `nod-validate` dependency
- Rewrite `common/nod.js` wrapper to use HTML5 validation or Pristine
- Update `common/form-validation.js`
- Update min-max-validate and its spec

### 1e. EasyZoom → Vanilla image zoom
**Files affected:** `product/image-gallery.js` (1 call site)
**Options:**
- **Drift** (vanilla zoom library, ~6KB)
- Custom CSS `transform: scale()` + mousemove handler (very lightweight, sufficient for product zoom)

**Action:**
- Remove `easyzoom` dependency
- Rewrite zoom initialization in `product/image-gallery.js`

---

## Phase 2: Replace jQuery AJAX with Fetch API

### 2a. Direct `$.ajax` calls
**Files affected:** `search.js`, `common/payment-method.js`, `global/currency-selector.js`
Only 3 files use `$.ajax` directly (most API calls go through `stencil-utils` which already uses fetch).

**Action:**
- Replace `$.ajax()` calls with native `fetch()` + appropriate error handling
- These are straightforward 1:1 replacements

---

## Phase 3: Replace jQuery DOM Manipulation with Vanilla JS

This is the bulk of the work — converting `$(selector)` patterns to vanilla JS across ~50 source files.

### jQuery → Vanilla equivalents used in this codebase:

| jQuery | Vanilla JS |
|--------|-----------|
| `$(selector)` | `document.querySelector(selector)` / `querySelectorAll` |
| `$el.find(sel)` | `el.querySelector(sel)` / `querySelectorAll` |
| `$el.on(evt, fn)` | `el.addEventListener(evt, fn)` |
| `$el.on(evt, sel, fn)` | Event delegation: `el.addEventListener(evt, e => { if (e.target.matches(sel)) fn(e) })` |
| `$el.off(evt, fn)` | `el.removeEventListener(evt, fn)` |
| `$el.trigger(evt)` | `el.dispatchEvent(new Event(evt))` |
| `$el.addClass/removeClass/toggleClass` | `el.classList.add/remove/toggle` |
| `$el.hasClass(c)` | `el.classList.contains(c)` |
| `$el.attr(k, v)` | `el.setAttribute(k, v)` / `el.getAttribute(k)` |
| `$el.data(k)` | `el.dataset[k]` |
| `$el.html(v)` | `el.innerHTML = v` |
| `$el.text(v)` | `el.textContent = v` |
| `$el.val()` | `el.value` |
| `$el.append(x)` | `el.append(x)` or `el.insertAdjacentHTML('beforeend', x)` |
| `$el.remove()` | `el.remove()` |
| `$el.show/hide` | `el.style.display = '' / 'none'` or classList toggle |
| `$el.parent/children/siblings` | `el.parentElement` / `el.children` / spread + filter |
| `$el.closest(sel)` | `el.closest(sel)` |
| `$el.each(fn)` | `els.forEach(fn)` |
| `$.each(obj, fn)` | `Object.entries(obj).forEach(...)` |
| `$.contains(a, b)` | `a.contains(b)` |
| `$(html)` | Template + `insertAdjacentHTML` or `DOMParser` |

### Conversion order (by dependency, highest-impact first):

1. **Page infrastructure** (3 files): `app.js`, `page-manager.js`, `global.js`
2. **Global components** (10 files): `modal.js`, `menu.js`, `mobile-menu-toggle.js`, `cart-preview.js`, `quick-search.js`, `quick-view.js`, `compare-products.js`, `currency-selector.js`, `language-selector.js`, `text-truncate.js`
3. **Common utilities** (12 files): `collapsible.js`, `collapsible-group.js`, `faceted-search.js`, `product-details.js`, `product-details-base.js`, `state-country.js`, `cart-item-details.js`, `select-option-plugin.js`, `form-utils.js`, `pagination-utils.js`, `url-utils.js`, `aria/radioOptions.js`
4. **Page managers** (10 files): `cart.js`, `search.js`, `product.js`, `category.js`, `account.js`, `auth.js`, `brand.js`, `gift-certificate.js`, `wishlist.js`, `contact-us.js`, `catalog.js`, `compare.js`
5. **Sub-components** (5 files): `cart/shipping-estimator.js`, `product/image-gallery.js`, `product/video-gallery.js`, `product/reviews.js`

### Helper utility to consider:
Create a small (~20 line) `dom.js` helper module for the two patterns that are verbose in vanilla JS:
- **Event delegation**: `delegate(parent, selector, event, handler)`
- **Query all as array**: `qsa(selector, context)` → returns `Array` from `querySelectorAll`

This avoids repeating boilerplate without adding a library.

---

## Phase 4: Update Build Configuration & Tests

### 4a. Webpack changes (`webpack.common.js`)
- Remove `ProvidePlugin` entries for `$`, `jQuery`, `window.jQuery`
- Remove `expose-loader` rule for jQuery
- Remove jQuery alias from `resolve.alias`
- Remove jstree alias, slick-carousel alias

### 4b. Jest setup (`jest.setup.js`)
- Remove global jQuery setup (`global.$`, `global.jQuery`, `window.jQuery`)

### 4c. Test files (10 spec files)
- Remove `import $ from 'jquery'` from all test files
- Update test DOM setup to use vanilla JS instead of jQuery wrappers
- Update assertions that rely on jQuery objects

---

## Phase 5: Remove jQuery & Clean Up

- `npm uninstall jquery foundation-sites slick-carousel jstree nod-validate easyzoom`
- Delete `assets/js/theme/global/jquery-migrate.js`
- Delete `assets/js/theme/global/jquery-migrate/` directory
- Delete `assets/js/theme/common/select-option-plugin.js` (jQuery plugin pattern, rewrite as vanilla utility if still needed)
- Run full build (`npm run build`) and test suite (`npm test`) to verify
- Check bundle size reduction (jQuery alone is ~87KB min, Foundation ~150KB min)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@bigcommerce/stencil-utils` jQuery coupling | High | Verified: stencil-utils does NOT depend on jQuery. Safe. |
| Foundation CSS depends on Foundation JS | Medium | Foundation 5 CSS can remain as-is; only the JS plugins (reveal, dropdown, tabs) are being replaced. The CSS classes/markup stay the same. |
| Third-party scripts on storefront expecting global `$` | Medium | BigCommerce merchants may have custom scripts using `$`. Add a note in changelog. If needed, a small shim could expose `document.querySelector` as `$` for back-compat, but this is a theme concern, not a library concern. |
| Slick carousel CSS/markup coupling | Low | Most carousel replacements support similar markup patterns or can be configured to match. |
| Regression in complex UI flows (cart, checkout) | High | Each phase should be followed by manual QA of key flows: add-to-cart, cart update, modal open/close, faceted search, product options. |

## Estimated Scope

- **~50 source files** to modify
- **~10 test files** to update
- **5 dependencies** to remove, **2-4 new vanilla dependencies** to add (or zero if using native APIs)
- **Expected bundle size savings**: ~240KB+ minified (jQuery 87KB + Foundation 150KB + plugins)
