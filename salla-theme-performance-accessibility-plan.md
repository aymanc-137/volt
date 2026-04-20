# Salla Theme Performance & Accessibility Improvement Plan

> A reusable, step-by-step guide for improving Lighthouse Performance & Accessibility scores on any Salla Twilight theme. Based on the [Salla Theme Raed Performance & Accessibility Guide](https://salla.dev/blog/theme-raed-performance-and-accessibility-guide/) and [PR #814](https://github.com/SallaApp/theme-raed/pull/814).

---

## Table of Contents

1. [Phase 1: Fix Cumulative Layout Shift (CLS)](#phase-1-fix-cumulative-layout-shift-cls)
2. [Phase 2: Fix Focus Styles](#phase-2-fix-focus-styles)
3. [Phase 3: Fix Color Contrast (WCAG AA)](#phase-3-fix-color-contrast-wcag-aa)
4. [Phase 4: Fix Image Alt Attributes](#phase-4-fix-image-alt-attributes)
5. [Phase 5: Optimize Image Loading](#phase-5-optimize-image-loading)
6. [Phase 6: Accessibility Polish](#phase-6-accessibility-polish)
7. [File-by-File Checklist](#file-by-file-checklist)
8. [Testing & Validation](#testing--validation)

---

## Expected Outcomes

| Metric | Before | Target |
|---|---|---|
| CLS Score | Variable | ~0 |
| Accessibility Score | Variable | 100 |
| Core Web Vitals | Needs work | All green |
| WCAG Compliance | Partial | AA minimum |

---

## Phase 1: Fix Cumulative Layout Shift (CLS)

Layout shift happens when images and elements load without reserved space, causing the page to "jump."

### What to Do

1. **Add `width` and `height` attributes to every `<img>` tag** across all `.twig` files.
2. **Add CSS `aspect-ratio`** as a fallback, because Tailwind classes like `w-full` and `h-80` override fixed HTML dimensions, making `width`/`height` alone ineffective for CLS.
3. **Preserve existing `loading="lazy"` attributes** — do not remove them.

### How to Find Affected Files

Search all `.twig` files for `<img` tags and check each one:

```bash
grep -rn '<img' src/views/ --include="*.twig"
```

### Code Patterns

**Before (causes CLS):**
```html
<img src="{{ image.url }}" alt="product" class="w-full h-80 object-cover">
```

**After (CLS fixed):**
```html
<img src="{{ image.url }}" alt="product" class="w-full h-80 object-cover" width="400" height="320" style="aspect-ratio: 400/320;">
```

**For dynamic/responsive images where exact size is unknown:**
```html
<img src="{{ image.url }}" alt="product" class="w-full object-cover aspect-video" width="1200" height="675">
```

**Using Tailwind aspect-ratio classes (preferred if available):**
```html
<!-- Square images -->
<img ... class="aspect-square w-full object-cover" width="300" height="300">

<!-- Banner/hero images -->
<img ... class="aspect-video w-full object-cover" width="1200" height="675">

<!-- Logo/icon images -->
<img ... class="aspect-square w-16 h-16 object-contain" width="64" height="64">
```

### Common Locations to Check

| File Pattern | Typical Image Type | Suggested Dimensions |
|---|---|---|
| `header/header.twig` | Store logo | Match actual logo size |
| `footer/footer.twig` | Footer logo, certificates | 100x100 or actual |
| `components/home/*.twig` | Banners, sliders, product cards | 1200x675 (banners), 400x400 (products) |
| `pages/product/single.twig` | Product gallery images | 800x800 |
| `pages/blog/*.twig` | Blog thumbnails, post images | 800x450 |
| `pages/customer/orders/*.twig` | Order item thumbnails | 80x80 |
| `pages/brands/*.twig` | Brand logos | 400x300 |

### Critical Warning

> Sentry/Lighthouse will flag: "The `width` and `height` attributes are ineffective because CSS classes like `w-full` and `h-80` override them."
> **Solution:** Always pair `width`/`height` with CSS `aspect-ratio` or Tailwind's `aspect-*` utility class.

---

## Phase 2: Fix Focus Styles

Removing focus outlines breaks keyboard navigation and is an accessibility violation.

### What to Do

1. **Remove `outline: none`** from `a:focus` in the reset stylesheet.
2. **Add visible focus indicators** using `focus-visible` (shows focus only for keyboard users, not mouse clicks).
3. **Update form inputs** to have visible focus rings instead of `focus:ring-transparent`.
4. **Add focus styles to buttons and interactive elements.**

### How to Find Affected Files

```bash
grep -rn 'outline.*none\|ring-transparent\|focus.*none' src/assets/styles/ --include="*.scss"
grep -rn 'focus:outline-none\|focus:ring-0' src/views/ --include="*.twig"
```

### Code Patterns

**Reset stylesheet fix:**

```scss
/* BEFORE (harmful - removes all focus indicators) */
a:focus {
  outline: none;
  text-decoration: none;
}

/* AFTER (accessible - visible focus for keyboard users) */
a:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  text-decoration: none;
}
```

**Form input fix:**

```scss
/* BEFORE */
.form-input {
  @apply focus:ring-transparent focus:border-primary;
}

/* AFTER */
.form-input {
  @apply focus:ring-2 focus:ring-primary focus:border-primary;
}
```

**Button focus fix (add to buttons.scss):**

```scss
.btn, button, [role="button"] {
  &:focus-visible {
    @apply ring-2 ring-primary ring-offset-2 outline-none;
  }
}
```

**Navigation link focus fix (Twig templates):**

```html
<!-- BEFORE -->
<a href="..." class="focus:outline-none">

<!-- AFTER -->
<a href="..." class="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
```

### Files Typically Affected

- `src/assets/styles/02-generic/reset.scss`
- `src/assets/styles/03-elements/form.scss`
- `src/assets/styles/03-elements/buttons.scss`
- `src/assets/styles/04-components/header.scss`
- `src/assets/styles/04-components/menus.scss`
- Any `.twig` file using `focus:outline-none` inline

---

## Phase 3: Fix Color Contrast (WCAG AA)

WCAG AA requires a minimum contrast ratio of **4.5:1** for normal text and **3:1** for large text (18px+ or 14px+ bold).

### What to Do

1. **Replace low-contrast text colors** (`text-gray-400`, `text-gray-500`) with darker alternatives.
2. **Replace opacity-based text** with solid color equivalents.
3. **Update CSS custom properties** that define low-contrast colors.
4. **Add text shadows** for text on image/colored backgrounds.
5. **Improve form label contrast.**

### How to Find Affected Files

```bash
grep -rn 'text-gray-400\|text-gray-500' src/views/ --include="*.twig"
grep -rn 'opacity-50\|opacity-60' src/views/ --include="*.twig"
grep -rn 'color-text\|text-gray' src/assets/styles/ --include="*.scss"
```

### Color Replacement Map

| Current Class | Contrast Ratio | Replacement | New Ratio |
|---|---|---|---|
| `text-gray-400` (#9CA3AF) | ~3.0:1 | `text-gray-600` (#4B5563) | ~7.0:1 |
| `text-gray-500` (#6B7280) | ~4.6:1 | `text-gray-600` (#4B5563) | ~7.0:1 |
| `opacity-50` on text | Varies | Use solid color instead | 4.5:1+ |
| `opacity-60` on text | Varies | Use solid color instead | 4.5:1+ |

### Code Patterns

**CSS custom property fix:**

```scss
/* BEFORE */
:root {
  --color-text: #7c8082;  /* Low contrast ~4.1:1 */
}

/* AFTER */
:root {
  --color-text: #4b5563;  /* WCAG AA compliant ~7.0:1 */
}
```

**Twig template fix:**

```html
<!-- BEFORE -->
<p class="text-gray-400">Product description</p>
<span class="text-black opacity-50">Subtitle</span>

<!-- AFTER -->
<p class="text-gray-600">Product description</p>
<span class="text-gray-600">Subtitle</span>
```

**Text on image backgrounds:**

```html
<!-- BEFORE -->
<div class="relative">
  <img src="...">
  <p class="absolute text-white">Overlay text</p>
</div>

<!-- AFTER -->
<div class="relative">
  <img src="...">
  <p class="absolute text-white drop-shadow-lg" style="text-shadow: 0 1px 3px rgba(0,0,0,0.6);">Overlay text</p>
</div>
```

### Files Typically Affected

- `src/assets/styles/01-settings/global.scss` — CSS custom properties
- `src/views/components/footer/footer.twig` — footer text
- `src/views/pages/product/single.twig` — product descriptions, out-of-stock text
- `src/views/components/home/*.twig` — various section descriptions
- `src/views/pages/blog/*.twig` — blog metadata text
- `src/views/pages/customer/*.twig` — account page labels

### Contrast Checking Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools → Elements → Styles → click on any color swatch to see contrast ratio
- Lighthouse Accessibility audit

---

## Phase 4: Fix Image Alt Attributes

Every `<img>` must have an `alt` attribute. The value depends on the image's purpose.

### What to Do

1. **Add meaningful `alt` text** to all images that convey information.
2. **Use `alt=""`** (empty) ONLY for purely decorative images.
3. **Use dynamic alt text** from Twig variables where available.
4. **Never use generic text** like "image" or "photo."

### How to Find Affected Files

```bash
# Images with no alt attribute at all
grep -rn '<img' src/views/ --include="*.twig" | grep -v 'alt='

# Images with empty alt (check if they're truly decorative)
grep -rn 'alt=""' src/views/ --include="*.twig"

# Images with generic/meaningless alt
grep -rn 'alt="image"\|alt="photo"\|alt="img"\|alt="logo"' src/views/ --include="*.twig"
```

### Code Patterns

**Product images:**
```html
<!-- BEFORE -->
<img src="{{ product.image.url }}">

<!-- AFTER -->
<img src="{{ product.image.url }}" alt="{{ product.image.alt|default(product.name) }}">
```

**Store logo:**
```html
<!-- BEFORE -->
<img src="{{ store.logo }}" alt="">

<!-- AFTER -->
<img src="{{ store.logo }}" alt="{{ store.name }} logo">
```

**Blog post image:**
```html
<!-- BEFORE -->
<img src="{{ article.image.url }}">

<!-- AFTER -->
<img src="{{ article.image.url }}" alt="{{ article.image.alt|default(article.title) }}">
```

**Decorative images (background patterns, dividers, etc.):**
```html
<!-- Correct — truly decorative, hidden from screen readers -->
<img src="divider.svg" alt="" role="presentation">
```

**Icon images that have adjacent text:**
```html
<!-- Decorative because text provides the meaning -->
<img src="phone-icon.svg" alt=""> <span>Call us: 123-456</span>
```

### Alt Text Guidelines

| Image Type | Alt Text Strategy |
|---|---|
| Product images | Product name: `alt="{{ product.name }}"` |
| Blog thumbnails | Article title: `alt="{{ article.title }}"` |
| Brand logos | Brand name: `alt="{{ brand.name }}"` |
| Store logo | Store name + "logo": `alt="{{ store.name }} logo"` |
| Banner images | Describe the promotion or use CTA text |
| Testimonial avatars | Person's name: `alt="{{ testimonial.author }}"` |
| Certificate images | Certificate name or issuing body |
| Decorative images | Empty: `alt=""` with `role="presentation"` |

---

## Phase 5: Optimize Image Loading

Proper loading strategies improve LCP (Largest Contentful Paint) and reduce bandwidth.

### What to Do

1. **Above-the-fold images**: `loading="eager"` + `fetchpriority="high"`
2. **Below-the-fold images**: `loading="lazy"`
3. **All non-critical images**: `decoding="async"`
4. **Never lazy-load the LCP image** (usually the hero/banner or first product image).

### How to Find Affected Files

```bash
# All images — check loading attribute
grep -rn '<img' src/views/ --include="*.twig"

# Images missing loading attribute entirely
grep -rn '<img' src/views/ --include="*.twig" | grep -v 'loading='
```

### Code Patterns

**Hero/banner/slider (above the fold):**
```html
<img src="{{ banner.url }}"
     alt="{{ banner.alt }}"
     loading="eager"
     fetchpriority="high"
     decoding="async"
     width="1200" height="675">
```

**Product cards in a grid (below the fold):**
```html
<img src="{{ product.image.url }}"
     alt="{{ product.name }}"
     loading="lazy"
     decoding="async"
     width="400" height="400">
```

**Store logo in header (above the fold):**
```html
<img src="{{ store.logo }}"
     alt="{{ store.name }} logo"
     loading="eager"
     fetchpriority="high"
     width="150" height="50">
```

### Loading Strategy by Location

| Location | loading | fetchpriority | decoding |
|---|---|---|---|
| Header logo | `eager` | `high` | (omit) |
| Hero slider/banner | `eager` | `high` | `async` |
| First product image (PDP) | `eager` | `high` | `async` |
| Product cards in grid | `lazy` | (omit) | `async` |
| Blog thumbnails | `lazy` | (omit) | `async` |
| Footer images | `lazy` | (omit) | `async` |
| Testimonial avatars | `lazy` | (omit) | `async` |
| Customer order images | `lazy` | (omit) | `async` |

---

## Phase 6: Accessibility Polish

Final pass to ensure full WCAG AA compliance and best practices.

### 6.1 Skip Navigation Link

Add a skip link as the first focusable element in the page for keyboard users.

```html
<!-- Add to master.twig, right after <body> -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-primary">
  Skip to main content
</a>

<!-- Ensure main content area has the matching id -->
<main id="main-content" role="main">
```

### 6.2 Landmark Roles & Semantic HTML

```html
<!-- Header -->
<header role="banner">
  <nav role="navigation" aria-label="Main navigation">
    ...
  </nav>
</header>

<!-- Main content -->
<main id="main-content" role="main">
  ...
</main>

<!-- Footer -->
<footer role="contentinfo">
  ...
</footer>
```

### 6.3 ARIA Labels for Interactive Elements

```html
<!-- Search button with only an icon -->
<button aria-label="Search">
  <i class="icon-search"></i>
</button>

<!-- Cart icon with count -->
<a href="/cart" aria-label="Shopping cart, {{ cart.count }} items">
  <i class="icon-cart"></i>
  <span>{{ cart.count }}</span>
</a>

<!-- Close button -->
<button aria-label="Close menu">
  <i class="icon-close"></i>
</button>

<!-- Social media links -->
<a href="{{ social.url }}" aria-label="Follow us on {{ social.name }}">
  <i class="icon-{{ social.name }}"></i>
</a>
```

### 6.4 Form Accessibility

```html
<!-- Every input must have an associated label -->
<label for="email" class="form-label">Email address</label>
<input type="email" id="email" name="email" class="form-input"
       autocomplete="email"
       aria-describedby="email-error">
<span id="email-error" class="text-red-500 text-sm" role="alert"></span>

<!-- Required fields -->
<label for="name" class="form-label">
  Name <span class="text-red-500" aria-hidden="true">*</span>
  <span class="sr-only">(required)</span>
</label>
<input type="text" id="name" required aria-required="true">
```

### 6.5 RTL Compatibility

Ensure all accessibility changes maintain RTL support:

```scss
/* Use logical properties instead of directional ones */
/* BEFORE */
margin-left: 1rem;
padding-right: 0.5rem;

/* AFTER */
margin-inline-start: 1rem;
padding-inline-end: 0.5rem;
```

### How to Find Files Needing Updates

```bash
# Icon-only buttons without aria-label
grep -rn '<button' src/views/ --include="*.twig" | grep -v 'aria-label'

# Links without accessible text
grep -rn '<a ' src/views/ --include="*.twig" | grep -v 'aria-label'

# Inputs without associated labels
grep -rn '<input' src/views/ --include="*.twig" | grep -v 'id='

# Missing landmark roles
grep -rn '<main\|<nav\|<header\|<footer' src/views/ --include="*.twig"
```

---

## File-by-File Checklist

Use this checklist when auditing any Salla theme. Go through each file and check all applicable items.

### Layout Files

- [ ] `layouts/master.twig` — skip nav link, landmark roles, `<html lang="">`, `<meta viewport>`
- [ ] `layouts/customer.twig` — proper heading hierarchy, landmark roles

### Header & Footer

- [ ] `components/header/header.twig` — logo alt+dimensions, nav aria-label, focus styles, search button aria-label
- [ ] `components/footer/footer.twig` — logo alt+dimensions, link contrast, social media aria-labels

### Home Components (check each file in `components/home/`)

For **every** home component file:
- [ ] All `<img>` have `width`, `height`, `alt`, `loading`, and `aspect-ratio`
- [ ] Text contrast meets WCAG AA (no `text-gray-400`/`text-gray-500` without good reason)
- [ ] Interactive elements have focus styles
- [ ] Links/buttons have accessible names

### Page Files

- [ ] `pages/index.twig` — heading hierarchy, component ordering
- [ ] `pages/product/single.twig` — product image alt, gallery accessibility, form labels, price announced to SR
- [ ] `pages/product/index.twig` — filter accessibility, product card alt text
- [ ] `pages/cart.twig` — item images, quantity input labels, remove button aria-labels
- [ ] `pages/blog/index.twig` — article image alt, link text, date formatting
- [ ] `pages/blog/single.twig` — content images alt, heading hierarchy
- [ ] `pages/brands/index.twig` — brand logo alt+dimensions
- [ ] `pages/brands/single.twig` — brand image alt+dimensions
- [ ] `pages/testimonials.twig` — avatar alt, quote markup
- [ ] `pages/loyalty.twig` — form labels, interactive elements
- [ ] `pages/landing-page.twig` — all images, heading hierarchy
- [ ] `pages/thank-you.twig` — order details accessibility

### Customer Pages

- [ ] `pages/customer/profile.twig` — form labels, input associations
- [ ] `pages/customer/orders/index.twig` — table accessibility, image alt
- [ ] `pages/customer/orders/single.twig` — order item image alt+dimensions
- [ ] `pages/customer/wishlist.twig` — product image alt, remove button labels
- [ ] `pages/customer/wallet.twig` — transaction table accessibility
- [ ] `pages/customer/notifications.twig` — notification role, live region

### Stylesheets

- [ ] `01-settings/global.scss` — CSS custom property contrast check
- [ ] `02-generic/reset.scss` — remove harmful `outline: none`
- [ ] `03-elements/form.scss` — visible focus rings
- [ ] `03-elements/buttons.scss` — visible focus indicators
- [ ] `04-components/header.scss` — navigation focus styles
- [ ] `04-components/menus.scss` — dropdown focus management

---

## Testing & Validation

### Run Lighthouse Audit

1. Open Chrome DevTools → Lighthouse tab
2. Select "Performance" and "Accessibility" categories
3. Run audit on:
   - Homepage
   - Product detail page
   - Blog listing page
   - Cart page
   - Customer profile page

### Manual Testing Checklist

- [ ] **Keyboard navigation**: Tab through the entire page — can you see where focus is?
- [ ] **Screen reader**: Test with NVDA (Windows) or VoiceOver (Mac) on key pages
- [ ] **Zoom**: Zoom to 200% — does everything remain usable?
- [ ] **Color contrast**: Use DevTools to verify all text meets 4.5:1 ratio
- [ ] **No layout shift**: Watch for any "jumps" as the page loads
- [ ] **RTL**: Switch to Arabic and verify layout is correct
- [ ] **Mobile**: Test on mobile viewport — touch targets should be at least 44x44px

### Automated Tools

- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [axe DevTools](https://www.deque.com/axe/devtools/) (browser extension)
- [WAVE](https://wave.webaim.org/) (Web Accessibility Evaluation Tool)
- Chrome DevTools → Rendering → "Emulate a focused page" for focus testing

---

## Quick Reference: Salla/Twilight Specific Notes

- Salla themes use **Twig** templating — dynamic alt text uses `{{ variable }}` syntax
- Product images are available via `product.image.url` and `product.image.alt`
- Store info is available via `store.name`, `store.logo`, etc.
- Tailwind CSS is the utility framework — prefer Tailwind classes over custom CSS
- RTL support is critical — Salla stores serve Arabic-speaking markets
- Theme file size limit: **1MB** (public) / **2MB** (private)
- The theme must remain "substantively different" from Theme Raed for publishing

---

*Last updated: 2026-03-23*
*Based on: [Salla Theme Raed Performance & Accessibility Guide](https://salla.dev/blog/theme-raed-performance-and-accessibility-guide/) and [PR #814](https://github.com/SallaApp/theme-raed/pull/814)*
