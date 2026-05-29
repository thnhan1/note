# Content Fragments — AEM 6.5 On-Premise

---

## 1. Content Fragment Là Gì

Content Fragment (CF) là structured content tách biệt hoàn toàn khỏi presentation. Khác với page component (trộn content + layout), CF cho phép tái sử dụng cùng nội dung trên nhiều kênh: website, SPA, mobile app, email... thông qua Java API, REST, hoặc GraphQL.

CF được lưu dưới dạng `dam:Asset` trong `/content/dam/`.

---

## 2. Content Fragment Models

Model định nghĩa schema (fields + types) cho fragment. Được lưu trong configuration space `/conf`.

### Bật CF Models cho một site

1. **Tools > General > Configuration Browser**
2. Chọn site config (VD: `myproject`)
3. Tick **Content Fragment Models**
4. Models được lưu tại: `/conf/myproject/settings/dam/cfm/models/`

### Các kiểu field

| Field Type | JCR Storage | Java Type | Khi nào dùng |
|---|---|---|---|
| Single-line text | `String` | `String` | Title, label, text ngắn |
| Multi-line text | `String` | `String` | Rich text (HTML), Markdown, plain text |
| Number | `Long` / `Double` | `Long` / `Double` | Số lượng, giá, rating |
| Boolean | `Boolean` | `Boolean` | Toggle, flag |
| Date and Time | `Calendar` | `Calendar` | Ngày publish, ngày event |
| Enumeration | `String` | `String` | Dropdown lựa chọn cố định |
| Tags | `String[]` | `String[]` | AEM tag references |
| Content Reference | `String` | `String` | Path tới page hoặc asset |
| Fragment Reference | `String[]` | `String[]` | Tham chiếu tới CF khác |
| JSON Object | `String` (JSON) | `String` | Dữ liệu cấu trúc tùy ý |
| Tab Placeholder | -- | -- | Nhóm visual trong editor, không chứa data |

### Cấu trúc JCR của Model

```
/conf/myproject/settings/dam/cfm/models/article
├── jcr:content
│   ├── jcr:title = "Article"
│   ├── jcr:description = "An article with title, body, and author"
│   └── model
│       └── cq:fields
│           ├── title          (fieldType: "text-single", required: true)
│           ├── body           (fieldType: "text-multi", mimeType: "text/html")
│           ├── publishDate    (fieldType: "calendar")
│           ├── category       (fieldType: "enumeration", options: [...])
│           ├── featuredImage  (fieldType: "content-reference")
│           ├── author         (fieldType: "fragment-reference", modelPath: "/conf/.../author")
│           └── relatedArticles (fieldType: "fragment-reference", multiple: true)
```

### Validation trên Model

| Validation | Áp dụng cho | Hiệu quả |
|---|---|---|
| Required | Tất cả | Field bắt buộc phải có giá trị |
| Min/Max length | Text fields | Giới hạn số ký tự |
| Min/Max value | Number fields | Giới hạn phạm vi số |
| Unique | Text fields | Giá trị phải duy nhất trong cùng model |
| Pattern (Regex) | Text fields | Giá trị phải match regex |
| Accept | Content/Fragment ref | Giới hạn model hoặc path có thể chọn |

---

## 3. Cấu Trúc JCR Của Content Fragment

```
/content/dam/myproject/articles/my-article
├── jcr:content
│   ├── jcr:primaryType = "dam:AssetContent"
│   ├── data
│   │   ├── cq:model = "/conf/myproject/settings/dam/cfm/models/article"
│   │   ├── title = "My Article Title"
│   │   ├── body = "<p>The article body in HTML...</p>"
│   │   ├── publishDate = "2025-06-15T10:00:00.000+02:00"
│   │   ├── category = "technology"
│   │   ├── featuredImage = "/content/dam/myproject/images/hero.jpg"
│   │   └── author = ["/content/dam/myproject/authors/john-doe"]
│   └── metadata
│       ├── dc:title = "My Article Title"
│       └── dc:description = "..."
```

