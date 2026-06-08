/**
 * Volt Drawer Menu — a fully self-contained off-canvas (drawer) navigation.
 *
 * This is intentionally isolated from the native `<custom-main-menu>` /
 * mmenu-light setup so the two never conflict:
 *   - its own custom element (<volt-drawer-menu>)
 *   - its own JS (this file) and SCSS (04-components/volt-menu.scss)
 *   - its own DOM ids/classes (all prefixed `volt-menu__`)
 *   - visibility is driven by a class toggle, NOT a viewport media query,
 *     so the drawer works identically at every screen width.
 *
 * Rendered (instead of the native menu) only when the `enable_drawer_menu`
 * theme setting is on — see header.twig.
 */
class VoltDrawerMenu extends HTMLElement {
    connectedCallback() {
        salla.onReady()
            .then(() => salla.lang.onLoaded())
            .then(() => {
                this.isRtl = !!salla.config.get('theme.is_rtl');
                this.title = salla.lang.get('blocks.header.main_menu');
                this.displayAllText = salla.lang.get('blocks.home.display_all');
                this.closeText = salla.lang.get('common.elements.close') || 'Close';
                return salla.api.component.getMenus();
            })
            .then(({ data }) => {
                this.menus = data || [];
                this.render();
                this.bindEvents();
            })
            .catch((error) => salla.logger.error('volt-drawer-menu::Error fetching menus', error));
    }

    /**
     * @param {Object} menu
     * @returns {Boolean}
     */
    hasChildren(menu) {
        return menu?.children?.length > 0;
    }

    /**
     * Render a single menu node (recurses for children as an accordion).
     * @param {Object} menu
     * @returns {String}
     */
    renderItem(menu) {
        const image = menu.image
            ? `<img src="${menu.image}" class="volt-menu__img" width="40" height="40" alt="${menu.title || ''}" loading="lazy" />`
            : '';

        if (!this.hasChildren(menu)) {
            return `
            <li class="volt-menu__item" ${menu.attrs || ''}>
                <a class="volt-menu__link" href="${menu.url}" aria-label="${menu.title || 'category'}" ${menu.link_attrs || ''}>
                    ${image}<span>${menu.title || ''}</span>
                </a>
            </li>`;
        }

        return `
        <li class="volt-menu__item volt-menu__item--parent" ${menu.attrs || ''}>
            <button type="button" class="volt-menu__toggle" aria-expanded="false">
                <span class="volt-menu__toggle-label">${image}<span>${menu.title || ''}</span></span>
                <i class="volt-menu__chevron" aria-hidden="true"></i>
            </button>
            <ul class="volt-menu__submenu">
                <li class="volt-menu__item">
                    <a class="volt-menu__link volt-menu__link--all" href="${menu.url}">${this.displayAllText}</a>
                </li>
                ${menu.children.map((child) => this.renderItem(child)).join('')}
            </ul>
        </li>`;
    }

    render() {
        this.innerHTML = `
        <button type="button" class="volt-menu__trigger" aria-label="${this.title}" aria-haspopup="true" aria-expanded="false">
            <i class="sicon-menu" aria-hidden="true"></i>
        </button>
        <div class="volt-menu__drawer volt-menu__drawer--${this.isRtl ? 'rtl' : 'ltr'}" data-state="closed" hidden>
            <div class="volt-menu__backdrop" data-volt-close></div>
            <aside class="volt-menu__panel dynamic-bg-color dynamic-text-color" role="dialog" aria-modal="true" aria-label="${this.title}">
                <div class="volt-menu__head">
                    <span class="volt-menu__title">${this.title}</span>
                    <button type="button" class="volt-menu__close" data-volt-close aria-label="${this.closeText}">
                        <i class="sicon-cancel" aria-hidden="true"></i>
                    </button>
                </div>
                <nav class="volt-menu__nav">
                    <ul class="volt-menu__list">
                        ${this.menus.map((menu) => this.renderItem(menu)).join('')}
                    </ul>
                </nav>
            </aside>
        </div>`;
    }

    bindEvents() {
        this.drawer = this.querySelector('.volt-menu__drawer');
        this.trigger = this.querySelector('.volt-menu__trigger');

        this.trigger.addEventListener('click', () => this.open());
        this.querySelectorAll('[data-volt-close]').forEach((el) =>
            el.addEventListener('click', () => this.close())
        );

        // Accordion: expand/collapse a parent's submenu.
        this.querySelectorAll('.volt-menu__toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.volt-menu__item--parent');
                const expanded = item.classList.toggle('is-expanded');
                btn.setAttribute('aria-expanded', String(expanded));
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.drawer.dataset.state === 'open') this.close();
        });
    }

    open() {
        this.drawer.hidden = false;
        // Wait a frame so the un-hidden element can transition from its closed state.
        requestAnimationFrame(() => {
            this.drawer.dataset.state = 'open';
            this.drawer.classList.add('is-open');
        });
        this.trigger.setAttribute('aria-expanded', 'true');
        document.body.classList.add('volt-menu-open');
    }

    close() {
        this.drawer.dataset.state = 'closed';
        this.drawer.classList.remove('is-open');
        this.trigger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('volt-menu-open');
        // Hide only after the slide-out transition has finished.
        setTimeout(() => {
            if (this.drawer.dataset.state === 'closed') this.drawer.hidden = true;
        }, 350);
    }
}

customElements.define('volt-drawer-menu', VoltDrawerMenu);
