# Coral UI trong AEM 6.5

## Giới thiệu

**Coral UI** là thư viện web components chính thức của Adobe, cung cấp toàn bộ giao diện Touch UI của AEM 6.5 - bao gồm dialogs, Sites console, DAM console, thanh công cụ page editor và tất cả các admin interface. Khi bạn xây dựng custom dialog fields, admin consoles, hoặc author-facing UI trong AEM 6.5, bạn sẽ sử dụng các components của Coral UI.

**Coral UI 3** (phiên bản được sử dụng trong AEM 6.5) được xây dựng dựa trên chuẩn **Web Components** (Custom Elements v1). Các components được sử dụng như các HTML elements với thuộc tính `is="coral-*"` hoặc như các tags độc lập như `&lt;coral-dialog&gt;`.

```
Granite UI (Server-side) → renders HTML với Coral classes và attributes
Coral UI 3 (Client-side) → Cung cấp interactive web components
```

## Granite UI vs Coral UI

Hai khái niệm này thường bị nhầm lẫn. Chúng làm việc cùng nhau nhưng ở các lớp khác nhau:

| Layer | Framework | Nơi chạy | Chức năng |
|-------|-----------|----------|-----------|
| **Granite UI** | Server-side (Sling) | AEM server | Đọc dialog XML, render HTML markup với Coral classes và attributes |
| **Coral UI 3** | Client-side (JS/CSS) | Browser | Cung cấp interactive web components (buttons, dialogs, selects, etc.) |

Khi bạn viết dialog XML như `sling:resourceType="granite/ui/components/coral/foundation/form/textfield"`, Granite UI sẽ render server-side HTML, và Coral UI's JavaScript sẽ enhance nó thành một text field tương tác trong browser.

> 💡 **Mẹo:** Bạn tương tác với Granite UI khi viết **dialog XML** (server-side). Bạn tương tác với Coral UI khi viết **client-side JavaScript** cho dialog customization, custom fields, hoặc admin pages.

---

## Thư viện Components

AEM 6.5 đi kèm với Coral UI 3. Full API có thể truy cập trên local instance của bạn:

| Resource | URL |
|----------|-----|
| **Coral UI component examples** | `http://localhost:4502/libs/granite/ui/components/coral/foundation/form/field.html` |
| **Coral UI 3 API docs** | `http://localhost:4502/libs/granite/ui/references/coral-ui/coralui3/` |
| **Granite UI server-side docs** | `http://localhost:4502/libs/granite/ui/content/dumplibs.html` |

### Các Coral UI Components thường dùng

| Component | HTML | Mục đích |
|-----------|------|----------|
| `coral-button` | `&lt;button is="coral-button"&gt;` | Buttons với icons và variants |
| `coral-textfield` | `&lt;input is="coral-textfield"&gt;` | Text input fields |
| `coral-textarea` | `&lt;textarea is="coral-textarea"&gt;` | Multi-line text input |
| `coral-select` | `&lt;coral-select&gt;` | Dropdown select |
| `coral-checkbox` | `&lt;coral-checkbox&gt;` | Checkbox toggle |
| `coral-radio` | `&lt;coral-radio&gt;` | Radio button |
| `coral-switch` | `&lt;coral-switch&gt;` | Toggle switch |
| `coral-dialog` | `&lt;coral-dialog&gt;` | Modal dialog |
| `coral-alert` | `&lt;coral-alert&gt;` | Alert / notification banner |
| `coral-table` | `&lt;coral-table&gt;` | Data table |
| `coral-tabs` | `&lt;coral-tablist&gt;` + `&lt;coral-panelstack&gt;` | Tabbed interface |
| `coral-accordion` | `&lt;coral-accordion&gt;` | Collapsible sections |
| `coral-tag` | `&lt;coral-tag&gt;` | Tag / chip |
| `coral-tooltip` | `&lt;coral-tooltip&gt;` | Tooltip on hover |
| `coral-popover` | `&lt;coral-popover&gt;` | Popover content |
| `coral-progress` | `&lt;coral-progress&gt;` | Progress bar |
| `coral-wait` | `&lt;coral-wait&gt;` | Loading spinner |
| `coral-icon` | `&lt;coral-icon&gt;` | Icon (từ Coral icon set) |
| `coral-masonry` | `&lt;coral-masonry&gt;` | Masonry grid layout (card view) |
| `coral-columnview` | `&lt;coral-columnview&gt;` | Column / Miller columns view |
| `coral-shell` | `&lt;coral-shell&gt;` | AEM shell (global navigation) |