Data nằm tại `jcr:content/data`. Tên element trùng với tên field trong model. Fragment reference lưu dưới dạng `String[]` chứa path.

### Variations

Variation là phiên bản thay thế của cùng nội dung (VD: bản tóm tắt, bản social media). Mỗi variation lưu riêng bộ field values:

```
/content/dam/myproject/articles/my-article
├── jcr:content
│   └── data
│       ├── master             ← variation mặc định
│       │   ├── title = "My Article Title"
│       │   └── body = "<p>Full article body...</p>"
│       └── summary            ← variation tùy chỉnh
│           ├── title = "My Article"
│           └── body = "<p>Short summary...</p>"
```

Variation kế thừa từ `master`. Chỉ các field được set tường minh trên variation mới được lưu riêng.

---

## 4. Đọc Content Fragment — Java API

### Adapt Resource sang ContentFragment

Package chính: `com.adobe.cq.dam.cfm.ContentFragment`

```java
@Model(
    adaptables = SlingHttpServletRequest.class,
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
)
public class ArticleModel {

    @ValueMapValue
    private String fragmentPath;

    @SlingObject
    private ResourceResolver resolver;

    private ContentFragment fragment;

    @PostConstruct
    protected void init() {
        if (fragmentPath == null) return;
        Resource cfResource = resolver.getResource(fragmentPath);
        if (cfResource != null) {
            fragment = cfResource.adaptTo(ContentFragment.class);
        }
    }

    public String getTitle() {
        if (fragment == null) return null;
        return fragment.getElement("title").getContent();
    }

    public String getBody() {
        if (fragment == null) return null;
        ContentElement bodyElement = fragment.getElement("body");
        return bodyElement != null ? bodyElement.getContent() : null;
    }

    public Calendar getPublishDate() {
        if (fragment == null) return null;
        ContentElement element = fragment.getElement("publishDate");
        if (element == null) return null;
        FragmentData data = element.getValue();
        return data != null ? data.getValue(Calendar.class) : null;
    }
}
```

### ContentFragment API

| Method | Trả về | Mô tả |
|---|---|---|
| `getTitle()` | `String` | Title của fragment |
| `getDescription()` | `String` | Description |
| `getName()` | `String` | Node name (URL-safe) |
| `getElement(name)` | `ContentElement` | Truy cập element theo tên field |
| `getElements()` | `Iterator&lt;ContentElement&gt;` | Iterate tất cả elements |
| `getVariations()` | `Iterator&lt;ContentVariation&gt;` | Liệt kê variations |
| `hasElement(name)` | `boolean` | Kiểm tra element tồn tại |
| `getAssociatedContent()` | `Iterator&lt;Resource&gt;` | Associated content (collections) |
| `adaptTo(Resource.class)` | `Resource` | Underlying Sling resource |

### ContentElement API

| Method | Trả về | Mô tả |
|---|---|---|
| `getName()` | `String` | Tên field |
| `getTitle()` | `String` | Display title |
| `getContent()` | `String` | String value (cho text fields) |
| `setContent(content, mimeType)` | `void` | Set content + MIME type |
| `getValue()` | `FragmentData` | Typed value container |
| `setValue(FragmentData)` | `void` | Set typed value |
| `getContentType()` | `String` | MIME type (`text/plain`, `text/html`...) |
| `getVariation(name)` | `ContentVariation` | Variation cụ thể của element |
| `getVariations()` | `Iterator&lt;ContentVariation&gt;` | Liệt kê variations |

### Đọc typed values

