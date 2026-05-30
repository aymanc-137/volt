import BasePage from './base-page';

/**
 * Product Tabs
 * ------------
 * Renders per-product content tabs on the single product page. The tab content
 * lives in the `home.product-tabs` component (a data-only component configured
 * once in the theme editor, populated from the Tab Builder tool in /worker).
 *
 * Tabs do NOT hide/show content — every section is stacked normally in the page,
 * and clicking a tab smooth-scrolls to its section. A scroll-spy keeps the active
 * tab in sync with whichever section is in view.
 */
class ProductTabs extends BasePage {
    async onReady() {
        const LOG = '[ProductTabs]';
        const mount = document.querySelector('#product-tabs');
        if (!mount) { return; }
        if (!salla.url.is_page('product.single')) { return; }

        const productId = mount.dataset.productId;
        console.log(LOG, 'product id:', productId);

        try {
            const res = await salla.api.request('component/list', { params: { paths: ['home.product-tabs'] } });
            const components = res.data;
            if (!Array.isArray(components) || !components.length) {
                console.warn(LOG, 'no product-tabs component returned');
                return;
            }

            const component = components[0].component;
            const sticky = component?.tabs_sticky !== false;
            const collection = component?.tabs_data || component?.['tabs_data'] || [];
            if (!Array.isArray(collection) || !collection.length) {
                console.warn(LOG, 'component has no tabs_data items');
                return;
            }

            // Find the collection item whose product matches the current product
            const match = collection.find(item => {
                const prodField = item.product ?? item['tabs_data.product'];
                const prod = Array.isArray(prodField) ? prodField[0] : prodField;
                const pid = prod?.id ?? prod?.value ?? prod;
                return pid != null && String(pid) === String(productId);
            });

            if (!match) {
                console.log(LOG, 'no tabs configured for this product');
                return;
            }

            const rawJson = match.tabs_json ?? match['tabs_data.tabs_json'] ?? '{"tabs":[]}';
            let parsed;
            try {
                parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
            } catch (e) {
                console.error(LOG, 'invalid tabs JSON:', e, rawJson);
                return;
            }

            const tabs = (parsed && Array.isArray(parsed.tabs)) ? parsed.tabs : [];
            const renderable = tabs.filter(t => t && t.type && this.hasContent(t));
            if (!renderable.length) {
                console.warn(LOG, 'no renderable tabs');
                return;
            }

            // Unhide BEFORE rendering so the sticky bar can be measured with a
            // real layout (a display:none element reports zero rects).
            mount.classList.remove('hidden');
            this.render(mount, renderable, sticky, productId);
            console.log(LOG, 'rendered', renderable.length, 'tabs');
        } catch (e) {
            console.error(LOG, 'onReady threw:', e);
            salla.logger.error(e);
        }
    }

    hasContent(tab) {
        switch (tab.type) {
            case 'about': return !!(tab.content && String(tab.content).trim());
            case 'faq':   return Array.isArray(tab.items) && tab.items.some(i => i && (i.q || i.a));
            case 'specs': return Array.isArray(tab.rows) && tab.rows.some(r => r && (r.key || r.value));
            case 'media': return Array.isArray(tab.items) && tab.items.some(i => i && i.url);
            case 'howto': return Array.isArray(tab.steps) && tab.steps.some(s => s && (s.title || s.text || s.image));
            default: return false;
        }
    }

    render(mount, tabs, sticky, productId) {
        const uid = 'ptabs-' + productId;

        const barButtons = tabs.map((tab, i) =>
            `<button type="button" class="product-tabs__tab ${i === 0 ? 'is-active' : ''}"
                     data-tab-target="${uid}-${i}" role="tab">${this.escapeHtml(tab.title || this.defaultTitle(tab.type))}</button>`
        ).join('');

        const sections = tabs.map((tab, i) =>
            `<section id="${uid}-${i}" class="product-tabs__section" data-tab-section="${i}">
                <h2 class="product-tabs__section-title">${this.escapeHtml(tab.title || this.defaultTitle(tab.type))}</h2>
                <div class="product-tabs__section-body">${this.renderTab(tab)}</div>
            </section>`
        ).join('');

        mount.innerHTML = `
            <div class="product-tabs__bar ${sticky ? 'product-tabs__bar--sticky' : ''}" role="tablist" data-tabs-bar>
                <div class="product-tabs__bar-inner">${barButtons}</div>
            </div>
            <div class="product-tabs__sections">${sections}</div>
        `;

        this.wireInteractions(mount);
    }

