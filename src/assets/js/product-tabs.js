import BasePage from './base-page';

/**
 * Product Tabs — interaction only
 * -------------------------------
 * The tabs are rendered server-side by `views/components/home/product-tabs.twig`
 * (placed on the product page via the editor). This script no longer fetches or
 * builds anything; it only wires behaviour onto that markup: a sticky bar, a
 * scroll-spy that highlights the section in view, and click-to-smooth-scroll.
 *
 * Tabs do NOT hide/show content — every section is stacked normally in the page,
 * so with JS disabled the content is still fully readable; the bar just stops
 * being interactive.
 */
class ProductTabs extends BasePage {
    onReady() {
        if (!salla.url.is_page('product.single')) return;
        const mount = document.querySelector('.product-tabs');
        if (!mount) return;

        // If the description was moved below (product_description_position_under),
        // fold it in as the first tab, then wire interactions over everything.
        this.foldInDescription(mount);
        this.wireInteractions(mount);
    }

    // Optional: when `#product-description-under` is present (the merchant turned
    // on "description below"), inject it as the first tab of the already-rendered
    // bar and drop the standalone block so the content is not shown twice. No-op
    // when the block is absent or empty.
    foldInDescription(mount) {
        const el = document.querySelector('#product-description-under');
        if (!el) return;

        const contentEl = el.querySelector('[data-description-content]');
        const content = contentEl ? contentEl.innerHTML.trim() : '';
        const barInner = mount.querySelector('.product-tabs__bar-inner');
        const sections = mount.querySelector('.product-tabs__sections');

        if (content && barInner && sections) {
            const title = el.dataset.descriptionTitle || 'وصف المنتج';
            const firstSection = mount.querySelector('.product-tabs__section');
            const base = (firstSection?.id || 'ptabs-0').replace(/-\d+$/, '');
            const id = base + '-desc';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'product-tabs__tab';
            btn.setAttribute('data-tab-target', id);
            btn.setAttribute('role', 'tab');
            btn.textContent = title;

            const section = document.createElement('section');
            section.id = id;
            section.className = 'product-tabs__section';
            section.innerHTML =
                `<h2 class="product-tabs__section-title">${this.escapeHtml(title)}</h2>` +
                `<div class="product-tabs__section-body"><div class="ptab-about">${content}</div></div>`;

            barInner.insertBefore(btn, barInner.firstChild);
            sections.insertBefore(section, sections.firstChild);

            // The description is now first — make it the active tab.
            barInner.querySelectorAll('.product-tabs__tab')
                .forEach((b, i) => b.classList.toggle('is-active', i === 0));
        }

        el.remove();
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

        // Scroll-spy → highlight the section currently in view.
        // Deterministic: pick the last section whose top has scrolled past a
        // reference line just below the pinned bar. An IntersectionObserver band
        // matched zero or multiple sections depending on their heights, which made
        // the active tab flicker; this always resolves to exactly one section.
        if (!sections.length) return;

        let activeId = null;
        const setActive = (id) => {
            if (id === activeId) return;
            activeId = id;
            tabButtons.forEach(b => {
                const isActive = b.dataset.tabTarget === id;
                b.classList.toggle('is-active', isActive);
                if (isActive) this.ensureVisibleInBar(b);
            });
        };

        const spy = () => {
            const line = (bar ? bar.offsetHeight : 0) + this.headerOffset() + 24;

            // At the very bottom of the page, force the last section active so the
            // final (often short) tab can always be reached.
            if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 2) {
                setActive(sections[sections.length - 1].id);
                return;
            }

            let current = sections[0];
            for (const s of sections) {
                if (s.getBoundingClientRect().top - line <= 0) current = s;
                else break;
            }
            setActive(current.id);
        };

        spy();
        window.addEventListener('scroll', spy, { passive: true });
        window.addEventListener('resize', spy, { passive: true });
        window.addEventListener('load', spy, { passive: true });
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

    escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

ProductTabs.initiateWhenReady(['product.single']);

export default ProductTabs;
