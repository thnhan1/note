# Vue 2 + AEM 6.5 Handbook — Phần 1: Core Features

> Tài liệu tham chiếu toàn diện cho developer tích hợp Vue 2.7.x với AEM 6.5 HTL. Phần 1 covering: Data Binding, Directives, Props, Events, Computed, Watch, Lifecycle Hooks trong context AEM.

## Quy ước chung trong tài liệu

```
HTL  = phía server, AEM render
Vue  = phía client, browser runtime
data-prop-* = cầu nối HTL → Vue (truyền dữ liệu)
```

---

## 1. Data Binding — Từ HTL sang Vue

### 1.1 One-way binding: HTL → Vue qua `data-*`

AEM HTL render HTML trên server. Vue đọc dữ liệu từ DOM attributes rồi tạo reactive state.

<Tabs>
  <Tab label="HTL (Server)">

  ```html
  <!-- hellobanner.html -->
  <div data-sly-use.model="com.example.core.models.BannerModel"
       data-vue-component="HeroBanner"
       data-prop-title="${model.title}"
       data-prop-subtitle="${model.subtitle}"
       data-prop-image-src="${model.imageSrc}"
       data-prop-is-active="${model.active}">
  </div>
  ```

  </Tab>
  <Tab label="Vue (Client)">

  ```vue
  <template>
    <section class="hero-banner" :class="{ 'hero-banner--active': isActive }">
      <img :src="imageSrc" :alt="title" />
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
    </section>
  </template>
  
  <script>
  export default {
    name: 'HeroBanner',
    props: {
      title:    { type: String, default: '' },
      subtitle: { type: String, default: '' },
      imageSrc: { type: String, default: '' },
      isActive: { type: Boolean, default: false }
    }
  }
  </script>
  ```

  </Tab>
</Tabs>

::: tip Quy tắc chuyển đổi tên
HTL dùng **kebab-case** trong attribute: `data-prop-image-src`
Vue nhận **camelCase** trong props: `imageSrc`
Hàm `parseProps()` trong `main.js` tự convert.
:::

### 1.2 Truyền Object / Array phức tạp

HTL không serialize được object trực tiếp. Cần serialize trong Sling Model.

<Tabs>
  <Tab label="Sling Model">

  ```java
  @Model(adaptables = Resource.class)
  public class CardListModel {
  
      @ChildResource
      private List<CardItem> cards;
  
      private static final ObjectMapper MAPPER = new ObjectMapper();
  
      public String getCardsJson() {
          try {
              return MAPPER.writeValueAsString(cards);
          } catch (Exception e) {
              return "[]";
          }
      }
  }
  ```

  </Tab>
  <Tab label="HTL">

  ```html
  <div data-vue-component="CardList"
       data-prop-cards="${model.cardsJson}">
  </div>
  ```

  </Tab>
  <Tab label="Vue Component">

  ```vue
  <template>
    <div class="card-list">
      <div v-for="card in cards" :key="card.id" class="card-list__item">
        <h3>{{ card.title }}</h3>
        <p>{{ card.description }}</p>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      cards: { type: Array, default: () => [] }
    }
  }
  </script>
  ```

  </Tab>
</Tabs>

### 1.3 Two-way binding (`v-model`) trong AEM

`v-model` chỉ hoạt động **bên trong Vue component** — không sync ngược lên HTL/JCR. Dùng cho form input, filter, search — các interaction thuần client-side.

```vue
<template>
  <div class="search-filter">
    <!-- v-model chỉ reactive trong Vue scope -->
    <input v-model="searchQuery" placeholder="Tìm kiếm..." />
    <select v-model="selectedCategory">
      <option v-for="cat in categories" :key="cat.value" :value="cat.value">
        {{ cat.label }}
      </option>
    </select>

    <ul>
      <li v-for="item in filteredItems" :key="item.id">{{ item.name }}</li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    items:      { type: Array, default: () => [] },
    categories: { type: Array, default: () => [] }
  },
  data() {
    return {
      searchQuery: '',
      selectedCategory: ''
    }
  },
  computed: {
    filteredItems() {
      return this.items.filter(item => {
        const matchQuery = item.name.toLowerCase().includes(this.searchQuery.toLowerCase());
        const matchCat = !this.selectedCategory || item.category === this.selectedCategory;
        return matchQuery && matchCat;
      });
    }
  }
}
</script>
```

