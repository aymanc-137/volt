import BasePage from './base-page';

class CarSearchTree extends BasePage {
    async onReady() {
        const container = document.querySelector('#car-search-tree');

        if (!container || !salla.url.is_page('product.index')) {
            return;
        }

        const cat_id = container.dataset.catid;

        try {
            // TODO: Uncomment after publish - Salla API call
            // const res = await salla.api.request('component/list', { params: { paths: ['home.car-search-tree'] } });
            // const components = res.data;

            // TEST: Mock data for testing (remove after publish)
            const components = [{
                "component": {
                    "key": "716e33df-97f4-4808-97a8-c8784d339916",
                    "title": "قائمة بحث المركبات",
                    "description": "اختر الماركة ثم الموديل والسنة (إن وُجدت) لإظهار المنتجات المتوافقة.",
                    "badge": "اكتشف ملاءمة القطع",
                    "hide_brand_labels": false,
                    "use_dropdown_layout": false,
                    "category": [
                        {
                            "id": 1967275527,
                            "name": "المحرك",
                            "url": "https://salla.design/dev-pbdsq67yexku5kq3/المحرك/c1967275527",
                            "icon": "sicon-store",
                            "image": null,
                            "sub_categories": []
                        }
                    ],
                    "show_in_category_page": true,
                    "target_category": [
                        {
                            "id": 1967275527,
                            "url": "https://salla.design/dev-pbdsq67yexku5kq3/المحرك/c1967275527",
                            "icon": "sicon-store",
                            "name": "المحرك",
                            "image": null,
                            "sub_categories": null
                        }
                    ]
                },
                "position": 1
            }];

            console.log('Car Search Tree API response:', components);

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
                this.renderComponent(container, component, item.position, cat_id);
            });

        } catch (e) {
            salla.logger.error(e);
        }
    }

    renderComponent(container, component, position, currentCategoryId) {
        const tree_component_id = `car-search-tree-${component.key || position}`;
        const categories_payload = JSON.stringify(component.category || []);
        const heading = component.title || 'ابحث عن سيارتك';
        const description = component.description || 'اختر الماركة ثم الموديل والسنة (إن وُجدت) لإظهار المنتجات المتوافقة.';
        const badge = component.badge || 'اكتشف ملاءمة القطع';
        const hide_brand_labels = component.hide_brand_labels || false;
        const use_dropdown_layout = component.use_dropdown_layout || false;
        const brand_select_id = `${tree_component_id}-brand-select`;
        const model_select_id = `${tree_component_id}-model-select`;
        const year_select_id = `${tree_component_id}-year-select`;

        // Build complete HTML
        const html = `
            <section class="car-search-tree-block border-y dynamic-border-color" id="${tree_component_id}"
                     data-categories='${this.escapeHtml(categories_payload)}'
                     data-hide-brand-labels="${hide_brand_labels ? 'true' : 'false'}"
                     data-display-mode="${use_dropdown_layout ? 'dropdown' : 'tiles'}"
                     data-current-category-id="${currentCategoryId}">

                <div class="car-search-tree container ${use_dropdown_layout ? 'car-search-tree--dropdown' : ''}">
                    <div class="car-search-tree__header">
                        <div>
                            <p class="car-search-tree__eyebrow">${badge}</p>
                            <h2 class="car-search-tree__title">${heading}</h2>
                            <p class="car-search-tree__subtitle">${description}</p>
                        </div>
                        <div class="car-search-tree__selection">
                            <span class="car-search-tree__selection-label">اختيارك الحالي:</span>
                            <span class="car-search-tree__selection-value" data-selected-path>—</span>
                        </div>
                    </div>

                    <div class="car-search-tree__empty hidden" data-empty>
                        <div>
                            <strong>لا توجد بيانات للعرض.</strong>
                            <p>أضف تصنيفات السيارات من إعدادات المكوّن لبدء استخدام شجرة البحث.</p>
                        </div>
                    </div>

                    <div class="car-search-tree__rows ${use_dropdown_layout ? 'hidden' : ''}">
                        <div class="car-search-tree__row-wrapper" data-wrapper="brands">
                            <div class="car-search-tree__row" data-row="brands"></div>
                        </div>

                        <div class="car-search-tree__row-wrapper hidden" data-wrapper="models">
                            <div class="car-search-tree__row" data-row="models"></div>
                        </div>

                        <div class="car-search-tree__row-wrapper hidden" data-wrapper="years">
                            <div class="car-search-tree__row" data-row="years"></div>
                        </div>
                    </div>

                    <div class="car-search-tree__selects" 
                         style="${use_dropdown_layout ? '' : 'display:none;'}"
                         data-selects>
                        <div class="car-search-tree__select" data-select-wrapper="brand">
                            <label for="${brand_select_id}">اختر الماركة</label>
                            <select id="${brand_select_id}" data-select="brand">
                                <option value="" disabled selected>اختر الماركة</option>
                            </select>
                        </div>
                        <div class="car-search-tree__select" data-select-wrapper="model">
                            <label for="${model_select_id}">اختر الموديل</label>
                            <select id="${model_select_id}" data-select="model" disabled>
                                <option value="" disabled selected>اختر الموديل</option>
                            </select>
                        </div>
                        <div class="car-search-tree__select" data-select-wrapper="year">
                            <label for="${year_select_id}">اختر السنة</label>
                            <select id="${year_select_id}" data-select="year" disabled>
                                <option value="" disabled selected>اختر السنة</option>
                            </select>
                        </div>
                    </div>

                    <div class="car-search-tree__products">
                        <div class="car-search-tree__products-header">
                            <h3>المنتجات المتوافقة</h3>
                            <p>سيتم تحميل المنتجات تلقائياً بعد إتمام الاختيار.</p>
                        </div>

                        <div class="hidden" data-products-loading>
                            <div class="car-search-tree__products-state">
                                <salla-loading size="32"></salla-loading>
                                <p>جاري تحميل المنتجات...</p>
                            </div>
                        </div>

                        <div data-products-empty>
                            <div class="car-search-tree__products-state">
                                <p>لم يتم اختيار فئة بعد.</p>
                            </div>
                        </div>
                        <div class="car-search-tree__products-grid hidden" data-row="products"></div>
                    </div>
                </div>
            </section>
        `;

        container.innerHTML = html;
        container.style.display = 'block';

        // Initialize the car search tree functionality
        this.initializeCarSearchTree(tree_component_id, currentCategoryId);
    }

    initializeCarSearchTree(tree_component_id, currentCategoryId) {
        const root = document.getElementById(tree_component_id);
        if (!root || root.dataset.initialized === 'true') return;
        root.dataset.initialized = 'true';

        const categories = this.safeParse(root.dataset.categories);
        const rows = {
            brands: root.querySelector('[data-row="brands"]'),
            models: root.querySelector('[data-row="models"]'),
            years: root.querySelector('[data-row="years"]'),
            products: root.querySelector('[data-row="products"]'),
        };
        const wrappers = {
            brands: root.querySelector('[data-wrapper="brands"]'),
            models: root.querySelector('[data-wrapper="models"]'),
            years: root.querySelector('[data-wrapper="years"]'),
        };
        const emptyEl = root.querySelector('[data-empty]');
        const selectionEl = root.querySelector('[data-selected-path]');
        const loadingEl = root.querySelector('[data-products-loading]');
        const productsEmptyEl = root.querySelector('[data-products-empty]');
        const defaultProductsEmptyContent = productsEmptyEl?.innerHTML || '';
        const rowsContainer = root.querySelector('.car-search-tree__rows');
        const selectsWrapper = root.querySelector('[data-selects]');
        const selects = {
            brand: root.querySelector('[data-select="brand"]'),
            model: root.querySelector('[data-select="model"]'),
            year: root.querySelector('[data-select="year"]'),
        };
        const selectWrappers = {
            brand: root.querySelector('[data-select-wrapper="brand"]'),
            model: root.querySelector('[data-select-wrapper="model"]'),
            year: root.querySelector('[data-select-wrapper="year"]'),
        };
        const hideBrandLabels = root.dataset.hideBrandLabels === 'true';
        const displayMode = root.dataset.displayMode || 'tiles';
        const isDropdownMode = displayMode === 'dropdown';

        const state = {
            brand: null,
            model: null,
            year: null,
            lastRequestSignature: null,
        };

        if (isDropdownMode) {
            rowsContainer?.classList.add('hidden');
            selectsWrapper?.classList.remove('hidden');
            this.attachSelectListeners(selects, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selectWrappers);
            this.clearSelect(selects.model, selectWrappers.model, 'model');
            this.clearSelect(selects.year, selectWrappers.year, 'year');
        } else {
            selectsWrapper?.classList.add('hidden');
        }

        if (!Array.isArray(categories) || !categories.length) {
            emptyEl.classList.remove('hidden');
            this.hideLoading(loadingEl);
            return;
        }

        emptyEl.classList.add('hidden');
        selectionEl.textContent = '—';
        this.renderBrands(rows, wrappers, categories, state, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers, currentCategoryId);
    }

    renderBrands(rows, wrappers, categories, state, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers, currentCategoryId) {
        this.renderOptions(rows.brands, categories, 'brand', state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers, currentCategoryId);
        if (!isDropdownMode) {
            wrappers.brands.classList.remove('hidden');
        }
    }

    renderOptions(container, items, level, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers, currentCategoryId) {
        if (isDropdownMode) {
            this.renderSelectOptions(level, items, selects, selectWrappers);
            return;
        }
        if (!container) return;
        if (!Array.isArray(items) || !items.length) {
            container.innerHTML = '';
            container.parentElement?.classList.add('hidden');
            return;
        }

        container.parentElement?.classList.remove('hidden');
        container.innerHTML = items.map((item) => this.createOptionTemplate(item, level, hideBrandLabels)).join('');
        container.querySelectorAll('.car-search-tree__option').forEach((button) => {
            button.addEventListener('click', () => this.handleSelection(level, button.dataset.id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, items, hideBrandLabels, isDropdownMode, selects, selectWrappers));
        });

        // Auto-select current category if we're at the brand level
        if (level === 'brand' && currentCategoryId) {
            const matchingBrand = items.find(item => item.id == currentCategoryId);
            if (matchingBrand) {
                console.log('Auto-selecting current category:', matchingBrand.name);
                // Trigger selection after a short delay to ensure DOM is ready
                setTimeout(() => {
                    this.handleSelection('brand', matchingBrand.id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, items, hideBrandLabels, isDropdownMode, selects, selectWrappers);
                }, 100);
            }
        }
    }

    handleSelection(level, id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selects, selectWrappers) {
        const numericId = Number(id);
        if (!numericId) return;

        if (level === 'brand') {
            this.selectBrand(numericId, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selects, selectWrappers);
        } else if (level === 'model') {
            this.selectModel(numericId, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers);
        } else if (level === 'year') {
            this.selectYear(numericId, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, isDropdownMode);
        }
    }

    selectBrand(id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selects, selectWrappers) {
        const brand = this.findById(categories, id);
        if (!brand) return;
        state.brand = brand;
        state.model = null;
        state.year = null;
        this.resetProductsArea(rows, productsEmptyEl, defaultProductsEmptyContent);

        this.setActive(rows.brands, id, isDropdownMode);
        this.renderOptions(rows.models, this.normalizeChildren(brand.sub_categories), 'model', state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers);
        this.clearRow(rows.years, wrappers.years, 'year', isDropdownMode, selects, selectWrappers);
        this.updateSelectionPath(state, selectionEl);

        if (this.hasChildren(brand)) {
            this.showProductsHint('اختر الموديل لإظهار المنتجات.', productsEmptyEl, rows);
        } else {
            this.fetchProducts(brand, {}, state, rows, productsEmptyEl, loadingEl);
        }
    }

    selectModel(id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers) {
        if (!state.brand) return;
        const model = this.findById(this.normalizeChildren(state.brand.sub_categories), id);
        if (!model) return;
        state.model = model;
        state.year = null;

        this.setActive(rows.models, id, isDropdownMode);
        this.renderOptions(rows.years, this.normalizeChildren(model.sub_categories), 'year', state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers);
        this.updateSelectionPath(state, selectionEl);

        if (this.hasChildren(model)) {
            this.fetchProducts(model, { includeDescendants: true }, state, rows, productsEmptyEl, loadingEl);
        } else {
            this.fetchProducts(model, {}, state, rows, productsEmptyEl, loadingEl);
        }
    }

    selectYear(id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, isDropdownMode) {
        if (!state.model) return;
        const year = this.findById(this.normalizeChildren(state.model.sub_categories), id);
        if (!year) return;
        state.year = year;
        this.setActive(rows.years, id, isDropdownMode);
        this.updateSelectionPath(state, selectionEl);
        this.fetchProducts(year, {}, state, rows, productsEmptyEl, loadingEl);
    }

    fetchProducts(category, options = {}, state, rows, productsEmptyEl, loadingEl) {
        const { includeDescendants = false } = options;
        if (!category?.id || typeof window.salla?.product?.fetch !== 'function') {
            this.showProductsHint('تعذر الاتصال بواجهة المنتجات. تأكد من تحميل منصة سلة.', productsEmptyEl, rows);
            return;
        }
        const ids = (includeDescendants ? this.collectCategoryIds(category) : [Number(category.id)])
            .filter((value) => typeof value === 'number' && !Number.isNaN(value));
        if (!ids.length) {
            this.showProductsHint('لا توجد فئات متاحة لتحميل المنتجات.', productsEmptyEl, rows);
            return;
        }
        const requestSignature = `${ids.join(',')}:${includeDescendants ? 'deep' : 'single'}`;
        state.lastRequestSignature = requestSignature;
        rows.products.classList.add('hidden');
        rows.products.innerHTML = '';
        productsEmptyEl.classList.add('hidden');
        this.showLoading(loadingEl);

        window.salla.product.fetch({
            source: 'categories',
            source_value: ids,
        })
            .then((response) => {
                if (state.lastRequestSignature !== requestSignature) return;
                const products = this.extractProducts(response);
                if (!products.length) {
                    this.showProductsHint('لا توجد منتجات متاحة لهذا الاختيار حالياً.', productsEmptyEl, rows);
                    return;
                }
                this.renderProducts(products, rows, productsEmptyEl);
            })
            .catch(() => {
                this.showProductsHint('حدث خطأ أثناء تحميل المنتجات، حاول مجدداً لاحقاً.', productsEmptyEl, rows);
            })
            .finally(() => this.hideLoading(loadingEl));
    }

    renderProducts(products, rows, productsEmptyEl) {
        if (!Array.isArray(products)) return;
        const fragment = document.createDocumentFragment();
        products.forEach((product) => {
            const card = document.createElement('custom-salla-product-card');
            card.setAttribute('product', JSON.stringify(product));
            card.setAttribute('shadow-on-hover', '');
            fragment.appendChild(card);
        });
        rows.products.innerHTML = '';
        rows.products.appendChild(fragment);
        rows.products.classList.remove('hidden');
        productsEmptyEl.classList.add('hidden');
    }

    showProductsHint(message, productsEmptyEl, rows) {
        productsEmptyEl.innerHTML = `<p>${this.escapeHtml(message)}</p>`;
        productsEmptyEl.classList.remove('hidden');
        rows.products.classList.add('hidden');
    }

    showLoading(loadingEl) {
        loadingEl.classList.remove('hidden');
    }

    hideLoading(loadingEl) {
        loadingEl.classList.add('hidden');
    }

    resetProductsArea(rows, productsEmptyEl, defaultProductsEmptyContent) {
        if (!productsEmptyEl || !rows.products) return;
        rows.products.innerHTML = '';
        rows.products.classList.add('hidden');
        productsEmptyEl.classList.remove('hidden');
        productsEmptyEl.innerHTML = defaultProductsEmptyContent;
    }

    updateSelectionPath(state, selectionEl) {
        const parts = [state.brand?.name, state.model?.name, state.year?.name].filter(Boolean);
        selectionEl.textContent = parts.length ? parts.join(' / ') : '—';
    }

    clearRow(container, wrapper, level, isDropdownMode, selects, selectWrappers) {
        if (isDropdownMode) {
            this.clearSelect(selects[level], selectWrappers[level], level);
            return;
        }
        if (container) container.innerHTML = '';
        wrapper?.classList.add('hidden');
    }

    setActive(container, id, isDropdownMode) {
        if (isDropdownMode) return;
        if (!container) return;
        container.querySelectorAll('.car-search-tree__option').forEach((button) => {
            button.classList.toggle('is-active', Number(button.dataset.id) === Number(id));
        });
    }

    hasChildren(item) {
        return Array.isArray(item?.sub_categories) && item.sub_categories.length > 0;
    }

    findById(list, id) {
        return list?.find((item) => Number(item.id) === Number(id));
    }

    normalizeChildren(children) {
        return Array.isArray(children) ? children : [];
    }

    createOptionTemplate(item, level, hideBrandLabels) {
        const name = item?.name || '';
        const safeName = this.escapeHtml(name);
        const firstLetter = this.escapeHtml(name.charAt(0) || '?');
        const isYearLevel = level === 'year';
        let thumbClass = 'car-search-tree__option-thumb';
        let thumbContent = '';

        if (isYearLevel) {
            thumbClass += ' car-search-tree__option-thumb--year';
            thumbContent = `<span>${safeName}</span>`;
        } else if (item?.image) {
            thumbContent = `<img src="${this.escapeAttribute(item.image)}" alt="${this.escapeAttribute(name || 'category')}" loading="lazy">`;
        } else {
            thumbClass += ' car-search-tree__option-thumb--fallback';
            thumbContent = `<span>${firstLetter}</span>`;
        }

        const hideLabel = level === 'brand' && hideBrandLabels;
        const buttonClasses = ['car-search-tree__option'];
        if (hideLabel) {
            buttonClasses.push('car-search-tree__option--no-label');
        }
        const labelMarkup = hideLabel || isYearLevel ? '' : `<span class="car-search-tree__option-label">${safeName}</span>`;

        return `
            <button type="button"
                    class="${buttonClasses.join(' ')}"
                    data-id="${item.id}"
                    data-level="${level}"
                    aria-label="${safeName}">
                <span class="${thumbClass}">
                    ${thumbContent}
                </span>
                ${labelMarkup}
            </button>
        `;
    }

    renderSelectOptions(level, items, selects, selectWrappers) {
        const selectEl = selects[level];
        if (!selectEl) return;
        const normalizedItems = Array.isArray(items) ? items : this.normalizeChildren(items);
        const placeholder = this.escapeHtml(this.getSelectPlaceholder(level));
        const optionsMarkup = normalizedItems
            .map((item) => `<option value="${this.escapeAttribute(item.id)}">${this.escapeHtml(item?.name || '')}</option>`)
            .join('');
        selectEl.innerHTML = `<option value="" disabled selected>${placeholder}</option>${optionsMarkup}`;
        const shouldDisable = !normalizedItems.length;
        selectEl.disabled = shouldDisable;
        this.setSelectDisabledState(level, shouldDisable, selectWrappers);
        selectEl.value = '';
    }

    clearSelect(selectEl, wrapper, level) {
        if (!selectEl) return;
        const placeholder = this.escapeHtml(this.getSelectPlaceholder(level));
        selectEl.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
        const shouldDisable = level !== 'brand';
        selectEl.disabled = shouldDisable;
        this.setSelectDisabledState(level, shouldDisable, { [level]: wrapper });
        selectEl.value = '';
    }

    getSelectPlaceholder(level) {
        if (level === 'brand') return 'اختر الماركة';
        if (level === 'model') return 'اختر الموديل';
        if (level === 'year') return 'اختر السنة';
        return 'اختر الخيار';
    }

    attachSelectListeners(selects, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selectWrappers) {
        Object.entries(selects).forEach(([level, selectEl]) => {
            if (!selectEl) return;
            selectEl.addEventListener('change', (event) => {
                const value = event.target.value;
                if (!value) return;
                this.handleSelection(level, value, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selects, selectWrappers);
            });
        });
    }

    setSelectDisabledState(level, disabled, selectWrappers) {
        const wrapper = selectWrappers[level];
        if (!wrapper) return;
        wrapper.classList.toggle('car-search-tree__select--disabled', Boolean(disabled));
    }

    collectCategoryIds(category) {
        const ids = [];
        const traverse = (node) => {
            if (!node?.id) return;
            const numericId = Number(node.id);
            if (!Number.isNaN(numericId)) {
                ids.push(numericId);
            }
            this.normalizeChildren(node.sub_categories).forEach(traverse);
        };
        traverse(category);
        return Array.from(new Set(ids));
    }

    extractProducts(response) {
        return response?.data?.products
            || response?.data?.items
            || response?.data
            || response?.products
            || [];
    }

    safeParse(payload) {
        try {
            return JSON.parse(payload || '[]');
        } catch (error) {
            console.warn('car-search-tree::unable to parse categories payload', error);
            return [];
        }
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    escapeAttribute(value) {
        return this.escapeHtml(value).replace(/`/g, '&#096;');
    }
}

CarSearchTree.initiateWhenReady(['product.index']);

export default CarSearchTree;
