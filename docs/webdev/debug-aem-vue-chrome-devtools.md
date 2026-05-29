---
title: Debug JS/HTML/CSS trong AEM + Vue 2 với Chrome DevTools
description: Hướng dẫn chuyên sâu cách debug component Vue 2 (custom tag dạng <my-vue-cmp>) render trong AEM 6.5 bằng Chrome DevTools — Elements, Console, Sources, Network, Performance, Vue Devtools.
---
# Debug JS/HTML/CSS trong AEM + Vue 2 với Chrome DevTools

> Bài viết tổng hợp quy trình debug **chuyên nghiệp** cho dự án AEM 6.5 on-premise tích hợp Vue 2.7, nơi `ui.frontend` build ra clientlib JS, còn AEM HTL render HTML thường với **custom tag** kiểu `<my-vue-cmp data-...>`. Tập trung vào Chrome DevTools: **Elements, Console, Sources, Network, Performance, Application** và **Vue.js devtools** extension.

---

## 1. Bối cảnh: Vue build thành clientlib, AEM HTL render custom tag

Đây **không phải Vue SPA**. Kiến trúc thực tế trong dự án:

```
[ ui.frontend ]                        [ AEM 6.5 server ]
 ┌──────────────────────────┐
 │ MyVueCmp.vue             │
 │ main.js (đăng ký tag)    │   build  ┌───────────────────────────┐
 │ webpack.config           │ ───────► │ clientlib-site.js / .css  │
 └──────────────────────────┘          │  (Vue runtime + bundle)   │
                                       └─────────────┬─────────────┘
                                                     │ <script src=...>
                                                     ▼
[ HTL render server-side ]               [ Browser ]
 ┌──────────────────────────┐            ┌───────────────────────────┐
 │ Sling Model → HTL        │  HTML →    │ <my-vue-cmp data-...>     │
 │ <my-vue-cmp data-title=  │            │   (HTMLUnknownElement)    │
 │   "${hero.title}"        │            │           ↓ bootstrap     │
 │   data-items=            │            │   Vue đọc data-* và       │
 │   "${hero.itemsJson}">   │            │   upgrade thành component │
 └──────────────────────────┘            └───────────────────────────┘
```

**3 điều quan trọng để debug đúng:**

1. **HTL chạy server-side, Vue chạy client-side — chúng không hiểu nhau.** AEM xuất HTML thuần. Mọi cú pháp Vue như `:title="..."`, `v-bind:items="..."`, `v-if="..."` trong HTL sẽ **không được Vue compile** (vì không có root Vue instance bao quanh). Chúng chỉ là attribute string nằm trên DOM.
2. **Props truyền qua `data-*` attribute hoặc JSON string**, do component Vue tự đọc trong `created()` / `mounted()` rồi `JSON.parse`.
3. **Mỗi custom tag tự bootstrap thành 1 Vue instance riêng**, không có root chung. Lỗi 1 component không kéo sập cả page.

### HTL template — chỉ là HTML thuần

```html
<!-- /apps/myproject/components/hero/hero.html -->
<sly data-sly-use.hero="com.example.HeroModel"></sly>

<my-vue-cmp
  data-title="${hero.title @ context='attribute'}"
  data-image="${hero.imageSrc @ context='attribute'}"
  data-items="${hero.itemsJson @ context='attribute'}">
</my-vue-cmp>
```

> `hero.itemsJson` ở Sling Model trả về **chuỗi JSON đã serialize** (vd `[{&quot;id&quot;:1}]` sau HTL escape). Không có dấu `:` hay `v-bind` ở đây — AEM không biết đến Vue.

### Bundle Vue — đăng ký + bootstrap tag

