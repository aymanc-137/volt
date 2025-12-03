import BasePage from './base-page';

class CategoryAds extends BasePage {
  async  onReady() {
const CatElement = document.querySelector('#category-ads');

if (!CatElement || !salla.url.is_page('product.index')) {
    return;
}

const cat_id = CatElement.dataset.catid;

    try {
        await salla.api.request('component/list', { params: { paths: ['home.category-ads'] } })
        .then((res) => {
            //  console.log(res);
             const catArray = res.data[0].component.category_ads;

            catArray.forEach(element => {
               
                if(element.category[0] == cat_id || element.category.id == cat_id){

                    if (element) {
                        CatElement.style =   `background-image: url(${element.image}); display: flex;`;
                      if(element?.title) CatElement.innerHTML = `<h3 style="text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);" class=" place-self-center text-white lg:text-3xl md:text-xl text-sm" >${element.title}</h3>`;
                    }
                }
                
            });
          
             
        });
  
    } catch (e) {
        salla.logger.error(e);
    }
 
}
}

CategoryAds.initiateWhenReady(['product.index']);


    