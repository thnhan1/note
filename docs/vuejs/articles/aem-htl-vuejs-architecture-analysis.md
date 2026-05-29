# Phân tích kiến trúc AEM HTL + Vue.js Frontend

> Bài phân tích thực chiến — không phải tutorial. Đặt câu hỏi trước khi code: ClientLibs đặt ở đâu? Bundle JS có lãng phí không? Style System AEM bị ảnh hưởng thế nào khi dùng Vue?

---

## 1. Bức tranh tổng thể kiến trúc

AEM HTL + Vue.js **không phải SPA**. Đây là **Server-Side Rendered HTML với JavaScript enhancement** — còn gọi là **Islands Architecture** trong thuật ngữ modern web.

```
┌────────────────────────────────────────────────────────┐
│                    AEM Page (SSR)                      │
│                                                        │
│  ┌──────────────────┐   ┌──────────────────┐           │
│  │  Static Component│   │  Static Component│           │
│  │  (HTL only)      │   │  (HTL only)      │           │
│  └──────────────────┘   └──────────────────┘           │
│                                                        │
│  ┌──────────────────┐   ┌──────────────────┐           │
│  │  Vue Island 🏝️   │   │ Vue Island 🏝️   │           │
│  │  HelloBanner     │   │  ProductFilter   │           │
│  │  (Vue instance)  │   │  (Vue instance)  │           │
│  └──────────────────┘   └──────────────────┘           │
│                                                        │
└────────────────────────────────────────────────────────┘
         ↑ Toàn bộ trang do AEM render (HTL/SSR)
         ↑ Chỉ các "island" Vue mới có JS reactivity
```

AEM render toàn bộ HTML trên server. Vue **không** kiểm soát router, không hydrate toàn trang — chỉ mount vào từng element cụ thể. Đây vừa là **ưu điểm** (SEO tốt, AEM author experience nguyên vẹn) vừa là **hạn chế** (không phải Vue SPA thuần túy).

---

## 2. ClientLibs — Đặt ở đâu và tại sao?

### 2.1 Hai chiến lược đặt ClientLib

#### Chiến lược A: ClientLib gắn vào Page Component (phổ biến nhất)

```
ui.apps/.../clientlibs/
└── clientlib-site/          ← Một bundle duy nhất
    ├── .content.xml         ← categories="[mysite.site]"
    ├── js/site.js           ← Webpack output (toàn bộ Vue + components)
    └── css/site.css         ← Toàn bộ CSS
```

ClientLib được include trong **page template** HTL:

```html
<!-- apps/mysite/components/page/custompage.html -->
<head>
  <sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html"
       data-sly-call="${clientlib.css @ categories='mysite.site'}" />
</head>
<body>
  ${sling:include('body.html')}

  <!-- JS ở cuối body -->
  <sly data-sly-call="${clientlib.js @ categories='mysite.site'}" />
</body>
```

**Kết quả:** Mọi trang đều load cùng một bundle `site.js`.

---

#### Chiến lược B: ClientLib gắn vào từng Component (granular)

```
ui.apps/.../components/content/hellobanner/
├── .content.xml
├── hellobanner.html
└── clientlibs/
    └── clientlib-hellobanner/
        ├── .content.xml     ← categories="[mysite.hellobanner]"
        ├── js/hellobanner.js
        └── css/hellobanner.css
```

Include trong component HTL:

```html
<!-- hellobanner.html -->
<sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html" />
<sly data-sly-call="${clientlib.all @ categories='mysite.hellobanner'}" />

<div data-vue-component="HelloBanner"
     data-prop-title="${model.title}">
</div>
```

**Kết quả:** JS/CSS của `HelloBanner` chỉ load khi component này xuất hiện trên trang.

---

### 2.2 So sánh hai chiến lược

| Tiêu chí | Page-level ClientLib | Component-level ClientLib |
|---|---|---|
| **Vị trí include** | Page template (`custompage.html`) | Component HTL (`hellobanner.html`) |
| **Load khi nào** | Mọi trang, luôn luôn | Chỉ khi component có mặt trên trang |
| **Số HTTP request** | 1 request / page | N requests (1 per component) |
| **Cache browser** | Tốt — 1 file ổn định | Kém hơn — nhiều file |
| **Bundle size** | Lớn hơn (tất cả components) | Nhỏ hơn per page |
| **AEM ClientLib merging** | AEM tự merge nếu cùng page | AEM merge theo thứ tự xuất hiện |
| **Phù hợp với** | Vue island pattern | Component độc lập, lazy load |

