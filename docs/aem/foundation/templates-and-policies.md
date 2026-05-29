---
tags: [project, active, aem, wcm, templates]
created: 2026-04-26
modified: 2026-04-26
title: Templates & Policies (Editable Templates) — AEM 6.5
aliases: [templates-and-policies, template, policy, editable templates]
---

> **Nguồn:** [Templates & Policies — Luca Nerlich](https://lucanerlich.com/aem/beginners-guide/templates-and-policies/).  
> **Scope:** AEM 6.5 On-Premise (Touch UI, Editable Templates), `/conf`-based configuration.

## Tóm tắt 30 giây

- **Template**: quyết định **page structure** và **vùng authoring**.
- **Policy**: quyết định **được phép thả component nào** + **default/design options** + **Style System**.
- Storage chính:
  - Templates: `/conf/&lt;site&gt;/settings/wcm/templates/`
  - Policies: `/conf/&lt;site&gt;/settings/wcm/policies/`
  - Template types: `/conf/&lt;site&gt;/settings/wcm/template-types/`

---

## 1) Map khái niệm → nơi lưu → ai quản

| Khái niệm | Nơi lưu (JCR) | Ai quản | Ghi chú |
|---|---|---|---|
| **Template Type** | `/conf/&lt;site&gt;/settings/wcm/template-types/` | Dev + template admin | “Blueprint” cho editable template |
| **Editable Template** | `/conf/&lt;site&gt;/settings/wcm/templates/` | Template author (UI) | Tạo trong Tools → Templates |
| **Page** | `/content/&lt;site&gt;/...` | Content author (UI) | `cq:template` trỏ về template |
| **Policies** | `/conf/&lt;site&gt;/settings/wcm/policies/` | Template author / admin | Theo template + container |

---

## 2) Editable Template: 3 mode trong Template Editor

| Mode | Bạn chỉnh | Hệ quả |
|---|---|---|
| **Structure** | locked layout + container + component “bắt buộc” | Author **không** move/delete/override locked items |
| **Initial Content** | nội dung “mặc định” khi tạo page mới | Author sửa được sau khi page được tạo |
| **Policies** | allowed components + design/style defaults | Governing authoring |

Checklist:

- **Structure**
  - [ ] Có layout container (responsive grid) cho vùng main
  - [ ] Có header/footer locked (nếu dùng)
  - [ ] Đặt allowed components (qua policy) cho đúng vùng
- **Initial**
  - [ ] Placeholder components cần thiết (title, hero empty, list pre-config…)
- **Policies**
  - [ ] Allowed components theo container
  - [ ] Style System groups (theme/spacing/size…)
  - [ ] Design dialog/policy fields của component (nếu có)

---

## 3) Template Type: cấu trúc chuẩn (seed bằng code)

Path mẫu:

```text
/conf/<site>/settings/wcm/template-types/
└── page/
    ├── .content.xml        # template type definition
    ├── structure/
    │   └── .content.xml    # locked layout
    ├── initial/
    │   └── .content.xml    # initial content
    └── policies/
        └── .content.xml    # default policies (seed)
```

Ghi nhớ:

- Template Type **không phải** là page template “thực tế” mà author chọn — nó là **khuôn** để tạo editable template.
- Thực tế triển khai: dev seed cấu trúc/policy tối thiểu → template authors refine trong UI.

---

## 4) Tạo Editable Template (UI)

Tools → General → Templates:

- [ ] Chọn đúng config folder (`/conf/&lt;site&gt;`)
- [ ] Create → chọn Template Type (vd `Page`)
- [ ] Đặt title + name
- [ ] Mở Template Editor → chỉnh 3 mode (Structure/Initial/Policies)

---

## 5) Page Component (top-level renderer)

Mục tiêu:

- Render `&lt;html&gt;`, `&lt;head&gt;`, `&lt;body&gt;`
- Include clientlibs
- Include header/footer (fixed)
- Provide main area (container) cho author thả component

HTL skeleton (mẫu):

```html
<!-- /apps/<site>/components/page/page.html -->
<!DOCTYPE html>
<html lang="${currentPage.language}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${currentPage.title}</title>

  <sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html">
    <sly data-sly-call="${clientlib.css @ categories='<site>.base'}"/>
  </sly>
</head>
<body>
  <div data-sly-resource="${'header' @ resourceType='<site>/components/header'}"></div>

  <main>
    <div data-sly-resource="${'root' @ resourceType='core/wcm/components/container/v1/container'}"></div>
  </main>

  <div data-sly-resource="${'footer' @ resourceType='<site>/components/footer'}"></div>

  <sly data-sly-call="${clientlib.js @ categories='<site>.base'}"/>
</body>
</html>
```

---

## 6) Proxy Page Component (khuyến nghị)

Mục tiêu: kế thừa Core Components page thay vì viết lại toàn bộ.

`/apps/&lt;site&gt;/components/page/.content.xml`:

```xml
<jcr:root
  xmlns:cq="http://www.day.com/jcr/cq/1.0"
  xmlns:jcr="http://www.jcp.org/jcr/1.0"
  xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
  jcr:primaryType="cq:Component"
  jcr:title="Page"
  sling:resourceSuperType="core/wcm/components/page/v3/page"/>
```

Override “extension points” (thường gặp):

- `customheaderlibs.html` (head)
- `customfooterlibs.html` (before `&lt;/body&gt;`)

`customheaderlibs.html`:

```html
<sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html">
  <sly data-sly-call="${clientlib.css @ categories='<site>.site'}"/>
</sly>
```

`customfooterlibs.html`:

```html
<sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html">
  <sly data-sly-call="${clientlib.js @ categories='<site>.site'}"/>
</sly>
```

---

## 7) Policies: allowed components + design defaults + Style System

### 7.1 Allowed Components (per container)

Template Editor → Structure → chọn layout container → Policy (wrench):

- [ ] Allowed Components: chọn group/component được phép
- [ ] Chặn component “nguy hiểm” đặt sai vùng (vd Hero trong sidebar)

### 7.2 Design dialog / policy values (đọc bằng `currentStyle`)

Mẫu (request-based model):

```java
@Model(adaptables = SlingHttpServletRequest.class)
public class ImageModel {
  @ScriptVariable
  private Style currentStyle;

  public int getMaxWidth() {
    return currentStyle.get("maxWidth", 1200);
  }
}
```

### 7.3 Style System

Policy → Styles:

- **Group**: Size / Theme / Spacing …
- **Option**: map thành CSS class (vd `cmp-hero--dark`)

Checklist:

- [ ] Tên group rõ ràng
- [ ] Class naming theo convention (BEM/`cmp-*`)
- [ ] CSS implement đủ cho mỗi option

---

## 8) Responsive Grid policy (layout container)

Capabilities:

- Drag-drop
- 12-column grid
- Resize theo breakpoint

Breakpoints:

- Policy của responsive grid quyết định widths/breakpoints (template context).
- Nếu cần “custom breakpoints” → chỉnh trong policy node tương ứng dưới `/conf` (debug bằng CRXDE / repo dump).

---

## 9) Liên kết site ↔ templates (`cq:conf`)

Chỗ hay sai:

- Site root phải trỏ `cq:conf` đúng:

```text
/content/<site>/jcr:content
└── cq:conf = "/conf/<site>"
```

Triệu chứng:

- Create page không thấy template
- Template editor mở nhưng policy không apply đúng

---

## 10) Persistence giữa môi trường (On-Prem vs Cloud)

| Bối cảnh | Điều cần làm |
|---|---|
| **AEM 6.5 on-prem** | Có thể chỉnh UI trực tiếp, nhưng nên “persist” bằng package/config để tái tạo được. |
| **AEMaaCS** | Template/policy thay đổi trong UI phải **export + commit** (configuration-as-code), nếu không redeploy mất. |

Thực hành chung:

- [ ] Coi template/policy là **config**, không phải “state” chỉ tồn tại ở env
- [ ] Có quy trình export/packaging để replicate qua dev → stage → prod

---

## 11) Debug nhanh (nhìn path trong JCR)

| Vấn đề | Check nhanh |
|---|---|
| Template không apply | `cq:template` trên page + `cq:conf` trên site |
| Allowed components sai | policy của **đúng container** trong template |
| Style option không hiện | component policy có Style System chưa |
| Default policy không giống mong đợi | seed trong `template-types/&lt;type&gt;/policies` vs policy override trong editable template |

---

## Liên kết nội bộ

- [Extending Responsive Grid](../ui/extending-responsive-grid)
- [Component Dialogs](./component-dialogs)
- [HTL Templates](./htl-templates)