```java
// String
String title = fragment.getElement("title").getContent();

// Number
FragmentData numberData = fragment.getElement("rating").getValue();
Long rating = numberData.getValue(Long.class);
Double price = fragment.getElement("price").getValue().getValue(Double.class);

// Boolean
Boolean featured = fragment.getElement("featured").getValue().getValue(Boolean.class);

// Date
Calendar date = fragment.getElement("publishDate").getValue().getValue(Calendar.class);

// Fragment references (String[] chứa paths)
String[] refPaths = fragment.getElement("relatedArticles")
    .getValue().getValue(String[].class);

// Content reference (single path)
String imagePath = fragment.getElement("featuredImage").getContent();
```

### Đọc Variations

```java
ContentElement bodyElement = fragment.getElement("body");

// Đọc variation cụ thể
ContentVariation summary = bodyElement.getVariation("summary");
if (summary != null) {
    String summaryBody = summary.getContent();
}

// Liệt kê tất cả variations
Iterator<ContentVariation> variations = bodyElement.getVariations();
while (variations.hasNext()) {
    ContentVariation v = variations.next();
    LOG.info("Variation: {} ({})", v.getTitle(), v.getName());
}
```

---

## 5. Tạo Content Fragment Programmatically

### Tạo một fragment

```java
public ContentFragment createFragment(
        ResourceResolver resolver,
        String modelPath,
        String folderPath,
        String title) throws ContentFragmentException {

    Resource modelResource = resolver.getResource(modelPath);
    if (modelResource == null) {
        throw new ContentFragmentException("Model not found: " + modelPath);
    }

    FragmentTemplate template = modelResource.adaptTo(FragmentTemplate.class);
    if (template == null) {
        throw new ContentFragmentException(
            "Cannot adapt model to FragmentTemplate: " + modelPath);
    }

    Resource folder = resolver.getResource(folderPath);
    if (folder == null) {
        throw new ContentFragmentException("Folder not found: " + folderPath);
    }

    String nodeName = ResourceUtil.createUniqueChildName(folder, title);
    ContentFragment fragment = template.createFragment(folder, nodeName, title);

    LOG.info("Created CF: {} at {}",
        title, fragment.adaptTo(Resource.class).getPath());
    return fragment;
}
```

### Set giá trị các kiểu field

```java
/**
 * Text field (single-line hoặc multi-line).
 */
public void setText(ContentFragment fragment, String fieldName,
        String value, String mimeType) {
    fragment.getElement(fieldName).setContent(value, mimeType);
}

/**
 * Typed value (number, boolean, date...).
 */
public void setTypedValue(ContentFragment fragment, String fieldName, Object value) {
    FragmentData data = fragment.getElement(fieldName).getValue();
    data.setValue(value);
    fragment.getElement(fieldName).setValue(data);
}
```

Sử dụng:

```java
setText(fragment, "title", "My Article", "text/plain");
setText(fragment, "body", "<p>Rich text content</p>", "text/html");
setTypedValue(fragment, "rating", 5L);
setTypedValue(fragment, "featured", true);
setTypedValue(fragment, "publishDate", Calendar.getInstance());
```

### Set Fragment References

```java
public void setFragmentReferences(ContentFragment fragment, String fieldName,
        List<ContentFragment> references) {

    String[] paths = references.stream()
        .filter(Objects::nonNull)
        .map(ref -> ref.adaptTo(Resource.class).getPath())
        .toArray(String[]::new);

    if (paths.length == 0) return;

    FragmentData data = fragment.getElement(fieldName).getValue();
    data.setValue(paths);
    fragment.getElement(fieldName).setValue(data);
}
```

### Ví dụ hoàn chỉnh: tạo article + link references