---

## Setup và Integration

Để sử dụng Coral UI components trong custom page hoặc template (outside of standard dialogs), load Coral UI libraries qua clientlib dependency.

### 1. Tạo clientlib với Coral dependencies

**File:** `ui.apps/.../clientlibs/clientlib-coral-custom/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0"
    jcr:primaryType="cq:ClientLibraryFolder"
    allowProxy="{Boolean}true"
    dependencies="[coralui3,granite.ui.coral.foundation]"
    categories="[myproject.coral-custom]"/>
```

| Dependency | Cung cấp |
|------------|----------|
| `coralui3` | Core Coral UI 3 library (tất cả components, JS, CSS) |
| `granite.ui.coral.foundation` | Granite UI foundation components (form fields, containers) |
| `granite.ui.shell` | AEM shell framework (chỉ cần nếu building full admin pages) |

### 2. Load clientlib trong HTL template

**File:** `body.html`

```html
<sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html">
    <sly data-sly-call="${clientlib.all @ categories='myproject.coral-custom'}"/>
</sly>

<div class="myproject-custom-ui">
    <button is="coral-button" variant="primary" icon="add">Thêm Item</button>
</div>
```

Thuộc tính `dependencies` trong clientlib XML đảm bảo Coral UI 3 được load trước khi custom code của bạn chạy.

---

## Sử dụng Coral UI Components

### Buttons

```html
<!-- Primary action button -->
<button is="coral-button" variant="primary" icon="check">Lưu</button>

<!-- Secondary / quiet button -->
<button is="coral-button" variant="quiet" icon="edit">Sửa</button>

<!-- Warning button -->
<button is="coral-button" variant="warning" icon="delete">Xóa</button>

<!-- Button với chỉ icon (không label) -->
<button is="coral-button" variant="quietaction" icon="more" iconsize="S"
        title="Thêm tùy chọn"></button>

<!-- Disabled button -->
<button is="coral-button" variant="primary" disabled>Không khả dụng</button>

<!-- Button sizes -->
<button is="coral-button" variant="primary" size="M">Medium</button>
<button is="coral-button" variant="primary" size="L">Large</button>
```

**Button variants:** `default`, `primary`, `secondary`, `warning`, `quiet`, `minimal`, `quietaction`, `action`

### Alerts

```html
<!-- Info alert -->
<coral-alert variant="info">
    <coral-alert-header>Thông tin</coral-alert-header>
    <coral-alert-content>Component này có changes chưa được lưu.</coral-alert-content>
</coral-alert>

<!-- Success alert -->
<coral-alert variant="success">
    <coral-alert-header>Đã lưu</coral-alert-header>
    <coral-alert-content>Các thay đổi đã được lưu thành công.</coral-alert-content>
</coral-alert>

<!-- Warning alert -->
<coral-alert variant="warning">
    <coral-alert-header>Cảnh báo</coral-alert-header>
    <coral-alert-content>Hành động này không thể hoàn tác.</coral-alert-content>
</coral-alert>

<!-- Error alert -->
<coral-alert variant="error">
    <coral-alert-header>Lỗi</coral-alert-header>
    <coral-alert-content>Không thể lưu. Vui lòng thử lại.</coral-alert-content>
</coral-alert>
```

**Alert variants:** `info`, `success`, `warning`, `error`, `help`

### Dialogs

```html
<!-- Define a dialog -->
<coral-dialog id="myDialog" variant="default">
    <coral-dialog-header>Xác nhận hành động</coral-dialog-header>
    <coral-dialog-content>
        <p>Bạn có chắc chắn muốn xóa item này?</p>
    </coral-dialog-content>
    <coral-dialog-footer>
        <button is="coral-button" variant="default" coral-close>Hủy</button>
        <button is="coral-button" variant="primary" id="confirmBtn">Xóa</button>
    </coral-dialog-footer>
</coral-dialog>
```

**Mở và xử lý dialogs:**

```javascript
// Mở dialog
var dialog = document.getElementById('myDialog');
dialog.show();

// Xử lý confirm button
document.getElementById('confirmBtn').addEventListener('click', function() {
    // Thực hiện hành động
    dialog.hide();
});

// Lắng nghe dialog close
dialog.on('coral-overlay:close', function() {
    console.log('Dialog đã đóng');
});
```

**Dialog variants:** `default`, `error`, `warning`, `success`, `help`, `info`

### Select / Dropdown

