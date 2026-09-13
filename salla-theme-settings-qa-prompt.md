# Salla Theme — Settings QA Prompt

A reusable prompt + bug catalog for auditing the **theme settings** of any Salla (Twilight) theme.
Scope is settings only — components are a separate pass.

Every pattern below is a real defect found in the Alwan theme. Each section shows the broken code,
the corrected code, and how to detect the same pattern elsewhere.

---

## 1. The prompt

Paste this into Claude Code from the theme's repo root.

> Audit this Salla theme's **settings** (not components, not native Salla settings).
>
> Do two passes and cross-check them against each other.
>
> **Pass A — static analysis.** Read `twilight.json`, extract every setting `id`, then grep `src/`
> for each one. Build a table: `id` → type/format → default → files that read it → verdict.
> Flag: settings read nowhere (dead), settings read in code but missing from `twilight.json`
> (phantom), id spelling mismatches between `twilight.json` and `theme.settings.get(...)`,
> sub-settings whose `conditions` parent is not also checked in the template, `required` fields
> nested inside `collection`s, and string defaults used in boolean contexts.
>
> **Pass B — live test.** Run `pnpm dev` (or `salla theme p --store=<store> --with-editor`), open the
> theme editor, **hard-refresh the page** so the local theme files load, then toggle each setting in
> the editor panel and verify the change appears in the live preview iframe. Don't open a separate
> preview window. Skip Salla-native settings.
>
> Rules that matter:
> - The editor's `s-toggle` / `s-select` / `s-input` web components ignore programmatic `.click()`.
>   Use real mouse events (screenshot → click coordinates).
> - Screenshots are downscaled from the real viewport. Calibrate `click = js_coord * scale` before
>   trusting coordinate math, or read coordinates straight off the screenshot.
> - Trust screenshots over DOM queries — `querySelectorAll('[name]')` matches stale nodes here.
> - Restore every setting you changed and confirm the save toast before finishing.
>
> Report each finding as: what's broken → exact `file:line` → how to reproduce → what the merchant sees.
> Check the bug patterns in section 2 first — these recur across themes.

---

## 2. Bug patterns

### 2.1 Setting id mismatch (hyphen vs underscore)

The id in `twilight.json` doesn't match the string in `theme.settings.get()`, so the lookup always
returns the default. When that default is a non-empty string it is **truthy**, so the feature is
stuck "on" and the toggle is inert in both positions.

```json
// twilight.json
{ "id": "wishlist-btn", "type": "boolean", "format": "switch", "value": true }
```
```twig
{# BROKEN — reads the underscore version, always gets the literal string "default" #}
window.wishlist_btn = "{{ theme.settings.get('wishlist_btn', 'default') }}"
```
```twig
{# FIXED — matching id, boolean default, emitted as a real boolean #}
window.wishlist_btn = {{ theme.settings.get('wishlist-btn', true)|json_encode|raw }}
```

Two bugs stack here: the id typo, and quoting a boolean into a string so `false` arrives in JS as
`"false"` (truthy). Fix both — `|json_encode|raw` for anything read as a boolean in JS.

**Reproduce:** flip the toggle both ways → no visual change; `window.<var>` never changes in console.

*Status in Alwan: fixed (`master.twig:85`).*

---

### 2.2 Sub-settings not gated on their parent switch

A group switch (`*_advanced_options`) hides sub-settings in the editor via `conditions`, but the
template reads the sub-settings directly. Turning the parent off hides the controls while their
effects keep applying — with no way to undo them.

```twig
{# BROKEN — no parent check #}
{{ theme.settings.get('hide_product_card_border') ? ' hide-card-border' : '' }}
{{ theme.settings.get('center_product_card_text') ? ' center-card-text' : '' }}
```
```twig
{# FIXED — parent gates the whole block #}
{% if theme.settings.get('product_card_advanced_options') %}
  {{ theme.settings.get('hide_product_card_border') ? ' hide-card-border' : '' }}
  {{ theme.settings.get('center_product_card_text') ? ' center-card-text' : '' }}
{% endif %}
```

Check the **inverse** too: a setting gated in code but with no `conditions` in `twilight.json` shows
a control that silently does nothing while the parent is off. Inline form:

```twig
{{ (theme.settings.get('product_card_advanced_options') and theme.settings.get('products_autoload')) ? 'autoload' : '' }}
```

