## MVVM (Model -View -ViewModel)

- Model: dữ liệu (thường nằm trong `data`)
- View: Giao diện HTML
- ViewModel: Chính là **Vue instance** - cầu nối giữa Model và View.

## Tại sao trong docs lại dùng biến `vm`

Trong tài liệu Vue, `vm` như 1 biến đại diện minh họa cho Vue instace. 

<Tabs>
  <Tab label="main.js">

  ```js
  var vm = new Vue({
      data: { a : 1 }
  })
  ```

  </Tab>
</Tabs>

Ví dụ:

```js
// Cách 1: Đặt tên tùy ý
var app = new Vue({
  el: '#app',
  data: {
    message: 'Hello Vue!'
  }
})

// Cách 2: Không gán vào biến nào cả (thường dùng trong main.js)
new Vue({
  el: '#app',
  render: h => h(App)
})

// Cách 3: Trong component (phổ biến nhất)
export default {
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++ // this chính là Vue instance (tương đương vm trong docs)
    }
  }
}
```

## Minh hoạ cơ chế reactive của Vue

```js
var data = { a: 1 }
var vm = new Vue({
  data: data
})

// Vue "proxy" các thuộc tính từ data vào vm
// Nên vm.a thực chất là truy cập đến data.a
vm.a = 2      // Thay đổi vm.a
data.a // => 2 (data cũng thay đổi theo)

data.a = 3    // Thay đổi data.a
vm.a // => 3  (vm.a cũng thay đổi theo)
```

- Khi tạo Vue instance, Vue sử dụng Object.defineProperty (trong Vue2) để tạo getter/setter cho các thuộc tính
vm.a thực chất không phải là một thuộc tính riêng, mà là "cửa ngõ" để truy cập data.a
- Khi bạn thay đổi vm.a, Vue biết và cập nhật data.a, sau đó kích hoạt re-render view


## Dùng cách nào để mount


### 1. Dùng `el: "#app"` (khai báo lúc tạo instance)

```javascript
// Cách 1: Dùng el trong options
var vm = new Vue({
  el: '#app',  // Tự động mount ngay khi tạo
  data: {
    message: 'Hello'
  }
})
// => Vue instance được tạo và mount ngay lập tức vào #app
```

### 2. Dùng `.$mount('#app')` (gọi method sau khi tạo)

```javascript
// Cách 2: Dùng $mount() method
var vm = new Vue({
  data: {
    message: 'Hello'
  }
})
// Vue instance được tạo nhưng CHƯA mount
vm.$mount('#app')  // Mount sau
```

### Sự khác biệt về timing (thời điểm thực thi)

| Đặc điểm | `el: "#app"` | `.$mount('#app')` |
|----------|--------------|-------------------|
| **Thời điểm mount** | Ngay khi khởi tạo Vue instance | Sau khi Vue instance đã được tạo |
| **Có thể delay không?** | Không | Có |
| **Dùng với SSR?** | Không phù hợp | Phù hợp |

### Ví dụ thực tế cho thấy sự khác biệt

```javascript
// === Cách 1: el - Mount ngay lập tức ===
var vm = new Vue({
  el: '#app',
  data: { count: 0 },
  created() {
    console.log('Created!')
    console.log(this.$el) // undefined - vì chưa mount xong
  },
  mounted() {
    console.log('Mounted!')
    console.log(this.$el) // <div id="app">...</div>
  }
})
// Created! và Mounted! chạy ngay

// === Cách 2: $mount - Có thể delay ===
var vm = new Vue({
  data: { count: 0 },
  created() {
    console.log('Created!')
  }
})

// Làm gì đó trước khi mount...
console.log('Chuẩn bị mount...')

// Mount sau
vm.$mount('#app')  // Lúc này mounted() mới chạy
```

### Khi nào nên dùng cách nào?

&lt;details&gt;
&lt;summary&gt;&lt;strong&gt;✅ Dùng `el: "#app"` khi nào?&lt;/strong&gt;&lt;/summary&gt;

Dùng khi bạn muốn **mount ngay lập tức** và không cần làm gì trước khi mount.

**Phù hợp cho:**
- Ứng dụng Vue thuần túy (không kèm thư viện khác)
- Code đơn giản, trực tiếp
- Không cần kiểm tra điều kiện trước khi mount

```javascript
// Trường hợp phổ biến
new Vue({
  el: '#app',
  data: { /* ... */ },
  methods: { /* ... */ }
})
```
&lt;/details&gt;

&lt;details&gt;
&lt;summary&gt;&lt;strong&gt;✅ Dùng `.$mount('#app')` khi nào?&lt;/strong&gt;&lt;/summary&gt;

Dùng khi bạn cần **kiểm soát thời điểm mount** hoặc cần làm gì đó trước khi mount.

**Phù hợp cho:**

1. **Kết hợp với các thư viện khác** (như Vue Router, Vuex cần khởi tạo trước):
```javascript
// main.js trong Vue CLI project
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// Tạo instance nhưng chưa mount
const app = new Vue({
  router,
  store,
  render: h => h(App)
})

// Có thể làm gì đó ở đây (ví dụ: kiểm tra auth)
console.log('App created, preparing to mount...')

// Mount sau
app.$mount('#app')
```

2. **Server-Side Rendering (SSR)**:
```javascript
// Trong SSR, bạn tạo app nhưng mount ở client
export default function createApp() {
  const app = new Vue({
    // ...
  })
  return { app, router }
}
// Sau đó mount ở client
```

3. **Kiểm tra điều kiện trước khi mount**:
```javascript
const app = new Vue({
  data: { /* ... */ }
})

if (someCondition) {
  app.$mount('#app')
} else {
  app.$mount('#fallback-app')
}
```
&lt;/details&gt;

### Trong thực tế code Vue2 nên dùng cách nào?

#### Khuyến nghị theo trường hợp:

**1. Vue CLI project (phổ biến nhất):**
```javascript
// main.js
import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')  // Dùng $mount
```
👉 **Lý do:** Vue CLI thường dùng cách này vì tính nhất quán và dễ mở rộng.

**2. Code đơn giản, không dùng build tool:**
```javascript
// index.js hoặc script trực tiếp
new Vue({
  el: '#app',  // Dùng el
  data: {
    message: 'Hello Vue!'
  }
})
```
👉 **Lý do:** Đơn giản, trực tiếp, dễ hiểu.

**3. Khi cần kiểm soát thời điểm mount:**
```javascript
const app = new Vue({
  // options
})

// Chờ API, hoặc kiểm tra điều kiện
fetch('/api/config')
  .then(() => {
    app.$mount('#app')
  })
```

### Tóm lại

| Tiêu chí | Nên dùng |
|----------|----------|
| **Code đơn giản, mount ngay** | `el: "#app"` |
| **Vue CLI project** | `.$mount('#app')` |
| **Cần delay hoặc kiểm tra trước khi mount** | `.$mount('#app')` |
| **SSR hoặc kết hợp nhiều thư viện** | `.$mount('#app')` |

**Lời khuyên:** Nếu làm việc với Vue CLI hoặc dự án thực tế, hãy quen với `.$mount('#app')`. Còn nếu viết code đơn giản trực tiếp, `el: "#app"` cũng hoàn toàn ổn.

Cả hai cách đều **hoạt động giống nhau về kết quả cuối cùng**, chỉ khác nhau về **thời điểm** mount thôi. 😊