::: tip Khuyến nghị thực tế cho AEM 6.5
Dùng **Page-level ClientLib** cho Vue bundle. Lý do:
1. Vue runtime (~30KB gzip) nên load một lần duy nhất
2. AEM ClientLib merging đã xử lý deduplication
3. Browser cache hiệu quả hơn với 1 file lớn so với nhiều file nhỏ
4. Tránh race condition khi nhiều component load JS cùng lúc

Chỉ dùng Component-level ClientLib cho **CSS thuần** (styles không cần Vue) hoặc **third-party lib** nặng chỉ dùng trong 1 component cụ thể.
:::

---

## 3. Bundle JS — Có lãng phí không?

### 3.1 Phân tích vấn đề

Với Chiến lược A (Page-level), `site.js` chứa **tất cả Vue components**, kể cả component không xuất hiện trên trang hiện tại.

```
Trang chủ:  [HeroBanner] [ProductSlider] [Newsletter]
site.js:    HeroBanner + ProductSlider + Newsletter + ContactForm + SearchWidget + ...
                                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                      Không dùng nhưng vẫn download
```

**Thực tế có lãng phí không?** → **Có, nhưng ít nghiêm trọng hơn bạn nghĩ.**

### 3.2 Tại sao chấp nhận được trong AEM

```
Vue 2 runtime minified+gzip:  ~23KB
1 SFC component trung bình:    ~2–5KB gzip
10 components:                 ~20–50KB gzip
Tổng bundle thực tế:          ~50–80KB gzip
```

So với SPA hiện đại (React/Next.js baseline ~100–200KB), đây là con số nhỏ. AEM page thường có nhiều image, font, third-party script nặng hơn nhiều.

**Vấn đề thực sự** không phải download size mà là **parse + execute time** — nhưng Vue 2 nhẹ đủ để không gây vấn đề trên modern browser.

### 3.3 Khi nào THỰC SỰ cần tách bundle?

Chỉ tách bundle khi:

```js
// ❌ Đừng bỏ vào site.js chung:
import * as echarts from 'echarts'       // ~500KB
import fullcalendar from '@fullcalendar' // ~200KB
import { Editor } from '@tiptap/core'    // ~150KB
```

Với các lib nặng, dùng **Dynamic Import** kết hợp Component-level ClientLib:

```js
// main.js — chỉ load khi element tồn tại trên trang
const chartEl = document.querySelector('[data-vue-component="ChartWidget"]');
if (chartEl) {
  // Webpack code-split: chỉ download khi cần
  import('./components/ChartWidget.vue').then(({ default: ChartWidget }) => {
    new Vue({ el: chartEl, render: h => h(ChartWidget, { props: parseProps(chartEl) }) });
  });
}
```

### 3.4 Webpack Bundle Analysis

Dùng `webpack-bundle-analyzer` để kiểm tra:

```bash
cd ui.frontend
npm install --save-dev webpack-bundle-analyzer
```

```js
// webpack.prod.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',       // tạo file HTML báo cáo
      reportFilename: 'bundle-report.html',
      openAnalyzer: false
    })
  ]
};
```

```bash
npm run build
# Mở bundle-report.html để xem breakdown
```

---

## 4. Đăng ký Component — Vấn đề gì phát sinh?

### 4.1 Component name collision

Khi dùng `require.context` auto-import, tên file là key của registry. Nếu hai component khác folder cùng tên file:

```
components/
├── hero/Banner.vue       → registry key: "Banner"
└── product/Banner.vue    → registry key: "Banner" ← ĐÈ lên cái trên!
```

**Fix:** Dùng full path làm key, hoặc đổi tên file:

```js
requireComponent.keys().forEach(filePath => {
  const Component = requireComponent(filePath).default;

  // Dùng path đầy đủ làm key để tránh collision
  // './hero/Banner.vue' => 'HeroBanner'
  const componentName = filePath
    .replace(/^\.\//, '')     // bỏ './'
    .replace(/\.vue$/, '')    // bỏ '.vue'
    .replace(/\//g, '')       // bỏ '/' => 'heroBanner'
    // Hoặc PascalCase: 'hero/Banner' => 'HeroBanner'
    .split('/')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

  componentRegistry[componentName] = Component;
});
```

### 4.2 Component mount trước khi DOM render xong

AEM Author mode thêm edit layer (overlay) làm DOM thay đổi sau `DOMContentLoaded`. Component Vue đã mount vào element bị AEM di chuyển → Vue mất reference.

