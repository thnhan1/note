# Edge DevTools — Debug AEM Author/Publish

Hướng dẫn chi tiết sử dụng Microsoft Edge DevTools (Chromium) để debug các vấn đề trên AEM 6.5 Author và Publish instance.

> Edge DevTools tương đương Chrome DevTools vì cùng engine Chromium. Mọi kỹ thuật áp dụng cho cả Chrome.

## Mở DevTools

| Phím tắt | Mô tả |
|----------|-------|
| `F12` | Mở/đóng DevTools |
| `Ctrl+Shift+I` | Mở DevTools |
| `Ctrl+Shift+J` | Mở Console tab |
| `Ctrl+Shift+C` | Mở Elements + Inspect mode |
| `Ctrl+Shift+M` | Toggle Device Emulation |

---

## 1. Elements Tab — Inspect AEM Component Markup

### Xác định component từ HTML markup

AEM Touch UI inject `data-*` attributes vào mỗi component trong editor mode:

```html
<div class="cmp-teaser"
     data-cmp-is="teaser"
     data-cmp-data-layer='{"teaser-xxx": {"@type":"mysite/components/teaser"}}'>
```

**Cách dùng:**
1. `Ctrl+Shift+C` → hover lên section cần debug
2. Xem `data-cmp-data-layer` → biết ngay `@type` (resourceType)
3. Từ resourceType → tìm code trong `/apps/`

### Inspect AEM Editor overlay

Trong Author editor mode (`/editor.html/...`), mỗi component được wrap bởi:

```html
<div class="cq-placeholder" data-emptytext="Teaser"></div>
<!-- hoặc -->
<div class="cmp-teaser" data-path="/content/mysite/en/home/jcr:content/root/container/teaser">
```

`data-path` → đây là JCR path chính xác của component → mở ngay trong CRXDE.

### Tìm CSS conflict

1. Chọn element trong Elements tab
2. Panel **Styles** bên phải → xem tất cả CSS rules applied
3. Rules bị gạch ngang = bị override
4. **Computed** tab → xem final computed value

**AEM-specific:** Clientlibs CSS thường load từ `/etc.clientlibs/` hoặc `/libs/clientlibs/`. Tìm file source:
- Click link file CSS trong Styles panel → nhảy tới Sources tab

### Edit CSS live

Double-click value trong Styles panel → sửa trực tiếp → preview ngay trên page. Dùng để test fix CSS trước khi commit code.

---

## 2. Console Tab — AEM JavaScript Debug

### Kiểm tra AEM JS Objects

AEM expose nhiều global objects trong editor mode:

```js
// Granite UI namespace
Granite.author                    // Author UI API
Granite.author.editables          // Danh sách tất cả editable components trên page
Granite.author.ContentFrame       // Content iframe reference
Granite.author.DialogFrame        // Dialog frame reference

// Kiểm tra editable component
Granite.author.editables.forEach(e => {
    console.log(e.path, e.type);
});
```

### Debug Coral UI / Granite UI Dialog

Khi dialog mở, inspect trong Console:

```js
// Lấy tất cả dialog fields
document.querySelectorAll('coral-dialog [name]').forEach(el => {
    console.log(el.name, el.value);
});

// Xem current dialog DOM
document.querySelector('coral-dialog.is-open');
```

### Monitor AEM Events

```js
// Listen cho component edit events
$(document).on('cq-editables-loaded', () => {
    console.log('Editables loaded:', Granite.author.editables.length);
});

// Listen cho page editor events
$(document).on('cq-editor-loaded', () => {
    console.log('Editor fully loaded');
});

// Listen cho dialog events
$(document).on('coral-overlay:open', (e) => {
    console.log('Dialog opened:', e.target);
});
```

### Kiểm tra WCM Mode

```js
// Trên author
Granite.author.pageInfoProvider?.getPageInfo().then(info => {
    console.log('Page info:', info);
});

// Check WCM mode từ meta tag
document.querySelector('meta[name="wcm.mode"]')?.content
// → "EDIT", "PREVIEW", "DISABLED", "ANALYTICS"
```

### Console Utilities hữu ích

```js
// Copy object ra clipboard
copy(Granite.author.editables[0])

// Monitor function calls
monitor(Granite.author.edit)

// Time execution
console.time('query');
// ... code ...
console.timeEnd('query');

// Table format
console.table(Granite.author.editables.map(e => ({
    path: e.path,
    type: e.type,
    dom: e.dom?.[0]?.tagName
})));
```