**Detect:** for every setting carrying a `conditions` block in `twilight.json`, confirm the parent id
also appears in every template that reads the child.

```bash
python3 - <<'PY'
import json, re, pathlib, collections
cfg = json.load(open('twilight.json'))
parents = {}
def walk(node):
    if isinstance(node, dict):
        if 'id' in node and 'conditions' in node:
            ids = [c.get('id') for c in node['conditions'] if isinstance(c, dict)]
            parents[node['id']] = [i for i in ids if i]
        for v in node.values(): walk(v)
    elif isinstance(node, list):
        for v in node: walk(v)
walk(cfg)

src = {p: p.read_text(errors='ignore') for p in pathlib.Path('src').rglob('*')
       if p.is_file() and p.suffix in ('.twig', '.js')}
for child, ps in sorted(parents.items()):
    for path, text in src.items():
        if re.search(r"settings\.get\(['\"]%s['\"]" % re.escape(child), text):
            missing = [p for p in ps if p not in text]
            if missing:
                print(f"UNGATED  {path}: {child}  (parent not checked: {', '.join(missing)})")
PY
```

**Reproduce:** enable the parent → enable a sub-setting → turn the parent off → save → effect persists.

*Status in Alwan: fixed for the product-card group (`master.twig:208`) and the three
`products_autoload` call sites. **Six more still open** — `master.twig:149-154` emits these CSS custom
properties unconditionally, and neither parent id appears anywhere in the file:*

```twig
--header-logo-size:      {{ theme.settings.get('header_logo_size', 48) }}px;      {# header_advanced_options #}
--header-icons-size:     {{ theme.settings.get('header_icons_size', 40) }}px;     {# header_advanced_options #}
--header-menu-text-size: {{ theme.settings.get('header_menu_text_size', 16) }}px; {# header_advanced_options #}
--menu-dropdown-bg:      {{ theme.settings.get('menu_dropdown_bg_color', '#ffffff') }}; {# header_advanced_options #}
--footer-logo-size:      {{ theme.settings.get('footer_logo_size', 128) }}px;     {# footer_advanced_options #}
--footer-height:         {{ theme.settings.get('footer_height', 64) }}px;         {# footer_advanced_options #}
```

*Set the header logo to 80px, turn `header_advanced_options` off, save → the logo stays 80px and the
control to change it back is gone.*

---

### 2.3 `required` field nested inside a `collection` blocks *every* save

A collection whose nested field is `required: true`. If the defaults don't populate, the row renders
empty, fails validation, and blocks saving **any** theme setting — not just that section.

```json
{ "type": "string", "format": "image", "value": null,
  "id": "footer_payment_methods.image", "required": true }
```

**Detect:**
```bash
grep -n '"required"[[:space:]]*:[[:space:]]*true' twilight.json
```
then check whether each hit sits inside a `"format": "collection"` block.

**Reproduce:** enable the collection's parent switch → an empty row appears → change any *unrelated*
setting → save fails validation until the blank row is deleted.

**Fix:** either ship defaults that actually populate, or drop `required` on nested collection fields.

*Status in Alwan: **still open** — default rows now exist in `twilight.json`, but
`footer_payment_methods.image` is still `required: true`. Re-test the empty-row case in the editor.*

---

### 2.4 Dead settings (defined in `twilight.json`, never read)

A setting the merchant can change that is wired to nothing.

```twig
{# BROKEN — CSS background with no settings-driven size #}
<div class="lazy__bg lazy" data-bg="{{ item.image.url }}"></div>
```
```twig
{# FIXED #}
<div class="lazy__bg lazy" data-bg="{{ item.image.url }}"
     style="background-size: {{ theme.settings.get('squar_photo_bg_image_size', 'contain') }};"></div>
```

**Tailwind caveat:** a setting consumed only inside an interpolated class name
(`class="object-{{ theme.settings.get('slider_background_size') }}"`) can be purged. Confirm the class
literals are in `safelist` in `tailwind.config.js`, appear literally somewhere Tailwind scans, or are
present in the built `public/app.css`. Inline `style` (as above) sidesteps the problem entirely.

*Status in Alwan: fixed (`components/home/square-photos.twig:26`).*

---

### 2.5 Label overpromises scope

A setting labelled as store-wide with exactly one consumer:

```twig
{# components/home/brands.twig:8 — the only place this is read #}
{% set display_all_url = theme.settings.get('is_more_button_enabled') %}
```

