# Vue 2 + AEM 6.5 Handbook — Phần 2: AEM Features & Advanced Patterns

> Phần 2 covering: Transitions, Custom Directives, Error Handling, WCM Mode, Style System, Experience Fragments, Responsive Grid, Performance, ClientLib strategies.

**→ Xem trước [Phần 1: Core Features](/docs/vuejs/articles/vuejs-aem-handbook-part1.md)**

---

## 9. Transitions & Animations

### 9.1 Vue Transition trong AEM component

```vue
<template>
  <div class="accordion">
    <button @click="isOpen = !isOpen" class="accordion__toggle">
      {{ title }}
      <span :class="{ 'rotated': isOpen }">▼</span>
    </button>

    <transition name="slide-fade">
      <div v-if="isOpen" class="accordion__content">
        <div v-html="body"></div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  props: {
    title: { type: String, default: '' },
    body:  { type: String, default: '' },
    defaultOpen: { type: Boolean, default: false }
  },
  data() {
    return { isOpen: this.defaultOpen }
  }
}
</script>

<style>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}
.slide-fade-enter,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
```

### 9.2 Transition Group — Animated list

```vue
<template>
  <div class="tab-content">
    <div class="tab-content__nav">
      <button v-for="tab in tabs" :key="tab.id"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </div>

    <transition name="fade" mode="out-in">
      <div :key="activeTab" class="tab-content__panel">
        <div v-html="activeContent"></div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  props: {
    tabs: { type: Array, default: () => [] }
    // tabs: [{ id: 'tab1', label: 'Tab 1', content: '<p>...</p>' }]
  },
  data() {
    return { activeTab: this.tabs[0]?.id || '' }
  },
  computed: {
    activeContent() {
      const tab = this.tabs.find(t => t.id === this.activeTab);
      return tab ? tab.content : '';
    }
  }
}
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
```

::: tip Performance
Dùng `transform` và `opacity` cho animation — chúng chạy trên GPU, không trigger layout reflow. Tránh animate `height`, `width`, `top`, `left`.
:::

---

## 10. Custom Directives — Tiện ích cho AEM

### 10.1 `v-analytics` — Track click event

```js
// directives/analytics.js
import Vue from 'vue';

Vue.directive('analytics', {
  bind(el, binding) {
    const handler = () => {
      const data = binding.value || {};
      // Push vào Adobe Analytics / dataLayer
      window.digitalData = window.digitalData || {};
      window.digitalData.event = window.digitalData.event || [];
      window.digitalData.event.push({
        eventInfo: {
          eventName: data.event || 'click',
          eventAction: data.action || 'unknown',
          eventLabel: data.label || el.textContent.trim()
        }
      });

      // Hoặc Adobe Launch / DTM
      if (window._satellite) {
        window._satellite.track(data.event || 'click', data);
      }
    };

    el.__analyticsHandler = handler;
    el.addEventListener('click', handler);
  },

  unbind(el) {
    if (el.__analyticsHandler) {
      el.removeEventListener('click', el.__analyticsHandler);
      delete el.__analyticsHandler;
    }
  }
});
```

```vue
<template>
  <div>
    <!-- Tracking click với data tùy chỉnh -->
    <button v-analytics="{ event: 'cta-click', action: 'hero-banner', label: title }">
      {{ ctaLabel }}
    </button>

    <!-- Tracking đơn giản -->
    <a v-analytics :href="link">Xem thêm</a>
  </div>
</template>
```

### 10.2 `v-lazy-src` — Lazy load image

```js
// directives/lazySrc.js
import Vue from 'vue';

Vue.directive('lazy-src', {
  inserted(el, binding) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          el.src = binding.value;
          el.classList.add('loaded');
          observer.unobserve(el);
        }
      });
    }, { rootMargin: '200px' });

    observer.observe(el);
    el.__lazyObserver = observer;
  },

  unbind(el) {
    if (el.__lazyObserver) {
      el.__lazyObserver.disconnect();
      delete el.__lazyObserver;
    }
  }
});
```