---

## 3. Network Tab — Debug AEM Requests

### Filter requests hiệu quả

| Filter | Mục đích |
|--------|----------|
| `Fetch/XHR` | AJAX calls, Sling servlet responses |
| `JS` | JavaScript/clientlib files |
| `CSS` | Stylesheet files |
| `Doc` | Main HTML document |
| `Img` | Images từ DAM |
| `-is-launch -analytics -target` | Loại bỏ Adobe marketing noise |

### Debug Sling Servlet / API calls

1. Chọn filter **Fetch/XHR**
2. Trigger action trên page (save dialog, load content, etc.)
3. Click request → xem:
   - **Headers** → URL, method, status code
   - **Payload** → POST data gửi lên
   - **Preview/Response** → JSON response từ AEM

**Ví dụ debug dialog save:**

Khi author save dialog, AEM gửi POST tới:
```
POST /content/mysite/en/home/jcr:content/root/container/teaser HTTP/1.1
```

Payload chứa tất cả field values:
```
./jcr:title=My Title
./description=My Description
./fileReference=/content/dam/mysite/hero.jpg
```

→ Nếu field không save → kiểm tra payload có chứa field đó không.

### Debug Content Loading

Page AEM load content qua nhiều request:

```
GET /content/mysite/en/home/jcr:content/root.model.json    ← Sling Model JSON
GET /content/mysite/en/home/jcr:content.infinity.json       ← Full JCR export
GET /libs/cq/gui/components/authoring/editors/...           ← Editor UI
GET /etc.clientlibs/mysite/clientlibs/...                   ← ClientLibs
```

### Kiểm tra Clientlib loading

Filter `JS` hoặc `CSS` → search `clientlibs`:

```
/etc.clientlibs/mysite/clientlibs/clientlib-base.min.js
/etc.clientlibs/mysite/clientlibs/clientlib-base.min.css
```

Nếu 404 → clientlib category sai hoặc chưa build.

### Throttling — Simulate slow network

1. Network tab → **No throttling** dropdown
2. Chọn **Slow 3G** hoặc **Fast 3G**
3. Dùng để test page load performance trên mạng chậm

### Block requests — Test without specific resources

1. Network tab → right-click request → **Block request URL**
2. Reload page → xem page render thế nào khi thiếu resource đó
3. Hữu ích khi debug CSS/JS conflict

---

## 4. Sources Tab — Debug JavaScript

### Tìm và debug clientlib JS

1. Sources tab → **Page** tree
2. Navigate: `etc.clientlibs` → `mysite` → `clientlibs`
3. Hoặc `Ctrl+P` → gõ tên file JS

### Đặt Breakpoint

1. Click vào line number → breakpoint (dot xanh)
2. Khi code chạy tới → dừng lại
3. Panel bên phải:
   - **Scope** → xem tất cả variables
   - **Call Stack** → xem function nào gọi tới đây
   - **Watch** → thêm expression để monitor

### Conditional Breakpoint

Right-click line number → **Add conditional breakpoint**:

```js
path === '/content/mysite/en/home'
```

→ Chỉ dừng khi condition đúng. Rất hữu ích khi debug loop.

### Logpoint (không dừng, chỉ log)

Right-click line number → **Add logpoint**:

```js
'Component path:', componentPath, 'data:', JSON.stringify(data)
```

→ Print ra Console mà không pause execution.

### Debug Minified Code

1. Click `\{\}` (Pretty print) ở dưới source panel → format code đẹp
2. Đặt breakpoint trên formatted code

### Debug Event Listeners

1. Elements tab → chọn element
2. Panel **Event Listeners** → xem tất cả listeners attached
3. Click link → nhảy tới source code
4. Uncheck **Framework listeners** để filter noise

### Source Map

Nếu `ui.frontend` build có source map, Edge DevTools tự map tới original source:
- `webpack://` → original TypeScript/SCSS files
- Đặt breakpoint trên original source

---

## 5. Application Tab — AEM Session & Storage

### Cookies quan trọng trong AEM

| Cookie | Ý nghĩa |
|--------|----------|
| `login-token` | AEM authentication token |
| `cq-authoring-mode` | Current authoring mode |
| `wcmmode` | WCM mode (edit/preview/disabled) |
| `cq-editor-layer` | Editor layer (Edit/Layout/etc.) |

