---
tags: [project, active, aem, sling, backend]
created: 2026-04-26
modified: 2026-04-26
title: Sling Model — cầu nối JCR / Request và HTL
aliases: [sling-model, sling models]
---
 
> **Nguồn tham khảo (đã cập nhật cho 6.5):** [Sling Models — Beginners Guide (Luca Nerlich)](https://lucanerlich.com/aem/beginners-guide/sling-models/).

## Mục lục nhanh

| # | Nội dung |
|---|----------|
| 1 | Sling Model là gì, dùng ở đâu |
| 2 | `@Model` + `adaptables` (Resource vs Request) |
| 3 | Các annotation inject phổ biến |
| 4 | `@Default`, optional injection, `@PostConstruct` |
| 5 | Interface + `adapters` |
| 6 | JSON export (`.model.json`) |
| 7 | Unit test với `AemContext` |
| 8 | Service user + repoinit (bối cảnh không có request) |
| 9 | Gỡ lỗi (adapt `null`, field rỗng) |

---

## 1. Vai trò

| Khái niệm | Mô tả |
|-----------|--------|
| **Sling Model** | POJO (Java) được Sling *adapt* từ `Resource` hoặc `SlingHttpServletRequest`, field được **inject** tự động từ JCR / request / OSGi. |
| **Tại sao cần** | Tách logic đọc content khỏi HTL; HTL chỉ gọi getter, không nên lặp lại `resource.getValueMap().get(...)` khắp template. |
| **Khi nào bắt buộc** | Hầu hết component có dialog + logic → nên có model (hoặc delegate tới model khác). |

**Luồng tóm tắt (HTL):**

1. `data-sly-use` trỏ tới class có `@Model`.
2. Sling tạo instance và inject field.
3. HTL dùng `$\{model.property\}`.

---

## 2. Model tối thiểu

**Java (`core` module, ví dụ `com.mysite.core.models.TitleModel`):**

```java
package com.mysite.core.models;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.Default;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(adaptables = Resource.class)
public class TitleModel {

    @ValueMapValue
    @Default(values = "Default Title")
    private String title;

    @ValueMapValue
    @Default(values = "h2")
    private String headingLevel;

    public String getTitle() { return title; }
    public String getHeadingLevel() { return headingLevel; }
}
```

**HTL:**

```html
<div data-sly-use.model="com.mysite.core.models.TitleModel">
    <h1 data-sly-element="${model.headingLevel}">${model.title}</h1>
</div>
```

| Ghi chú AEM 6.5 | Chi tiết |
|-----------------|----------|
| Package | `org.apache.sling.models.annotations.*` (Sling Models API đi kèm AEM). |
| `data-sly-element` | Phải trả về tên thẻ hợp lệ (`h1`–`h6`); nếu author nhập sai, cân nhắc validate trong model hoặc dùng giá trị mặc định. |

---

## 3. `adaptables`: `Resource` vs `SlingHttpServletRequest`

| `adaptables` | Dùng khi | Thêm injectors tiêu biểu |
|--------------|----------|--------------------------|
| `Resource.class` | Chỉ cần property / child node trên content resource. | `@ValueMapValue`, `@ChildResource`, `@ResourcePath`, `@OSGiService`, `@Self` (Resource). |
| `SlingHttpServletRequest.class` | Cần request: selector, query param, `RequestDispatcher`, object HTL global. | Tất cả trên + `@RequestAttribute`, `@ScriptVariable`, `@Self` (Request). |

```java
// Ưu tiên khi đủ — đơn giản, dễ test, chạy được cả ngoài HTTP request (nếu có Resource)
@Model(adaptables = Resource.class)
public class SimpleModel { }

@Model(adaptables = SlingHttpServletRequest.class)
public class RequestAwareModel { }
```

| Best practice (6.5) | Nội dung |
|---------------------|----------|
| Ưu tiên `Resource.class` | Ít phụ thuộc request, dễ unit test. |
| `SlingHttpServletRequest` khi cần | `Page`, `Style`, tham số từ HTL, v.v. |

---

## 4. Annotation inject (ôn tập nhanh)

### 4.1. `@ValueMapValue` — đọc property

```java
@ValueMapValue
private String title;

@ValueMapValue
private boolean featured;

@ValueMapValue
private java.util.Calendar publishDate;

@ValueMapValue(name = "jcr:title")
private String pageTitle;
```

| Kiểu hỗ trợ thường dùng | Ghi chú |
|-------------------------|--------|
| `String`, số, `boolean`/`Boolean`, `Calendar` | Tên mặc định = tên field; dùng `name = "..."` nếu trùng namespace (`jcr:title`, …). |

### 4.2. `@ChildResource` — child node / multifield

```java
@ChildResource
private java.util.List<org.apache.sling.api.resource.Resource> links;
```

**Multifield có model lồng:**

```java
@Model(adaptables = Resource.class)
public class LinkItem {
    @ValueMapValue private String label;
    @ValueMapValue private String url;
    @ValueMapValue
    @Default(booleanValues = false)
    private boolean openInNewTab;
    // getter...
}

@Model(adaptables = Resource.class, defaultInjectionStrategy = org.apache.sling.models.annotations.DefaultInjectionStrategy.OPTIONAL)
public class NavigationModel {
    @ChildResource
    private java.util.List<LinkItem> links;
    public java.util.List<LinkItem> getLinks() {
        return links != null ? links : java.util.Collections.emptyList();
    }
}
```

| AEM Dialog | Lưu ý |
|------------|--------|
| `composite="\{Boolean\}true` | Tạo **node con** mỗi phần tử — cấu trúc khớp `@ChildResource` + model con. |
| Thiếu `composite` | Có thể là string/array — **không** map trực tiếp sang `List&lt;LinkItem&gt;`. |

### 4.3. `@Self` — bản thân adaptable

```java
@Model(adaptables = Resource.class)
public class PathModel {
    @Self
    private Resource resource;
    public String getPath() { return resource.getPath(); }
}
```

Request-based: `@Self SlingHttpServletRequest request` — dùng cho query string, v.v.  
**Bảo mật:** tham số request là dữ liệu không tin cậy; validate trước khi dùng cho query, redirect, phân quyền.

### 4.4. `@OSGiService`

```java
@Model(adaptables = Resource.class)
public class ArticleListModel {
    @org.apache.sling.models.annotations.injectorspecific.OSGiService
    com.day.cq.search.QueryBuilder queryBuilder;
    @Self
    private Resource resource;
}
```

Cần service **đang active** trong OSGi; interface inject phải đúng type đăng ký.

### 4.5. `@ScriptVariable` (chỉ với `SlingHttpServletRequest`)

```java
@Model(adaptables = SlingHttpServletRequest.class)
public class PageHeaderModel {
    @org.apache.sling.models.annotations.injectorspecific.ScriptVariable
    private com.day.cq.wcm.api.Page currentPage;
}
```

### 4.6. `@RequestAttribute` — tham số từ HTL

```html
<div data-sly-use.model="${'com.mysite.core.models.ListModel' @ maxItems=5}">
```

```java
@Model(adaptables = SlingHttpServletRequest.class, defaultInjectionStrategy = org.apache.sling.models.annotations.DefaultInjectionStrategy.OPTIONAL)
public class ListModel {
    @org.apache.sling.models.annotations.injectorspecific.RequestAttribute
    @org.apache.sling.models.annotations.Default(intValues = 10)
    private int maxItems;
}
```

### 4.7. `@ResourcePath`

```java
@org.apache.sling.models.annotations.injectorspecific.ResourcePath(path = "/content/mysite/en/jcr:content")
private Resource siteRoot;
```

### 4.8. `@Via` — lấy inject từ resource khi adaptable là request

```java
@ValueMapValue
@org.apache.sling.models.annotations.Via("resource")
private String title;
```

---

## 5. `@Default` — chọn đúng attribute theo kiểu

| Kiểu field | Attribute `@Default` | Ví dụ |
|------------|------------------------|--------|
| `String` / `String[]` | `values` | `@Default(values = "x")` |
| `boolean` | `booleanValues` | `@Default(booleanValues = false)` |
| `int` | `intValues` | `@Default(intValues = 10)` |
| `long` | `longValues` | |
| `double` | `doubleValues` | |
| Dùng sai attribute | Không lỗi compile nhưng runtime sai giá trị mặc định. |

---

## 6. `@PostConstruct` — init sau khi inject xong

**AEM 6.5:** dùng `javax.annotation.PostConstruct` (cả Java 8 và 11 trên stack AEM 6.5).

```java
import javax.annotation.PostConstruct;

@Model(adaptables = Resource.class, defaultInjectionStrategy = org.apache.sling.models.annotations.DefaultInjectionStrategy.OPTIONAL)
public class ArticleModel {
    @ValueMapValue private String text;
    private int readingTime;

    @PostConstruct
    protected void init() {
        if (text != null) {
            int wordCount = text.split("\\s+").length;
            readingTime = Math.max(1, wordCount / 200);
        }
    }
    public int getReadingTime() { return readingTime; }
}
```

| Dùng cho | Ví dụ |
|----------|--------|
| Giá trị dẫn xuất | `readingTime`, format string. |
| Validate / chuẩn hoá | Trim, fallback logic phức tạp. |

---

## 7. Optional injection

| Cách | Mô tả |
|------|--------|
| Per-field | `@ValueMapValue(injectionStrategy = org.apache.sling.models.annotations.InjectionStrategy.OPTIONAL)` |
| Toàn model (khuyên dùng) | `defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL` trên `@Model` |

| Thực tế 6.5 | Gợi ý |
|-------------|--------|
| Author thường bỏ trống field | `OPTIONAL` + `@Default` giảm `adaptTo(...) == null`. |
| Field bắt buộc nghiệp vụ | Validate trong `@PostConstruct` hoặc HTL `data-sly-test`. |

---

## 8. Interface + `adapters` (API sạch cho HTL & test)

```java
public interface Hero {
    String getHeading();
    String getSubheading();
    String getImagePath();
}
```

```java
@Model(
    adaptables = Resource.class,
    adapters = Hero.class,
    defaultInjectionStrategy = org.apache.sling.models.annotations.DefaultInjectionStrategy.OPTIONAL
)
public class HeroImpl implements Hero {
    @ValueMapValue private String heading;
    @ValueMapValue private String subheading;
    @ValueMapValue(name = "fileReference") private String imagePath;
    @Override public String getHeading() { return heading; }
    @Override public String getSubheading() { return subheading; }
    @Override public String getImagePath() { return imagePath; }
}
```

**HTL dùng interface:**

```html
<div data-sly-use.hero="com.mysite.core.models.Hero">
    <h1>${hero.heading}</h1>
</div>
```

| Lợi ích | |
|---------|--|
| Test | Mock `Hero`. |
| Thay implementation | HTL không đổi. |

---

## 9. JSON export (headless / SPA) — `.model.json`

**Điều kiện (ý tưởng):**

| Thành phần | Mô tả |
|------------|--------|
| `adapters` | Có thêm `com.adobe.cq.export.json.ComponentExporter` (AEM) |
| `resourceType` | Trùng với `sling:resourceType` của component |
| `@Exporter` | Thường dùng `name = "jackson"`, `extensions = "json"`, `selector = "model"` — bundle phải có dependency Jackson exporter tương thích (archetype AEM thường cấu hình sẵn). |
| Nội dung JSON | Field export ra phụ thuộc model (getter), phiên bản `com.adobe.cq.export.json` và cấu hình serializer — cần align với `core/pom.xml` của từng dự án. |

Ví dụ bộ khung (bỏ qua chi tiết serialize từng field; triển khai thật nên copy pattern từ [AEM Core Components](https://github.com/adobe/aem-core-wcm-components) cùng phiên bản):

```java
@Model(
    adaptables = Resource.class,
    adapters = { Hero.class, com.adobe.cq.export.json.ComponentExporter.class },
    resourceType = "mysite/components/hero",
    defaultInjectionStrategy = org.apache.sling.models.annotations.DefaultInjectionStrategy.OPTIONAL
)
@org.apache.sling.models.annotations.exporter.Exporter(
    name = "jackson",
    extensions = "json",
    selector = "model"
)
public class HeroImpl implements Hero, com.adobe.cq.export.json.ComponentExporter {

    @ValueMapValue
    private String heading;

    @Override
    public String getExportedType() {
        return "mysite/components/hero";
    }

    // Getter cho HTL + (tuỳ cấu hình) tham gia JSON export
    public String getHeading() { return heading; }
}
```

| Ghi chú 6.5 | |
|-------------|--|
| URL | Gọi trên **resource** của instance component, ví dụ: `.../jcr:content/.../hero.model.json` — đúng theo cây trang. |
| Kiểm tra nhanh | Mở trực tiếp trên instance Author/Publish; nếu 404, kiểm tra `resourceType` và import package `com.adobe.cq.export.json`. |

---

## 10. Unit test (wcm.io Aem Mocks, JUnit 5)

| Thành phần | |
|------------|--|
| Dependency | `io.wcm:io.wcm.testing.aem-mock.junit5` (theo BOM dự án). |
| Pattern | `AemContext` + `context.create().resource(...)` + `resource.adaptTo(InterfaceOrModel.class)`. |

```java
import io.wcm.testing.aem.junit5.AemContext;
import io.wcm.testing.aem.junit5.AemContextExtension;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.apache.sling.api.resource.Resource;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(AemContextExtension.class)
class HeroImplTest {
    private final AemContext context = new AemContext();

    @Test
    void headingFromValueMap() {
        context.create().resource("/content/test",
            "sling:resourceType", "mysite/components/hero",
            "heading", "Xin chào",
            "subheading", "AEM 6.5");
        Resource r = context.resourceResolver().getResource("/content/test");
        Hero h = r.adaptTo(Hero.class);
        assertEquals("Xin chào", h.getHeading());
    }
}
```

*Phiên bản API `AemContext` có thể khác nhẹ theo wcm.io — align với `core/pom.xml`.*

---

## 11. Gỡ lỗi nhanh

| Triệu chứng | Hướng xử lý |
|-------------|-------------|
| `adaptTo(Model)` = `null` | Sai `adaptables`; thiếu `defaultInjectionStrategy` + property thiếu; lỗi OSGi (model chưa register). |
| Field `null` | So khớp tên JCR với `name` trong annotation; property chưa lưu sau dialog. |
| `List` multifield rỗng | Kiểm tra cấu trúc `composite` + đường dẫn child node. |
| `@OSGiService` null / model fail | Service không active; sai interface. |
| Chạy local OK, deploy lỗi | Gói `core` thiếu, hoặc cấu hình OSGi chưa đóng gói. |

---

## 12. Ngoài request: service user + repoinit (On-Prem 6.5)

| Vấn đề | Cách đúng |
|--------|------------|
| Scheduler / event / workflow không có request | Dùng `ResourceResolverFactory.getServiceResourceResolver(...)` với **subservice** đã map. |
| Tạo user & ACL bằng code | `RepositoryInitializer` (repoinit) trong `ui.config` — lưu trong source control, có thể review. |
| *Không* làm | Mở session `admin` trong app code. |

**Repoinit (ví dụ cấu trúc — PID / `~` suffix theo dự án thực tế):**

`ui.config/.../org.apache.sling.jcr.repoinit.RepositoryInitializer~mysite.cfg.json`

```json
{
  "scripts": [
    "create service user mysite-reader",
    "set ACL for mysite-reader",
    "  allow jcr:read on /content/mysite",
    "end"
  ]
}
```

**Service user mapping:**

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended~mysite.cfg.json`

```json
{
  "user.mapping": [
    "com.mysite.core:mysite-reader=mysite-reader"
  ]
}
```

*Chuỗi mapping theo dạng `bundleId:subservice=principal` — mở `/system/console/jcracl` (hoặc log khi fail) nếu vẫn 403/LoginException.*

**Code:**

```java
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
// ...
Map<String, Object> auth = Map.of(ResourceResolverFactory.SUBSERVICE, "mysite-reader");
try (ResourceResolver rr = resolverFactory.getServiceResourceResolver(auth)) {
    // dùng rr, luôn try-with-resources
}
```

| On-Prem vs Cloud | Ghi chú |
|------------------|--------|
| **AEM 6.5** | Có thể tạo user thủ công trên dev; **production** nên dùng repoinit + ACL như code. |
| **AEMaaCS** | Không tạo user qua CRXDE trên prod; bắt buộc kiểu cấu hình như trên. |

---

## 13. Bảo mật (tóm tắt)

| Nguyên tắc | |
|------------|--|
| Tham số request | Validate / whitelist. |
| Resolver | Đóng `ResourceResolver` khi tự tạo (try-with-resources). |
| Quyền | Service user tối thiểu; tránh `admin`. |
| Log | Không log dữ liệu nhạy cảm / PII. |

---

## 14. Tóm tắt

- Sling Model = **lớp Java** gắn `@Model` để Sling **inject** từ JCR/request/OSGi, HTL gọi qua `data-sly-use`.
- **Ưu tiên** `Resource.class` khi đủ; dùng `SlingHttpServletRequest` khi cần HTL global / request.
- Dùng **`DefaultInjectionStrategy.OPTIONAL`** + `@Default` đúng kiểu cho môi trường authoring.
- **Interface + `adapters`** để tách API và dễ test.
- **`.model.json`**: `ComponentExporter` + `@Exporter` + `resourceType`.
- Ngoài HTTP: **service user + repoinit + mapping**; không dùng session admin.

---

## Liên kết nội bộ (aem-docs)

- [HTL Templates](./htl-templates)
- [Component Dialogs](./component-dialogs)
- [Your First Component](./your-first-component)
- [OSGi Fundamentals](./osgi-fundamentals)

---