```html
<coral-select name="category" placeholder="Chọn một danh mục">
    <coral-select-item value="news">Tin tức</coral-select-item>
    <coral-select-item value="blog">Blog</coral-select-item>
    <coral-select-item value="product" selected>Sản phẩm</coral-select-item>
    <coral-select-item value="event">Sự kiện</coral-select-item>
</coral-select>
```

**Đọc giá trị được chọn:**

```javascript
var select = document.querySelector('coral-select[name="category"]');
select.on('change', function() {
    console.log('Đã chọn:', select.value);
});
```

### Tables

```html
<coral-table selectable>
    <coral-table-head>
        <coral-table-row>
            <coral-table-headercell>Tên</coral-table-headercell>
            <coral-table-headercell>Trạng thái</coral-table-headercell>
            <coral-table-headercell>Chỉnh sửa</coral-table-headercell>
        </coral-table-row>
    </coral-table-head>
    <coral-table-body>
        <coral-table-row>
            <coral-table-cell>Trang chủ</coral-table-cell>
            <coral-table-cell><coral-status variant="success">Đã xuất bản</coral-status></coral-table-cell>
            <coral-table-cell>2026-01-15</coral-table-cell>
        </coral-table-row>
        <coral-table-row>
            <coral-table-cell>Giới thiệu</coral-table-cell>
            <coral-table-cell><coral-status variant="warning">Bản nháp</coral-status></coral-table-cell>
            <coral-table-cell>2026-01-20</coral-table-cell>
        </coral-table-row>
    </coral-table-body>
</coral-table>
```

### Tabs

```html
<coral-tablist>
    <coral-tab>Chung</coral-tab>
    <coral-tab selected>Nâng cao</coral-tab>
    <coral-tab>Phân quyền</coral-tab>
</coral-tablist>
<coral-panelstack>
    <coral-panel>
        <p>Nội dung cài đặt chung</p>
    </coral-panel>
    <coral-panel selected>
        <p>Nội dung cài đặt nâng cao</p>
    </coral-panel>
    <coral-panel>
        <p>Nội dung cài đặt phân quyền</p>
    </coral-panel>
</coral-panelstack>
```

### Icons

Coral UI bao gồm bộ icon toàn diện. Sử dụng thuộc tính `icon` trên buttons hoặc element `&lt;coral-icon&gt;`:

```html
<!-- Standalone icon -->
<coral-icon icon="edit" size="S"></coral-icon>
<coral-icon icon="delete" size="M"></coral-icon>
<coral-icon icon="check" size="L"></coral-icon>

<!-- Common icons -->
<coral-icon icon="add"></coral-icon>         <!-- + -->
<coral-icon icon="close"></coral-icon>       <!-- × -->
<coral-icon icon="search"></coral-icon>      <!-- 🔍 -->
<coral-icon icon="settings"></coral-icon>    <!-- ⚙ -->
<coral-icon icon="infoCircle"></coral-icon>  <!-- ℹ -->
<coral-icon icon="alert"></coral-icon>       <!-- ⚠ -->
<coral-icon icon="folder"></coral-icon>
<coral-icon icon="image"></coral-icon>
<coral-icon icon="globe"></coral-icon>
<coral-icon icon="user"></coral-icon>
<coral-icon icon="link"></coral-icon>
<coral-icon icon="code"></coral-icon>
```

Xem tất cả icons tại: `http://localhost:4502/libs/granite/ui/references/coral-ui/coralui3/Coral.Icon.html`

---

## Coral UI trong Dialog Clientlibs

Trường hợp sử dụng phổ biến nhất của Coral UI trong custom code là **dialog clientlibs** - JavaScript chạy bên trong component dialogs để thêm custom behaviour (show/hide fields, validation, dynamic defaults).

### Show/hide fields dựa trên giá trị dropdown

**File:** `ui.apps/.../clientlibs/clientlib-dialog/js/showhide.js`

```javascript
(function($, Coral) {
    'use strict';

    // Chạy khi dialog load
    $(document).on('dialog-ready', function() {
        initShowHide();
    });

    function initShowHide() {
        // Tìm select field trigger
        var $select = $('[name="./layoutType"]');
        if (!$select.length) return;

        // Lấy Coral select component
        Coral.commons.ready($select[0], function(selectEl) {
            // Trạng thái ban đầu
            toggleFields(selectEl.value);

            // Lắng nghe changes
            selectEl.on('change', function() {
                toggleFields(selectEl.value);
            });
        });
    }

    function toggleFields(value) {
        var $imageField = $('[name="./backgroundImage"]').closest('.coral-Form-fieldwrapper');
        var $colorField = $('[name="./backgroundColor"]').closest('.coral-Form-fieldwrapper');

        if (value === 'image') {
            $imageField.show();
            $colorField.hide();
        } else if (value === 'color') {
            $imageField.hide();
            $colorField.show();
        } else {
            $imageField.show();
            $colorField.show();
        }
    }

})(jQuery, Coral);
```