```vue
<template>
  <img v-lazy-src="imageSrc" :alt="title" class="lazy-image" />
</template>

<style>
.lazy-image {
  opacity: 0;
  transition: opacity 0.3s;
}
.lazy-image.loaded {
  opacity: 1;
}
</style>
```

### 10.3 Đăng ký directives trong main.js

```js
// main.js
import Vue from 'vue';
import './directives/analytics';
import './directives/lazySrc';
import './filters';

// ... phần còn lại (registry, mount)
```

---

## 11. AEM WCM Mode — Xử lý Author vs Publish

### 11.1 Detect WCM Mode

AEM page có các WCM modes: `edit`, `preview`, `design`, `disabled` (publish).

```js
// utils/aem.js
export function getWcmMode() {
  // Cách 1: Từ meta tag (cần thêm vào page template)
  const meta = document.querySelector('meta[name="wcm-mode"]');
  if (meta) return meta.content;

  // Cách 2: Từ body class (AEM inject tự động)
  if (document.body.classList.contains('aem-AuthorLayer-Edit')) return 'edit';
  if (document.body.classList.contains('aem-AuthorLayer-Preview')) return 'preview';
  if (document.body.classList.contains('aem-AuthorLayer-Design')) return 'design';

  // Cách 3: Check CQ object
  if (window.CQ?.WCM?.getMode) return window.CQ.WCM.getMode();

  return 'disabled'; // publish mode
}

export function isAuthorMode() {
  const mode = getWcmMode();
  return mode === 'edit' || mode === 'design';
}
```

### 11.2 Thêm WCM Mode meta tag

<Tabs>
  <Tab label="custompage.html">

  ```html
  <head>
    <meta name="wcm-mode"
          data-sly-attribute.content="${wcmmode.edit ? 'edit' :
            (wcmmode.preview ? 'preview' :
            (wcmmode.design ? 'design' : 'disabled'))}" />
  </head>
  ```

  </Tab>
</Tabs>

### 11.3 Ứng dụng: Disable animation trong Author mode

```vue
<script>
import aemMixin from '../mixins/aemMixin';

export default {
  mixins: [aemMixin],
  computed: {
    transitionName() {
      // Tắt animation trong Author mode (tránh glitch khi drag/drop)
      return this.isAuthorMode ? '' : 'slide-fade';
    }
  }
}
</script>

<template>
  <transition :name="transitionName">
    <div v-if="isOpen">...</div>
  </transition>
</template>
```

### 11.4 Placeholder cho Author mode

Khi component Vue chưa mount (hoặc không có data), Author cần thấy gì đó để click edit:

```html
<!-- hellobanner.html -->
<div data-sly-use.model="com.example.core.models.BannerModel"
     data-vue-component="HelloBanner"
     data-prop-title="${model.title}">

  <!-- Fallback content: AEM Author thấy khi JS chưa load -->
  <!-- Vue sẽ replace element này khi mount -->
  <sly data-sly-test="${wcmmode.edit && !model.title}">
    <p class="cq-placeholder">Configure Hello Banner</p>
  </sly>
</div>
```

---

## 12. AEM Style System + Vue

### 12.1 Vấn đề cốt lõi

AEM Style System inject CSS class vào **wrapper div** bên ngoài component. Vue render **bên trong** wrapper đó. Style System class và Vue component tách biệt.

```html
<!-- AEM render: -->
<div class="aem-GridColumn mysite-banner--dark-theme">  ← Style System class
  <div data-vue-component="Banner">                     ← Vue mount point
    <!-- Vue render bên trong đây -->
  </div>
</div>
```

### 12.2 Giải pháp: Truyền Style System class vào Vue