::: warning v-model KHÔNG sync ngược lên AEM
Dữ liệu từ `v-model` chỉ tồn tại trong browser. Khi reload trang, mọi state bị reset.
Nếu cần persist, gọi API AEM servlet qua `fetch()`.
:::

---

## 2. Directives — Cái nào dùng được, cái nào không

### 2.1 Bảng tổng hợp Directives trong AEM context

| Directive | Dùng được? | Ghi chú |
|---|---|---|
| `v-if` / `v-else` | ✅ | Client-side conditional. Dùng khi condition phụ thuộc user action |
| `v-show` | ✅ | Toggle display CSS. Nhanh hơn `v-if` cho toggle thường xuyên |
| `v-for` | ✅ | Render list từ data truyền qua props |
| `v-bind` (`:`) | ✅ | Bind attribute động |
| `v-on` (`@`) | ✅ | Event handler |
| `v-model` | ✅ | Form input — chỉ client-side |
| `v-html` | ⚠️ | Cần cẩn thận XSS. Dùng cho Rich Text từ AEM |
| `v-text` | ✅ | An toàn hơn `v-html` |
| `v-pre` | ✅ | Skip compilation — hữu ích cho performance |
| `v-cloak` | ✅ | Ẩn template chưa compile — **quan trọng trong AEM** |
| `v-once` | ✅ | Render 1 lần — tốt cho static content từ AEM |

### 2.2 `v-if` vs HTL `data-sly-test` — Khi nào dùng cái nào?

```html
<!-- ✅ Dùng HTL data-sly-test khi: condition biết trước lúc server render -->
<div data-sly-test="${model.showBanner}">
  <div data-vue-component="Banner" data-prop-title="${model.title}"></div>
</div>

<!-- ✅ Dùng Vue v-if khi: condition phụ thuộc user interaction -->
<!-- Ví dụ: show/hide panel khi click button -->
```

```vue
<template>
  <div>
    <button @click="showDetails = !showDetails">Toggle</button>
    <div v-if="showDetails" class="details-panel">
      <!-- Nội dung chỉ hiện khi user click -->
    </div>
  </div>
</template>
```

| | `data-sly-test` (HTL) | `v-if` (Vue) |
|---|---|---|
| Chạy ở đâu | Server | Client |
| DOM element | Không render nếu false | Render rồi remove/add |
| SEO | Tốt (không có trong HTML) | Kém hơn (có thể bị crawl) |
| Dùng khi | Permission, content có/không | User toggle, tab, accordion |

### 2.3 `v-html` — Render Rich Text từ AEM

AEM Rich Text Editor (RTE) trả về HTML string. Dùng `v-html` để render:

<Tabs>
  <Tab label="HTL">

  ```html
  <div data-vue-component="RichContent"
       data-prop-body="${model.richText @ context='unsafe'}">
  </div>
  ```

  </Tab>
  <Tab label="Vue">

  ```vue
  <template>
    <div class="rich-content" v-html="body"></div>
  </template>
  
  <script>
  export default {
    props: {
      body: { type: String, default: '' }
    }
  }
  </script>
  ```

  </Tab>
</Tabs>

::: danger XSS risk với v-html
`v-html` render raw HTML — không escape. Chỉ dùng khi source là AEM RTE (trusted). 
Không bao giờ dùng `v-html` với user input trực tiếp.
HTL `context='unsafe'` cũng cần cẩn thận — chỉ dùng khi biết chắc content an toàn.
:::

### 2.4 `v-cloak` — Tránh flash of uncompiled template

Khi Vue chưa mount xong, user thấy `\{\{ title \}\}` raw trên trang. Dùng `v-cloak`:

```css
/* Thêm vào base CSS (clientlib-base) */
[v-cloak] {
  display: none !important;
}
```

```vue
<template>
  <div v-cloak class="banner">
    <!-- Ẩn cho đến khi Vue compile xong -->
    <h1>{{ title }}</h1>
  </div>
</template>
```