### Custom validation

**File:** `ui.apps/.../clientlibs/clientlib-dialog/js/validation.js`

```javascript
(function($, Coral) {
    'use strict';

    // Đăng ký custom validator
    $(window).adaptTo('foundation-registry').register(
        'foundation.validation.validator',
        {
            // CSS selector để match field
            selector: '[data-validation="url-pattern"]',

            // Validation function
            validate: function(el) {
                var value = el.value;
                if (!value) return; // Bỏ qua empty (dùng 'required' cho việc đó)

                var urlPattern = /^https?:\/\/.+/;
                if (!urlPattern.test(value)) {
                    return 'Vui lòng nhập URL hợp lệ bắt đầu bằng http:// hoặc https://';
                }
            }
        }
    );

})(jQuery, Coral);
```

Thêm validator vào dialog field qua `granite:data`:

```xml
<linkUrl
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
    fieldLabel="Link URL"
    name="./linkUrl"
    validation="url-pattern"/>
```

### Setting default values động

**Setting default date là ngày hôm nay:**

```javascript
(function($, Coral) {
    'use strict';

    $(document).on('dialog-ready', function() {
        var $dateField = $('[name="./publishDate"]');
        if (!$dateField.length) return;

        Coral.commons.ready($dateField[0], function(datePicker) {
            // Chỉ set nếu field empty (component mới)
            if (!datePicker.value) {
                var today = new Date().toISOString().split('T')[0];
                datePicker.value = today;
            }
        });
    });

})(jQuery, Coral);
```

### Loading dialog clientlib

Đăng ký dialog clientlib với category `cq.authoring.dialog` hoặc reference nó như thuộc tính `extraClientlibs` trên component:

**File:** `ui.apps/.../clientlibs/clientlib-dialog/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0"
    jcr:primaryType="cq:ClientLibraryFolder"
    allowProxy="{Boolean}true"
    categories="[cq.authoring.dialog]"
    dependencies="[coralui3]"/>
```

> 💡 **Mẹo:** Category `cq.authoring.dialog` được load cho **tất cả** dialogs. Nếu script của bạn chỉ nên chạy cho một component cụ thể, scope nó bằng cách check for a field unique to that dialog:

```javascript
$(document).on('dialog-ready', function() {
    var $myField = $('[name="./myUniqueFieldName"]');
    if (!$myField.length) return; // Không phải dialog của chúng ta
    // ... custom logic ...
});
```

---

## Coral UI JavaScript API Patterns

### `Coral.commons.ready()`

Đợi cho đến khi Coral component được fully initialised trước khi tương tác:

```javascript
var element = document.querySelector('coral-select');
Coral.commons.ready(element, function(readyElement) {
    // Component đã fully initialised và ready
    console.log('Selected value:', readyElement.value);
});
```

### Event handling với `.on()`

Coral components mở rộng HTMLElement và hỗ trợ standard DOM events plus Coral-specific events:

```javascript
// Coral event
dialog.on('coral-overlay:open', function() { /* dialog opened */ });
dialog.on('coral-overlay:close', function() { /* dialog closed */ });

// Standard DOM event on Coral element
select.on('change', function() { /* value changed */ });

// jQuery-style với delegation
$(document).on('change', 'coral-select[name="./category"]', function(e) {
    console.log('Category changed:', e.target.value);
});
```

### Các Coral events phổ biến

| Event | Component | Kích hoạt khi |
|-------|-----------|---------------|
| `change` | Select, Checkbox, Radio, Switch | Value changes |
| `coral-overlay:open` | Dialog, Popover | Overlay opens |
| `coral-overlay:close` | Dialog, Popover | Overlay closes |
| `coral-overlay:beforeopen` | Dialog, Popover | Before overlay opens (cancellable) |
| `coral-overlay:beforeclose` | Dialog, Popover | Before overlay closes (cancellable) |
| `coral-collection:add` | Multifield, TagList | Item added |
| `coral-collection:remove` | Multifield, TagList | Item removed |
| `click` | Button | Button clicked |
| `input` | Textfield, Textarea | User types |

