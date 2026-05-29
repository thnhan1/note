# Tích hợp Vue 2 vào AEM 6.5 Maven Archetype

> Ghi chú thực chiến: Tích hợp Vue 2.7.x vào `ui.frontend` của AEM Maven archetype 39+, bao gồm đăng ký component, truyền props từ HTL, và mount nhiều Vue instance trên một trang.

## Tổng quan kiến trúc

```
AEM 6.5 Maven Project
├── core/                       ← Sling Models (Java)
├── ui.apps/                    ← Components HTL + .content.xml
│   └── src/main/content/jcr_root/apps/{project}/components/
│       └── vuecomponent/
│           ├── .content.xml
│           └── vuecomponent.html   ← HTL template (mount point)
└── ui.frontend/                ← Webpack + Vue 2
    ├── src/
    │   ├── main.js             ← Entry point, đăng ký Vue components
    │   └── components/
    │       └── VueComponent.vue
    └── webpack.config.js
```

**Luồng dữ liệu:**

```
JCR / Sling Model (Java)
    ↓ expose properties
HTL template (.html)
    ↓ render data-* attributes vào DOM
Vue instance
    ↓ đọc data-* attribute, mount vào element
Component Vue chạy trên browser
```

---

## Bước 1: Tạo AEM Maven Project

Dùng AEM Archetype 39 (phiên bản ổn định nhất với AEM 6.5).

```bash
mvn -B archetype:generate \
  -D archetypeGroupId=com.adobe.aem \
  -D archetypeArtifactId=aem-project-archetype \
  -D archetypeVersion=39 \
  -D appTitle="My Vue Site" \
  -D appId="myvuesite" \
  -D groupId="com.example" \
  -D artifactId="myvuesite" \
  -D package="com.example.myvuesite" \
  -D aemVersion="6.5.0" \
  -D frontendModule="general"
```

::: tip Lưu ý `frontendModule`
Chọn `general` để dùng Webpack thuần. Không chọn `react` hay `angular` vì sẽ kéo theo dependency thừa.
:::

---

## Bước 2: Cài đặt Vue 2 vào ui.frontend

```bash
cd ui.frontend
npm install vue@2.7.16
npm install vue-loader@15 vue-template-compiler@2.7.16 --save-dev
```

::: warning Version phải khớp
`vue` và `vue-template-compiler` phải **cùng minor version**. Ví dụ cả hai đều `2.7.16`.
:::

---

## Bước 3: Cấu hình Webpack

Mở `ui.frontend/webpack.common.js` (hoặc `webpack.config.js` tùy archetype version), thêm `VueLoaderPlugin`:

<Tabs>
  <Tab label="webpack.common.js">

  ```js
  const { VueLoaderPlugin } = require('vue-loader');
  
  module.exports = {
    // ... các config hiện có
  
    module: {
      rules: [
        // --- Thêm rule cho .vue files ---
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        },
  
        // Rule JS hiện có (giữ nguyên)
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: ['babel-loader']
        },
  
        // Rule CSS/SCSS hiện có (giữ nguyên)
        {
          test: /\.scss$/,
          use: ['style-loader', 'css-loader', 'sass-loader']
        }
      ]
    },
  
    plugins: [
      // --- Thêm VueLoaderPlugin ---
      new VueLoaderPlugin(),
      // ... các plugin hiện có
    ],
  
    resolve: {
      extensions: ['.js', '.vue'],   // thêm .vue
      alias: {
        'vue$': 'vue/dist/vue.esm.js'  // dùng full build để hỗ trợ template string
      }
    }
  };
  ```

  </Tab>
</Tabs>

::: tip `vue$` alias
`vue/dist/vue.esm.js` là **full build** (bao gồm cả compiler). Cần thiết nếu bạn dùng `template: '...'` dạng string trong component. Nếu chỉ dùng `.vue` files (SFC) thì có thể dùng `vue/dist/vue.runtime.esm.js` nhẹ hơn.
:::

---

## Bước 4: Tạo Vue Component (SFC)