**Detect:** count consumers per id; if the label says "all" / "everywhere" but there's one hit, either
the label is wrong or the wiring is incomplete.

**Reproduce:** turn it off → only that one section changes.

*Status in Alwan: **still open** — one consumer.*

---

### 2.6 Phantom settings (read in code, missing from `twilight.json`)

The merchant sees no control and the value is frozen at whatever the template's fallback is.

```twig
{# master.twig — was frozen at 248 until the id was added to twilight.json #}
{% set pre_loade_logo = theme.settings.get('preloader_logo_size', 248) %}
```

**Detect:** the `PHANTOM` section of the triage script below.

*Status in Alwan: `preloader_logo_size` fixed. **Two still open** —
`mail_list_title` and `mail_list_subtitle` (`components/footer/footer.twig:99,102`) are read with
hardcoded Arabic fallbacks but have no entry in `twilight.json`, so the newsletter heading and
subheading can't be edited or translated.*

---

## 3. Triage script

```bash
#!/usr/bin/env bash
# run from the theme root
set -euo pipefail

grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' twilight.json \
  | sed 's/.*"\([^"]*\)"$/\1/' | sort -u > /tmp/tw_ids.txt

grep -rhoE "settings\.get\(['\"][^'\"]+" src/ \
  | sed "s/.*['\"]//" | sort -u > /tmp/tw_used.txt

echo "== PHANTOM (read in src/, missing from twilight.json) =="
comm -13 /tmp/tw_ids.txt /tmp/tw_used.txt

echo
echo "== DEAD (in twilight.json, never read) =="
comm -23 /tmp/tw_ids.txt /tmp/tw_used.txt

echo
echo "== NEAR-MISS ids (same after normalising '-' to '_', but spelled differently) =="
cat /tmp/tw_ids.txt /tmp/tw_used.txt | sort -u \
  | awk '{n=$0; gsub(/-/,"_",n); print n"\t"$0}' | sort \
  | awk -F'\t' '{if($1==p && $2!=q) print "  "q"  <->  "$2; p=$1; q=$2}'

echo
echo "== required:true (check each for collection nesting) =="
grep -n '"required"[[:space:]]*:[[:space:]]*true' twilight.json
```

Reading the output:

- **PHANTOM** — real bugs, except doc-comment noise. In Alwan, `my_var` comes from the Twig variable
  reference table in `master.twig`; ignore it.
- **DEAD** — includes false positives. Collection sub-fields use dotted ids
  (`footer_payment_methods.image`) and are read as loop variables in Twig, so they always appear here.
  Component field ids live in `twilight.json` too and are read via `component.*`, not
  `theme.settings.get()`. Filter both out by hand.
- **NEAR-MISS** — empty output is the healthy case.

Alwan's current counts: 209 ids in `twilight.json`, 85 read via `theme.settings.get()`.

---

## 4. Live-test checklist

Verify each in the preview iframe:

- Preloader (+ logo size)
- Add-to-cart toast
- WhatsApp button — and that it stays hidden when the number field is empty
- Scroll-to-top button
- Sticky header, mega menu, more-menu, dark topnav
- Advert bar, important links
- All theme colors — verify via CSS custom properties, not by eye
- Header advanced group (heights, background color)
- Footer group, including payment methods
- Email subscription block (heading, subheading, list URL, audience id, input field)
- Product card color and every advanced sub-setting (see 2.2)
- Product breadcrumbs, description position, sticky add-to-cart
- Slider background size (contain vs cover)
- Every `conditions`-gated show/hide, in **both** parent states

**Before finishing:** restore all changed values, save, confirm the success toast
("حفظت التغييرات بنجاح"), and report any test values left behind (e.g. a dummy WhatsApp number).

---

## 5. Environment gotchas

- Hard-refresh the theme editor after it opens, or it won't load your local theme files.
- Skip Salla-native settings — you don't control them. In Alwan: `arabic_numbers`,
  `content_copyright`, `display_copyright`, `is_breadcrumbs`, `is_equal_cart_height`.
- The preview iframe is cross-origin (`salla.design`); you can't inspect it from the editor page.
  Verify visually via screenshots instead of reaching into it.
- Sustained automation freezes the editor renderer. Pace the clicks; if it stops painting, reload
  (unsaved changes are lost) and re-apply.