### `foundation-registry`

Granite UI registry được sử dụng cho validators, adapters, và các extension points khác:

```javascript
var registry = $(window).adaptTo('foundation-registry');

// Register a validator
registry.register('foundation.validation.validator', { ... });

// Register a condition (for show/hide)
registry.register('foundation.condition', { ... });

// Register an adapter
registry.register('foundation.adapters', { ... });
```

### `foundation-contentloaded`

Kích hoạt khi nội dung mới được load vào DOM (ví dụ: dialog mở, multifield item được thêm):

```javascript
$(document).on('foundation-contentloaded', function(e) {
    // New content đã được load vào e.target
    // Re-initialise any custom logic cho dynamically added fields
    var $newContent = $(e.target);
    $newContent.find('[data-my-widget]').each(function() {
        initMyWidget(this);
    });
});
```

---

## Xây dựng Custom Dialog Field

Cho các requirements mà Coral UI's built-in fields không đáp ứng được, bạn có thể tạo custom Granite UI field component mà render Coral UI markup:

### Server-side (Granite UI field)

**File:** `ui.apps/apps/myproject/components/fields/color-picker/color-picker.html`

```html
<sly data-sly-use.field="com.adobe.granite.ui.components.Field"/>
<div class="coral-Form-fieldwrapper"
     data-sly-use.cfg="com.adobe.granite.ui.components.Config">

    <label class="coral-Form-fieldlabel"
           data-sly-test="${cfg.fieldLabel}">${cfg.fieldLabel}</label>

    <div class="myproject-color-picker">
        <input is="coral-textfield"
               name="${field.name}"
               value="${field.value}"
               type="text"
               class="myproject-color-picker__input"
               placeholder="${cfg.emptyText || '#000000'}"/>
        <div class="myproject-color-picker__preview"
             style="background-color: ${field.value || '#000000'}"></div>
    </div>

    <coral-icon icon="infoCircle"
                size="S"
                class="coral-Form-fieldinfo"
                data-sly-test="${cfg.fieldDescription}"
                title="${cfg.fieldDescription}"></coral-icon>
</div>
```

### Client-side (JavaScript enhancement)

**File:** `ui.apps/.../clientlibs/clientlib-dialog/js/color-picker.js`

```javascript
(function($, Coral) {
    'use strict';

    $(document).on('foundation-contentloaded', function() {
        $('.myproject-color-picker').each(function() {
            var $picker = $(this);
            var $input = $picker.find('.myproject-color-picker__input');
            var $preview = $picker.find('.myproject-color-picker__preview');

            // Update preview on input change
            $input.on('input', function() {
                $preview.css('background-color', $input.val() || '#000000');
            });
        });
    });

})(jQuery, Coral);
```

### Sử dụng custom field trong dialog

```xml
<backgroundColor
    jcr:primaryType="nt:unstructured"
    sling:resourceType="myproject/components/fields/color-picker"
    fieldLabel="Màu nền"
    fieldDescription="Nhập mã hex color"
    emptyText="#ffffff"
    name="./backgroundColor"/>
```

---

## Theming và CSS Classes

Coral UI sử dụng các CSS utility classes cho layout và spacing:

### Layout classes

| Class | Mục đích |
|-------|----------|
| `coral-Form-fieldwrapper` | Wraps a form field (label + input + description) |
| `coral-Form-fieldlabel` | Field label text |
| `coral-Form-fieldinfo` | Help icon / description |
| `coral-Form-field` | The input element itself |
| `coral--dark` | Dark theme (applied to a container) |
| `coral--light` | Light theme |
| `coral--largest` | Largest text size |
| `coral--large` | Large text size |

### Spacing với `u-coral-*`

```html
<!-- Margin -->
<div class="u-coral-margin">Standard margin</div>
<div class="u-coral-marginTop">Top margin only</div>
<div class="u-coral-marginBottom">Bottom margin only</div>

<!-- Padding -->
<div class="u-coral-padding">Standard padding</div>
<div class="u-coral-noPadding">Remove padding</div>

<!-- Text alignment -->
<div class="u-coral-textAlignCenter">Centred text</div>
<div class="u-coral-textAlignRight">Right-aligned text</div>

<!-- Visibility -->
<div class="u-coral-screenReaderOnly">Hidden visually, accessible to screen readers</div>
```

---

## Best Practices cho AEM 6.5 (2026)

### 1. Luôn sử dụng `Coral.commons.ready()` trước khi access components