    wireInteractions(mount) {
        const bar = mount.querySelector('[data-tabs-bar]');
        const tabButtons = Array.prototype.slice.call(mount.querySelectorAll('.product-tabs__tab'));
        const sections = Array.prototype.slice.call(mount.querySelectorAll('.product-tabs__section'));

        // Click → smooth scroll to section (offset for the pinned bar + sticky header)
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.tabTarget);
                if (!target) return;
                const barH = bar ? bar.offsetHeight : 0;
                const top = target.getBoundingClientRect().top + window.pageYOffset - barH - this.headerOffset() - 12;
                window.scrollTo({ top, behavior: 'smooth' });
            });
        });

        if (bar) this.setupSticky(bar);

        // Scroll-spy → highlight the section currently in view
        if ('IntersectionObserver' in window && sections.length) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    tabButtons.forEach(b => {
                        const isActive = b.dataset.tabTarget === entry.target.id;
                        b.classList.toggle('is-active', isActive);
                        if (isActive) this.ensureVisibleInBar(b);
                    });
                });
            }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
            sections.forEach(s => observer.observe(s));
        }
    }

    // JS sticky: pin the bar with position:fixed once the page scrolls past it.
    // This avoids `position: sticky` failing inside ancestors that establish a
    // scroll/transform containing block (overflow-x:hidden on body, etc.).
    setupSticky(bar) {
        if (!bar.classList.contains('product-tabs__bar--sticky')) return;

        const placeholder = document.createElement('div');
        placeholder.className = 'product-tabs__bar-placeholder';
        let pinned = false;
        let startY = 0;

        const measure = () => {
            // When pinned, the placeholder occupies the bar's natural slot.
            const ref = pinned ? placeholder : bar;
            startY = ref.getBoundingClientRect().top + window.pageYOffset;
        };

        const pin = () => {
            if (!pinned) {
                placeholder.style.height = bar.offsetHeight + 'px';
                bar.parentNode.insertBefore(placeholder, bar);
                bar.classList.add('is-pinned');
                pinned = true;
            }
            // Keep tucked below the sticky site header while it is revealed
            bar.style.top = this.headerOffset() + 'px';
        };

        const unpin = () => {
            if (!pinned) return;
            bar.classList.remove('is-pinned');
            bar.style.top = '';
            if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
            pinned = false;
        };

        const onScroll = () => {
            // startY > 0 guards against a bad (zero) measurement pinning at load
            if (startY > 0 && window.pageYOffset >= startY) pin();
            else unpin();
        };

        const remeasure = () => { unpin(); measure(); onScroll(); };

        measure();
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', remeasure, { passive: true });
        // Layout above the bar can shift as images load — re-measure once settled
        window.addEventListener('load', remeasure, { passive: true });
    }

    // Height occupied by the site's sticky/fixed header at the top of the viewport
    // (0 when no fixed header is currently shown).
    headerOffset() {
        const inner = document.querySelector('#mainnav .inner') || document.querySelector('.main-nav-container .inner');
        if (!inner) return 0;
        if (getComputedStyle(inner).position !== 'fixed') return 0;
        const rect = inner.getBoundingClientRect();
        // Only count it if it is actually pinned to the top of the viewport
        return rect.top <= 1 ? Math.max(0, rect.bottom) : 0;
    }

    // Keep the active tab scrolled into view inside a horizontally-scrolling bar
    ensureVisibleInBar(btn) {
        const inner = btn.parentElement;
        if (!inner || inner.scrollWidth <= inner.clientWidth) return;
        const btnLeft = btn.offsetLeft;
        const btnRight = btnLeft + btn.offsetWidth;
        if (btnLeft < inner.scrollLeft) {
            inner.scrollTo({ left: btnLeft - 16, behavior: 'smooth' });
        } else if (btnRight > inner.scrollLeft + inner.clientWidth) {
            inner.scrollTo({ left: btnRight - inner.clientWidth + 16, behavior: 'smooth' });
        }
    }

    // ── Per-type renderers ────────────────────────────────────────────────────

    renderTab(tab) {
        switch (tab.type) {
            case 'about': return this.renderAbout(tab);
            case 'faq':   return this.renderFaq(tab);
            case 'specs': return this.renderSpecs(tab);
            case 'media': return this.renderMedia(tab);
            case 'howto': return this.renderHowTo(tab);
            default: return '';
        }
    }

    renderAbout(tab) {
        // Merchant-authored HTML, injected as-is
        return `<div class="ptab-about">${tab.content || ''}</div>`;
    }

    renderFaq(tab) {
        const items = (tab.items || []).filter(i => i && (i.q || i.a)).map((i, idx) => `
            <details class="ptab-faq__item" ${idx === 0 ? 'open' : ''}>
                <summary class="ptab-faq__q">${this.escapeHtml(i.q || '')}</summary>
                <div class="ptab-faq__a">${this.escapeHtml(i.a || '').replace(/\n/g, '<br>')}</div>
            </details>
        `).join('');
        return `<div class="ptab-faq">${items}</div>`;
    }

    renderSpecs(tab) {
        const rows = (tab.rows || []).filter(r => r && (r.key || r.value)).map(r => `
            <tr>
                <th>${this.escapeHtml(r.key || '')}</th>
                <td>${this.escapeHtml(r.value || '')}</td>
            </tr>
        `).join('');
        return `<table class="ptab-specs"><tbody>${rows}</tbody></table>`;
    }

    renderMedia(tab) {
        const items = (tab.items || []).filter(i => i && i.url).map(i => {
            const caption = i.caption ? `<figcaption class="ptab-media__cap">${this.escapeHtml(i.caption)}</figcaption>` : '';
            let media;
            if (i.kind === 'video') {
                media = this.renderVideo(i.url);
            } else {
                media = `<img loading="lazy" src="${this.escapeAttr(i.url)}" alt="${this.escapeAttr(i.caption || '')}">`;
            }
            return `<figure class="ptab-media__item">${media}${caption}</figure>`;
        }).join('');
        return `<div class="ptab-media">${items}</div>`;
    }

    renderVideo(url) {
        const yt = this.youtubeId(url);
        if (yt) {
            return `<div class="ptab-media__video"><iframe src="https://www.youtube.com/embed/${yt}"
                        title="video" frameborder="0" loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen></iframe></div>`;
        }
        return `<div class="ptab-media__video"><video src="${this.escapeAttr(url)}" controls playsinline preload="metadata"></video></div>`;
    }

    renderHowTo(tab) {
        const steps = (tab.steps || []).filter(s => s && (s.title || s.text || s.image)).map((s, idx) => `
            <li class="ptab-howto__step">
                <div class="ptab-howto__num">${idx + 1}</div>
                <div class="ptab-howto__content">
                    ${s.title ? `<h3 class="ptab-howto__title">${this.escapeHtml(s.title)}</h3>` : ''}
                    ${s.text ? `<p class="ptab-howto__text">${this.escapeHtml(s.text).replace(/\n/g, '<br>')}</p>` : ''}
                    ${s.image ? `<img class="ptab-howto__img" loading="lazy" src="${this.escapeAttr(s.image)}" alt="${this.escapeAttr(s.title || '')}">` : ''}
                </div>
            </li>
        `).join('');
        return `<ol class="ptab-howto">${steps}</ol>`;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    youtubeId(url) {
        const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
        return m ? m[1] : null;
    }

    defaultTitle(type) {
        return {
            about: 'عن المنتج',
            faq: 'الأسئلة الشائعة',
            specs: 'المواصفات',
            media: 'آراء العملاء',
            howto: 'طريقة الاستخدام',
        }[type] || '';
    }

    escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    escapeAttr(value) {
        return this.escapeHtml(value).replace(/`/g, '&#096;');
    }
}

ProductTabs.initiateWhenReady(['product.single']);

export default ProductTabs;