```js
// ❌ Dễ gặp vấn đề trong Author mode
document.addEventListener('DOMContentLoaded', mountVueComponents);

// ✅ Dùng MutationObserver để handle dynamic DOM trong Author mode
function mountVueComponents() {
  document.querySelectorAll('[data-vue-component]:not([data-vue-mounted])').forEach(el => {
    el.setAttribute('data-vue-mounted', 'true'); // đánh dấu đã mount
    const componentName = el.getAttribute('data-vue-component');
    const Component = componentRegistry[componentName];
    if (Component) {
      new Vue({ el, render: h => h(Component, { props: parseProps(el) }) });
    }
  });
}

// Mount lần đầu
document.addEventListener('DOMContentLoaded', mountVueComponents);

// Re-mount khi Author thêm component mới (drag & drop)
if (typeof window.Granite !== 'undefined') {
  const observer = new MutationObserver(mountVueComponents);
  observer.observe(document.body, { childList: true, subtree: true });
}
```

---

## 5. AEM Style System và Vue — Xung đột ở đâu?

### 5.1 Style System hoạt động thế nào

AEM Style System cho phép Author chọn CSS class từ dialog, AEM inject class vào wrapper div của component:

```html
<!-- AEM Style System inject class vào wrapper ngoài cùng -->
<div class="aem-Grid-column mysite-hellobanner mysite-hellobanner--dark-theme">
  <!-- Component HTL render bên trong -->
  <div data-vue-component="HelloBanner"
       data-prop-title="...">
  </div>
</div>
```

### 5.2 Vấn đề với `scoped` styles của Vue

Vue SFC với `&lt;style scoped&gt;` thêm attribute selector `[data-v-xxxxxx]` vào tất cả rules:

```css
/* Vue compile thành: */
.hello-banner[data-v-a1b2c3] { ... }
.hello-banner__title[data-v-a1b2c3] { ... }
```

**Vấn đề:** Style System inject class vào **wrapper div bên ngoài** — wrapper đó không có `data-v-xxxxxx` → CSS scoped không áp dụng được cho wrapper.

```html
<!-- Style System thêm class ở đây -->
<div class="mysite-hellobanner--dark-theme">  <!-- KHÔNG có data-v-xxxxxx -->

  <!-- Vue render bên trong này mới có data-v-xxxxxx -->
  <div class="hello-banner" data-v-a1b2c3>
    ...
  </div>

</div>
```

### 5.3 Giải pháp: Đọc class từ wrapper rồi bind vào Vue

```html
<!-- hellobanner.html: truyền style classes xuống làm prop -->
<div data-vue-component="HelloBanner"
     data-prop-title="${model.title}"
     data-prop-style-classes="${cssClassName}">
     <!-- cssClassName = classes được AEM Style System inject -->
</div>
```

```java
// Sling Model đọc cssClassName từ Style System
@ScriptVariable
private Style currentStyle;

public String getCssClassName() {
    // AEM Style System lưu class trong currentStyle
    return currentStyle != null ? currentStyle.get("cssClassName", String.class) : "";
}
```

```vue
<!-- HelloBanner.vue nhận styleClasses làm prop -->
<template>
  <div class="hello-banner" :class="styleClassesArray">
    <!-- ... -->
  </div>
</template>

<script>
export default {
  props: {
    styleClasses: { type: String, default: '' }
  },
  computed: {
    styleClassesArray() {
      return this.styleClasses
        .split(' ')
        .filter(Boolean)
        .reduce((acc, cls) => ({ ...acc, [cls]: true }), {});
    }
  }
}
</script>
```

### 5.4 Giải pháp thay thế: Không dùng `scoped`, dùng BEM

Trong context AEM, `&lt;style scoped&gt;` gây nhiều rắc rối hơn lợi ích. Khuyến nghị dùng **BEM naming** thay thế:

```vue
<!-- ✅ Không dùng scoped — dùng BEM prefix đủ để tránh conflict -->
<style>
/* Prefix rõ ràng thay vì scoped */
.vue-hello-banner { }
.vue-hello-banner__title { }
.vue-hello-banner__cta { }
.vue-hello-banner--dark { }
</style>
```

::: warning Style System class phải nằm ngoài Vue component
AEM Style System inject class vào wrapper **do AEM quản lý**, không phải do Vue render. Không bao giờ expect Style System class xuất hiện bên trong `&lt;template&gt;` của Vue component.
:::

---

## 6. CSS — Đặt ở đâu trong dự án AEM?

### 6.1 Sơ đồ quyết định CSS

