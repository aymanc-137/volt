import BasePage from './base-page';
import CarSearchTree from './car-search-tree';

/**
 * Fetches the home.car-search-tree component settings via the Salla API and
 * renders the widget inside every [data-cat-list-car-search] placeholder that
 * the category-list Twig component stamped into the page.
 *
 * Follows the same pattern as category-ads.js / CarSearchTree on product pages.
 */
class CatListCarSearch extends BasePage {
    async onReady() {
        const containers = document.querySelectorAll('[data-home-car-search]');
        if (!containers.length) return;

        try {
            const res = await salla.api.request('component/list', {
                params: { paths: ['home.car-search-tree'] },
            });

            const item = res.data?.[0];
            if (!item?.component) return;

            item.component.use_dropdown_layout = true;
            item.component.card_attributes = ['minimal', 'horizontal'];

            const treeRenderer = new CarSearchTree();

            containers.forEach(container => {
                container.classList.remove('hidden');
                treeRenderer.renderComponent(container, item.component, item.position, null);
            });
        } catch (e) {
            salla.logger.error(e);
        }
    }
}

CatListCarSearch.initiateWhenReady(['index']);

export default CatListCarSearch;