### Debug login issues

1. Application tab → **Cookies** → domain
2. Xóa `login-token` → reload → phải redirect về login
3. Nếu không redirect → có SSO hoặc dispatcher config vấn đề

### Local Storage / Session Storage

AEM editor lưu state vào storage:
```js
// Xem trong Console
Object.keys(localStorage).filter(k => k.includes('cq') || k.includes('granite'));
```

---

## 6. Performance Tab — AEM Page Performance

### Record page load

1. Performance tab → click **Record** (⏺)
2. Reload page (`Ctrl+R`)
3. Stop recording
4. Phân tích:
   - **Summary** → tổng thời gian Loading/Scripting/Rendering/Painting
   - **Bottom-Up** → function nào tốn thời gian nhất
   - **Call Tree** → execution hierarchy

### Xác định blocking resources

- Band đỏ trên **Main** thread → long task (>50ms)
- Hover để xem function name → thường là clientlib JS nặng

### Lighthouse Audit

1. Mở DevTools → tab **Lighthouse**
2. Chọn: Performance, Accessibility, Best Practices, SEO
3. Click **Analyze page load**
4. Kết quả cho từng category + recommendations

> **Lưu ý:** Chạy Lighthouse trên **publish instance** với `wcmmode=disabled` để có kết quả chính xác. Author mode có rất nhiều editor JS làm sai kết quả.

---

## 7. AEM-Specific Debug Techniques

### Debug Component rendering order

Mở Console, paste:

```js
// Liệt kê tất cả component trên page theo DOM order
document.querySelectorAll('[data-cmp-data-layer]').forEach(el => {
    const data = JSON.parse(el.dataset.cmpDataLayer || '{}');
    const key = Object.keys(data)[0];
    if (key) {
        console.log(`${key} → ${data[key]['@type']}`);
    }
});
```

### Debug Dispatcher Cache

So sánh response headers giữa author và publish:

**Network tab → click request → Headers:**

```
X-Dispatcher: ...
X-Cache: HIT (hoặc MISS)
X-Cache-Lookup: HIT (hoặc MISS)
Last-Modified: ...
Cache-Control: ...
```

| Header | Ý nghĩa |
|--------|----------|
| `X-Cache: HIT` | Response từ dispatcher cache |
| `X-Cache: MISS` | Request forward tới AEM publish |
| `X-Dispatcher` | Dispatcher version/instance |
| `Age` | Thời gian (giây) content đã nằm trong cache |

### Debug Sling Model JSON

Thêm extension `.model.json` vào URL:

```
/content/mysite/en/home/jcr:content/root/container/teaser.model.json
```

Mở trong Network tab hoặc new tab → xem JSON output của Sling Model Exporter.

### Debug Content Fragment / Experience Fragment

```
/content/dam/mysite/fragments/my-cf.model.json       ← CF data
/api/assets/mysite/fragments/my-cf.json               ← Assets API
/content/experience-fragments/mysite/xf-header.model.json  ← XF data
```

### Debug Author permissions

Nếu component không editable → kiểm tra Console có error:

```
Uncaught Error: No edit config found for ...
```

Hoặc Network tab có 403 responses → user thiếu quyền trên path đó.

### So sánh Author vs Publish rendering

Mở 2 tab Edge:
- Tab 1: `http://localhost:4502/content/mysite/en/home.html?wcmmode=disabled` (Author, disabled mode)
- Tab 2: `http://localhost:4503/content/mysite/en/home.html` (Publish)

Mở DevTools cả 2 → so sánh:
- HTML structure (Elements)
- Network requests
- Console errors
- Response headers

---

## 8. Network Conditions & Override

### Override HTTP responses (Local Overrides)

Cho phép thay đổi response content mà không cần modify server:

1. Sources tab → **Overrides** panel (sidebar trái)
2. Click **Select folder for overrides** → chọn folder local
3. Network tab → right-click request → **Override content**
4. Edit response → save → reload page

**Use case:** Test fix CSS/JS trước khi deploy. Override JSON response để test edge case.

### Override User Agent

1. Network conditions (`Ctrl+Shift+P` → gõ "network conditions")
2. Uncheck **Use browser default** cho User agent
3. Chọn device hoặc gõ custom UA string