```java
public void createArticleWithRelated(ResourceResolver resolver) throws Exception {
    String articleModel = "/conf/myproject/settings/dam/cfm/models/article";
    String authorModel  = "/conf/myproject/settings/dam/cfm/models/author";

    // 1. Tạo author fragment
    ContentFragment author = createFragment(resolver, authorModel,
        "/content/dam/myproject/authors", "Jane Doe");
    setText(author, "name", "Jane Doe", "text/plain");
    setText(author, "bio", "Senior tech writer.", "text/plain");

    // 2. Tạo article chính
    ContentFragment article = createFragment(resolver, articleModel,
        "/content/dam/myproject/articles", "Getting Started with CF");
    setText(article, "title", "Getting Started with CF", "text/plain");
    setText(article, "body",
        "<p>Content Fragments manage structured content...</p>", "text/html");
    setTypedValue(article, "publishDate", Calendar.getInstance());
    setTypedValue(article, "featured", true);

    // 3. Link author → article
    setFragmentReferences(article, "author", Collections.singletonList(author));

    // 4. Tạo related articles
    List<ContentFragment> related = new ArrayList<>();
    for (String t : Arrays.asList("CF Models Deep Dive", "GraphQL Queries")) {
        ContentFragment cf = createFragment(resolver, articleModel,
            "/content/dam/myproject/articles", t);
        setText(cf, "title", t, "text/plain");
        related.add(cf);
    }

    // 5. Link related articles
    setFragmentReferences(article, "relatedArticles", related);

    // 6. Persist
    resolver.commit();
}
```

---

## 6. Cập Nhật Fragment Đã Tồn Tại

### Update field values

```java
Resource cfResource = resolver.getResource(
    "/content/dam/myproject/articles/my-article");
ContentFragment fragment = cfResource.adaptTo(ContentFragment.class);

// Text
fragment.getElement("title").setContent("Updated Title", "text/plain");

// Typed
FragmentData ratingData = fragment.getElement("rating").getValue();
ratingData.setValue(4L);
fragment.getElement("rating").setValue(ratingData);

resolver.commit();
```

### Tạo và chỉnh sửa Variations

```java
ContentElement bodyElement = fragment.getElement("body");

// Tạo variation mới
ContentVariation social = bodyElement.createVariation(
    "social", "Social Media", "Short version for social");
social.setContent("Check out our latest article!", "text/plain");

// Cập nhật variation có sẵn
ContentVariation existing = bodyElement.getVariation("summary");
if (existing != null) {
    existing.setContent("Updated summary text", "text/plain");
}

resolver.commit();
```

### Xóa fragment

```java
Resource cfResource = resolver.getResource(
    "/content/dam/myproject/articles/old-article");
if (cfResource != null) {
    resolver.delete(cfResource);
    resolver.commit();
}
```

---

## 7. Render Content Fragment Trong HTL

### Core Content Fragment Component