<Tabs>
  <Tab label="src/components/HelloBanner.vue">

  ```vue
  <template>
    <div class="hello-banner">
      <h2 class="hello-banner__title">{{ title }}</h2>
      <p class="hello-banner__desc">{{ description }}</p>
      <button
        v-if="showButton"
        class="hello-banner__cta"
        @click="handleClick"
      >
        {{ ctaLabel }}
      </button>
      <ul v-if="items.length > 0" class="hello-banner__list">
        <li v-for="(item, index) in items" :key="index">{{ item }}</li>
      </ul>
    </div>
  </template>
  
  <script>
  export default {
    name: 'HelloBanner',
  
    // Props nhận từ data-* attribute ở HTL
    props: {
      title: {
        type: String,
        default: 'Hello AEM'
      },
      description: {
        type: String,
        default: ''
      },
      ctaLabel: {
        type: String,
        default: 'Click me'
      },
      showButton: {
        type: Boolean,
        default: true
      },
      // Array/Object props cần parse từ JSON string
      items: {
        type: Array,
        default: () => []
      }
    },
  
    methods: {
      handleClick() {
        console.log('[HelloBanner] CTA clicked, title:', this.title)
        this.$emit('cta-click', { title: this.title })
      }
    }
  }
  </script>
  
  <style scoped>
  .hello-banner {
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }
  
  .hello-banner__title {
    margin: 0 0 0.5rem;
    font-size: 1.5rem;
  }
  
  .hello-banner__cta {
    margin-top: 1rem;
    padding: 0.5rem 1.25rem;
    background: #1473e6;
    color: #fff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
  </style>
  ```

  </Tab>
</Tabs>

---

## Bước 5: Đăng ký Component & Mount trong main.js

Đây là phần **cốt lõi** của integration. Trong AEM, mỗi component HTL render ra một DOM element riêng — không phải SPA, không có root duy nhất. Ta cần **tìm tất cả mount points và khởi tạo Vue instance cho từng cái**.

