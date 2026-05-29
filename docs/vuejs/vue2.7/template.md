## Vue Template

### text

```vue
<p>{{ text }} </p>
```

- dùng `v-once` để text không change (giống lần render đầu) khi nó được thay đổi giá trị.

### raw html

```vue
<p>Using mustaches: {{ rawHtml }}</p>
<p>Using v-html directive: <span v-html="rawHtml"></span></p>
```

- dynamically rendering HTML trong website có thể nguy hiểm và có thể gây **XSS**.

### Atrributes

- v-bind: `v-bind:attribute="value"` or `:attribute="value"`

```vue
<template>
  <!-- Đúng: binding object attributes -->
  <div v-bind="divAttrs">Content</div>
</template>

<script>
export default {
  data() {
    return {
      divAttrs: {
        id: 'main',
        class: 'container'
      }
    }
  }
}
</script>
```

- kết quả render: `&lt;div class='container' id='main'&gt;Content&lt;/div&gt;`
- Với các giá trị `true`
- Nếu giá trị bind là **truthy** (khác `null`, `undefined`, `false`): Vue render attribute vào DOM (ví dụ: `disabled="disabled"` hoặc `disabled`).
- Nếu giá trị bind là **falsy** (`null`, `undefined`, `false`): Vue &lt;mark style="background: #FFF3A3A6;"&gt;**xóa hoàn toàn** attribute đó khỏi DOM element.&lt;/mark&gt;

### Js expression

- valid expression (will be evaluated as js in data scope of owner Vue instance. can only single expression)

```vue
{{ number + 1 }}

{{ ok ? 'YES' : 'NO' }}

{{ message.split('').reverse().join('') }}

<div v-bind:id="'list-' + id"></div>
```

- Invalid: because it statement

```
<!-- this is a statement, not an expression: -->
{{ var a = 1 }}

<!-- flow control won't work either, use ternary expressions -->
{{ if (ok) { return message } }}
```

### Directives

Là các thuộc tính đặc biệt bắt đầu bằng `v-`

#### Arguments

một vài directives có thể nhận "argument". Ví dụ `v-bind`.

```vue
<a v-bind:href="url">
```

#### Directive Arguments (2.6.0+)

Dùng dấu `[]` để chứa attribute name cho directive.

```vue
<!--
Note that there are some constraints to the argument expression, as explained
in the "Dynamic Argument Expression Constraints" section below.
-->
<a v-bind:[attributeName]="url"> … </a>
```

ví dụ:

```vue
<a v-on:[eventName]="doSomething"> … </a>
```

- constraint cho Dynamic Argument Expression
	- Tránh đặt tên có uppercase vì nó sẽ thành lowercase ví dụ `v-bind:[someAttr]` sẽ thành `someattr`

#### Modifier

- ví dụ

```vue
<form v-on:submit.prevent="onSubmit"> … </form>
```

#### Shorthand

- dạng short-hand là dùng dấu `:`

```vue
<!-- full syntax -->
<a v-on:click="doSomething"> … </a>

<!-- shorthand -->
<a @click="doSomething"> … </a>

<!-- shorthand with dynamic argument (2.6.0+) -->
<a @[event]="doSomething"> … </a>
```