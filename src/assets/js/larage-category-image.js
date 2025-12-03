import BasePage from './base-page';

class LarageCategoryImage extends BasePage {
    async onReady() {
        const container = document.querySelector('#larage-category-image');

        if (!container || !salla.url.is_page('product.index')) {
            return;
        }

        const cat_id = container.dataset.catid;

        try {
            // TODO: Uncomment after publish - Salla API call
            // const res = await salla.api.request('component/list', { params: { paths: ['home.larage-category-image'] } });
            // const components = res.data;

            // TEST: External API call for testing (remove after publish)
           // const res = await fetch('https://api.npoint.io/229d91aac91ebb887a59');
           // const data = await res.json();
          //  const components = data.data;
            const components = [{"component":
                                        {"ar":{"title":"العنوان","sub_title":"العنوان الجانبي"},"key":"01dbcfa2-5e33-40f6-ac2f-89979591f8af","title":"العنوان","marquee":true,"slas_hbg":true,"sub_title":"العنوان الجانبي","categories":[{"ar":{"title":"قطع سيارات السرعة"},"link":"https://salla.design/dev-pbdsq67yexku5kq3/redirect/categories/1967275527","image":"https://cdn.files.salla.network/homepage/1573552885/12896eba-0f7b-423c-b05e-9e848cf1a544.webp","title":"قطع سيارات السرعة"},{"ar":{"title":"كفرات"},"link":"https://salla.design/dev-pbdsq67yexku5kq3/redirect/products/1958852814","image":"https://cdn.files.salla.network/homepage/1573552885/e40cf31c-113a-4572-82f1-cee5f237368d.webp","title":"كفرات"},{"ar":{"title":"ختر لون سيارتك"},"link":"https://salla.design/dev-pbdsq67yexku5kq3/redirect/products/1958852814","image":"https://cdn.files.salla.network/homepage/1573552885/10589b0a-3e53-4b52-b8fa-304f80ba6a22.webp","title":"ختر لون سيارتك"}],"enable_glow":false,"marqueetext":"سرعة /// أداء /// تحكم","enable_border":true,"slas_hbg_size":"80","slas_hbg_color":"#000000","target_category":[{"id":1967275527,"url":"https://salla.design/dev-pbdsq67yexku5kq3/المحرك/c1967275527","icon":"sicon-store","name":"المحرك","image":null,"sub_categories":null}],"marquee_is_moving":true,"marquee_text_size":"15","enable_gradient_word":false,"enable_gradient_title":false,"marquee_text_position":"top","show_in_category_page":true,"slas_hbg_use_primary_color":false}
                                    
        }];
            console.log('Test API response:', components);

            components.forEach(item => {
                const component = item.component;
                
                // Check if this component is set to show in category page
                if (!component.show_in_category_page) {
                    return;
                }

                // Check if target category matches current category
                const targetCategory = component.target_category;
                const targetCatId = targetCategory?.[0] || targetCategory?.id;
                console.log('targetCatId', targetCatId);
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
        const categories = component.categories || [];

        // Build marquee HTML
        let marqueeTopHtml = '';
        let marqueeBottomHtml = '';
        
        if (marquee) {
            const marqueeContent = `
                <span class="font-alshohadaa font-bold display-text whitespace-nowrap px-4 dynamic-text-color">
                    ${marqueetext}&nbsp;&nbsp;&nbsp; ${marqueetext}&nbsp;&nbsp;&nbsp; ${marqueetext}&nbsp;&nbsp;&nbsp; ${marqueetext}
                </span>
                <span class="font-alshohadaa font-bold display-text whitespace-nowrap px-4 dynamic-text-color">
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

        // Build title HTML
        let titleHtml = '';
        if (component.title) {
            let titleContent = component.title;
            if (component.enable_gradient_word && component.gradient_word) {
                titleContent = component.title.replace(
                    component.gradient_word,
                    `<span class="text-[var(--color-primary)]">${component.gradient_word}</span>`
                );
            }
            titleHtml = `
                <div class="mx-auto">
                    <h2 class="text-2xl font-alshohadaa md:text-4xl mb-6 text-center italic uppercase dynamic-text-color">
                        ${titleContent}
                    </h2>
                    <p class="mx-auto my-2 text-center text-xl dynamic-text-color">${component.sub_title || ''}</p>
                </div>
            `;
        }

        // Build categories grid HTML
        const gridCols = categories.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
        let categoriesHtml = categories.map((item, index) => `
            <div class="relative group -skew-x-3 hover:border-r-8 overflow-hidden h-full border-r-4 border-b border-[var(--color-scandary)] cursor-pointer">
                <a href="${item.url}" class="block h-full w-full">
                    <img src="${item.image}" class="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-110" alt="${item.title}">
                    <div class="absolute inset-0 bg-gradient-to-t from-[var(--color-light-page-background)] dark:from-[var(--color-dark-page-background)] to-transparent duration-300"></div>
                    <div class="absolute bottom-0 left-0 p-6 z-10">
                        <h3 class="text-3xl font-bold italic uppercase skew-x-[-5deg] dynamic-text-color">${item.title}</h3>
                    </div>
                </a>
            </div>
        `).join('');

        // Build section classes
        const sectionClasses = [
            'z-10',
            'overflow-hidden',
            enable_border ? 'border-y border-[var(--color-primary)]' : '',
            'py-20',
            'relative',
            slashbg ? `slash-bg-${position} dynamic-bg-color` : '',
            'pb-16'
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

        // Build complete HTML
        const html = `
            <section class="${sectionClasses}">
                ${glowHtml}
                ${marqueeTopHtml}
                ${marqueeBottomHtml}        
                <div class="container mx-auto px-6">
                    ${titleHtml}
                    <div class="grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-4 h-[400px]">
                        ${categoriesHtml}
                    </div>
                </div>
            </section>
            ${styleHtml}
        `;

        container.innerHTML = html;
        container.style.display = 'block';
    }
}

LarageCategoryImage.initiateWhenReady(['product.index']);
