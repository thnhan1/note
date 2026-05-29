## Class binding

```html
v-bind:class="{ className: condition }"
```

Có nghĩa:

```
{
  tên_class_css: điều_kiện_boolean
}
```

trong vue

```html
<div v-bind:class="{ class: isActive }">
```

Vue hiểu:

```
Nếu isActive === true
→ thêm class "class"

Nếu isActive === false
→ không thêm class "class"
```

Code ví dụ:

```js
<div :class="{ active: isActive }">
  Hello
</div>

export default {
  data() {
    return {
      isActive: true
    }
  }
}
```

- Ví dụ nhiều class:

```js
<div :class="{
  active: isActive,
  danger: hasError,
  hidden: isHidden
}">
</div>

// data
data() {
  return {
    isActive: true,
    hasError: false,
    isHidden: true
  }
}

// ket qua
<div class="active hidden"></div>
```
### Các kiểu binding class
- String syntax
```html
<div :class="'active'"></div>
```
- Object syntax:
```html
<div :class="{ active: isActive }"></div>
```
- Array Syntax:
```js
<div :class="[activeClass, errorClass]"></div>

// data
data() {
  return {
    activeClass: 'active',
    errorClass: 'danger'
  }
}

// kq
<div class="active danger"></div>


// mix
<div :class="[
  activeClass,
  { danger: hasError }
]">
</div>
```