<Tabs>
  <Tab label="Thủ công (Registry)">

  ```js
  import Vue from 'vue';
  
  // Import tất cả Vue components
  import HelloBanner from './components/HelloBanner.vue';
  import AnotherWidget from './components/AnotherWidget.vue';
  
  // Map: data-vue-component="HelloBanner" => component class
  const componentRegistry = {
    HelloBanner,
    AnotherWidget,
  };
  
  /**
   * Parse props từ data-* attributes của element.
   *
   * HTL render: <div data-vue-component="HelloBanner"
   *                   data-prop-title="My Title"
   *                   data-prop-show-button="true"
   *                   data-prop-items='["a","b","c"]'>
   *
   * Hàm này trả về: { title: "My Title", showButton: true, items: ["a","b","c"] }
   */
  function parseProps(el) {
    const props = {};
  
    Array.from(el.attributes).forEach(attr => {
      // Chỉ lấy data-prop-* attributes
      if (!attr.name.startsWith('data-prop-')) return;
  
      // "data-prop-show-button" => "showButton" (camelCase)
      const rawKey = attr.name.replace('data-prop-', '');
      const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  
      const rawValue = attr.value;
  
      // Auto parse JSON (array, object, boolean, number)
      try {
        props[key] = JSON.parse(rawValue);
      } catch {
        props[key] = rawValue; // fallback: coi là string
      }
    });
  
    return props;
  }
  
  /**
   * Tìm tất cả [data-vue-component] trên trang
   * và mount Vue instance tương ứng.
   */
  function mountVueComponents() {
    const mountPoints = document.querySelectorAll('[data-vue-component]');
  
    mountPoints.forEach(el => {
      const componentName = el.getAttribute('data-vue-component');
      const Component = componentRegistry[componentName];
  
      if (!Component) {
        console.warn(`[Vue AEM] Component not found in registry: "${componentName}"`);
        return;
      }
  
      const props = parseProps(el);
  
      new Vue({
        el,
        render: h => h(Component, { props })
      });
    });
  }
  
  // Mount sau khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountVueComponents);
  } else {
    mountVueComponents();
  }
  ```

  </Tab>
  <Tab label="Auto-import (require.context)">

  ```js
  import Vue from 'vue';
  
  /**
   * Tự động quét toàn bộ file *.vue trong thư mục components/
   * và build registry mà không cần import thủ công từng file.
   *
   * require.context là tính năng của Webpack — KHÔNG dùng được với Vite/Rollup.
   *
   * Tham số:
   *   - './components'  : thư mục quét
   *   - true            : quét đệ quy các thư mục con
   *   - /\.vue$/        : chỉ lấy file .vue
   */
  const requireComponent = require.context(
    './components',  // thư mục
    true,            // recursive
    /\.vue$/         // regex filter
  );
  
  // Build registry tự động
  // Key = tên file không có extension và đường dẫn con
  // Ví dụ: './HelloBanner.vue'     => 'HelloBanner'
  //        './cards/CardItem.vue'  => 'CardItem'
  const componentRegistry = {};
  
  requireComponent.keys().forEach(filePath => {
    const componentConfig = requireComponent(filePath);
    const Component = componentConfig.default || componentConfig;
  
    // Lấy tên component từ tên file (bỏ thư mục + bỏ .vue)
    // './cards/CardItem.vue' => 'CardItem'
    const componentName = filePath
      .split('/')
      .pop()
      .replace(/\.\w+$/, '');
  
    componentRegistry[componentName] = Component;
  });
  
  // Nếu muốn xem registry để debug:
  // console.log('[Vue AEM] Registry:', Object.keys(componentRegistry));
  
  // === parseProps và mountVueComponents giữ nguyên ===
  
  function parseProps(el) {
    const props = {};
    Array.from(el.attributes).forEach(attr => {
      if (!attr.name.startsWith('data-prop-')) return;
      const rawKey = attr.name.replace('data-prop-', '');
      const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      try {
        props[key] = JSON.parse(attr.value);
      } catch {
        props[key] = attr.value;
      }
    });
    return props;
  }
  
  function mountVueComponents() {
    document.querySelectorAll('[data-vue-component]').forEach(el => {
      const componentName = el.getAttribute('data-vue-component');
      const Component = componentRegistry[componentName];
  
      if (!Component) {
        console.warn(`[Vue AEM] "${componentName}" không có trong registry.`);
        return;
      }
  
      new Vue({ el, render: h => h(Component, { props: parseProps(el) }) });
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountVueComponents);
  } else {
    mountVueComponents();
  }
  ```

  </Tab>
  <Tab label="Từng component riêng lẻ">

  ```js
  import Vue from 'vue';
  import HelloBanner from './components/HelloBanner.vue';
  import AnotherWidget from './components/AnotherWidget.vue';
  
  // parseProps dùng chung
  function parseProps(el) {
    const props = {};
    Array.from(el.attributes).forEach(attr => {
      if (!attr.name.startsWith('data-prop-')) return;
      const key = attr.name
        .replace('data-prop-', '')
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      try {
        props[key] = JSON.parse(attr.value);
      } catch {
        props[key] = attr.value;
      }
    });
    return props;
  }
  
  /**
   * Helper: mount một component lên tất cả element có selector tương ứng.
   * Dùng khi mỗi component có selector riêng thay vì dùng data-vue-component chung.
   */
  function mountComponent(selector, Component) {
    document.querySelectorAll(selector).forEach(el => {
      new Vue({
        el,
        render: h => h(Component, { props: parseProps(el) })
      });
    });
  }
  
  function mountAll() {
    // Mỗi component được mount riêng với selector của chính nó.
    // HTL dùng: <div data-cmp="hello-banner" data-prop-title="...">
    mountComponent('[data-cmp="hello-banner"]',  HelloBanner);
    mountComponent('[data-cmp="another-widget"]', AnotherWidget);
  
    // Hoặc dùng class CSS làm selector
    // mountComponent('.vue-hello-banner', HelloBanner);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
  ```

  </Tab>
