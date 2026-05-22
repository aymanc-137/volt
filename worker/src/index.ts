import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Category } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// ── Auth middleware ──────────────────────────────────────────────────────────
app.use('/api/*', async (c, next) => {
  const secret = c.req.header('X-Admin-Secret') ?? c.req.query('secret') ?? '';
  if (secret !== c.env.ADMIN_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

// ── Storage helpers ──────────────────────────────────────────────────────────
const KV_KEY = 'categories';

async function load(env: Env): Promise<Category[]> {
  const raw = await env.CATEGORIES_KV.get(KV_KEY);
  return raw ? (JSON.parse(raw) as Category[]) : [];
}

async function save(env: Env, tree: Category[]): Promise<void> {
  await env.CATEGORIES_KV.put(KV_KEY, JSON.stringify(tree));
}

function find(tree: Category[], id: string): Category | null {
  for (const c of tree) {
    if (c.id === id) return c;
    const hit = find(c.sub_categories, id);
    if (hit) return hit;
  }
  return null;
}

function remove(tree: Category[], id: string): boolean {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) { tree.splice(i, 1); return true; }
    if (remove(tree[i].sub_categories, id)) return true;
  }
  return false;
}

// ── API routes ───────────────────────────────────────────────────────────────

// GET /api/categories
app.get('/api/categories', async (c) => {
  return c.json(await load(c.env));
});

// POST /api/categories — { name, parentId? }
app.post('/api/categories', async (c) => {
  const { name, parentId } = await c.req.json<{ name: string; parentId?: string }>();
  const tree = await load(c.env);

  const cat: Category = {
    id: crypto.randomUUID(),
    name,
    image: null,
    url: '',
    products: [],
    sub_categories: [],
  };

  if (parentId) {
    const parent = find(tree, parentId);
    if (!parent) return c.json({ error: 'Parent not found' }, 404);
    parent.sub_categories.push(cat);
  } else {
    tree.push(cat);
  }

  await save(c.env, tree);
  return c.json(cat, 201);
});

// PUT /api/categories/:id — update name / url / products
app.put('/api/categories/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<Pick<Category, 'name' | 'url' | 'products'>>>();
  const tree = await load(c.env);

  const cat = find(tree, id);
  if (!cat) return c.json({ error: 'Not found' }, 404);

  if (body.name !== undefined) cat.name = body.name;
  if (body.url !== undefined) cat.url = body.url;
  if (body.products !== undefined) cat.products = body.products;

  await save(c.env, tree);
  return c.json(cat);
});

// DELETE /api/categories/:id
app.delete('/api/categories/:id', async (c) => {
  const id = c.req.param('id');
  const tree = await load(c.env);
  if (!remove(tree, id)) return c.json({ error: 'Not found' }, 404);
  await save(c.env, tree);
  return c.json({ ok: true });
});

// POST /api/upload/:id — multipart image → R2
app.post('/api/upload/:id', async (c) => {
  const id = c.req.param('id');
  const tree = await load(c.env);
  const cat = find(tree, id);
  if (!cat) return c.json({ error: 'Not found' }, 404);

  const form = await c.req.formData();
  const file = form.get('image') as File | null;
  if (!file) return c.json({ error: 'No image provided' }, 400);

  const ext = file.name.split('.').pop() ?? 'bin';
  const key = `images/${id}-${Date.now()}.${ext}`;
  await c.env.IMAGES_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  cat.image = `/r2/${key}`;
  await save(c.env, tree);
  return c.json({ url: cat.image });
});

// GET /r2/* — proxy R2 objects publicly
app.get('/r2/*', async (c) => {
  const key = c.req.path.slice(4); // strip leading /r2/
  const obj = await c.env.IMAGES_BUCKET.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
});

// GET /api/export — final JSON ready to paste into the component
app.get('/api/export', async (c) => {
  return c.json(await load(c.env));
});

// ── Frontend ─────────────────────────────────────────────────────────────────
app.get('/', (c) => c.html(html));