Coral components initialise không đồng bộ. Luôn sử dụng `Coral.commons.ready()` hoặc `foundation-contentloaded` event trước khi đọc values hoặc attach listeners.

### 2. Scope dialog scripts để tránh conflicts

Dialog clientlibs với category `cq.authoring.dialog` chạy cho mọi dialog. Luôn check for a unique field name trước khi executing logic của bạn.

### 3. Không manipulate Coral DOM internals

Coral components tự quản lý internal DOM structure của chúng (shadow DOM). Không rely vào hoặc manipulate internal elements -- sử dụng component's JavaScript API thay thế:

```javascript
// ❌ Bad: manipulating internal DOM
select.querySelector('.coral-Select-trigger').style.color = 'red';

// ✅ Good: using the component API
select.variant = 'warning';
select.disabled = true;
```

### 4. Sử dụng `granite:data` cho custom data attributes

Pass custom data từ dialog XML đến client-side JavaScript của bạn:

```xml
<myField
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
    name="./title">
    <granite:data
        jcr:primaryType="nt:unstructured"
        max-words="{Long}50"
        show-counter="{Boolean}true"/>
</myField>
```

```javascript
// Đọc trong JS
var maxWords = $field.data('max-words');     // 50
var showCounter = $field.data('show-counter'); // true
```

### 5. Ưu tiên built-in Granite UI fields

Trước khi building custom field, check xem có existing Granite UI field type hoặc Coral component nào cover need của bạn không. Custom fields add maintenance overhead và có thể break khi AEM upgrades.

### 6. Cập nhật 2026: Tối ưu cho AEM 6.5 on-premise

- **Performance:** Sử dụng async loading cho clientlibs lớn
- **Security:** Validate tất cả inputs trong custom dialogs
- **Accessibility:** Đảm bảo WCAG 2.1 compliance cho author UI
- **Browser support:** AEM 6.5 Coral UI 3 support modern browsers (Chrome 90+, Firefox 88+, Edge 90+)

---

## Common Pitfalls và Solutions

| Vấn đề | Giải pháp |
|--------|-----------|
| `Coral is not defined` | Đảm bảo clientlib của bạn có `coralui3` như một dependency |
| Component API methods return `undefined` | Sử dụng `Coral.commons.ready()` - component chưa được initialised |
| Dialog script chạy cho wrong component | Scope script của bạn bằng cách check for a unique field name |
| Styles break sau AEM upgrade | Không rely vào internal Coral DOM structure; sử dụng public API |
| `foundation-contentloaded` fires nhiều lần | Bình thường - nó fires cho mỗi lần content load mới (dialog open, multifield add); make init logic idempotent |
| Custom field không save values | Đảm bảo `&lt;input&gt;` có `name` attribute matching `./propertyName` |
| jQuery `$` không available | Sử dụng `(function($, Coral) \{ ... \})(jQuery, Coral);` wrapper |

---

## Tài nguyên Tham khảo

### Tài liệu chính thức
- [Coral UI 3 Documentation](http://localhost:4502/libs/granite/ui/references/coral-ui/coralui3/)
- [Granite UI Foundation Components](http://localhost:4502/libs/granite/ui/content/dumplibs.html)
- [Coral Spectrum (open-source successor)](https://opensource.adobe.com/coral-spectrum/)
- [Adobe Spectrum Design System](https://spectrum.adobe.com/)

### Xem thêm
- **Touch UI (Author UI)** - Touch UI architecture
- **Overlays** - Customising existing AEM UI
- **Render Conditions** - Showing/hiding UI elements
- **Component Dialogs** - Dialog field types và XML structure
- **Client Libraries** - Loading clientlibs
- **Custom Component Guide** - Building components với dialog clientlibs
- **HTL Templates** - Server-side rendering

---

## Kết luận

Coral UI là nền tảng quan trọng cho việc phát triển author UI trong AEM 6.5. Hiểu rõ sự khác biệt giữa Granite UI (server-side) và Coral UI (client-side), nắm vững các components phổ biến, và áp dụng best practices sẽ giúp bạn xây dựng các custom dialogs và admin interfaces hiệu quả, maintainable và compatible với AEM 6.5 on-premise trong năm 2026.

> **Lưu ý quan trọng:** AEM 6.5 vẫn đang được Adobe support đến tháng 4/2026 (với Extended Support). Coral UI 3 là version ổn định nhất cho AEM 6.5. Không upgrade lên Coral Spectrum (v4) vì nó chỉ compatible với AEM as a Cloud Service và AEM 6.6+.



