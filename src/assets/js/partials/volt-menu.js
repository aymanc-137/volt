/**
 * Volt Drawer Menu — a fully self-contained off-canvas (drawer) navigation with
 * sliding sub-panels (like mmenu-light's "slidingSubmenus", but dependency-free).
 *
 * Kept isolated from the native `<custom-main-menu>` / mmenu-light setup so the
 * two never conflict:
 *   - its own custom element (<volt-drawer-menu>)
 *   - its own JS (this file) and SCSS (04-components/volt-menu.scss)
 *   - its own DOM ids/classes (all prefixed `volt-menu__`)
 *   - open/closed + active-panel state is class-driven (no media queries), so it
 *     behaves identically at every screen width.
 *
 * Every sub-menu is rendered as a flat, absolutely-positioned panel that is a
 * direct child of the nav stage. Opening a parent slides its panel in over the
 * current one; "back" slides it out. Flattening the panels (instead of nesting
 * them) keeps positioning/scroll behaviour simple and predictable at any depth.
 *
 * Rendered (instead of the native menu) only for the "centered logo + drawer"
 * header layout (header_layout = 'centered_logo_drawer') — see header.twig.
 */
class VoltDrawerMenu extends HTMLElement {
    connectedCallback() {
        salla.onReady()
            .then(() => salla.lang.onLoaded())
            .then(() => {
                this.isRtl = !!salla.config.get('theme.is_rtl');
                this.title = salla.lang.get('blocks.header.main_menu');
                this.displayAllText = salla.lang.get('blocks.home.display_all');
                this.backText = this.isRtl ? 'رجوع' : 'Back';
                this.closeText = this.isRtl ? 'إغلاق' : 'Close';
                this.backIcon = this.isRtl ? 'sicon-arrow-right' : 'sicon-arrow-left';
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
     * Render one menu node.
     * - Leaf nodes return a simple link `<li>`.
     * - Parent nodes return a `<li>` whose button opens a dedicated sub-panel,
     *   and the sub-panel itself is pushed onto `this.subPanels` (flat list).
     * @param {Object} menu
     * @returns {String} the `<li>` markup for this node within its parent list
     */
    renderNode(menu) {
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

        const panelId = `volt-panel-${++this.panelSeq}`;
        const childItems = menu.children.map((child) => this.renderNode(child)).join('');

        this.subPanels.push(`
        <div class="volt-menu__panel-view dynamic-bg-color dynamic-text-color" id="${panelId}" role="group" aria-label="${menu.title || ''}">
            <div class="volt-menu__subhead">
                <button type="button" class="volt-menu__back" data-volt-back aria-label="${this.backText}">
                    <i class="${this.backIcon}" aria-hidden="true"></i>
                    <span>${menu.title || ''}</span>
                </button>
            </div>
            <ul class="volt-menu__list">
                <li class="volt-menu__item">
                    <a class="volt-menu__link volt-menu__link--all" href="${menu.url}">${this.displayAllText}</a>
                </li>
                ${childItems}
            </ul>
        </div>`);

        return `
        <li class="volt-menu__item volt-menu__item--parent" ${menu.attrs || ''}>
            <button type="button" class="volt-menu__toggle" data-volt-open="${panelId}" aria-haspopup="true">
                <span class="volt-menu__toggle-label">${image}<span>${menu.title || ''}</span></span>
                <i class="volt-menu__chevron" aria-hidden="true"></i>
            </button>
        </li>`;
    }

    render() {
        this.panelSeq = 0;
        this.subPanels = [];
        this.stack = [];

        const rootItems = this.menus.map((menu) => this.renderNode(menu)).join('');

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
                    <div class="volt-menu__panel-view is-active" data-root>
                        <ul class="volt-menu__list">${rootItems}</ul>
                    </div>
                    ${this.subPanels.join('')}
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
        this.querySelectorAll('[data-volt-open]').forEach((btn) =>
            btn.addEventListener('click', () => this.openPanel(btn.getAttribute('data-volt-open')))
        );
        this.querySelectorAll('[data-volt-back]').forEach((btn) =>
            btn.addEventListener('click', () => this.back())
        );

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || this.drawer.dataset.state !== 'open') return;
            // Escape backs out one level, then closes the drawer at the root.
            this.stack.length ? this.back() : this.close();
        });
    }

    openPanel(id) {
        const panel = this.querySelector(`#${id}`);
        if (!panel) return;
        this.stack.push(panel);
        panel.style.zIndex = String(10 + this.stack.length);
        panel.classList.add('is-active');
        const list = panel.querySelector('.volt-menu__list');
        if (list) list.scrollTop = 0;
    }

    back() {
        const panel = this.stack.pop();
        if (!panel) return;
        panel.classList.remove('is-active');
        panel.style.zIndex = '';
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
        setTimeout(() => {
            if (this.drawer.dataset.state !== 'closed') return;
            this.drawer.hidden = true;
            // Reset back to the root panel for the next open.
            while (this.stack.length) this.back();
        }, 350);
    }
}

customElements.define('volt-drawer-menu', VoltDrawerMenu);