```js
// ui.frontend/src/main.js  → build ra clientlib-site.js
import Vue from 'vue';
import MyVueCmp from './components/MyVueCmp.vue';

// Đăng ký global component với tên = custom tag dùng trong HTL
Vue.component('my-vue-cmp', MyVueCmp);

// Tắt cảnh báo "unknown custom element" cho tag không đăng ký (nếu có)
Vue.config.ignoredElements = [/^cq-/];

document.addEventListener('DOMContentLoaded', () => {
  // Cách phổ biến: mount từng custom tag thành 1 instance riêng,
  // dùng render function để không cần Vue compiler ở runtime build.
  document.querySelectorAll('my-vue-cmp').forEach((el) => {
    const props = {
      title:  el.dataset.title,
      image:  el.dataset.image,
      items:  safeJsonParse(el.dataset.items, []),
    };
    new Vue({
      render: (h) => h(MyVueCmp, { props }),
    }).$mount(el); // thay thế <my-vue-cmp> bằng template render
  });
});

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); }
  catch (e) { console.error('[bootstrap] JSON parse fail:', str, e); return fallback; }
}
```

> Tuỳ team, có thể dùng [`vue-custom-element`](https://github.com/karol-f/vue-custom-element) để biến `MyVueCmp` thành **real Custom Element** (browser tự upgrade khi gặp tag, không cần `forEach` thủ công). Cách debug bên dưới vẫn áp dụng được.

### Đặc thù khi debug

- **Trước khi `clientlib-site.js` chạy xong**: trình duyệt thấy `<my-vue-cmp>` là **HTMLUnknownElement** (không có style mặc định, là `display: inline`). CSS cho element này phải dùng selector `my-vue-cmp { display: block; }` hoặc set `display` trong root template.
- **Sau khi bootstrap**: `$mount(el)` **thay thế** `<my-vue-cmp>` bằng root element trong template Vue → mọi `class`/`data-*` đặt thủ công trên `<my-vue-cmp>` trong HTL sẽ **biến mất**, trừ khi component template có `v-bind="$attrs"` + `inheritAttrs: true`.
- **JSON từ HTL hay lỗi escape**: HTL escape `"` thành `&quot;`. Khi `JSON.parse(el.dataset.items)` lỗi mà bạn `try/catch` nuốt → component render rỗng, không có error đỏ. Section 4 sẽ dạy cách phát hiện.
- **AEM Author** chạy trong **iframe** (`/editor.html`) → DevTools mặc định trỏ top frame, không thấy được Vue instance của trang. Section 2 xử lý.
- **Clientlib cache**: AEM cache JS/CSS rất aggressive ở `/etc.clientlibs`. Sửa code không thấy đổi → check Network mục 6.

Phần còn lại của bài đi từng tab DevTools để xử lý các đặc thù trên.

---

## 2. Mở DevTools đúng cách trên AEM Author

### 2.1. Author dùng iframe — phải chọn đúng frame

Khi mở `http://localhost:4502/editor.html/content/myproject/en.html`, trang thật của bạn nằm trong iframe `ContentFrame`. Console mặc định trỏ vào **top frame** (editor shell), không phải trang.

Trong **Console**, mở dropdown **JavaScript context** (góc trên trái, mặc định là `top`) → chọn frame chứa nội dung (thường là `ContentFrame` hoặc URL `/content/...wcmmode=...`).

> 📍 **Vị trí UI:** Console toolbar → dropdown **JavaScript context** (góc trên trái, mặc định hiển thị `top`) → chọn frame con (vd `ContentFrame`).
>
> 📷 Ảnh minh hoạ chính thức: [Console → Select JavaScript context](https://developer.chrome.com/docs/devtools/console/reference#context)

> Nếu bạn `console.log(window.Vue)` mà ra `undefined`, 90% là đang ở sai frame.

### 2.2. So sánh 3 chế độ AEM

| URL | Mục đích | Lưu ý debug |
| --- | --- | --- |
| `/editor.html/content/...html` | Author Edit | Có iframe, có overlay của AEM, Vue có thể bị chặn click |
| `/content/...html?wcmmode=disabled` | Preview như Publish | **Luôn debug ở đây trước**, sạch nhất |
| `/content/...html` (Publish) | Production | Không có dispatcher cache trên local nếu đi thẳng publish:4503 |

Quy tắc: **bug Vue/JS/CSS → debug ở `wcmmode=disabled` trước**, sau đó mới kiểm tra Author để xem có conflict với AEM editor không.

---

## 3. Tab **Elements** — Debug HTML và CSS

### 3.1. Kiểm tra custom tag đã được Vue thay thế chưa

Mở Elements, tìm `my-vue-cmp`. Có 3 trạng thái cần phân biệt:

1. **Còn nguyên `<my-vue-cmp data-title="...">...</my-vue-cmp>`** → Vue **chưa mount** (lỗi script, sai selector mount, JS chưa load).
2. **Tag biến thành template trong component** (vd `<section class="hero">...`) → mount OK.
3. **Tag tồn tại nhưng rỗng** → Vue mount nhưng `template` không render được (lỗi prop, lỗi `v-if`).

> Trick: chuột phải vào element → **Store as global variable** → `temp1.__vue__` để truy cập instance Vue ngay trong Console (nếu Vue 2 ở development build).

```js
// Trong Console sau khi Store as global variable
temp1.__vue__              // VueComponent instance
temp1.__vue__.$props       // props đang nhận
temp1.__vue__.$data        // data hiện tại
temp1.__vue__.$options.name
```

> 📍 **Vị trí UI:** Elements → chuột phải element → **Store as global variable** → Console gõ `temp1.__vue__`.
>
> 📷 Ảnh minh hoạ chính thức: [Console utilities — `$0`, `temp1`](https://developer.chrome.com/docs/devtools/console/utilities#recent)

### 3.2. Force state để debug `:hover`, `:focus`, `:active`

Khi style chỉ sai lúc hover/focus mà bạn không thể giữ chuột để xem panel Styles:

Elements → chọn element → panel **Styles** → biểu tượng **`:hov`** → tick `:hover`, `:focus-within`, `:active`, `:visited`.

> 📍 **Vị trí UI:** Elements → panel **Styles** (bên phải) → toolbar trên cùng có nút **`:hov`** → tick các pseudo-state.
>
> 📷 Ảnh minh hoạ chính thức: [Force a state on an element](https://developer.chrome.com/docs/devtools/css/reference#pseudo-class)

### 3.3. Computed + Specificity

Tab **Computed** trong Styles cho biết **giá trị cuối cùng** của mỗi property và **CSS rule nào thắng**. Khi style không apply, đừng đoán — mở Computed, click property → DevTools nhảy thẳng tới rule đang thắng.

Các nguyên nhân override điển hình trong AEM:

- CSS của **clientlib `cq.authoring.editor`** chèn vào Author và đè style của bạn (ví dụ `.cq-Editable-dom { ... }`).
- Style inline do Vue binding `:style="..."` (specificity = 1000) đè class.
- **Order clientlib**: clientlib categories `base` được load sau `site` → đè ngược.

### 3.4. Layout debug: Grid / Flexbox overlay

Click badge **`grid`** hoặc **`flex`** cạnh element trong Elements → DevTools vẽ overlay. Tab **Layout** (cạnh Styles) cho phép bật overlay nhiều grid cùng lúc, hiển thị track-size, gap.

> 📍 **Vị trí UI:** Elements → cạnh element có badge nhỏ **`grid`** / **`flex`** → click để bật overlay. Tab **Layout** ở panel phải để quản lý nhiều overlay.
>
> 📷 Ảnh minh hoạ chính thức: [Inspect CSS grid](https://developer.chrome.com/docs/devtools/css/grid) · [Inspect Flexbox](https://developer.chrome.com/docs/devtools/css/flexbox)

### 3.5. Bug điển hình: attribute biến mất sau mount

Bạn viết:

```html
<my-vue-cmp class="hero-dark" data-track-id="hero-1" :title="..."></my-vue-cmp>
```

Sau khi Vue mount, `class="hero-dark"` và `data-track-id` **biến mất** khỏi root element render. Nguyên nhân: trong `MyVueCmp.vue` bạn có `inheritAttrs: false` hoặc root template render thẻ khác và không bind `$attrs`.

Fix:

```vue
<script>
export default {
  name: 'MyVueCmp',
  inheritAttrs: false, // tự kiểm soát
  props: ['title'],
};
</script>

<template>
  <section v-bind="$attrs" :class="['hero', $attrs.class]">
    <h1>{{ title }}</h1>
  </section>
</template>
```

Cách phát hiện nhanh ngay tại Elements: so sánh outerHTML trước/sau mount bằng cách thêm breakpoint `Subtree modifications` trên parent (xem mục 6.4).

---

## 4. Tab **Console** — Logging chuyên nghiệp

`console.log` không phải tất cả. Trong dự án Vue + AEM legacy, các API sau cực kỳ đắt giá.

### 4.1. Các API ngoài `console.log`

| API | Khi nào dùng |
| --- | --- |
| `console.table(arr)` | Log array of objects (ví dụ items render từ HTL JSON) — xem dạng bảng |
| `console.dir(el)` | Xem **DOM element** dưới dạng object JS, thấy đủ properties (kể cả `__vue__`) |
| `console.group` / `groupCollapsed` / `groupEnd` | Gom log của 1 component theo cây |
| `console.time('mount')` / `timeEnd('mount')` | Đo thời gian mount Vue |
| `console.count('render hero')` | Phát hiện component re-render quá nhiều |
| `console.assert(cond, msg)` | Log có điều kiện, không spam khi đúng |
| `console.trace()` | Stack trace tại điểm hiện tại — tìm ai gọi function |

```js
// Trong mounted() của MyVueCmp
console.groupCollapsed('[MyVueCmp] mounted', this.$el);
console.table(this.items);
console.log('props:', this.$props);
console.trace();
console.groupEnd();
```

> 📍 **Output mong đợi:** Console hiển thị một group có thể collapse với tên `[MyVueCmp] mounted`, bên trong là table các items và stack trace.
>
> 📷 Ảnh minh hoạ chính thức: [`console.table()`](https://developer.chrome.com/docs/devtools/console/api#table) · [`console.group()`](https://developer.chrome.com/docs/devtools/console/api#group)

### 4.2. Log filter bằng prefix

Quy ước team: **mọi log đều có prefix `[ComponentName]`**. Trong Console, gõ filter `[MyVueCmp]` để chỉ xem log của component đó. Khi production cần tắt, chỉ cần build script `terser` xoá `console.*` bằng `drop_console: true`.

### 4.3. Live expression — pin biến để watch

Click biểu tượng **mắt (Create live expression)** trong Console toolbar. Pin `document.querySelectorAll('my-vue-cmp').length` để xem số instance thay đổi real-time khi Author edit.

> 📍 **Vị trí UI:** Console toolbar → biểu tượng **mắt** (`Create live expression`, cạnh nút filter) → nhập biểu thức → expression sẽ pin trên đầu Console và auto-refresh.
>
> 📷 Ảnh minh hoạ chính thức: [Live Expressions in the Console](https://developer.chrome.com/docs/devtools/console/live-expressions)

### 4.4. Conditional logpoint thay vì sửa code

Thay vì thêm `console.log` rồi build lại Webpack (chậm 30–60s với `ui.frontend`), dùng **Logpoint**:

Sources → mở file → chuột phải số dòng → **Add logpoint…** → nhập `'items=', items, 'len=', items.length`.

Logpoint **không sửa file**, không cần rebuild, hoạt động cả với **sourcemap** từ Webpack.

> 📍 **Vị trí UI:** Sources → mở file (Ctrl+P) → **chuột phải vào số dòng** ở cột bên trái → menu hiện ra chọn **Add logpoint…** → gõ biểu thức như khi viết tham số `console.log` (không cần `console.log`, không cần dấu ngoặc).
>
> 📷 Ảnh minh hoạ chính thức: [Log line-of-code breakpoints (Logpoints)](https://developer.chrome.com/docs/devtools/javascript/breakpoints#logpoints)

---

## 5. Tab **Sources** — Breakpoint, Sourcemap, Snippet

### 5.1. Bật và xác minh Sourcemap

`ui.frontend` Webpack mặc định build production không có sourcemap. Để debug code thật trên Author/Publish local:

```js
// webpack.dev.js
module.exports = {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
};
```

Sau khi build, vào **Sources → Page → top → localhost:4502 → etc.clientlibs/...**: bạn phải thấy cây `webpack://` chứa file `.vue` gốc. Nếu không:

- DevTools → **Settings (F1) → Preferences → Sources**: tick **Enable JavaScript source maps** và **Enable CSS source maps**.
- Kiểm tra `Network` request file `.js` có header `SourceMap: ...js.map` không. Nếu thiếu, AEM dispatcher / clientlib có thể đã strip comment `//# sourceMappingURL=`.

### 5.2. Breakpoint loại nào, khi nào

| Loại | Tác dụng | Ví dụ AEM/Vue |
| --- | --- | --- |
| **Line breakpoint** | Dừng tại dòng | Dừng trong `mounted()` của `MyVueCmp` |
| **Conditional breakpoint** | Dừng khi điều kiện đúng | `this.items.length === 0` |
| **Logpoint** | Chỉ log, không dừng | Log props mỗi lần `updated()` |
| **DOM breakpoint** | Dừng khi DOM thay đổi | Phát hiện ai sửa `class` của `<my-vue-cmp>` |
| **XHR/fetch breakpoint** | Dừng khi gọi URL chứa string | Dừng khi gọi `/bin/myservlet` |
| **Event listener breakpoint** | Dừng khi event xảy ra | `click`, `load`, `DOMContentLoaded` |

### 5.3. Debug bug "Vue chưa mount"

Triệu chứng: `<my-vue-cmp>` còn nguyên trên DOM.

Quy trình debug:

1. **Console** → gõ `Vue` → nếu `undefined` → file Vue chưa load → kiểm tra Network (mục 6).
2. Nếu `Vue` có → gõ `Vue.options.components['my-vue-cmp']` → phải khác `undefined`. Nếu `undefined` → `Vue.component('my-vue-cmp', ...)` chưa chạy → đặt **line breakpoint** tại `Vue.component(` trong `main.js` (Sources → Ctrl+P → main.js).
3. Nếu component đã đăng ký → bug ở vòng bootstrap `forEach(...).$mount(el)`. Đặt breakpoint trên dòng `new Vue({ render: ... }).$mount(el)`:
   - `el` có đúng là `<my-vue-cmp>` không?
   - `el.dataset` có đủ các key không? (HTL ghi sai tên attr → `dataset` thiếu key, im lặng).
   - `safeJsonParse(el.dataset.items)` trả về array hợp lệ hay fallback `[]`?
4. **Timing**: `document.readyState` tại thời điểm bootstrap. Nếu clientlib JS được nhúng ở `<head>` không có `defer`, nó chạy trước khi `<my-vue-cmp>` tồn tại → `querySelectorAll` ra rỗng. Dispatcher / clientlib cần nhúng ở cuối `<body>` hoặc thiết lập `DOMContentLoaded` listener (đã có trong ví dụ mainjs).

### 5.4. DOM breakpoint — bắt thủ phạm sửa DOM

AEM Author chèn rất nhiều DOM (overlay editable). Khi class trên `<my-vue-cmp>` bỗng đổi:

Elements → chuột phải element → **Break on → attribute modifications**.

Khi class thay đổi, DevTools dừng tại **đúng dòng JS** đã sửa, kèm full call stack — có thể là code AEM editor hoặc chính `mounted()` Vue của bạn.

> 📍 **Vị trí UI:** Elements → chuột phải element → **Break on** → chọn 1 trong 3: `subtree modifications` / `attribute modifications` / `node removal`. Element có DOM breakpoint sẽ có chấm xanh nhỏ ở góc.
>
> 📷 Ảnh minh hoạ chính thức: [DOM change breakpoints](https://developer.chrome.com/docs/devtools/javascript/breakpoints#dom)

### 5.5. Snippets — script tái dùng

Sources → tab **Snippets** → New snippet:

```js
// Snippet: list-vue-instances
const tags = document.querySelectorAll('my-vue-cmp');
console.table(
  Array.from(tags).map((el) => ({
    tag: el.tagName,
    mounted: !!el.__vue__,
    name: el.__vue__?.$options.name,
    props: el.__vue__ ? JSON.stringify(el.__vue__.$props) : null,
  }))
);
```

Ctrl+Enter chạy snippet trên trang bất kỳ. Cực hữu ích để **audit** mọi page xem instance Vue nào đã mount.

### 5.6. Override — sửa file production mà không cần build

Khi bug chỉ tái hiện trên Publish/Stage và bạn cần thử fix CSS/JS **ngay trên môi trường đó**:

Sources → tab **Overrides** → **Select folder for overrides** → cấp quyền → giờ mọi file bạn sửa trong Sources sẽ được lưu local và **trình duyệt phục vụ phiên bản local thay vì server**.

> Cảnh báo: dễ quên tắt → tưởng deploy đã fix nhưng thực ra browser vẫn dùng override local. Luôn check chấm tím cạnh file.

> 📍 **Vị trí UI:** Sources → tab **Overrides** (cạnh Page, Filesystem, Snippets — có thể nằm trong menu `>>` nếu panel hẹp) → **Select folder for overrides** → chọn thư mục local → nhấn **Allow** ở banner trên cùng. File đã override có chấm tím cạnh tên.
>
> 📷 Ảnh minh hoạ chính thức: [Local Overrides in DevTools](https://developer.chrome.com/docs/devtools/overrides)

---

## 6. Tab **Network** — JSON từ HTL, clientlib, model.json

### 6.1. Filter cho project AEM

Network gần như **không thể đọc** nếu không filter. Các filter hữu ích:

- `-.png -.jpg -.svg -.woff2` → ẩn asset.
- `clientlib` → chỉ xem JS/CSS của bạn.
- `.model.json` → xem Sling Model export khi dùng SPA Editor / model.json.
- `domain:localhost method:POST` → POST tới AEM (form submit, servlet).

### 6.2. Kiểm tra clientlib có load đúng không

Khi Vue không hoạt động, mở Network, filter `myproject` (tên app). Bạn phải thấy:

```
GET /etc.clientlibs/myproject/clientlibs/clientlib-site.js   200
GET /etc.clientlibs/myproject/clientlibs/clientlib-site.css  200
```

Nếu **404**: clientlib category sai, hoặc chưa deploy `ui.apps`. Mở response để xem nội dung — nhiều khi AEM trả HTML lỗi 404 với `Content-Type: text/html` → `<script>` import sẽ lỗi parse JS.

### 6.3. Disable cache khi debug

DevTools → Network → tick **Disable cache**. Bắt buộc khi sửa CSS clientlib — AEM dispatcher + browser cache rất "lì". Kết hợp `?` hash hoặc xoá `/var/clientlibs/...`.

### 6.4. Inspect XHR/fetch từ Vue

Khi Vue gọi `axios.get('/bin/myservlet')`:

- Cột **Initiator** click vào sẽ chỉ ra **stack trace** từ `axios → action → mounted()` của component nào gọi.
- Tab **Payload** xem query/body.
- Tab **Preview** parse JSON đẹp; **Response** là raw.
- Right-click request → **Copy → Copy as fetch** để replay request trong Console khi test edge case.

> 📍 **Vị trí UI:** Network → click 1 request → tab **Initiator** (cạnh Headers, Payload, Preview, Response) → cây stack trace, click vào dòng nào nhảy thẳng tới Sources.
>
> 📷 Ảnh minh hoạ chính thức: [Network Initiator pane](https://developer.chrome.com/docs/devtools/network/reference#initiator)

### 6.5. Throttle để bắt race condition

Network → **No throttling** → đổi thành **Slow 3G**. Bug "đôi khi data render trống" thường là race giữa `mounted()` và `axios.then()`. Slow 3G làm nó tái hiện 100%.

### 6.6. Search trong tất cả response

Ctrl+F trong panel Network mở **global search**: tìm string trong **mọi response body** — cứu mạng khi cần biết property `firstName` đến từ servlet nào trong 40 request.

---

## 7. Vue.js devtools extension

Cài [Vue.js devtools](https://devtools.vuejs.org/) cho Chrome. Yêu cầu:

- Vue **development build**, không phải `vue.runtime.min.js`. Đặt trong webpack:
  ```js
  resolve: { alias: { vue$: 'vue/dist/vue.esm.js' } }
  // hoặc với production build, bật devtools tay:
  Vue.config.devtools = true;
  ```
- Trên Author iframe: extension thường hiện tab **Vue** rỗng vì nó nhìn top frame. Mở DevTools rồi **Undock to separate window**, chọn frame con như mục 2.1.

Khi hoạt động, tab **Vue** liệt kê cây component, click `<MyVueCmp>` → panel phải hiện `props`, `data`, `computed`. Sửa trực tiếp giá trị → component re-render ngay.

> 📍 **Vị trí UI:** DevTools → tab **Vue** (xuất hiện sau khi cài extension) → cây component bên trái, panel **props/data/computed/events** bên phải. Hover component trong tree → element tương ứng được highlight trên page.
>
> 📷 Ảnh minh hoạ chính thức: [Vue.js devtools — Getting Started](https://devtools.vuejs.org/guide/installation.html)

> Lưu ý production: nhớ tắt `Vue.config.devtools = false` và `Vue.config.productionTip = false` trước khi build prod.

---

## 8. Tab **Performance** — khi page lag sau khi tích hợp Vue

1. Mở `?wcmmode=disabled`.
2. DevTools → Performance → **Record** → reload → stop sau ~5s.
3. Xem track **Main**:
   - Khối tím dài = **Recalculate Style / Layout** → nghi ngờ CSS selector quá rộng (vd `* { box-sizing }` + Vue inline style spam).
   - Khối vàng dài = **Scripting** → click vào để thấy function nào — thường là `Vue.prototype._update` quá nhiều lần → component watcher sai.
4. **Bottom-Up** sort theo Self Time → top function.

Mẹo: bật **Screenshots** và **Memory** khi record để correlate visual ↔ JS heap.

---

## 9. Tab **Application** — clientlib version, storage

- **Frames → top → ContentFrame**: xem document URL thật.
- **Storage → Cookies**: `cq-authoring-mode`, `login-token` — xoá khi test login flow.
- **Local Storage / Session Storage**: nếu Vue lưu state ở đây, dễ kiểm tra hơn `console.log`.
- **Service Workers**: AEM 6.5 thường không có, nhưng nếu dự án có PWA layer, **Unregister** khi debug để tránh phục vụ cache cũ.

---

## 10. Checklist debug nhanh khi `<my-vue-cmp>` "không chạy"

Theo thứ tự, bạn nên kiểm tra:

1. **Đúng frame?** Console context = ContentFrame.
2. **Clientlib JS load 200?** Network filter `clientlib` — các file `.js`/`.css` phải 200, `Content-Type: application/javascript` / `text/css`.
3. **Vue load?** Console: `typeof Vue` = `'function'`. Nếu Vue được bundle inline (không expose ra `window`), thử gõ tên export khác của bundle.
4. **Component đăng ký?** `Vue.options.components['my-vue-cmp']` (nếu Vue trên window) — hoặc đặt logpoint tại dòng `Vue.component('my-vue-cmp', ...)`.
5. **Bootstrap chạy?** Đặt logpoint trong `forEach((el) => { ... })` log `el` và `el.dataset`.
6. **Element tồn tại lúc bootstrap?** `document.querySelectorAll('my-vue-cmp').length` — nếu = 0 tại thời điểm `DOMContentLoaded`, clientlib đang load quá sớm.
7. **`data-*` attribute có đúng?** Elements → chọn `<my-vue-cmp>` → kiểm các attribute. HTL gõ sai tên (`data-Items` vs `data-items`) → `dataset.items` = `undefined`.
8. **JSON parse OK?** Snippet trong Console: `JSON.parse(document.querySelector('my-vue-cmp').dataset.items)` — phải trả array, không throw. HTL escape sai (`@ context='attribute'` thiếu) là nguyên nhân hay gặp nhất.
9. **Sourcemap bật?** Sources thấy file `.vue` gốc.
10. **Không bị AEM editor chặn?** Test ở `?wcmmode=disabled`.
11. **Không có error đỏ trong Console?** (Hiển nhiên — nhưng đôi khi error nằm ở frame khác.)

---

## 11. Phụ lục: Snippet hay dùng

```js
// 1. Dump tất cả Vue instance trên page
copy(JSON.stringify(
  Array.from(document.querySelectorAll('*'))
    .filter(el => el.__vue__)
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      name: el.__vue__.$options.name,
      props: el.__vue__.$props,
    })),
  null, 2
));
```

```js
// 2. Bắt mọi prop thay đổi (Vue 2)
const vm = $0.__vue__; // chọn element trong Elements trước
Object.keys(vm.$props).forEach(k => {
  vm.$watch(k, (n, o) => console.log(`[${vm.$options.name}] ${k}:`, o, '→', n));
});
```

```js
// 3. Highlight mọi <my-vue-cmp> chưa mount
document.querySelectorAll('my-vue-cmp').forEach(el => {
  if (!el.__vue__) el.style.outline = '3px solid red';
});
```

---

## 12. Quy ước team khi debug

- Mọi `console.log` phải có prefix `[ComponentName]`.
- Production build **bắt buộc** strip console (`terser drop_console`).
- Khi report bug: kèm **HAR file** (Network → right-click → Save all as HAR with content) + screenshot Console + URL có `?wcmmode=disabled`.
- Không commit code có `debugger;`.
- Mỗi component Vue có file `.spec.md` ghi: cách mount, prop format, lỗi đã gặp.

---

## Tài liệu tham khảo

- [Chrome DevTools — Overview](https://developer.chrome.com/docs/devtools/)
- [Vue 2 — Production Deployment Tips](https://v2.vuejs.org/v2/guide/deployment.html)
- [AEM 6.5 — Client-Side Libraries](https://experienceleague.adobe.com/docs/experience-manager-65/developing/introduction/clientlibs.html)
- [Webpack Devtool option](https://webpack.js.org/configuration/devtool/)

---

> **Ghi chú về ảnh minh hoạ:** Mỗi mục kèm link 📷 tới **tài liệu chính thức của Chrome DevTools / Vue devtools** nơi có screenshot thật do Google/Vue team bảo trì. Cách này đảm bảo ảnh **luôn mới**, không bị broken khi Chrome update UI, và không phụ thuộc hot-link.
>
> Nếu muốn có screenshot **đúng context AEM Author + Vue của dự án**, hãy tự chụp từ môi trường local (`localhost:4502`), lưu vào `static/img/webdev/`, rồi chèn bằng cú pháp `![mô tả](/img/webdev/ten-file.png)` ngay dưới block `📍 Vị trí UI` tương ứng. Khi đó link 📷 vẫn giữ lại để tham chiếu cross-version.