Hữu ích khi debug AEM responsive behavior hoặc device-specific rendering.

---

## 9. Console Snippets — Reusable Debug Scripts

Lưu scripts thường dùng:

1. Sources tab → **Snippets** (sidebar trái)
2. **+ New snippet** → đặt tên → viết code
3. `Ctrl+Enter` để chạy

### Snippet: List all AEM components on page

```js
// AEM Component Inspector
(() => {
    const components = document.querySelectorAll('[data-cmp-data-layer]');
    const result = [];
    components.forEach(el => {
        const data = JSON.parse(el.dataset.cmpDataLayer || '{}');
        const key = Object.keys(data)[0];
        if (key && data[key]) {
            result.push({
                id: key,
                type: data[key]['@type'] || 'unknown',
                title: data[key]['dc:title'] || '',
                path: el.closest('[data-path]')?.dataset.path || ''
            });
        }
    });
    console.table(result);
})();
```

### Snippet: Check all broken images

```js
// Find broken images on page
(() => {
    const images = document.querySelectorAll('img');
    const broken = [];
    images.forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
            broken.push({ src: img.src, alt: img.alt });
        }
    });
    if (broken.length) {
        console.warn(`Found ${broken.length} broken images:`);
        console.table(broken);
    } else {
        console.log('All images loaded OK');
    }
})();
```

### Snippet: Check clientlib loading status

```js
// Check ClientLib status
(() => {
    const scripts = [...document.querySelectorAll('script[src*="clientlibs"]')];
    const styles = [...document.querySelectorAll('link[href*="clientlibs"]')];
    console.group('ClientLibs loaded');
    console.log('JS files:', scripts.length);
    scripts.forEach(s => console.log('  ', s.src));
    console.log('CSS files:', styles.length);
    styles.forEach(s => console.log('  ', s.href));
    console.groupEnd();
})();
```

### Snippet: Export page component tree as JSON

```js
// Export component tree
(() => {
    const tree = {};
    document.querySelectorAll('[data-path]').forEach(el => {
        const path = el.dataset.path;
        const type = el.dataset.cmpDataLayer
            ? JSON.parse(el.dataset.cmpDataLayer)[Object.keys(JSON.parse(el.dataset.cmpDataLayer))[0]]?.['@type']
            : el.getAttribute('data-sly-resource-type') || 'unknown';
        tree[path] = type;
    });
    console.table(tree);
    copy(JSON.stringify(tree, null, 2));
    console.log('Copied to clipboard!');
})();
```

---

## 10. Keyboard Shortcuts Cheat Sheet

| Shortcut | Hành động |
|----------|-----------|
| `Ctrl+Shift+C` | Inspect element mode |
| `Ctrl+Shift+J` | Mở Console |
| `Ctrl+P` | Quick Open file (trong Sources) |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+F` | Search trong panel hiện tại |
| `Ctrl+Shift+F` | Search across all sources |
| `F8` | Resume/Pause script execution |
| `F10` | Step over |
| `F11` | Step into |
| `Shift+F11` | Step out |
| `Ctrl+\` | Pause on next statement |
| `Ctrl+Shift+E` | Run selected code in Console |
| `Esc` | Toggle Console drawer |

---

## 11. Debug Checklist cho AEM Issues

### Page không render đúng
1. **Console** → check JS errors
2. **Network** → check 404/500 responses
3. **Elements** → inspect HTML structure, missing components
4. **Sources** → debug clientlib JS

### Dialog không save
1. **Network** → filter POST → check payload và response
2. **Console** → check validation errors
3. **Elements** → inspect dialog fields, check `name` attribute

### Component không hiển thị
1. **Elements** → tìm `data-path` của component → có trong DOM không?
2. **Console** → check rendering errors
3. **Network** → check `.model.json` response

### Page load chậm
1. **Network** → sort by Size/Time → tìm request lớn/chậm
2. **Performance** → record → tìm long tasks
3. **Lighthouse** → chạy audit
4. **Coverage** (`Ctrl+Shift+P` → "coverage") → tìm unused CSS/JS

### Cache issues
1. `Ctrl+Shift+Delete` → clear browser cache
2. **Network** → check `Disable cache` checkbox
3. Check response headers: `X-Cache`, `Cache-Control`
4. Hard reload: `Ctrl+Shift+R`