AEM Core Components cung cấp sẵn [Content Fragment component](https://www.aemcomponents.dev/content/core-components-examples/library/content-fragment.html). Thêm vào template policy, cấu hình qua dialog.

### Custom Sling Model + HTL

**Sling Model:**

```java
@Model(
    adaptables = SlingHttpServletRequest.class,
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
)
public class ArticleCardModel {

    @ValueMapValue
    private String fragmentPath;

    @SlingObject
    private ResourceResolver resolver;

    private ContentFragment fragment;

    @PostConstruct
    protected void init() {
        if (fragmentPath == null) return;
        Resource cfResource = resolver.getResource(fragmentPath);
        if (cfResource != null) {
            fragment = cfResource.adaptTo(ContentFragment.class);
        }
    }

    public String getTitle() {
        return getElementContent("title");
    }

    public String getSummary() {
        return getElementContent("summary");
    }

    public String getImagePath() {
        return getElementContent("featuredImage");
    }

    public boolean isEmpty() {
        return fragment == null;
    }

    private String getElementContent(String name) {
        if (fragment == null || !fragment.hasElement(name)) return null;
        return fragment.getElement(name).getContent();
    }
}
```

**HTL template:**

```html
<sly data-sly-use.model="com.myproject.core.models.ArticleCardModel"/>
<div data-sly-test="${!model.empty}" class="article-card">
    <img data-sly-test="${model.imagePath}"
         src="${model.imagePath}"
         alt="${model.title}"/>
    <h3>${model.title}</h3>
    <p>${model.summary}</p>
</div>
<div data-sly-test="${model.empty}" class="cq-placeholder">
    Select a Content Fragment
</div>
```

Rich text cần `context='html'` để không bị escape:

```html
<div>${model.body @ context='html'}</div>
```

---

## 8. Query Content Fragments Bằng QueryBuilder

Tìm tất cả CF thuộc model "article", field `featured = true`, sắp xếp theo `publishDate`:

```java
Map<String, String> predicates = new HashMap<>();
predicates.put("path", "/content/dam/myproject");
predicates.put("type", "dam:Asset");
predicates.put("1_property", "jcr:content/data/cq:model");
predicates.put("1_property.value",
    "/conf/myproject/settings/dam/cfm/models/article");
predicates.put("2_property", "jcr:content/data/master/featured");
predicates.put("2_property.value", "true");
predicates.put("orderby", "@jcr:content/data/master/publishDate");
predicates.put("orderby.sort", "desc");
predicates.put("p.limit", "10");
predicates.put("p.guessTotal", "true");

Query query = queryBuilder.createQuery(
    PredicateGroup.create(predicates), session);
SearchResult result = query.getResult();

List<ContentFragment> fragments = new ArrayList<>();
for (Hit hit : result.getHits()) {
    ContentFragment cf = hit.getResource().adaptTo(ContentFragment.class);
    if (cf != null) {
        fragments.add(cf);
    }
}
```

Lưu ý query CF:
- Filter theo model: `jcr:content/data/cq:model`
- Field values nằm tại: `jcr:content/data/master/&lt;fieldName&gt;`
- Luôn set `p.limit` hợp lý, tránh `p.limit=-1`
- Tạo Oak index cho `cq:model` và các custom properties hay query

---

## 9. Assets HTTP API (REST)

AEM 6.5 hỗ trợ REST API để CRUD fragment mà không cần Java code. Dùng cho external systems hoặc migration scripts.

```bash
# Đọc fragment
curl -u admin:admin \
  "http://localhost:4502/api/assets/myproject/articles/my-article.json"

# Tạo fragment
curl -u admin:admin \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "cq:model": "/conf/myproject/settings/dam/cfm/models/article",
      "elements": {
        "title": { "value": "New Article" },
        "body": { "value": "<p>Content here</p>", "contentType": "text/html" }
      }
    }
  }' \
  "http://localhost:4502/api/assets/myproject/articles/new-article"
```

---

## 10. Folder Structure Chuẩn

```
/content/dam/myproject/
├── articles/               # Article fragments
│   ├── 2025/               # Tổ chức theo năm (tùy chọn)
│   └── 2026/
├── authors/                # Author fragments
├── categories/             # Category fragments (nếu dùng CF-based taxonomy)
├── config/                 # Configuration fragments (feature flags, settings)
└── shared/                 # Shared fragments (CTAs, disclaimers, footers)
```

### Tạo folder programmatically

```java
public Resource ensureFolder(ResourceResolver resolver, String path)
        throws PersistenceException {
    Resource existing = resolver.getResource(path);
    if (existing != null) return existing;

    String parentPath = path.substring(0, path.lastIndexOf('/'));
    Resource parent = ensureFolder(resolver, parentPath);

    Map<String, Object> props = new HashMap<>();
    props.put("jcr:primaryType", "sling:OrderedFolder");
    props.put("jcr:title", path.substring(path.lastIndexOf('/') + 1));

    return resolver.create(parent, path.substring(path.lastIndexOf('/') + 1), props);
}
```

---

## 11. Bulk Operations

### Groovy Console — update field trên tất cả fragments cùng model

```groovy
import com.adobe.cq.dam.cfm.ContentFragment

def modelPath = "/conf/myproject/settings/dam/cfm/models/article"
def targetFolder = "/content/dam/myproject/articles"
def count = 0

getResource(targetFolder).listChildren().each { child ->
    def cf = child.adaptTo(ContentFragment.class)
    if (cf == null) return

    def model = child.getChild("jcr:content/data")?.valueMap?.get("cq:model", "")
    if (model != modelPath) return

    cf.getElement("category").setContent("technology", "text/plain")
    count++
}

if (count > 0) {
    resourceResolver.commit()
}
println "Updated ${count} fragments"
```

### Bulk export to JSON

```java
public List<Map<String, Object>> exportFragments(ResourceResolver resolver,
        String folderPath, String modelPath) {

    List<Map<String, Object>> results = new ArrayList<>();
    Resource folder = resolver.getResource(folderPath);
    if (folder == null) return results;

    for (Resource child : folder.getChildren()) {
        ContentFragment cf = child.adaptTo(ContentFragment.class);
        if (cf == null) continue;

        Resource dataNode = child.getChild("jcr:content/data");
        if (dataNode == null) continue;

        String cfModel = dataNode.getValueMap().get("cq:model", "");
        if (!modelPath.equals(cfModel)) continue;

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("path", child.getPath());
        entry.put("title", cf.getTitle());

        Iterator<ContentElement> elements = cf.getElements();
        while (elements.hasNext()) {
            ContentElement el = elements.next();
            entry.put(el.getName(), el.getContent());
        }
        results.add(entry);
    }
    return results;
}
```

---

## 12. Best Practices

### Model design

- Một model cho một content type (Article, Author, FAQ). Tránh model "catch-all" nhiều chục field.
- Dùng Fragment Reference để link data liên quan, không duplicate.
- Đặt tên field nhất quán: camelCase, match API contract.
- Thêm description cho field — hiển thị dưới dạng help text trong editor.
- Thêm field an toàn. Rename/remove field sẽ break fragments hiện có.

### Authoring

- Tổ chức fragments theo folder: type, year, hoặc locale.
- Dùng Variations cho channel-specific content (web, email, social) thay vì tạo fragment riêng.
- Tag fragments để hỗ trợ tìm kiếm cross-model.
- Dùng Associated Content để link DAM assets thuộc về fragment.

### Performance

- Query luôn filter theo `jcr:content/data/cq:model` trước.
- Tạo Oak index cho các fragment properties hay query.
- Cache fragment data trong Sling Model bằng `@PostConstruct` — không đọc lại JCR mỗi lần gọi getter.

---

## 13. Lỗi Thường Gặp

| Lỗi | Nguyên nhân & giải pháp |
|---|---|
| `adaptTo(ContentFragment.class)` trả về `null` | Resource phải là `dam:Asset` có tham chiếu model hợp lệ. Kiểm tra `jcr:content/data/cq:model`. |
| `getElement()` trả về `null` | Tên field phải match chính xác model (case-sensitive). |
| Rich text hiển thị raw HTML | Dùng `context='html'` trong HTL: `$\{model.body @ context='html'\}` |
| Fragment reference bị hỏng | References lưu dưới dạng path. Nếu target bị move, reference trỏ sai. |
| Query CF chậm | Tạo Oak index cho property `cq:model` và các custom filter properties. |
| Variation content rỗng | Variation kế thừa từ `master`. Chỉ field được set tường minh mới có data riêng. |

---

## Tham Khảo

- [Content Fragment Models (AEM 6.5)](https://experienceleague.adobe.com/en/docs/experience-manager-65/content/assets/content-fragments/content-fragments-models) — Adobe Experience League
- [Content Fragments API (Javadoc)](https://developer.adobe.com/experience-manager/reference-materials/6-5/javadoc/com/adobe/cq/dam/cfm/package-summary.html)
- [Assets HTTP API](https://experienceleague.adobe.com/en/docs/experience-manager-65/content/assets/extending/mac-api-assets) — Adobe Experience League