<Tabs>
  <Tab label="Sling Model — đọc applied styles">

  ```java
  import com.day.cq.wcm.api.components.ComponentContext;
  import org.apache.sling.api.SlingHttpServletRequest;
  
  @Model(adaptables = SlingHttpServletRequest.class)
  public class BannerModel {
  
      @ScriptVariable
      private ComponentContext componentContext;
  
      /**
       * Đọc CSS classes từ Style System
       * AEM lưu trong property "appliedCssClasses"
       */
      public String getAppliedStyles() {
          if (componentContext == null) return "";
          String styles = componentContext.getResource()
              .getValueMap()
              .get("appliedCssClasses", String.class);
          return styles != null ? styles : "";
      }
  }
  ```

  </Tab>
  <Tab label="HTL — truyền xuống">

  ```html
  <div data-vue-component="Banner"
       data-prop-title="${model.title}"
       data-prop-applied-styles="${model.appliedStyles}">
  </div>
  ```

  </Tab>
  <Tab label="Vue — bind class">

  ```vue
  <template>
    <div class="vue-banner" :class="appliedStylesObj">
      <h1>{{ title }}</h1>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      title: String,
      appliedStyles: { type: String, default: '' }
    },
    computed: {
      appliedStylesObj() {
        // "dark-theme large-padding" => { 'dark-theme': true, 'large-padding': true }
        const obj = {};
        this.appliedStyles.split(' ').filter(Boolean).forEach(cls => {
          obj[cls] = true;
        });
        return obj;
      }
    }
  }
  </script>
  
  <style>
  /* Styles tương ứng với Style System options */
  .vue-banner.dark-theme {
    background: #1a1a2e;
    color: #eee;
  }
  .vue-banner.large-padding {
    padding: 3rem 2rem;
  }
  </style>
  ```

  </Tab>
</Tabs>

### 12.3 CSS không dùng `scoped` — dùng BEM

```vue
<!-- ✅ Khuyến nghị cho AEM: BEM prefix, không scoped -->
<style>
/* Component namespace rõ ràng */
.vue-banner { }
.vue-banner__title { }
.vue-banner__cta { }
.vue-banner--dark-theme { }
.vue-banner--large-padding { }
</style>
```

---

## 13. AEM Content Fragments + Vue

### 13.1 Fetch Content Fragment qua API

```vue
<script>
export default {
  props: {
    // Path đến Content Fragment, truyền từ HTL
    fragmentPath: { type: String, default: '' }
  },
  data() {
    return { fragment: null, loading: true }
  },
  async created() {
    if (!this.fragmentPath) return;
    try {
      // AEM Assets HTTP API
      const res = await fetch(
        `${this.fragmentPath}.json`
      );
      const data = await res.json();
      this.fragment = data;
    } catch (err) {
      console.error('[CF] Fetch failed:', err);
    } finally {
      this.loading = false;
    }
  }
}
</script>
```

### 13.2 Content Fragment List với Sling Model

<Tabs>
  <Tab label="Sling Model">

  ```java
  @Model(adaptables = SlingHttpServletRequest.class)
  public class ArticleListModel {
  
      @ValueMapValue
      private String parentPath; // e.g., /content/dam/mysite/articles
  
      @OSGiService
      private ResourceResolverFactory resolverFactory;
  
      public String getArticlesJson() {
          // Query Content Fragments dưới parentPath
          // Serialize thành JSON array
          // ... implementation
          return "[]";
      }
  }
  ```

  </Tab>
  <Tab label="HTL">

  ```html
  <div data-vue-component="ArticleList"
       data-prop-articles="${model.articlesJson}">
  </div>
  ```

  </Tab>
  <Tab label="Vue">

  ```vue
  <template>
    <div class="article-list">
      <div v-if="loading" class="article-list__skeleton">Loading...</div>
      <article v-for="article in articles" :key="article.path" class="article-list__item">
        <h3>{{ article.title }}</h3>
        <p>{{ article.description }}</p>
        <time>{{ article.publishDate | dateFormat }}</time>
      </article>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      articles: { type: Array, default: () => [] }
    },
    data() { return { loading: false } }
  }
  </script>
  ```

  </Tab>
</Tabs>

---

## 14. AEM Responsive Grid + Vue

### 14.1 Vue component không ảnh hưởng Responsive Grid

AEM Responsive Grid (Layout Container) quản lý column widths qua inline styles trên wrapper div. Vue component render **bên trong** — không ảnh hưởng grid.