</Tabs>

::: tip So sánh 3 cách

| | Thủ công (Registry) | Auto-import | Từng component riêng |
|---|---|---|---|
| **Cần import tay?** | ✅ Có | ❌ Không | ✅ Có |
| **Thêm component mới** | Sửa registry | Chỉ tạo file .vue | Thêm `mountComponent()` |
| **Selector HTL** | `data-vue-component` | `data-vue-component` | `data-cmp` tùy định nghĩa |
| **Phù hợp khi** | Ít component, cần kiểm soát | Nhiều component, muốn tự động | Component phức tạp, selector riêng |
| **Webpack required?** | ❌ | ✅ `require.context` | ❌ |

**Khuyến nghị cho AEM:** Dùng **Auto-import** nếu project có nhiều component và dùng Webpack (archetype mặc định). Dùng **Thủ công** nếu cần kiểm soát rõ component nào được load.
:::

::: warning `require.context` chỉ chạy trên Webpack
Nếu project dùng Vite (hiếm trong AEM 6.5), thay bằng `import.meta.glob`:
```js
// Vite equivalent
const modules = import.meta.glob('./components/*.vue', { eager: true });
const componentRegistry = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [
    path.split('/').pop().replace('.vue', ''),
    mod.default
  ])
);
```
:::

::: tip Tại sao không dùng một `new Vue(\{ el: '#app' \})` duy nhất?
AEM render nhiều component độc lập trên cùng một trang. Mỗi component HTL có DOM element riêng. Cần mount nhiều Vue instance — mỗi instance trên một element.
:::


---

## Bước 6: Tạo AEM Component

### 6.1 Cấu trúc thư mục

```
ui.apps/src/main/content/jcr_root/apps/myvuesite/components/
└── content/
    └── hellobanner/
        ├── .content.xml
        ├── hellobanner.html        ← HTL template (mount point)
        └── _cq_dialog/
            └── .content.xml       ← Author dialog
```

### 6.2 Component definition — `.content.xml`

<Tabs>
  <Tab label="hellobanner/.content.xml">

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <jcr:root
      xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
      xmlns:jcr="http://www.jcp.org/jcr/1.0"
      xmlns:cq="http://www.day.com/jcr/cq/1.0"
  
      jcr:primaryType="cq:Component"
      jcr:title="Hello Banner (Vue)"
      jcr:description="Vue 2 Banner component"
      componentGroup="My Vue Site - Content"
  />
  ```

  </Tab>
</Tabs>

### 6.3 HTL Template — mount point

<Tabs>
  <Tab label="hellobanner.html">

  ```html
  <!--
    HTL template — render ra div với data-* attributes.
    Vue sẽ đọc các attribute này làm props.
  -->
  <div data-sly-use.model="com.example.myvuesite.core.models.HelloBannerModel"
       data-vue-component="HelloBanner"
       data-prop-title="${model.title}"
       data-prop-description="${model.description}"
       data-prop-cta-label="${model.ctaLabel}"
       data-prop-show-button="${model.showButton}"
       data-prop-items="${model.itemsJson}">
  </div>
  ```

  </Tab>
</Tabs>

::: warning HTL escape và JSON
HTL mặc định escape HTML. Với string thường thì không sao. Nhưng với JSON array/object, cần dùng `@ context='unsafe'` hoặc pass qua Sling Model dưới dạng string đã được serialize sẵn.

```html
<!-- ✅ Đúng: Sling Model trả về string JSON -->
data-prop-items="${model.itemsJson}"