::: tip Trong AEM thường không cần v-cloak
Vì ta dùng `render: h => h(Component, \{ props \})` — Vue replace toàn bộ element. User không thấy raw mustache syntax. Nhưng nếu dùng inline template thì cần `v-cloak`.
:::

---

## 3. Computed Properties & Watchers

### 3.1 Computed — Xử lý dữ liệu AEM phía client

Dữ liệu từ AEM thường cần transform trước khi hiển thị. Computed properties là nơi lý tưởng:

```vue
<template>
  <div class="product-card">
    <span class="product-card__price">{{ formattedPrice }}</span>
    <span class="product-card__badge" v-if="isOnSale">SALE</span>
    <div class="product-card__tags">
      <span v-for="tag in sortedTags" :key="tag">{{ tag }}</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    price:         { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 },
    tags:          { type: Array, default: () => [] },
    locale:        { type: String, default: 'vi-VN' }
  },
  computed: {
    formattedPrice() {
      return new Intl.NumberFormat(this.locale, {
        style: 'currency', currency: 'VND'
      }).format(this.price);
    },
    isOnSale() {
      return this.originalPrice > this.price;
    },
    sortedTags() {
      return [...this.tags].sort();
    }
  }
}
</script>
```

### 3.2 Watch — Phản ứng với thay đổi dữ liệu

Dùng watch khi cần **side effect** (gọi API, analytics, update DOM ngoài Vue):

```vue
<script>
export default {
  props: {
    categoryId: { type: String, default: '' }
  },
  data() {
    return {
      products: [],
      loading: false
    }
  },
  watch: {
    // Khi author thay đổi category trong AEM dialog → re-fetch
    // (Chỉ xảy ra khi component re-mount, không phải live)
    categoryId: {
      immediate: true,  // chạy ngay khi mount
      handler(newId) {
        if (newId) this.fetchProducts(newId);
      }
    }
  },
  methods: {
    async fetchProducts(categoryId) {
      this.loading = true;
      try {
        // Gọi AEM servlet hoặc external API
        const res = await fetch(`/bin/api/products?category=${categoryId}`);
        this.products = await res.json();
      } catch (err) {
        console.error('[ProductList] fetch failed:', err);
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>
```

---

## 4. Component Communication trong AEM

### 4.1 Props down — Từ HTL xuống Vue

Đã cover ở trên. Pattern chuẩn: `data-prop-*` → `parseProps()` → component props.

### 4.2 Events up — Từ child Vue component lên parent

Trong AEM, mỗi Vue instance là **độc lập** (không có parent Vue instance). Events chỉ hoạt động **bên trong cùng một Vue instance tree**.

```vue
<!-- ParentComponent.vue -->
<template>
  <div>
    <child-item
      v-for="item in items"
      :key="item.id"
      :item="item"
      @select="handleSelect"
    />
  </div>
</template>

<script>
import ChildItem from './ChildItem.vue';

export default {
  components: { ChildItem },
  props: { items: Array },
  methods: {
    handleSelect(item) {
      console.log('Selected:', item);
    }
  }
}
</script>
```

```vue
<!-- ChildItem.vue -->
<template>
  <div @click="$emit('select', item)">{{ item.name }}</div>
</template>

<script>
export default {
  props: { item: Object }
}
</script>
```

### 4.3 Cross-instance communication — EventBus

Khi 2 AEM components (2 Vue instances khác nhau) cần giao tiếp:

```js
// eventBus.js
import Vue from 'vue';
export const EventBus = new Vue();
```

```js
// main.js — provide EventBus cho tất cả instances
function mountVueComponents() {
  document.querySelectorAll('[data-vue-component]').forEach(el => {
    const Component = componentRegistry[el.getAttribute('data-vue-component')];
    if (!Component) return;

    new Vue({
      el,
      provide: { EventBus },
      render: h => h(Component, { props: parseProps(el) })
    });
  });
}
```

```vue
<!-- ComponentA.vue (emit) -->
<script>
export default {
  inject: ['EventBus'],
  methods: {
    notify() {
      this.EventBus.$emit('filter-changed', { category: 'shoes' });
    }
  }
}
</script>
```