```html
<!-- AEM render: -->
<div class="aem-Grid-column aem-Grid-column--default--12 aem-Grid-column--tablet--6">
  <!-- ↑ Responsive Grid classes/styles — AEM quản lý -->
  <div data-vue-component="ProductCard" data-prop-title="...">
    <!-- Vue render ở đây — KHÔNG can thiệp grid -->
  </div>
</div>
```

### 14.2 Vue component cần responsive → dùng CSS hoặc `window.matchMedia`

```vue
<script>
export default {
  data() {
    return {
      isMobile: false,
      mediaQuery: null
    }
  },
  mounted() {
    this.mediaQuery = window.matchMedia('(max-width: 768px)');
    this.isMobile = this.mediaQuery.matches;
    this.mediaQuery.addEventListener('change', this.onResize);
  },
  beforeDestroy() {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.onResize);
    }
  },
  methods: {
    onResize(e) {
      this.isMobile = e.matches;
    }
  }
}
</script>
```

---

## 15. Error Handling

### 15.1 Global error handler

```js
// main.js
import Vue from 'vue';

// Bắt tất cả Vue errors
Vue.config.errorHandler = function (err, vm, info) {
  console.error(`[Vue Error] ${info}:`, err);

  // Report lên error tracking (nếu có)
  if (window._satellite) {
    window._satellite.track('js-error', {
      message: err.message,
      component: vm?.$options?.name || 'unknown',
      info
    });
  }
};

// Warning handler (chỉ chạy trong dev mode)
Vue.config.warnHandler = function (msg, vm, trace) {
  console.warn(`[Vue Warn] ${msg}`, trace);
};
```

### 15.2 Component-level error boundary

```vue
<!-- ErrorBoundary.vue -->
<script>
export default {
  name: 'ErrorBoundary',
  data() {
    return { hasError: false, errorMessage: '' }
  },
  errorCaptured(err, vm, info) {
    this.hasError = true;
    this.errorMessage = err.message;
    console.error(`[ErrorBoundary] Caught error in ${vm?.$options?.name}:`, err);
    return false; // ngăn error propagate lên
  },
  render(h) {
    if (this.hasError) {
      return h('div', { class: 'vue-error-fallback' }, [
        h('p', 'Component gặp lỗi. Vui lòng refresh trang.'),
      ]);
    }
    return this.$slots.default?.[0];
  }
}
</script>
```

Dùng trong mount logic:

```js
// main.js
import ErrorBoundary from './components/ErrorBoundary.vue';

function mountVueComponents() {
  document.querySelectorAll('[data-vue-component]').forEach(el => {
    const Component = componentRegistry[el.getAttribute('data-vue-component')];
    if (!Component) return;

    new Vue({
      el,
      render: h => h(ErrorBoundary, [
        h(Component, { props: parseProps(el) })
      ])
    });
  });
}
```

---

## 16. Performance Optimization

### 16.1 `v-once` cho static content từ AEM

Content từ AEM dialog thường không thay đổi sau khi render. Dùng `v-once` để Vue skip reactivity:

```vue
<template>
  <div class="static-banner">
    <!-- Render 1 lần, không track changes → nhanh hơn -->
    <h1 v-once>{{ title }}</h1>
    <p v-once v-html="body"></p>

    <!-- Phần interactive vẫn reactive bình thường -->
    <button @click="handleClick">{{ ctaLabel }}</button>
  </div>
</template>
```

### 16.2 `Object.freeze()` cho large dataset

```vue
<script>
export default {
  props: {
    // Large array từ AEM (ví dụ: 1000 items)
    items: { type: Array, default: () => [] }
  },
  data() {
    return {
      // Freeze để Vue không tạo getter/setter cho từng item
      frozenItems: Object.freeze(this.items)
    }
  }
}
</script>
```

### 16.3 Functional components cho simple rendering

```vue
<!-- SimpleTag.vue — functional, không có state -->
<template functional>
  <span :class="['tag', `tag--${props.variant}`]">
    {{ props.label }}
  </span>
</template>

<script>
export default {
  functional: true,
  props: {
    label:   { type: String, required: true },
    variant: { type: String, default: 'default' }
  }
}
</script>
```

### 16.4 Lazy mount — chỉ mount component trong viewport