<!-- ❌ Sai: List object không serialize được thành JSON tự động -->
data-prop-items="${model.items}"
```
:::

### 6.4 Author Dialog — `_cq_dialog/.content.xml`

<Tabs>
  <Tab label="_cq_dialog/.content.xml">

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <jcr:root
      xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
      xmlns:jcr="http://www.jcp.org/jcr/1.0"
      xmlns:cq="http://www.day.com/jcr/cq/1.0"
      xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
  
      jcr:primaryType="nt:unstructured"
      jcr:title="Hello Banner"
      sling:resourceType="cq/gui/components/authoring/dialog">
  
      <content
          jcr:primaryType="nt:unstructured"
          sling:resourceType="granite/ui/components/coral/foundation/tabs">
  
          <items jcr:primaryType="nt:unstructured">
  
              <properties
                  jcr:primaryType="nt:unstructured"
                  jcr:title="Properties"
                  sling:resourceType="granite/ui/components/coral/foundation/container">
  
                  <items jcr:primaryType="nt:unstructured">
  
                      <title
                          jcr:primaryType="nt:unstructured"
                          sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
                          fieldLabel="Title"
                          name="./title" />
  
                      <description
                          jcr:primaryType="nt:unstructured"
                          sling:resourceType="granite/ui/components/coral/foundation/form/textarea"
                          fieldLabel="Description"
                          name="./description" />
  
                      <ctaLabel
                          jcr:primaryType="nt:unstructured"
                          sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
                          fieldLabel="CTA Label"
                          name="./ctaLabel" />
  
                      <showButton
                          jcr:primaryType="nt:unstructured"
                          sling:resourceType="granite/ui/components/coral/foundation/form/checkbox"
                          text="Show Button"
                          name="./showButton"
                          value="true" />
  
                  </items>
  
              </properties>
  
          </items>
  
      </content>
  
  </jcr:root>
  ```

  </Tab>
</Tabs>

---

## Bước 7: Sling Model (Java)

Sling Model đọc properties từ JCR và expose ra HTL. Với array/object cần serialize sang JSON.

<Tabs>
  <Tab label="HelloBannerModel.java">

  ```java
  package com.example.myvuesite.core.models;
  
  import com.fasterxml.jackson.databind.ObjectMapper;
  import org.apache.sling.api.resource.Resource;
  import org.apache.sling.models.annotations.DefaultInjectionStrategy;
  import org.apache.sling.models.annotations.Model;
  import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;
  
  import javax.annotation.PostConstruct;
  import java.util.Arrays;
  import java.util.List;
  
  @Model(
      adaptables = Resource.class,
      defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
  )
  public class HelloBannerModel {
  
      @ValueMapValue
      private String title;
  
      @ValueMapValue
      private String description;
  
      @ValueMapValue
      private String ctaLabel;
  
      @ValueMapValue
      private boolean showButton;
  
      // Nếu cần array: lưu dạng multi-value property trong JCR
      @ValueMapValue
      private String[] items;
  
      // Serialize items thành JSON string để truyền qua data-* attribute
      private String itemsJson;
  
      private static final ObjectMapper MAPPER = new ObjectMapper();
  
      @PostConstruct
      protected void init() {
          // Default values
          if (title == null) title = "";
          if (description == null) description = "";
          if (ctaLabel == null) ctaLabel = "Read more";
          if (items == null) items = new String[0];
  
          try {
              itemsJson = MAPPER.writeValueAsString(Arrays.asList(items));
          } catch (Exception e) {
              itemsJson = "[]";
          }
      }
  
      public String getTitle() { return title; }
      public String getDescription() { return description; }
      public String getCtaLabel() { return ctaLabel; }
      public boolean isShowButton() { return showButton; }
      public String getItemsJson() { return itemsJson; }
  }
  ```

  </Tab>
</Tabs>

::: tip `@ValueMapValue` vs `@ChildResource`
- `@ValueMapValue` — lấy single value (String, int, boolean, String[])
- `@ChildResource` — lấy child node (dùng cho multifield phức tạp)
:::

---

## Bước 8: ClientLib — tích hợp Webpack output vào AEM

Webpack build ra file JS vào `ui.apps/src/main/content/jcr_root/apps/myvuesite/clientlibs/clientlib-site/js/`. AEM cần ClientLib để include file này.

### 8.1 Cấu trúc ClientLib