```vue
<!-- ComponentB.vue (listen) — AEM component khác trên cùng trang -->
<script>
export default {
  inject: ['EventBus'],
  data() { return { activeFilter: null } },
  mounted() {
    this.EventBus.$on('filter-changed', (filter) => {
      this.activeFilter = filter;
    });
  },
  beforeDestroy() {
    this.EventBus.$off('filter-changed');
  }
}
</script>
```

::: warning Luôn `$off` trong `beforeDestroy`
Trong AEM Author mode, component có thể bị remove/re-add khi author edit. Không `$off` → memory leak + duplicate handlers.
:::

### 4.4 Provide / Inject — Shared config

Dùng cho config chung (locale, theme, API base URL) mà không cần truyền qua props:

```js
// main.js
new Vue({
  el,
  provide: {
    EventBus,
    aemConfig: {
      locale: document.documentElement.lang || 'vi',
      wcmMode: document.querySelector('meta[name="wcm-mode"]')?.content || 'disabled',
      contextPath: window.CQ?.shared?.HTTP?.getContextPath() || ''
    }
  },
  render: h => h(Component, { props: parseProps(el) })
});
```

```vue
<script>
export default {
  inject: ['aemConfig'],
  computed: {
    apiBase() {
      return `${this.aemConfig.contextPath}/bin/api`;
    },
    isAuthorMode() {
      return this.aemConfig.wcmMode === 'edit' || this.aemConfig.wcmMode === 'design';
    }
  }
}
</script>
```

---

## 5. Lifecycle Hooks — Cái nào quan trọng trong AEM

### 5.1 Bảng lifecycle hooks và vai trò trong AEM

| Hook | Khi nào chạy | Dùng trong AEM |
|---|---|---|
| `beforeCreate` | Trước khi reactive setup | Hiếm dùng |
| `created` | Reactive setup xong, chưa mount | ✅ Fetch API, init data |
| `beforeMount` | Trước khi render DOM | Hiếm dùng |
| `mounted` | DOM đã render | ✅ Init third-party lib (Swiper, Chart.js) |
| `beforeUpdate` | Data thay đổi, trước re-render | Debug |
| `updated` | DOM đã re-render | ⚠️ Cẩn thận infinite loop |
| `beforeDestroy` | Trước khi destroy | ✅ Cleanup: `$off`, `clearInterval`, destroy lib |
| `destroyed` | Đã destroy | Hiếm dùng |

### 5.2 Pattern thực tế: Init third-party library

```vue
<template>
  <div ref="swiperContainer" class="vue-carousel">
    <div class="swiper-wrapper">
      <div v-for="slide in slides" :key="slide.id" class="swiper-slide">
        <img :src="slide.imageSrc" :alt="slide.title" />
      </div>
    </div>
    <div class="swiper-pagination"></div>
  </div>
</template>

<script>
import Swiper from 'swiper';
import 'swiper/swiper-bundle.css';

export default {
  props: {
    slides:       { type: Array, default: () => [] },
    autoplayDelay: { type: Number, default: 3000 }
  },
  data() {
    return { swiperInstance: null }
  },
  mounted() {
    // DOM đã sẵn sàng → init Swiper
    this.$nextTick(() => {
      this.swiperInstance = new Swiper(this.$refs.swiperContainer, {
        loop: true,
        autoplay: { delay: this.autoplayDelay },
        pagination: { el: '.swiper-pagination' }
      });
    });
  },
  beforeDestroy() {
    // Cleanup khi AEM author remove component
    if (this.swiperInstance) {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }
  }
}
</script>
```

---

## 6. Slots — Component linh hoạt trong AEM

### 6.1 Khi nào dùng Slots

Slots hữu ích khi **Vue component bọc layout** và AEM cung cấp nội dung bên trong. Tuy nhiên, trong AEM integration kiểu `data-prop-*`, slots ít dùng vì content truyền qua props.

Slots chủ yếu dùng cho **Vue internal** — component con bên trong cùng một Vue instance:

```vue
<!-- BaseCard.vue — reusable wrapper -->
<template>
  <div class="base-card">
    <div class="base-card__header">
      <slot name="header">
        <h3>{{ title }}</h3>
      </slot>
    </div>
    <div class="base-card__body">
      <slot><!-- default slot --></slot>
    </div>
    <div class="base-card__footer" v-if="$slots.footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script>
export default {
  props: { title: String }
}
</script>
```

