import BasePage from './base-page';

class CarSearchTree extends BasePage {
    async onReady() {
        const LOG = '[CarSearchTree]';
        const container = document.querySelector('#car-search-tree');

        if (!container) {
            console.log(LOG, 'no #car-search-tree placeholder on page, skipping');
            return;
        }
        if (!salla.url.is_page('product.index')) {
            console.log(LOG, 'not on product.index page, skipping');
            return;
        }

        const cat_id = container.dataset.catid;
        console.log(LOG, 'current category id:', cat_id);

        try {
            const res = await salla.api.request('component/list', { params: { paths: ['home.car-search-tree'] } });
            const components = res.data;

            console.log(LOG, 'API response:', components);

            if (!Array.isArray(components) || !components.length) {
                console.warn(LOG, 'no car-search-tree components returned');
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

                console.log(LOG, `item[${idx}] target:`, { targetField, targetCat, targetCatId, cat_id });

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
                this.renderComponent(container, component, item.position, cat_id);
            });

        } catch (e) {
            console.error(LOG, 'onReady threw:', e);
            salla.logger.error(e);
        }
    }

    renderComponent(container, component, position, currentCategoryId, options = {}) {
        const tree_component_id = `car-search-tree-${component.key || position}`;
        const categories_payload = JSON.stringify(component.category || []);
        const use_custom_json = component.use_custom_json || false;
        const custom_json_raw = typeof component.custom_json_data === 'string' ? component.custom_json_data : '';
        const show_search_button = options.showSearchButton === true;
        // Pull display text from the component's own settings (merchant-editable,
        // language-aware via Salla). Falls back to the inline default only when a
        // setting has no value. Stored on `this` so the async methods below reuse it.
        this._component = component;
        const t = (key, fallback) => {
            const fromComponent = {
                selection_label: component.selection_label,
                empty_title: component.empty_title,
                empty_desc: component.empty_description,
                brand: component.brand_label,
                model: component.model_label,
                year: component.year_label,
                products_title: component.products_title,
                products_subtitle: component.products_subtitle,
                no_selection: component.products_empty_text,
            }[key];
            return fromComponent || fallback;
        };
        // Grab target category url for the "Go to results" button
        const targetField = component.target_category;
        const targetCat = Array.isArray(targetField) ? targetField[0] : targetField;
        const target_category_url = targetCat?.url || '';
        const heading = component.title || 'ابحث عن سيارتك';
        const description = component.description || 'اختر الماركة ثم الموديل والسنة (إن وُجدت) لإظهار المنتجات المتوافقة.';
        const badge = component.badge || 'اكتشف ملاءمة القطع';
        const hide_brand_labels = component.hide_brand_labels || false;
        const use_dropdown_layout = component.use_dropdown_layout || false;
        this._extraCardAttrs = Array.isArray(component.card_attributes) ? component.card_attributes : [];
        const brand_select_id = `${tree_component_id}-brand-select`;
        const model_select_id = `${tree_component_id}-model-select`;
        const year_select_id = `${tree_component_id}-year-select`;

        // Build complete HTML
        const html = `
            <section class="car-search-tree-block border-y dynamic-border-color" id="${tree_component_id}"
                     data-categories='${this.escapeHtml(categories_payload)}'
                     data-custom-mode="${use_custom_json ? 'true' : 'false'}"
                     data-custom-json='${this.escapeHtml(custom_json_raw)}'
                     data-hide-brand-labels="${hide_brand_labels ? 'true' : 'false'}"
                     data-display-mode="${use_dropdown_layout ? 'dropdown' : 'tiles'}"
                     data-current-category-id="${currentCategoryId}"
                     data-show-search-button="${show_search_button ? 'true' : 'false'}"
                     data-target-category-url="${this.escapeAttribute(target_category_url)}">

                <div class="car-search-tree container ${use_dropdown_layout ? 'car-search-tree--dropdown' : ''}">
                    <div class="car-search-tree__header">
                        <div>
                            <p class="car-search-tree__eyebrow">${badge}</p>
                            <h2 class="car-search-tree__title">${heading}</h2>
                            <p class="car-search-tree__subtitle">${description}</p>
                        </div>
                        <div class="car-search-tree__selection">
                            <span class="car-search-tree__selection-label">${t('selection_label', 'اختيارك الحالي:')}</span>
                            <span class="car-search-tree__selection-value" data-selected-path>—</span>
                        </div>
                    </div>

                    <div class="car-search-tree__empty hidden" data-empty>
                        <div>
                            <strong>${t('empty_title', 'لا توجد بيانات للعرض.')}</strong>
                            <p>${t('empty_desc', 'أضف تصنيفات السيارات من إعدادات المكوّن لبدء استخدام شجرة البحث.')}</p>
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
                            <label for="${brand_select_id}">${t('brand', 'اختر الماركة')}</label>
                            <select class="rounded-custom" id="${brand_select_id}" data-select="brand">
                                <option value="" disabled selected>${t('brand', 'اختر الماركة')}</option>
                            </select>
                        </div>
                        <div class="car-search-tree__select" data-select-wrapper="model">
                            <label for="${model_select_id}">${t('model', 'اختر الموديل')}</label>
                            <select class="rounded-custom" id="${model_select_id}" data-select="model" disabled>
                                <option value="" disabled selected>${t('model', 'اختر الموديل')}</option>
                            </select>
                        </div>
                        <div class="car-search-tree__select" data-select-wrapper="year">
                            <label for="${year_select_id}">${t('year', 'اختر السنة')}</label>
                            <select class="rounded-custom" id="${year_select_id}" data-select="year" disabled>
                                <option value="" disabled selected>${t('year', 'اختر السنة')}</option>
                            </select>
                        </div>
                    </div>

                    ${show_search_button ? `
                        <div class="car-search-tree__submit" data-submit-wrapper>
                            <button type="button" class="car-search-tree__submit-btn" data-submit-btn disabled>
                                <i class="sicon-search"></i>
                                <span>${t('show_results', 'اعرض النتائج')}</span>
                            </button>
                        </div>
                    ` : ''}

                    <div class="car-search-tree__products${show_search_button ? ' hidden' : ''}">
                        <div class="car-search-tree__products-header">
                            <h3>${t('products_title', 'المنتجات المتوافقة')}</h3>
                            <p>${t('products_subtitle', 'سيتم تحميل المنتجات تلقائياً بعد إتمام الاختيار.')}</p>
                        </div>

                        <div class="hidden" data-products-loading>
                            <div class="car-search-tree__products-state">
                                <salla-loading size="32"></salla-loading>
                                <p>${t('loading', 'جاري تحميل المنتجات...')}</p>
                            </div>
                        </div>

                        <div data-products-empty>
                            <div class="car-search-tree__products-state">
                                <p>${t('no_selection', 'لم يتم اختيار فئة بعد.')}</p>
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

        const useCustomJson = root.dataset.customMode === 'true';
        const categories = useCustomJson
            ? this.safeParse(root.dataset.customJson)
            : this.safeParse(root.dataset.categories);
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
        const showSearchButton = root.dataset.showSearchButton === 'true';
        const targetCategoryUrl = root.dataset.targetCategoryUrl || '';
        const submitBtn = root.querySelector('[data-submit-btn]');

        const state = {
            brand: null,
            model: null,
            year: null,
            lastRequestSignature: null,
            useCustomJson,
            showSearchButton,
            targetCategoryUrl,
            submitBtn,
        };

        if (showSearchButton && submitBtn) {
            submitBtn.addEventListener('click', () => {
                if (!state.brand) return;
                const params = new URLSearchParams();
                params.set('volt_brand', String(state.brand.id));
                if (state.model) params.set('volt_model', String(state.model.id));
                if (state.year)  params.set('volt_year',  String(state.year.id));
                const url = targetCategoryUrl
                    ? `${targetCategoryUrl}${targetCategoryUrl.includes('?') ? '&' : '?'}${params.toString()}`
                    : `?${params.toString()}`;
                window.location.href = url;
            });
        }

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

        // Auto-select from ?volt_brand=&volt_model=&volt_year= URL params (category page only)
        if (!showSearchButton) {
            this.applyUrlPreselection(categories, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers);
        }
    }

    applyUrlPreselection(categories, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers) {
        const params = new URLSearchParams(window.location.search);
        const brandId = params.get('volt_brand');
        const modelId = params.get('volt_model');
        const yearId  = params.get('volt_year');
        if (!brandId) return;

        console.log('[CarSearchTree] URL preselection', { brandId, modelId, yearId });

        // Cascade selections; each step needs DOM updates to settle before the next click
        setTimeout(() => {
            this.handleSelection('brand', brandId, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selects, selectWrappers);
            if (modelId) {
                setTimeout(() => {
                    this.handleSelection('model', modelId, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selects, selectWrappers);
                    if (yearId) {
                        setTimeout(() => {
                            this.handleSelection('year', yearId, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selects, selectWrappers);
                        }, 50);
                    }
                }, 50);
            }
        }, 50);
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
        console.log('[CarSearchTree] handleSelection', { level, id, useCustomJson: state.useCustomJson });
        if (!id) {
            console.warn('[CarSearchTree] empty id, aborting');
            return;
        }

        if (level === 'brand') {
            this.selectBrand(id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selects, selectWrappers);
        } else if (level === 'model') {
            this.selectModel(id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers);
        } else if (level === 'year') {
            this.selectYear(id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, isDropdownMode);
        }
    }

    selectBrand(id, state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, categories, hideBrandLabels, isDropdownMode, selects, selectWrappers) {
        const brand = this.findById(categories, id);
        console.log('[CarSearchTree] selectBrand', {
            id,
            brand,
            categoriesCount: categories?.length,
            subCategoriesCount: brand?.sub_categories?.length,
        });
        if (!brand) {
            console.warn('[CarSearchTree] brand not found in categories', { id, categories });
            return;
        }
        state.brand = brand;
        state.model = null;
        state.year = null;
        this.resetProductsArea(rows, productsEmptyEl, defaultProductsEmptyContent);

        this.setActive(rows.brands, id, isDropdownMode);
        this.renderOptions(rows.models, this.normalizeChildren(brand.sub_categories), 'model', state, rows, wrappers, selectionEl, loadingEl, productsEmptyEl, defaultProductsEmptyContent, hideBrandLabels, isDropdownMode, selects, selectWrappers);
        this.clearRow(rows.years, wrappers.years, 'year', isDropdownMode, selects, selectWrappers);
        this.updateSelectionPath(state, selectionEl);

        if (this.hasChildren(brand)) {
            this.showProductsHint(this._component?.hint_select_model || 'اختر الموديل لإظهار المنتجات.', productsEmptyEl, rows);
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
            this.showProductsHint(this._component?.error_text || 'تعذر الاتصال بواجهة المنتجات. تأكد من تحميل منصة سلة.', productsEmptyEl, rows);
            return;
        }

        let fetchCall, requestSignature;

        if (state.useCustomJson) {
            const productIds = includeDescendants
                ? this.collectProductIds(category)
                : (Array.isArray(category.products) ? category.products : []);
            if (!productIds.length) {
                this.showProductsHint(this._component?.hint_no_products || 'لا توجد منتجات مرتبطة بهذا الاختيار.', productsEmptyEl, rows);
                return;
            }
            requestSignature = productIds.join(',') + ':products';
            fetchCall = window.salla.product.fetch({
                source: 'selected',
                source_value: productIds.map(Number),
            });
        } else {
            const ids = (includeDescendants ? this.collectCategoryIds(category) : [Number(category.id)])
                .filter((value) => typeof value === 'number' && !Number.isNaN(value));
            if (!ids.length) {
                this.showProductsHint(this._component?.error_text || 'لا توجد فئات متاحة لتحميل المنتجات.', productsEmptyEl, rows);
                return;
            }
            requestSignature = `${ids.join(',')}:${includeDescendants ? 'deep' : 'single'}`;
            fetchCall = window.salla.product.fetch({
                source: 'categories',
                source_value: ids,
            });
        }

        state.lastRequestSignature = requestSignature;
        rows.products.classList.add('hidden');
        rows.products.innerHTML = '';
        productsEmptyEl.classList.add('hidden');
        this.showLoading(loadingEl);

        fetchCall
            .then((response) => {
                if (state.lastRequestSignature !== requestSignature) return;
                const products = this.extractProducts(response);
                if (!products.length) {
                    this.showProductsHint(this._component?.hint_no_products || 'لا توجد منتجات متاحة لهذا الاختيار حالياً.', productsEmptyEl, rows);
                    return;
                }
                this.renderProducts(products, rows, productsEmptyEl);
            })
            .catch(() => {
                this.showProductsHint(this._component?.error_text || 'حدث خطأ أثناء تحميل المنتجات، حاول مجدداً لاحقاً.', productsEmptyEl, rows);
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
            (this._extraCardAttrs || []).forEach(attr => card.setAttribute(attr, ''));
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
        if (state.submitBtn) {
            state.submitBtn.disabled = !state.brand;
        }
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
            button.classList.toggle('is-active', String(button.dataset.id) === String(id));
        });
    }

    hasChildren(item) {
        return Array.isArray(item?.sub_categories) && item.sub_categories.length > 0;
    }

    findById(list, id) {
        return list?.find((item) => String(item.id) === String(id));
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
        const c = this._component || {};
        if (level === 'brand') return c.brand_label || 'اختر الماركة';
        if (level === 'model') return c.model_label || 'اختر الموديل';
        if (level === 'year') return c.year_label || 'اختر السنة';
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

    collectProductIds(category) {
        const ids = [];
        const traverse = (node) => {
            if (!node) return;
            if (Array.isArray(node.products)) {
                node.products.forEach((id) => { if (id) ids.push(id); });
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