```
ui.apps/.../clientlibs/clientlib-site/
├── .content.xml        ← ClientLib definition
├── css.txt             ← danh sách CSS files
└── js.txt              ← danh sách JS files
```

### 8.2 ClientLib definition

<Tabs>
  <Tab label="clientlib-site/.content.xml">

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <jcr:root
      xmlns:cq="http://www.day.com/jcr/cq/1.0"
      xmlns:jcr="http://www.jcp.org/jcr/1.0"
  
      jcr:primaryType="cq:ClientLibraryFolder"
      allowProxy="{Boolean}true"
      categories="[myvuesite.site]"
  />
  ```

  </Tab>
  <Tab label="js.txt">

  ```text
  #base=js
  site.js
  ```

  </Tab>
  <Tab label="css.txt">

  ```text
  #base=css
  site.css
  ```

  </Tab>
</Tabs>

### 8.3 Include ClientLib trong Page template HTL

<Tabs>
  <Tab label="custompage/custompage.html">

  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${currentPage.title}</title>
      <!-- Include CSS -->
      <sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html"
           data-sly-call="${clientlib.css @ categories='myvuesite.site'}" />
    </head>
    <body>
      <!-- Page content -->
      <sly data-sly-include="body.html" />
  
      <!-- Include JS ở cuối body -->
      <sly data-sly-call="${clientlib.js @ categories='myvuesite.site'}" />
    </body>
  </html>
  ```

  </Tab>
</Tabs>

---

## Bước 9: Webpack config — output đúng đường dẫn

Đảm bảo Webpack output thẳng vào thư mục ClientLib.

<Tabs>
  <Tab label="webpack.prod.js">

  ```js
  const path = require('path');
  const MiniCssExtractPlugin = require('mini-css-extract-plugin');
  
  module.exports = {
    // ...
    output: {
      // Output thẳng vào ui.apps clientlib
      filename: 'site.js',
      path: path.resolve(
        __dirname,
        '../ui.apps/src/main/content/jcr_root/apps/myvuesite/clientlibs/clientlib-site/js'
      )
    },
  
    plugins: [
      new MiniCssExtractPlugin({
        filename: '../css/site.css'  // relative to output path
      }),
      // ...
    ]
  };
  ```

  </Tab>
</Tabs>

::: tip Archetype đã cấu hình sẵn
Archetype 39 đã có script `sync` để copy build output vào đúng chỗ. Kiểm tra `package.json` trong `ui.frontend` xem có script `build:clientlib` hay không.
:::

---

## Bước 10: Build & Deploy

```bash
# Từ root project
# Build frontend + deploy toàn bộ lên AEM local
mvn clean install -PautoInstallSinglePackage

# Chỉ build frontend
cd ui.frontend
npm run build

# Chỉ deploy ui.apps (sau khi đã build frontend)
cd ..
mvn -pl ui.apps -PautoInstallPackage install
```

---

## Pattern nâng cao: Multiple Vue instances với event bus

Khi nhiều component Vue cần giao tiếp trên cùng một trang mà không cần Vuex:

<Tabs>
  <Tab label="src/eventBus.js">

  ```js
  import Vue from 'vue';
  
  // Singleton event bus
  export const EventBus = new Vue();
  ```

  </Tab>
  <Tab label="src/main.js">

  ```js
  import Vue from 'vue';
  import { EventBus } from './eventBus';
  import HeaderNav from './components/HeaderNav.vue';
  import ContentBlock from './components/ContentBlock.vue';
  
  const componentRegistry = { HeaderNav, ContentBlock };
  
  function parseProps(el) { /* ... như trên ... */ }
  
  function mountVueComponents() {
    document.querySelectorAll('[data-vue-component]').forEach(el => {
      const name = el.getAttribute('data-vue-component');
      const Component = componentRegistry[name];
      if (!Component) return;
  
      new Vue({
        el,
        // Cung cấp EventBus cho tất cả instances qua provide/inject
        provide: { EventBus },
        render: h => h(Component, { props: parseProps(el) })
      });
    });
  }
  
  document.addEventListener('DOMContentLoaded', mountVueComponents);
  ```

  </Tab>
  <Tab label="src/components/HeaderNav.vue">

  ```vue
  <script>
  export default {
    inject: ['EventBus'],
    methods: {
      openModal(id) {
        this.EventBus.$emit('open-modal', id);
      }
    }
  }
  </script>
  ```

  </Tab>
  <Tab label="src/components/ContentBlock.vue">

  ```vue
  <script>
  export default {
    inject: ['EventBus'],
    mounted() {
      this.EventBus.$on('open-modal', (id) => {
        this.activeModal = id;
      });
    },
    beforeDestroy() {
      this.EventBus.$off('open-modal');
    }
  }
  </script>
  ```

  </Tab>
