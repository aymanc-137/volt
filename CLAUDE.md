# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Volt** is a custom Salla e-commerce theme built on the Twilight theme engine. It's a fork/customization of Theme Raed (the official Salla starter theme) for creating online stores on the Salla platform. The theme uses Twig templating, Tailwind CSS, and vanilla JavaScript with Salla's proprietary APIs.

## Development Commands

### Prerequisites
- Install [Salla CLI](https://www.npmjs.com/package/@salla.sa/cli) globally: `npm install -g @salla.sa/cli`
- This project uses `pnpm` as the package manager (enforced via preinstall hook)

### Common Commands

```bash
# Install dependencies
pnpm install

# Development mode with live preview
npm run dev
# This runs: salla theme p --store=volt-store --with-editor
# Opens live preview in browser with the editor panel

# Alternative preview command (from Salla CLI)
salla theme preview
# or short alias: salla theme p

# Build for production
npm run production
# or: npm run prod

# Build for development
npm run development

# Watch mode (rebuild on changes)
npm run watch
```

## Architecture

### Directory Structure

```
src/
├── assets/
│   ├── images/          # Static images (copied to public/images)
│   ├── js/              # JavaScript modules
│   │   ├── partials/    # Reusable JS components
│   │   ├── app.js       # Main app class (extends AppHelpers)
│   │   ├── home.js      # Home page specific JS
│   │   ├── product.js   # Single product page JS
│   │   ├── cart.js      # Cart page JS
│   │   └── ...          # Page-specific JS files
│   └── styles/          # SCSS files (ITCSS architecture)
│       ├── 01-settings/ # Variables, config
│       ├── 02-generic/  # Reset, normalize
│       ├── 03-elements/ # Base HTML elements
│       ├── 04-components/ # UI components
│       ├── 05-utilities/ # Helper classes
│       └── app.scss     # Main SCSS entry
├── locales/
│   ├── ar.json          # Arabic translations
│   └── en.json          # English translations
└── views/
    ├── components/      # Reusable Twig components
    │   ├── header/
    │   ├── footer/
    │   ├── home/        # Home page components
    │   └── product/
    ├── layouts/
    │   └── master.twig  # Base layout template
    └── pages/           # Page templates
        ├── index.twig   # Home page
        ├── cart.twig
        ├── product/
        ├── customer/
        └── ...
```

### Build System

**Webpack Configuration** ([webpack.config.js](webpack.config.js))
- Multiple entry points for code splitting (app, home, product, checkout, etc.)
- SCSS compilation with PostCSS (Tailwind, nesting support)
- Babel transpilation (excluding node_modules and twilight.js)
- Asset copying (images → public/images)
- Uses `@salla.sa/twilight` ThemeWatcher for live reloading
- CSS minimization with CssMinimizerPlugin

**Key Entry Points:**
- `app`: Main styles + core JS (wishlist, app, blog)
- `home`: Home page specific JS
- `product`: Product pages (single + listing)
- `checkout`: Cart + thank you pages
- `product-card`, `main-menu`, `wishlist-card`: Partial components

### Styling System

**Tailwind Configuration** ([tailwind.config.js](tailwind.config.js))
- Uses `@salla.sa/twilight-tailwind-theme` plugin
- Dark mode: `class` based
- Custom color CSS variables:
  - `--color-dark-page-background`
  - `--color-dark-page-foreground`
  - `--color-light-page-background`
  - `--color-light-page-foreground`
  - `--color-scandary` (secondary color)
- Content sources: `src/views/**/*.twig`, `src/assets/js/**/*.js`
- Extended with custom animations (slideUpFromBottom, slideDownFromBottom)

**SCSS Structure** (ITCSS methodology):
- 01-settings: Variables, configuration
- 02-generic: Resets, normalize
- 03-elements: Base HTML styling
- 04-components: Component-specific styles
- 05-utilities: Helper classes

### JavaScript Architecture

**Main App Class** ([src/assets/js/app.js](src/assets/js/app.js))
- Extends `AppHelpers` base class
- Singleton pattern: `window.app`
- Initialization in `loadTheApp()`:
  - Mobile menu (mmenu-light)
  - Sticky header
  - Add to cart functionality
  - Dropdowns, modals, collapse
  - Wishlist listeners
  - Tooltip initialization
- Dispatches `theme::ready` event when loaded
- Uses Salla's global `salla` object for API interactions

**Key Dependencies:**
- `mmenu-light`: Mobile navigation
- `sweetalert2`: Modal dialogs
- `fslightbox`: Image lightbox
- `animejs`: Animations
- Salla's proprietary libraries (`@salla.sa/twilight-components`)

### Twig Templates

**Master Layout** ([src/views/layouts/master.twig](src/views/layouts/master.twig))
- Contains comprehensive documentation of available variables in comments
- Key globals: `store`, `theme`, `user`
- `theme.settings.set()` / `theme.settings.get()`: Global variable management
- Includes `theme.color.darker()` / `theme.color.lighter()` helpers

**Salla Theme Features** (defined in [twilight.json](twilight.json)):
- Pre-defined components: mega-menu, fonts, color, breadcrumb, filters
- Home page components: featured-products, fixed-banner, products-slider, photos-slider, parallax-background, testimonials, youtube, store-features
- Custom components in `src/views/components/home/`

## Theme Customization

### twilight.json Configuration
- Theme name: "Volt" (Arabic: "فولت")
- Enabled features listed in `features` array
- Settings for component customization (dropdowns, images, etc.)
- Repository: https://github.com/musta20/volt

### Store Integration
- Development store: "volt-store"
- Uses Salla Partner Portal for theme management
- Requires partner account at [Salla Partners Portal](https://salla.partners/)

## Important Notes

### Salla Platform Specifics
- All data comes from Salla's backend APIs (products, cart, user, etc.)
- Use global `salla` object for API interactions:
  - `salla.comment.event.onAdded()`
  - `salla.log()`
  - Event system for cart, wishlist, etc.
- Twig variables are documented in [master.twig](src/views/layouts/master.twig) header comments

### File Modification Guidelines
- **Twig files**: All variables and structure documented in template comments
- **Webpack entry points**: Changes require updating [webpack.config.js](webpack.config.js)
- **Styles**: Follow ITCSS methodology in styles/ folders
- **JavaScript**: Extend the App class or create page-specific modules

### Localization
- Translations in `src/locales/ar.json` and `src/locales/en.json`
- Theme supports RTL/LTR via `theme.is_rtl`
- Arabic numbers support: `store.settings.arabic_numbers_enabled`

### Build Output
- Public directory: `public/`
- Assets are compiled to `public/app.css`, `public/app.js`, etc.
- Images copied from `src/assets/images/` to `public/images/`
- Build uses content hashing for JS chunks: `[name].[contenthash].js`

## Resources

- [Salla Theme Documentation](https://docs.salla.dev/?nav=01HNFTD5Y5ESFQS3P9MJ0721VM)
- [Twig Template Engine](https://twig.symfony.com/)
- [Twilight Theme Engine](https://docs.salla.dev/?nav=01HNFTD5Y5ESFQS3P9MJ0721VM)
- Repository: https://github.com/musta20/volt
- Based on: [Theme Raed](https://github.com/SallaApp/theme-raed)
