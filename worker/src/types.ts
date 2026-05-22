export interface Category {
  id: string;
  name: string;
  image: string | null;
  url: string;
  products: string[];
  sub_categories: Category[];
}

export interface Env {
  CATEGORIES_KV: KVNamespace;
  IMAGES_BUCKET: R2Bucket;
  ADMIN_SECRET: string;
}
