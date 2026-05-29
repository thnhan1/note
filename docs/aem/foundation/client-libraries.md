---
tags: [project, active, aem, frontend, clientlibs]
created: 2026-04-26
modified: 2026-04-26
title: Client Libraries (clientlibs) — AEM 6.5
aliases: [client-libraries, clientlib, clientlibs]
---


## 0) Tóm tắt

- Clientlib = cơ chế **bundle CSS/JS theo category**.
- Include trong page bằng **category string** (không link file lẻ).
- Trục debug:
  - category name đúng?
  - `allowProxy` đúng?
  - `css.txt/js.txt` đúng order + đúng path?
  - dependencies/embed đúng?

---

## 1) Cách clientlibs hoạt động

Clientlib làm được:

- Group file theo **category**
- Khai báo **dependencies** (đảm bảo load order)
- **embed** (gộp vào 1 request)
- Serve qua **proxy** `/etc.clientlibs/` (quan trọng cho Cloud; on-prem cũng nên bật để tương thích)

---

## 2) Cấu trúc clientlib chuẩn

```text
/apps/<site>/clientlibs/
└── clientlib-base/
    ├── .content.xml          # cq:ClientLibraryFolder
    ├── css.txt               # order include CSS
    ├── js.txt                # order include JS
    ├── css/
    │   ├── reset.css
    │   ├── variables.css
    │   └── base.css
    └── js/
        ├── utils.js
        └── main.js
```

### 2.1 `.content.xml` (quan trọng)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          jcr:primaryType="cq:ClientLibraryFolder"
          categories="[<site>.base]"
          allowProxy="{Boolean}true"/>
```

| Property | Ý nghĩa | Notes |
|---|---|---|
| `categories` | tên category (có thể nhiều) | include bằng HTL theo string |
| `allowProxy` | phục vụ qua `/etc.clientlibs/` | nên bật để tương thích AEMaaCS |
| `dependencies` | category phải load **trước** | tạo thêm request |
| `embed` | inline category khác vào bundle này | giảm request |

---

## 3) `css.txt` và `js.txt` (order + base)

`css.txt`:

```text
#base=css
reset.css
variables.css
base.css
```

`js.txt`:

```text
#base=js
utils.js
main.js
```

Rules:

- File được concat theo **đúng thứ tự liệt kê**
- `#base=` = prefix folder
- Không khai báo file ⇒ không được bundle

---

## 4) Include clientlibs trong Page Component (HTL)

Template include chuẩn:

```html
<sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html">
  <!-- CSS in <head> -->
  <sly data-sly-call="${clientlib.css @ categories='<site>.base'}"/>

  <!-- JS before </body> -->
  <sly data-sly-call="${clientlib.js @ categories='<site>.base'}"/>

  <!-- Both -->
  <sly data-sly-call="${clientlib.all @ categories='<site>.base'}"/>
</sly>
```

Multiple categories:

```html
<sly data-sly-call="${clientlib.css @ categories=['<site>.base', '<site>.components']}"/>
```

---

## 5) Dependencies vs Embed (quy tắc chọn)

### 5.1 Dependencies (load order, nhiều request)

```xml
<jcr:root
  jcr:primaryType="cq:ClientLibraryFolder"
  categories="[<site>.components]"
  dependencies="[<site>.base]"
  allowProxy="{Boolean}true"/>
```

Kết quả:

- Request 1: `&lt;site&gt;.base`
- Request 2: `&lt;site&gt;.components` (sau base)

### 5.2 Embed (gộp 1 request)

```xml
<jcr:root
  jcr:primaryType="cq:ClientLibraryFolder"
  categories="[<site>.site]"
  embed="[<site>.base,<site>.components]"
  allowProxy="{Boolean}true"/>
```

Kết quả:

- 1 request: `&lt;site&gt;.site` (chứa cả base + components)

Heuristic:

| Strategy | Khi dùng |
|---|---|
| **dependencies** | lib dùng chung, cần cache riêng, hoặc cần đảm bảo order rõ ràng |
| **embed** | bundle “site” cuối cùng để giảm request (project assets) |

---

## 6) Proxy serving `/etc.clientlibs/`

| Trạng thái | Path |
|---|---|
| không proxy | `/apps/&lt;site&gt;/clientlibs/...` (thường bị chặn ngoài production) |
| có proxy | `/etc.clientlibs/&lt;site&gt;/clientlibs/...` |

Checklist:

- [ ] `allowProxy="\{Boolean\}true"` ở mọi clientlib bạn muốn serve qua proxy
- [ ] Include bằng HTL template (AEM tự resolve sang `/etc.clientlibs/`)

---

## 7) Component-specific clientlibs

Pattern:

```text
/apps/<site>/components/hero/
├── .content.xml
├── hero.html
├── _cq_dialog/.content.xml
└── clientlibs/
    ├── .content.xml
    ├── css.txt
    ├── js.txt
    ├── css/hero.css
    └── js/hero.js
```

`.content.xml` của component clientlib:

```xml
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          jcr:primaryType="cq:ClientLibraryFolder"
          categories="[<site>.components]"
          allowProxy="{Boolean}true"/>
```

Note:

- Nhiều component clientlibs có thể dùng **chung 1 category** (`&lt;site&gt;.components`) ⇒ bundle cùng nhau.

---

## 8) `ui.frontend` module (tooling hiện đại)

Mục tiêu:

- SCSS/TS/build tool (webpack/Vite) trong `ui.frontend/`
- Output assets copy sang `ui.apps/.../clientlibs/...`
- Maven build/deploy package mang clientlibs vào AEM

Flow:

1. Build frontend (`npm/pnpm run build`) trong `ui.frontend/`
2. Copy output sang:
   - `ui.apps/src/main/content/jcr_root/apps/&lt;site&gt;/clientlibs/...`
3. Deploy package (Maven)

Dev loop (tuỳ project):

- `aem-clientlib-generator` (archetype hay dùng)
- `aemsync` (sync file vào AEM khi dev)

---

## 9) Naming convention (gợi ý)

| Category | Nội dung | Load |
|---|---|---|
| `&lt;site&gt;.base` | reset/fonts/variables/global | every page |
| `&lt;site&gt;.components` | CSS/JS theo component | every page |
| `&lt;site&gt;.site` | embed base + components | every page (single include) |
| `&lt;site&gt;.dependencies` | libs bên thứ ba | dependency của site |

---

## 10) Debug clientlibs (đúng thứ cần nhớ)

### 10.1 Xem clientlibs đang load

- Thêm `?debugClientLibs=true` vào URL page.

### 10.2 Rebuild/invalidate clientlibs cache (khi đổi không thấy)

- `http://localhost:4502/libs/granite/ui/content/dumplibs.rebuild.html`
  - Invalidate Caches
  - Rebuild Libraries

### 10.3 Check trực tiếp file proxy

```text
http://localhost:4502/etc.clientlibs/<site>/clientlibs/clientlib-base.css
http://localhost:4502/etc.clientlibs/<site>/clientlibs/clientlib-base.js
```

### 10.4 Matrix troubleshoot

| Symptom | Check | Fix |
|---|---|---|
| CSS/JS không load | category string trong HTL | khớp `categories` trong `.content.xml` |
| 404 `/etc.clientlibs/...` | `allowProxy` | set `\{Boolean\}true` + deploy |
| Deploy rồi vẫn không đổi | browser/dispatcher cache + rebuild | invalidate + rebuild libs |
| Load order sai | `dependencies`/`embed` | chuyển libs shared sang dependencies; bundle app libs bằng embed |
| JS file không chạy | `js.txt` + path + `#base` | thêm file vào `js.txt`, verify location |

---

## Liên kết nội bộ

- [Templates & Policies](./templates-and-policies)
- [Extending Responsive Grid](../ui/extending-responsive-grid)

