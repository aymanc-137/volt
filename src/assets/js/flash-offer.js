import BasePage from './base-page';

class FlashOffer extends BasePage {
    async onReady() {
        const container = document.querySelector('#flash-offer');

        if (!container || !salla.url.is_page('product.index')) {
            return;
        }

        const cat_id = container.dataset.catid;

        try {
            // TODO: Uncomment after publish - Salla API call
            // const res = await salla.api.request('component/list', { params: { paths: ['home.flash-offer'] } });
            // const components = res.data;

            // TEST: Mock data for testing (remove after publish)
            const components = [{
                "component": {
                    "key": "5b0f0805-0f41-444f-a50d-610796cbdb9f",
                    "badge_text": "عرض محدود الوقت",
                    "title": "عرض حصري",
                    "enable_gradient_word": false,
                    "gradient_word": "",
                    "description": "احصل على أفضل العروض اليوم فقط",
                    "url": "تسوق الآن",
                    "image": "https://images.unsplash.com/photo-1601918774946-25832a4be0d8?q=80&w=900&auto=format&fit=crop",
                    "product": [
                        {
                            "id": 123456,
                            "name": "منتج تجريبي",
                            "url": "https://example.com/product",
                            "discount_ends": "2025-12-31 23:59:59"
                        }
                    ],
                    "slas_hbg": false,
                    "slas_hbg_size": "20",
                    "slas_hbg_use_primary_color": false,
                    "slas_hbg_color": "#000000",
                    "marquee": false,
                    "marqueetext": " سرعة /// أداء /// تحكم ",
                    "marquee_text_position": "both",
                    "marquee_is_moving": true,
                    "marquee_text_size": "8",
                    "enable_border": false,
                    "enable_glow": false,
                    "show_in_category_page": true,
                    "target_category": [
                        {
                            "id": 1194286336,
                            "url": "https://salla.design/dev-pbdsq67yexku5kq3/بحث/c1194286336",
                            "icon": "sicon-store",
                            "name": "بحث",
                            "image": null,
                            "sub_categories": null
                        }
                    ]
                },
                "position": 1
            }];

            console.log('Flash Offer API response:', components);

            components.forEach(item => {
                const component = item.component;
                
                // Check if this component is set to show in category page
                if (!component.show_in_category_page) {
                    return;
                }

                // Check if target category matches current category
                const targetCategory = component.target_category;
                const targetCatId = targetCategory?.[0] || targetCategory?.id;
                console.log('targetCatId', targetCatId.id);
                console.log('cat_id', cat_id);
                
                if (targetCatId.id != cat_id) {
                    return;
                }

                // Build and render the component
                this.renderComponent(container, component, item.position);
            });

        } catch (e) {
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
