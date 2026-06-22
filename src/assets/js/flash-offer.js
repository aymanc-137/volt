import BasePage from './base-page';
import { log, warn } from './debug';

class FlashOffer extends BasePage {
    async onReady() {
        const LOG = '[FlashOffer]';
        const container = document.querySelector('#flash-offer');

        if (!container) {
            log(LOG, 'no #flash-offer placeholder on page, skipping');
            return;
        }
        if (!salla.url.is_page('product.index')) {
            log(LOG, 'not on product.index page, skipping');
            return;
        }

        const cat_id = container.dataset.catid;
        log(LOG, 'current category id:', cat_id);

        try {
            const res = await salla.api.request('component/list', { params: { paths: ['home.flash-offer'] } });
            const components = res.data;

            log(LOG, 'API response:', components);

            if (!Array.isArray(components) || !components.length) {
                warn(LOG, 'no flash-offer components returned');
                return;
            }

            components.forEach((item, idx) => {
                const component = item.component;
                if (!component) {
                    warn(LOG, `item[${idx}] has no .component`, item);
                    return;
                }

                if (!component.show_in_category_page) {
                    log(LOG, `item[${idx}] show_in_category_page is off, skipping`);
                    return;
                }

                // target_category is a dropdown-list field — Salla delivers it as an array
                // even though multichoice is false. Handle both shapes defensively.
                const targetField = component.target_category;
                const targetCat = Array.isArray(targetField) ? targetField[0] : targetField;
                const targetCatId = targetCat?.id ?? targetCat?.value ?? targetCat;

                log(LOG, `item[${idx}] target:`, { targetCatId, cat_id });

                if (!targetCatId) {
                    warn(LOG, `item[${idx}] has no target_category set, skipping`);
                    return;
                }
                if (String(targetCatId) !== String(cat_id)) {
                    log(LOG, `item[${idx}] target ${targetCatId} ≠ current ${cat_id}, skipping`);
                    return;
                }

                log(LOG, `item[${idx}] matched — rendering`);
                container.classList.remove('hidden');
                this.renderComponent(container, component, item.position);
            });

        } catch (e) {
            console.error(LOG, 'onReady threw:', e);
            salla.logger.error(e);
        }
    }

    // Category-page layout: a full-width, short bar with the component image as a
    // background, a black overlay, text on one side and the countdown on the other.
    // (The home-page layout lives in flash-offer.twig and is intentionally different.)
    renderComponent(container, component, position) {
        const has_gradient_word = component.enable_gradient_word && component.gradient_word;
        const flash_offer_title_id = has_gradient_word ? `flash-offer-title-${position}` : null;

        const product = component.product?.[0] || {};
        const productUrl = product.url || '#';
        const discountEnds = product.discount_ends || '';
        const bgImage = component.image || '';

        const html = `
            <section class="flash-offer-cat"${bgImage ? ` style="background-image:url('${bgImage}')"` : ''}>
                <div class="flash-offer-cat__overlay"></div>
                <div class="flash-offer-cat__inner container">
                    <div class="flash-offer-cat__text">
                        ${component.badge_text ? `<p class="flash-offer-cat__badge">${component.badge_text}</p>` : ''}
                        ${component.title ? `<h2 class="flash-offer-cat__title font-alshohadaa"${flash_offer_title_id ? ` id="${flash_offer_title_id}"` : ''}>${component.title}</h2>` : ''}
                        ${component.description ? `<p class="flash-offer-cat__desc">${component.description}</p>` : ''}
                        ${component.url ? `<a class="flash-offer-cat__btn" href="${productUrl}">${component.url}</a>` : ''}
                    </div>
                    <div class="flash-offer-cat__timer">
                        <salla-count-down
                            date="${discountEnds}"
                            end-of-day="true"
                            boxed="true"
                            labeled="true">
                        </salla-count-down>
                    </div>
                </div>
            </section>
        `;

        container.innerHTML = html;
        container.style.display = 'block';

        // Apply gradient word effect if enabled
        if (has_gradient_word) {
            this.applyGradientWord(flash_offer_title_id, component.gradient_word);
        }
    }

    applyGradientWord(titleId, gradientWord) {
        setTimeout(() => {
            const titleEl = document.getElementById(titleId);
            if (titleEl && !titleEl.dataset.gradientApplied) {
                const word = gradientWord.trim();
                if (word.length) {
                    const regex = new RegExp('(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                    titleEl.innerHTML = titleEl.innerHTML.replace(
                        regex,
                        '<span class="bg-gradient-to-r from-primary to-scandary bg-clip-text text-transparent">$1</span>'
                    );
                    titleEl.dataset.gradientApplied = 'true';
                }
            }
        }, 100);
    }
}

FlashOffer.initiateWhenReady(['product.index']);

export default FlashOffer;