```
CSS này dùng cho gì?
│
├── Layout / Grid / Page structure
│   → ui.apps/clientlibs/clientlib-base/css/
│   → Include sớm trong <head>
│
├── AEM Core Components overrides
│   → ui.apps/clientlibs/clientlib-site/css/
│   → BEM overrides, không dùng scoped
│
├── Vue component styles (không cần SSR fallback)
│   → ui.frontend/src/components/*.vue <style> block
│   → Webpack extract thành site.css
│
└── Critical CSS (above-the-fold)
    → Inline trong <head> qua HTL
    → Tránh FOUC (Flash of Unstyled Content)
```

### 6.2 Cấu trúc ClientLib thực tế cho dự án Vue+AEM

```
ui.apps/.../clientlibs/
│
├── clientlib-base/              ← CSS reset, grid, typography
│   ├── .content.xml             ← categories="[mysite.base]"
│   └── css/base.css
│
├── clientlib-site/              ← Main bundle (Vue output)
│   ├── .content.xml             ← categories="[mysite.site]"
│   │                                depends="[mysite.base]"
│   ├── js/site.js               ← Webpack output: Vue runtime + components
│   └── css/site.css             ← Webpack output: component styles
│
└── clientlib-author/            ← Chỉ load trong Author mode
    ├── .content.xml             ← categories="[mysite.author]"
    │                                embed="[mysite.base,mysite.site]"
    └── js/author-overrides.js   ← Fix UI quirks trong Author mode
```

### 6.3 Thứ tự load CSS tránh FOUC

```html
<!-- custompage.html — thứ tự quan trọng -->
<head>
  <!-- 1. Base styles trước (reset, grid) -->
  <sly data-sly-call="${clientlib.css @ categories='mysite.base'}" />

  <!-- 2. Site styles (Vue component CSS) -->
  <sly data-sly-call="${clientlib.css @ categories='mysite.site'}" />

  <!-- 3. KHÔNG để JS trong <head> — Vue mount sau khi DOM render xong -->
</head>

<body>
  <!-- Content -->
  ...

  <!-- 4. JS cuối body: Vue runtime + mount logic -->
  <sly data-sly-call="${clientlib.js @ categories='mysite.site'}" />
</body>
```

::: danger JS trong `&lt;head&gt;` → Vue mount trước DOM → crash
Nếu include JS trong `&lt;head&gt;` mà không có `defer`, `mountVueComponents()` chạy trước khi body render xong → `querySelectorAll('[data-vue-component]')` trả về rỗng → không có gì được mount.

Luôn để JS **cuối `&lt;body&gt;`** hoặc dùng `defer`:
```html
<script src="..." defer></script>
```
:::

---

## 7. Tổng kết — Decision matrix

### Khi nào dùng gì?

| Câu hỏi | Trả lời |
|---|---|
| **ClientLib gắn vào Page hay Component?** | Page-level cho Vue bundle. Component-level chỉ cho CSS riêng biệt hoặc heavy lib |
| **Bundle JS có lãng phí không?** | Chấp nhận được nếu < 100KB gzip. Tách bundle khi import lib nặng (charts, editor) |
| **Dùng `scoped` styles không?** | **Không** — dùng BEM prefix thay thế. `scoped` xung đột với Style System |
| **Style System AEM có dùng được không?** | Có, nhưng phải truyền class xuống làm prop hoặc để CSS không scoped |
| **Author mode có cần xử lý thêm?** | Có — dùng `data-vue-mounted` guard hoặc MutationObserver nếu component bị re-render |
| **JS đặt ở cuối body hay `&lt;head&gt;`?** | **Cuối body** hoặc `defer`. Tuyệt đối không để blocking JS trong `&lt;head&gt;` |

### Tóm tắt kiến trúc lý tưởng

```
ui.frontend/
├── src/
│   ├── main.js               ← Entry: auto-import + mount logic
│   ├── components/           ← Vue SFCs (BEM styles, không scoped)
│   └── styles/
│       ├── _variables.scss   ← Design tokens
│       └── _base.scss        ← Global styles
└── webpack.prod.js           ← Output → clientlib-site/js + css

ui.apps/.../clientlibs/
├── clientlib-base/           ← CSS reset (load trước, không phụ thuộc Vue)
└── clientlib-site/           ← Vue bundle (JS + CSS, load sau)

ui.apps/.../components/
└── {component}/
    ├── .content.xml
    ├── {component}.html      ← Mount point: data-vue-component + data-prop-*
    └── _cq_dialog/           ← Author dialog
```

> **Nguyên tắc vàng:** AEM quản lý content và layout. Vue quản lý interactivity trong từng "island". Không để Vue biết về AEM, không để AEM biết về Vue internals — chỉ giao tiếp qua `data-*` attributes.
