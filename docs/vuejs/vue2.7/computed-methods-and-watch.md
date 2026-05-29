## Computed

Là cách tạo ra các giá trị được tính toán dựa trên **Reactive state** (`data`, `props` hoặc `computed` khác). Nó giống như 1 biến ảo được Vue tự động cập nhật khi dữ liệu phụ thuộc thay đổi.

### Đặc điểm

- Caching: Vue chỉ tính lại khi dependency thay đổi.
- Ví dụ:

```js
computed: {
  expensiveCalculation() {
    console.log('computed chạy')

    return this.items.reduce((a, b) => a + b, 0)
  }
}
```

Nếu `items` không đổi

```html
{{ expensiveCalculation }}
{{ expensiveCalculation }}
{{ expensiveCalculation }}
```

Chỉ chạy 1 lần.

- Cú pháp:

```js
export default {
  data() {
    return {
      firstName: 'Nhan',
      lastName: 'Nguyen'
    }
  },
  computed: {
    // 1. Getter only (Phổ biến nhất)
    fullName() {
      return this.firstName + ' ' + this.lastName
    },

    // 2. Getter và Setter (Ít dùng)
    fullInfo: {
      get() {
        return this.firstName + ' ' + this.lastName
      },
      set(newValue) {
        const names = newValue.split(' ')
        this.firstName = names[0]
        this.lastName = names[names.length - 1]
      }
    }
  }
}
```

#### Ví dụ về computed có setter

Computed không chỉ đọc mà có thể ghi.

```js
computed: {
  fullName: {
    get() {
      return this.firstName + ' ' + this.lastName
    },

    set(value) {
      const parts = value.split(' ')

      this.firstName = parts[0]
      this.lastName = parts[1]
    }
  }
}
```

Dùng:

```js
this.fullName = 'Tran Van B'
```

Kết quả:

```js
this.firstName // Tranthis.lastName  // Van
```

### Khi nào dùng?

- Biến đổi dữ liệu để hiển thị
- filter/sort dữ liệu
- combine nhiều state.
- derived state

#### Ví dụ filter list

```js
data() {
  return {
    keyword: '',
    users: [
      { name: 'An' },
      { name: 'Binh' },
      { name: 'Cuong' }
    ]
  }
},

computed: {
  filteredUsers() {
    return this.users.filter(user =>
      user.name
        .toLowerCase()
        .includes(this.keyword.toLowerCase())
    )
  }
}
```

```html
<input v-model="keyword">

<ul>
  <li v-for="user in filteredUsers" :key="user.name">
    {{ user.name }}
  </li>
</ul>
```

## Watch

`watch` dùng để theo dõi sự thay đổi của dữ liệu và &lt;mark style="background: #ABF7F7A6;"&gt;thực hiện một hành động khi dữ liệu thay đổi.&lt;/mark&gt;
Khác với `computed`
- `computed`: tạo ra dữ liệu mới.
- `watch` -> chạy side effect.
- Ví dụ side effect:
	- gọi API
	- debounce search
	- lưu localStorage
	- validate form
	- tracking/log
	- animation