</Tabs>

---

## Checklist tích hợp

| Bước | Task | Ghi chú |
|------|------|---------|
| ✅ | Cài `vue@2.7.x` và `vue-loader@15` | version phải khớp |
| ✅ | Thêm `VueLoaderPlugin` vào Webpack | bắt buộc với vue-loader v15 |
| ✅ | Thêm alias `vue$` trong webpack resolve | dùng full build |
| ✅ | Tạo `componentRegistry` trong `main.js` | map tên → component |
| ✅ | Implement `parseProps()` với camelCase conversion | `data-prop-show-button` → `showButton` |
| ✅ | HTL dùng `data-vue-component` + `data-prop-*` | convention nhất quán |
| ✅ | Sling Model serialize Array/Object thành JSON string | tránh HTL escape issue |
| ✅ | ClientLib `categories` khớp với `data-sly-call` | không bị miss JS |
| ✅ | JS include ở cuối `&lt;body&gt;` | DOM ready trước khi Vue mount |

---

## Gotchas thường gặp

### 1. Vue component không mount

```js
// ❌ DOM chưa ready khi script chạy
mountVueComponents();

// ✅ Đợi DOM ready
document.addEventListener('DOMContentLoaded', mountVueComponents);
```

### 2. Props boolean nhận sai giá trị

HTL `$\{model.showButton\}` render ra string `"true"` hoặc `"false"`. JSON.parse sẽ convert đúng:

```js
// parseProps() dùng JSON.parse
JSON.parse("true")  // => true (boolean) ✅
JSON.parse("false") // => false (boolean) ✅
```

### 3. JSON array bị HTL escape

HTL escape `<`, `>`, `"` mặc định. Array JSON chứa `"` sẽ bị break.

```java
// ✅ Sling Model: dùng ObjectMapper serialize
itemsJson = MAPPER.writeValueAsString(Arrays.asList(items));
// Output: ["item1","item2"] — HTL không escape attribute value của data-*
```

### 4. `vue-template-compiler` version mismatch

```
Error: vue-template-compiler version mismatch
```

```bash
# Fix: đảm bảo cùng version
npm install vue@2.7.16 vue-template-compiler@2.7.16
```

### 5. AEM Author mode vs Publish mode

Trong Author mode, AEM có thể render thêm wrapper div cho WCM. Cần kiểm tra selector `[data-vue-component]` vẫn hoạt động:

```js
// ✅ document.querySelectorAll tìm trong toàn bộ DOM, kể cả nested
document.querySelectorAll('[data-vue-component]')
```

---

## Tóm tắt flow

```
Author nhập data vào Dialog
    ↓
JCR lưu properties vào component node
    ↓
Sling Model (@Model) đọc properties, serialize JSON
    ↓
HTL render <div data-vue-component="HelloBanner"
                 data-prop-title="..."
                 data-prop-items="[...]">
    ↓
Browser load, ClientLib JS chạy (main.js)
    ↓
querySelectorAll('[data-vue-component]') tìm tất cả mount points
    ↓
parseProps() đọc data-prop-* → props object
    ↓
new Vue({ el, render: h => h(Component, { props }) })
    ↓
Vue component render, reactive, event-driven
```
