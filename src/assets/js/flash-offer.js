import BasePage from './base-page';

class FlashOffer extends BasePage {
    async onReady() {
        const LOG = '[FlashOffer]';
        const container = document.querySelector('#flash-offer');

        if (!container) {
            console.log(LOG, 'no #flash-offer placeholder on page, skipping');
            return;
        }
        if (!salla.url.is_page('product.index')) {
            console.log(LOG, 'not on product.index page, skipping');
            return;
        }

        const cat_id = container.dataset.catid;
        console.log(LOG, 'current category id:', cat_id);

        try {
            const res = await salla.api.request('component/list', { params: { paths: ['home.flash-offer'] } });
            const components = res.data;

            console.log(LOG, 'API response:', components);

            if (!Array.isArray(components) || !components.length) {
                console.warn(LOG, 'no flash-offer components returned');
                return;
            }

            components.forEach((item, idx) => {
                const component = item.component;
                if (!component) {
                    console.warn(LOG, `item[${idx}] has no .component`, item);
                    return;
                }

                if (!component.show_in_category_page) {
                    console.log(LOG, `item[${idx}] show_in_category_page is off, skipping`);
                    return;
                }

                // target_category is a dropdown-list field — Salla delivers it as an array
                // even though multichoice is false. Handle both shapes defensively.
                const targetField = component.target_category;
                const targetCat = Array.isArray(targetField) ? targetField[0] : targetField;
                const targetCatId = targetCat?.id ?? targetCat?.value ?? targetCat;

                console.log(LOG, `item[${idx}] target:`, { targetCatId, cat_id });

                if (!targetCatId) {
                    console.warn(LOG, `item[${idx}] has no target_category set, skipping`);
                    return;
                }
                if (String(targetCatId) !== String(cat_id)) {
                    console.log(LOG, `item[${idx}] target ${targetCatId} ≠ current ${cat_id}, skipping`);
                    return;
                }

                console.log(LOG, `item[${idx}] matched — rendering`);
                container.classList.remove('hidden');
                this.renderComponent(container, component, item.position);
            });

        } catch (e) {
            console.error(LOG, 'onReady threw:', e);
            salla.logger.error(e);
        }
    }