```vue
<!-- ProductCard.vue — dùng BaseCard với named slots -->
<template>
  <base-card :title="name">
    <template #header>
      <h3>{{ name }} <span class="badge">{{ category }}</span></h3>
    </template>

    <p>{{ description }}</p>
    <span class="price">{{ formattedPrice }}</span>

    <template #footer>
      <button @click="$emit('add-to-cart')">Thêm vào giỏ</button>
    </template>
  </base-card>
</template>

<script>
import BaseCard from './BaseCard.vue';
export default {
  components: { BaseCard },
  props: {
    name: String,
    description: String,
    price: Number,
    category: String
  },
  computed: {
    formattedPrice() {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND'
      }).format(this.price);
    }
  }
}
</script>
```

---

## 7. Mixins — Tái sử dụng logic trong AEM components

### 7.1 AEM-specific mixin

```js
// mixins/aemMixin.js
export default {
  inject: {
    aemConfig: { default: () => ({ wcmMode: 'disabled', locale: 'vi' }) }
  },
  computed: {
    isAuthorMode() {
      return ['edit', 'design', 'preview'].includes(this.aemConfig.wcmMode);
    },
    isPublishMode() {
      return this.aemConfig.wcmMode === 'disabled';
    }
  },
  methods: {
    /**
     * Build AEM asset URL có context path
     */
    assetUrl(path) {
      if (!path) return '';
      const ctx = this.aemConfig.contextPath || '';
      return path.startsWith('/') ? `${ctx}${path}` : path;
    },

    /**
     * Gọi AEM servlet
     */
    async aemFetch(servletPath, options = {}) {
      const url = `${this.aemConfig.contextPath || ''}${servletPath}`;
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      if (!res.ok) throw new Error(`AEM API error: ${res.status}`);
      return res.json();
    }
  }
}
```

```vue
<!-- Dùng mixin -->
<script>
import aemMixin from '../mixins/aemMixin';

export default {
  mixins: [aemMixin],
  async created() {
    if (this.isPublishMode) {
      this.data = await this.aemFetch('/bin/api/products');
    }
  }
}
</script>
```

### 7.2 Fetch data mixin

```js
// mixins/fetchMixin.js
export default {
  data() {
    return {
      fetchData: null,
      fetchLoading: false,
      fetchError: null
    }
  },
  methods: {
    async doFetch(url) {
      this.fetchLoading = true;
      this.fetchError = null;
      try {
        const res = await fetch(url);
        this.fetchData = await res.json();
      } catch (err) {
        this.fetchError = err.message;
      } finally {
        this.fetchLoading = false;
      }
    }
  }
}
```

---

## 8. Filters — Format dữ liệu từ AEM

::: warning Vue 2 only
Filters bị loại bỏ trong Vue 3. Nếu plan migrate sau, dùng computed hoặc methods thay thế.
:::

```js
// filters/index.js — đăng ký global filters
import Vue from 'vue';

Vue.filter('currency', (value, locale = 'vi-VN', currency = 'VND') => {
  if (!value && value !== 0) return '';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
});

Vue.filter('truncate', (text, length = 100) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
});

Vue.filter('dateFormat', (value, locale = 'vi-VN') => {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
});

Vue.filter('aemPath', (path) => {
  // Thêm .html suffix cho AEM page paths
  if (!path) return '#';
  return path.endsWith('.html') ? path : `${path}.html`;
});
```

```vue
<template>
  <div>
    <span>{{ price | currency }}</span>
    <span>{{ description | truncate(150) }}</span>
    <span>{{ publishDate | dateFormat }}</span>
    <a :href="pagePath | aemPath">Xem thêm</a>
  </div>
</template>
```

Import filters trong `main.js`:

```js
// main.js
import Vue from 'vue';
import './filters';  // đăng ký global filters trước khi mount
// ... phần còn lại
```

---

**→ Tiếp tục [Phần 2: AEM Features & Advanced Patterns](/docs/vuejs/articles/vuejs-aem-handbook-part2.md)**