const html = /* html */`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>مدير تصنيفات السيارات</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #f1f5f9; color: #1e293b; display: flex; flex-direction: column; min-height: 100dvh; }
  header { background: #0f172a; color: #fff; padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  header h1 { font-size: 1.1rem; font-weight: 700; }
  .header-actions { display: flex; gap: .5rem; }
  .layout { display: grid; grid-template-columns: 320px 1fr; flex: 1; overflow: hidden; height: calc(100dvh - 57px); }
  .sidebar { background: #fff; border-left: 1px solid #e2e8f0; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: .75rem; }
  .panel { overflow-y: auto; padding: 1.5rem; }
  button { cursor: pointer; border: none; border-radius: .5rem; padding: .45rem .9rem; font-size: .85rem; font-weight: 600; transition: opacity .15s; }
  button:hover { opacity: .85; }
  .btn-primary { background: #3b82f6; color: #fff; }
  .btn-danger  { background: #ef4444; color: #fff; }
  .btn-ghost   { background: #e2e8f0; color: #1e293b; }
  .btn-success { background: #22c55e; color: #fff; }
  .btn-sm { padding: .25rem .6rem; font-size: .78rem; }
  input, textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: .5rem; padding: .5rem .75rem; font-size: .9rem; }
  input:focus, textarea:focus { outline: 2px solid #3b82f6; border-color: transparent; }
  label { font-size: .8rem; font-weight: 600; color: #64748b; display: block; margin-bottom: .25rem; }
  .field { display: flex; flex-direction: column; gap: .25rem; }
  .card { background: #fff; border-radius: .75rem; padding: 1.25rem; box-shadow: 0 1px 3px #0001; display: flex; flex-direction: column; gap: 1rem; }
  .card h2 { font-size: 1rem; font-weight: 700; }
  .tree-item { display: flex; align-items: center; gap: .5rem; padding: .35rem .5rem; border-radius: .5rem; cursor: pointer; font-size: .875rem; }
  .tree-item:hover { background: #f1f5f9; }
  .tree-item.active { background: #eff6ff; color: #2563eb; font-weight: 600; }
  .tree-item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tree-item img { width: 28px; height: 28px; object-fit: cover; border-radius: .35rem; }
  .tree-item .dot { width: 28px; height: 28px; border-radius: .35rem; background: #e2e8f0; flex-shrink: 0; }
  .children { padding-right: 1rem; border-right: 2px solid #e2e8f0; margin-right: .5rem; display: flex; flex-direction: column; gap: .15rem; margin-top: .15rem; }
  .add-root { display: flex; gap: .5rem; }
  .add-root input { flex: 1; }
  .product-tag { display: inline-flex; align-items: center; gap: .35rem; background: #f1f5f9; border-radius: .35rem; padding: .2rem .5rem; font-size: .78rem; }
  .product-tag button { background: none; color: #ef4444; padding: 0; font-size: .85rem; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; }
  .products-wrap { display: flex; flex-wrap: wrap; gap: .35rem; }
  .add-product { display: flex; gap: .5rem; }
  .add-product input { flex: 1; }
  .empty { color: #94a3b8; font-size: .875rem; text-align: center; padding: 2rem 0; }
  .export-box { position: fixed; inset: 0; background: #0008; display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
  .export-inner { background: #fff; border-radius: 1rem; padding: 1.5rem; max-width: 700px; width: 100%; display: flex; flex-direction: column; gap: 1rem; max-height: 90dvh; }
  .export-inner textarea { font-family: monospace; font-size: .8rem; flex: 1; min-height: 300px; }
  .export-inner header { display: flex; justify-content: space-between; align-items: center; }
  .export-inner header h2 { font-size: 1rem; font-weight: 700; }
  .thumb { width: 80px; height: 80px; object-fit: cover; border-radius: .5rem; }
  .upload-area { display: flex; align-items: center; gap: .75rem; }
  @media (max-width: 640px) { .layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; } .sidebar { max-height: 40dvh; } }
</style>
</head>
<body>
<header>
  <h1>🚗 مدير تصنيفات السيارات</h1>
  <div class="header-actions">
    <button class="btn-success" onclick="showExport()">تصدير JSON</button>
  </div>
</header>

<div class="layout">
  <aside class="sidebar">
    <div class="add-root">
      <input id="newRootName" placeholder="اسم التصنيف الجديد..." onkeydown="if(event.key==='Enter')addRoot()">
      <button class="btn-primary" onclick="addRoot()">+</button>
    </div>
    <div id="tree"></div>
  </aside>

  <main class="panel">
    <div id="panelContent" class="empty">اختر تصنيفاً من القائمة للتعديل</div>
  </main>
</div>

<div id="exportBox" class="export-box" style="display:none">
  <div class="export-inner">
    <header>
      <h2>JSON — الصقه في إعدادات المكوّن</h2>
      <button class="btn-ghost btn-sm" onclick="hideExport()">✕</button>
    </header>
    <textarea id="exportText" readonly></textarea>
    <div style="display:flex;gap:.5rem">
      <button class="btn-success" onclick="copyExport()">نسخ</button>
      <button class="btn-ghost" onclick="hideExport()">إغلاق</button>
    </div>
  </div>
</div>

<script>
const SECRET = prompt('أدخل كلمة المرور للوصول:') || '';
const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'X-Admin-Secret': SECRET, ...(opts.headers || {}) } });

let tree = [];
let selected = null;

async function loadTree() {
  const res = await api('/api/categories');
  if (!res.ok) { alert('كلمة المرور غير صحيحة'); return; }
  tree = await res.json();
  renderTree();
  if (selected) {
    const node = findNode(tree, selected);
    node ? renderPanel(node) : (selected = null, renderEmpty());
  }
}

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNode(n.sub_categories, id);
    if (f) return f;
  }
  return null;
}

function renderTree() {
  document.getElementById('tree').innerHTML = '';
  tree.forEach(cat => document.getElementById('tree').appendChild(buildNode(cat)));
}

function buildNode(cat, depth = 0) {
  const wrap = document.createElement('div');
  const row = document.createElement('div');
  row.className = 'tree-item' + (cat.id === selected ? ' active' : '');
  row.innerHTML = cat.image
    ? '<img src="' + cat.image + '" alt="">'
    : '<div class="dot"></div>';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = cat.name;
  const del = document.createElement('button');
  del.className = 'btn-danger btn-sm';
  del.textContent = '✕';
  del.onclick = (e) => { e.stopPropagation(); deleteCategory(cat.id); };
  row.appendChild(name);
  row.appendChild(del);
  row.addEventListener('click', () => selectNode(cat.id));
  wrap.appendChild(row);
  if (cat.sub_categories.length) {
    const ch = document.createElement('div');
    ch.className = 'children';
    cat.sub_categories.forEach(sub => ch.appendChild(buildNode(sub, depth + 1)));
    wrap.appendChild(ch);
  }
  return wrap;
}

function selectNode(id) {
  selected = id;
  renderTree();
  const node = findNode(tree, id);
  if (node) renderPanel(node);
}

function renderEmpty() {
  document.getElementById('panelContent').innerHTML = '<div class="empty">اختر تصنيفاً من القائمة للتعديل</div>';
}

function renderPanel(cat) {
  document.getElementById('panelContent').innerHTML = \`
    <div class="card">
      <h2>\${cat.name}</h2>
      <div class="upload-area">
        \${cat.image ? '<img class="thumb" src="' + cat.image + '" alt="">' : '<div class="dot" style="width:80px;height:80px"></div>'}
        <div>
          <label>صورة التصنيف</label>
          <input type="file" accept="image/*" onchange="uploadImage('\${cat.id}', this)">
        </div>
      </div>
      <div class="field">
        <label>الاسم</label>
        <input id="editName" value="\${cat.name}">
      </div>
      <div class="field">
        <label>الرابط (URL)</label>
        <input id="editUrl" value="\${cat.url || ''}" placeholder="https://...">
      </div>
      <button class="btn-primary" onclick="saveNode('\${cat.id}')">حفظ</button>
    </div>

    <div class="card" style="margin-top:1rem">
      <h2>تصنيف فرعي</h2>
      <div class="add-root">
        <input id="subName" placeholder="اسم التصنيف الفرعي...">
        <button class="btn-primary" onclick="addSub('\${cat.id}')">+</button>
      </div>
    </div>

    <div class="card" style="margin-top:1rem">
      <h2>معرّفات المنتجات</h2>
      <div class="products-wrap" id="productTags">
        \${cat.products.map(p => productTag(cat.id, p)).join('')}
      </div>
      <div class="add-product" style="margin-top:.5rem">
        <input id="newProduct" placeholder="أدخل معرّف المنتج..." onkeydown="if(event.key==='Enter')addProduct('\${cat.id}')">
        <button class="btn-primary" onclick="addProduct('\${cat.id}')">إضافة</button>
      </div>
    </div>
  \`;
}

function productTag(catId, productId) {
  return \`<span class="product-tag">\${productId}<button onclick="removeProduct('\${catId}','\${productId}')">✕</button></span>\`;
}

async function addRoot() {
  const name = document.getElementById('newRootName').value.trim();
  if (!name) return;
  await api('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
  document.getElementById('newRootName').value = '';
  loadTree();
}

async function addSub(parentId) {
  const name = document.getElementById('subName').value.trim();
  if (!name) return;
  await api('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentId }) });
  loadTree();
}

async function deleteCategory(id) {
  if (!confirm('حذف هذا التصنيف وكل ما بداخله؟')) return;
  await api('/api/categories/' + id, { method: 'DELETE' });
  if (selected === id) { selected = null; renderEmpty(); }
  loadTree();
}

async function saveNode(id) {
  const name = document.getElementById('editName').value.trim();
  const url  = document.getElementById('editUrl').value.trim();
  await api('/api/categories/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, url }) });
  loadTree();
}

async function uploadImage(id, input) {
  const file = input.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('image', file);
  const res = await api('/api/upload/' + id, { method: 'POST', body: form });
  if (res.ok) loadTree();
}

async function addProduct(catId) {
  const input = document.getElementById('newProduct');
  const pid = input.value.trim();
  if (!pid) return;
  const node = findNode(tree, catId);
  if (!node) return;
  if (node.products.includes(pid)) { input.value = ''; return; }
  const updated = [...node.products, pid];
  await api('/api/categories/' + catId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: updated }) });
  input.value = '';
  loadTree();
}

async function removeProduct(catId, pid) {
  const node = findNode(tree, catId);
  if (!node) return;
  const updated = node.products.filter(p => p !== pid);
  await api('/api/categories/' + catId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: updated }) });
  loadTree();
}

async function showExport() {
  const res = await api('/api/export');
  const json = JSON.stringify(await res.json(), null, 2);
  document.getElementById('exportText').value = json;
  document.getElementById('exportBox').style.display = 'flex';
}

function hideExport() { document.getElementById('exportBox').style.display = 'none'; }

function copyExport() {
  navigator.clipboard.writeText(document.getElementById('exportText').value);
  alert('تم النسخ!');
}

loadTree();
</script>
</body>
</html>`;

export default app;