    renderComponent(container, component, position) {
        const slashbg = component.slas_hbg || false;
        const marquee = component.marquee || false;
        const marqueetext = component.marqueetext || " سرعة /// أداء /// تحكم ";
        const enable_border = component.enable_border || false;
        const enable_glow = component.enable_glow || false;
        const marquee_text_position = component.marquee_text_position || 'both';
        const marquee_is_moving = component.marquee_is_moving;
        const marquee_text_size = component.marquee_text_size || '8';
        const slas_hbg_size = component.slas_hbg_size || '20';
        const slas_hbg_use_primary_color = component.slas_hbg_use_primary_color;
        const slas_hbg_color = (component.slas_hbg_color || '#000000') + '1A';
        const has_gradient_word = component.enable_gradient_word && component.gradient_word;
        const flash_offer_title_id = has_gradient_word ? `flash-offer-title-${position}` : null;

        // Build marquee HTML
        let marqueeTopHtml = '';
        let marqueeBottomHtml = '';
        
        if (marquee) {
            const marqueeContent = `
                <span class="font-alshohadaa font-bold display-text whitespace-nowrap px-4">
                    ${marqueetext}&nbsp;&nbsp;&nbsp; ${marqueetext}&nbsp;&nbsp;&nbsp; ${marqueetext}&nbsp;&nbsp;&nbsp; ${marqueetext}
                </span>
                <span class="font-alshohadaa font-bold display-text whitespace-nowrap px-4">
                    ${marqueetext}&nbsp;&nbsp;&nbsp;${marqueetext}&nbsp;&nbsp;&nbsp; ${marqueetext}&nbsp;&nbsp;&nbsp; ${marqueetext}
                </span>
            `;

            if (marquee_text_position === 'top' || marquee_text_position === 'both') {
                marqueeTopHtml = `
                    <div class="styleish-text absolute top-10 left-0 w-full opacity-10 pointer-events-none select-none overflow-hidden" dir="ltr">
                        <div style="font-size: ${marquee_text_size}rem; line-height:1;" class="${marquee_is_moving ? 'marquee-reverse-sections' : ''} flex whitespace-nowrap w-max">
                            ${marqueeContent}
                        </div>
                    </div>
                `;
            }

            if (marquee_text_position === 'bottom' || marquee_text_position === 'both') {
                marqueeBottomHtml = `
                    <div class="styleish-text absolute bottom-10 left-0 w-full opacity-10 pointer-events-none select-none overflow-hidden" dir="ltr">
                        <div style="font-size: ${marquee_text_size}rem; line-height:1;" class="${marquee_is_moving ? 'marquee-content-sections' : ''} flex whitespace-nowrap w-max">
                            ${marqueeContent}
                        </div>
                    </div>
                `;
            }
        }

        // Build glow HTML
        let glowHtml = '';
        if (enable_glow) {
            glowHtml = `
                <div class="absolute top-[15%] left-[25%] w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none" style="background-color: var(--color-primary);"></div>
                <div class="absolute bottom-[15%] right-[25%] w-56 h-56 rounded-full blur-3xl opacity-60 pointer-events-none" style="background-color: var(--color-scandary);"></div>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full blur-3xl opacity-60 pointer-events-none" style="background-color: var(--color-primary);"></div>
            `;
        }

        // Build section classes
        const sectionClasses = [
            'flash-offer',
            'z-10',
            'overflow-hidden',
            'relative',
            enable_border ? 'border-y border-[var(--color-primary)]' : '',
            slashbg ? `slash-bg-${position} dynamic-bg-color` : ''
        ].filter(Boolean).join(' ');

        // Build style for slash background
        let styleHtml = '';
        if (slashbg) {
            if (slas_hbg_use_primary_color) {
                styleHtml = `
                    <style>
                        .slash-bg-${position} {
                            background: linear-gradient(135deg, var(--color-primary-10) 25%, rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 0) 50%, var(--color-primary-10) 50%, var(--color-primary-10) 75%, rgba(0, 0, 0, 0) 75%);
                            background-size: ${slas_hbg_size}px ${slas_hbg_size}px;
                        }
                    </style>
                `;
            } else {
                styleHtml = `
                    <style>
                        .slash-bg-${position} {
                            background: linear-gradient(135deg, ${slas_hbg_color} 25%, rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 0) 50%, ${slas_hbg_color} 50%, ${slas_hbg_color} 75%, rgba(0, 0, 0, 0) 75%);
                            background-size: ${slas_hbg_size}px ${slas_hbg_size}px;
                        }
                    </style>
                `;
            }
        }

        // Get product info
        const product = component.product?.[0] || {};
        const productUrl = product.url || '#';
        const discountEnds = product.discount_ends || '';

        // Build complete HTML
        const html = `
            <section class="${sectionClasses}">
                ${glowHtml}
                ${marqueeTopHtml}
                ${marqueeBottomHtml}
                <div class="flash-offer-container shadow-pulse">
                    <img src="${component.image}" alt="${component.title}">
                    <div class="flash-offer-content w-1/2 p-5 flex flex-col justify-evenly">
                        <p class="flash-offer-badge">${component.badge_text}</p>
                        <h2 class="flash-offer-title font-alshohadaa text-2xl dynamic-text-color"${flash_offer_title_id ? ` id="${flash_offer_title_id}"` : ''}>${component.title}</h2>
                        
                        <div class="w-full mx-auto flash-offer-count-down">
                            <salla-count-down
                                date="${discountEnds}"
                                end-of-day="true"
                                boxed="true"
                                labeled="true">
                            </salla-count-down>
                        </div>

                        <p class="flash-offer-description dynamic-text-color">${component.description}</p>
                        
                        <salla-button class="volt" href="${productUrl}" color="primary" class="btn--rounded-full !text-white">
                            ${component.url}
                        </salla-button>
                    </div>
                </div>
            </section>
            ${styleHtml}
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