```js
// main.js — Lazy mount cho heavy components
function lazyMountVueComponents() {
  document.querySelectorAll('[data-vue-component][data-vue-lazy]').forEach(el => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          mountSingleComponent(el);
          observer.unobserve(el);
        }
      });
    }, { rootMargin: '200px' });

    observer.observe(el);
  });

  // Mount non-lazy components ngay
  document.querySelectorAll('[data-vue-component]:not([data-vue-lazy])').forEach(el => {
    mountSingleComponent(el);
  });
}
```

```html
<!-- HTL: thêm data-vue-lazy cho heavy components -->
<div data-vue-component="HeavyChart"
     data-vue-lazy
     data-prop-config="${model.chartConfigJson}">
</div>
```

---

## 17. ClientLib Strategies — Tổng kết

### 17.1 Cấu trúc ClientLib đề xuất

```
clientlibs/
├── clientlib-base/                    ← Load đầu tiên
│   ├── .content.xml                   ← categories="[mysite.base]"
│   └── css/
│       ├── reset.css
│       ├── grid.css
│       └── typography.css
│
├── clientlib-vendor/                  ← Third-party (nếu có)
│   ├── .content.xml                   ← categories="[mysite.vendor]"
│   └── js/
│       └── vendor.js                  ← Swiper, Chart.js, etc
│
├── clientlib-site/                    ← Vue bundle chính
│   ├── .content.xml                   ← categories="[mysite.site]"
│   │                                     depends="[mysite.base]"
│   ├── js/site.js                     ← Webpack output
│   └── css/site.css                   ← Webpack extracted CSS
│
└── clientlib-author/                  ← Chỉ Author mode
    ├── .content.xml                   ← categories="[cq.authoring.dialog]"
    └── js/author.js
```

### 17.2 ClientLib dependency chain

```xml
<!-- clientlib-site/.content.xml -->
<jcr:root ...
    jcr:primaryType="cq:ClientLibraryFolder"
    allowProxy="{Boolean}true"
    categories="[mysite.site]"
    dependencies="[mysite.base]"
/>
```

### 17.3 Include trong Page template

```html
<head>
  <!-- CSS trước — tránh FOUC -->
  <sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html" />
  <sly data-sly-call="${clientlib.css @ categories='mysite.base'}" />
  <sly data-sly-call="${clientlib.css @ categories='mysite.site'}" />
</head>
<body>
  <!-- Page content ở đây -->

  <!-- JS cuối body — DOM đã sẵn sàng -->
  <sly data-sly-call="${clientlib.js @ categories='mysite.site'}" />
</body>
```

---

## 18. Tổng kết — Quick Reference

### Vue features nên dùng trong AEM

| Feature | Dùng? | Lý do |
|---|---|---|
| Props (`data-prop-*`) | ✅ Luôn | Cầu nối HTL → Vue |
| Computed properties | ✅ Luôn | Transform dữ liệu AEM phía client |
| `v-if` / `v-show` | ✅ | Client-side toggle |
| `v-for` | ✅ | Render list từ props |
| `v-model` | ✅ | Form input (client-only) |
| Transitions | ✅ | UX tốt hơn |
| EventBus | ✅ | Cross-instance communication |
| Mixins | ✅ | Reuse AEM-specific logic |
| Filters | ⚠️ | Vue 2 only — plan migrate thì dùng methods |
| `v-html` | ⚠️ | Chỉ cho AEM RTE content (trusted) |
| `v-once` | ✅ | Performance cho static AEM content |
| Custom directives | ✅ | Analytics tracking, lazy load |
| Slots | ✅ | Vue internal component composition |
| `scoped` styles | ❌ | Xung đột Style System — dùng BEM |
| Vue Router | ❌ | AEM quản lý routing |
| Vuex | ⚠️ | Chỉ khi shared state phức tạp — thường EventBus đủ |

### Nguyên tắc vàng

> AEM quản lý **content, layout, routing, SEO**.
> Vue quản lý **interactivity, animation, client-side logic**.
> Giao tiếp qua **`data-*` attributes** — không coupling trực tiếp.
