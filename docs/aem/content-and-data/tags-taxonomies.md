# Tags và Taxonomies — AEM 6.5 On-Premise

---

## 1. Tag Trong AEM Là Gì

Tag là node JCR cấp cao (`cq:Tag`) nằm dưới `/content/cq:tags/`. Tag được gán cho pages, assets, Content Fragments, hoặc bất kỳ resource nào có property `cq:tags`. Tag phục vụ: navigation, search facets, analytics segmentation, personalisation.

---

## 2. Cấu Trúc Tag

### Namespaces

Mỗi tag thuộc một namespace — container cấp cao nhất, là direct children của `/content/cq:tags/`:

```
/content/cq:tags/
├── marketing/                 ← namespace
│   ├── campaigns/
│   │   ├── 2024/
│   │   └── 2025/
│   └── channels/
│       ├── email
│       ├── social
│       └── web
├── products/                  ← namespace
│   ├── shoes/
│   │   ├── running
│   │   └── hiking
│   └── clothing/
└── regions/                   ← namespace
    ├── emea
    ├── americas
    └── apac
```

### Node type `cq:Tag`

| Property | Type | Mô tả |
|---|---|---|
| `jcr:title` | String | Display title (mặc định) |
| `jcr:description` | String | Mô tả tag |
| `sling:resourceType` | String | `cq/tagging/components/tag` |
| `jcr:title.de` | String | Title tiếng Đức (i18n) |
| `jcr:title.fr` | String | Title tiếng Pháp (i18n) |

### Tag ID

Tag được định danh bằng tag ID — path relative so với `/content/cq:tags/`, dùng dấu `:` phân tách namespace khỏi path:

```
marketing:campaigns/2025
products:shoes/running
regions:emea
```

Property `cq:tags` trên resource lưu dạng String array:

```
cq:tags = ["marketing:campaigns/2025", "products:shoes/running"]
```

Luôn dùng tag ID (`namespace:path`), không dùng JCR path (`/content/cq:tags/namespace/path`). Tag ID ổn định qua các thao tác move và export.

---

## 3. Tạo và Quản Lý Tag

### Tagging Console (UI)

**Tools > General > Tagging** (`/aem/tagging`):

- Tạo namespaces và child tags
- Sửa title, description
- Move, merge tags
- Dịch tag title sang nhiều ngôn ngữ
- Xóa tags không dùng

### TagManager API (Java)

`TagManager` là interface chính để thao tác tag trong Java code.

```java
TagManager tagManager = resourceResolver.adaptTo(TagManager.class);
```

#### Tạo tag

```java
Tag newTag = tagManager.createTag(
    "marketing:campaigns/2025/summer",    // tag ID
    "Summer 2025 Campaign",               // title
    "Tags for the summer 2025 campaign",  // description
    true                                  // auto-save
);
```

`createTag` tự tạo parent tags nếu chưa tồn tại.

#### Resolve tag

```java
Tag tag = tagManager.resolve("marketing:campaigns/2025");

// Title theo locale
String titleDe = tag.getTitle(Locale.GERMAN);           // "Kampagnen 2025"
String titleDefault = tag.getTitle();                    // "2025"
String titleLocalized = tag.getLocalizedTitle(locale);   // fallback chain

// Thông tin tag
String path = tag.getPath();                // /content/cq:tags/marketing/campaigns/2025
String tagId = tag.getTagID();              // marketing:campaigns/2025
String ns = tag.getNamespace().getName();   // marketing
```

#### Đọc tags từ resource

```java
// Qua TagManager
Tag[] tags = tagManager.getTags(resource);

// Hoặc đọc trực tiếp property
String[] tagIds = resource.getValueMap().get("cq:tags", String[].class);
```

#### Gán tags cho resource

```java
Tag campaignTag = tagManager.resolve("marketing:campaigns/2025");
Tag channelTag = tagManager.resolve("marketing:channels/email");

// Thay thế toàn bộ tags hiện có
tagManager.setTags(resource, new Tag[]{ campaignTag, channelTag }, true);
```

#### Tìm resources theo tag

```java
Iterator<Resource> resources = tagManager.find(
    "/content/mysite",                  // search root
    "marketing:campaigns/2025"          // tag ID
);
while (resources.hasNext()) {
    Resource taggedResource = resources.next();
    // xử lý resource
}
```

### TagManager API tham khảo

| Method | Mô tả |
|---|---|
| `resolve(tagId)` | Resolve tag theo ID |
| `createTag(tagId, title, desc, autoSave)` | Tạo tag mới |
| `getTags(resource)` | Lấy tất cả tags trên resource |
| `setTags(resource, tags, autoSave)` | Gán tags cho resource |
| `find(rootPath, tagIds...)` | Tìm resources có tag cụ thể |
| `findByTitle(title)` | Tìm tag theo title |
| `deleteTag(tag, autoSave)` | Xóa tag |
| `moveTag(tag, newPath)` | Move/rename tag |
| `mergeTag(sourceTag, targetTag)` | Merge hai tags |
| `canCreateTag(tagId)` | Kiểm tra quyền tạo tag |

---

## 4. Tags Trong Sling Model

### Đọc tags từ component

```java
@Model(
    adaptables = Resource.class,
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
)
public class TaggedContentModel {

    @Self
    private Resource resource;

    @ValueMapValue(name = "cq:tags")
    private String[] cqTags;

    private List<TagInfo> tags;

    @PostConstruct
    protected void init() {
        tags = new ArrayList<>();
        if (cqTags == null || cqTags.length == 0) return;

        TagManager tagManager = resource.getResourceResolver()
            .adaptTo(TagManager.class);
        if (tagManager == null) return;

        for (String tagId : cqTags) {
            Tag tag = tagManager.resolve(tagId);
            if (tag != null) {
                tags.add(new TagInfo(
                    tag.getTagID(),
                    tag.getTitle(),
                    tag.getPath()
                ));
            }
        }
    }

    public List<TagInfo> getTags() {
        return Collections.unmodifiableList(tags);
    }

    public static class TagInfo {
        private final String id;
        private final String title;
        private final String path;

        public TagInfo(String id, String title, String path) {
            this.id = id;
            this.title = title;
            this.path = path;
        }

        public String getId() { return id; }
        public String getTitle() { return title; }
        public String getPath() { return path; }
    }
}
```

### Tag title theo locale

Khi site hỗ trợ nhiều ngôn ngữ, dùng `SlingHttpServletRequest` để lấy locale:

```java
@Model(
    adaptables = SlingHttpServletRequest.class,
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
)
public class LocalisedTagModel {

    @Self
    private SlingHttpServletRequest request;

    @ValueMapValue(name = "cq:tags")
    private String[] tagIds;

    public List<String> getTagTitles() {
        if (tagIds == null) return Collections.emptyList();

        Locale pageLocale = request.getLocale();
        TagManager tagManager = request.getResourceResolver()
            .adaptTo(TagManager.class);
        if (tagManager == null) return Collections.emptyList();

        List<String> titles = new ArrayList<>();
        for (String id : tagIds) {
            Tag tag = tagManager.resolve(id);
            if (tag != null) {
                titles.add(tag.getLocalizedTitle(pageLocale));
            }
        }
        return titles;
    }
}
```

Fallback chain của `getLocalizedTitle(locale)`:

1. Exact locale match (`de_DE`)
2. Language match (`de`)
3. Default title (không có locale suffix)

---

## 5. Tag Field Trong Component Dialog

### Tag picker chuẩn

```xml
<tags
    jcr:primaryType="nt:unstructured"
    sling:resourceType="cq/gui/components/coral/common/form/tagfield"
    fieldLabel="Tags"
    fieldDescription="Select one or more tags"
    name="./cq:tags"
    multiple="{Boolean}true"/>
```

### Giới hạn theo namespace

Dùng `rootPath` để restrict tag picker chỉ hiện tags trong namespace cụ thể:

```xml
<tags
    jcr:primaryType="nt:unstructured"
    sling:resourceType="cq/gui/components/coral/common/form/tagfield"
    fieldLabel="Product Tags"
    name="./productTags"
    multiple="{Boolean}true"
    rootPath="/content/cq:tags/products"/>
```

### Single tag (không multi-select)

```xml
<category
    jcr:primaryType="nt:unstructured"
    sling:resourceType="cq/gui/components/coral/common/form/tagfield"
    fieldLabel="Primary Category"
    name="./primaryCategory"
    multiple="{Boolean}false"/>
```

---

## 6. Render Tags Trong HTL

### Danh sách tags

```html
<sly data-sly-use.model="com.myproject.core.models.TaggedContentModel"/>
<div class="tag-list" data-sly-test="${model.tags.size > 0}">
    <ul>
        <li data-sly-repeat="${model.tags}">
            <span class="tag">${item.title}</span>
        </li>
    </ul>
</div>
```

### Tags dạng link (tag-based navigation)

```html
<sly data-sly-use.model="com.myproject.core.models.TaggedContentModel"/>
<nav class="tags" data-sly-test="${model.tags.size > 0}">
    <a data-sly-repeat="${model.tags}"
       href="/content/mysite/en/tags.html?tag=${item.id}"
       class="tag-link">
        ${item.title}
    </a>
</nav>
```

---

## 7. Tìm Kiếm Theo Tag Bằng QueryBuilder

### Tìm pages có tag cụ thể

```properties
path=/content/mysite/en
type=cq:Page
1_property=jcr:content/cq:tags
1_property.value=marketing:campaigns/2025
p.limit=20
p.guessTotal=true
```

### Tìm pages có BẤT KỲ tag nào trong danh sách (OR)

```properties
path=/content/mysite/en
type=cq:Page
group.p.or=true
group.1_property=jcr:content/cq:tags
group.1_property.value=marketing:channels/email
group.2_property=jcr:content/cq:tags
group.2_property.value=marketing:channels/social
p.limit=20
p.guessTotal=true
```

### Dùng predicate `tagid` (khuyến nghị)

Predicate `tagid` chuyên dùng cho tag query, đơn giản hơn property predicate:

```properties
path=/content/mysite/en
type=cq:Page
tagid=marketing:campaigns/2025
tagid.property=jcr:content/cq:tags
p.limit=20
```

### Tag inheritance — match cả child tags

`tagid` tự động match child tags. Query dưới đây trả về pages tag với `marketing:campaigns`, `marketing:campaigns/2024`, `marketing:campaigns/2025`...:

```properties
path=/content/mysite/en
type=cq:Page
tagid=marketing:campaigns
tagid.property=jcr:content/cq:tags
p.limit=20
```

Đây là lợi thế lớn của `tagid` so với `property` predicate — hỗ trợ hierarchical tag matching mà không cần viết nhiều điều kiện OR.

---

## 8. Taxonomy Design Patterns

### Flat vs Hierarchical

| Pattern | Ví dụ | Phù hợp khi |
|---|---|---|
| Flat | `regions:emea`, `regions:americas` | Phân loại đơn giản, không có quan hệ cha-con |
| Hierarchical | `regions:emea/uk`, `regions:emea/de` | Faceted navigation, tag inheritance, drill-down search |

### Multi-site tag governance

| Chiến lược | Vị trí tags | Khi nào dùng |
|---|---|---|
| Global shared | `/content/cq:tags/global/` | Tất cả sites dùng chung taxonomy |
| Per-site namespace | `/content/cq:tags/brand-a/`, `/content/cq:tags/brand-b/` | Mỗi site có tags riêng |
| Hybrid | `/content/cq:tags/shared/` + `/content/cq:tags/brand-a/` | Shared base + site-specific extensions |

### Closed namespace — kiểm soát vocabulary

Ngăn author tự tạo tags mới, buộc dùng vocabulary đã định nghĩa:

1. Set namespace thành **closed** trong Tagging Console
2. Hoặc set property `cq:isContainer = false` trên namespace node
3. Chỉ user thuộc group `tag-administrators` mới tạo được tags trong closed namespace

---

## 9. Dịch Tag Title (i18n)

Thêm property `jcr:title.&lt;locale&gt;` trên tag node:

```
/content/cq:tags/products/shoes
├── jcr:title    = "Shoes"
├── jcr:title.de = "Schuhe"
├── jcr:title.fr = "Chaussures"
├── jcr:title.es = "Zapatos"
└── jcr:title.ja = "靴"
```

Trong Java, `tag.getLocalizedTitle(locale)` tự xử lý fallback:
1. Exact locale (`de_DE`)
2. Language (`de`)
3. Default title

---

## 10. Groovy Console Scripts

### Liệt kê tất cả tags trong namespace

```groovy
import com.day.cq.tagging.TagManager

def tagManager = resourceResolver.adaptTo(TagManager.class)
def namespace = tagManager.resolve("products")

def printTag(tag, depth) {
    println "  " * depth + tag.tagID + " -> " + tag.title
    tag.listChildren().each { child ->
        printTag(child, depth + 1)
    }
}

printTag(namespace, 0)
```

### Tìm tags không được sử dụng

```groovy
import com.day.cq.tagging.TagManager

def tagManager = resourceResolver.adaptTo(TagManager.class)
def namespace = tagManager.resolve("marketing")

def checkTag(tag) {
    def count = 0
    def iter = tagManager.find("/content", tag.tagID)
    while (iter.hasNext()) {
        iter.next()
        count++
    }
    if (count == 0) {
        println "UNUSED: ${tag.tagID}"
    }
    tag.listChildren().each { child -> checkTag(child) }
}

checkTag(namespace)
```

### Bulk rename tag (dry-run pattern)

```groovy
def DRY_RUN = true

import com.day.cq.tagging.TagManager

def tagManager = resourceResolver.adaptTo(TagManager.class)
def oldTag = tagManager.resolve("marketing:campaigns/old-name")

if (oldTag != null) {
    if (DRY_RUN) {
        println "Would move ${oldTag.tagID} to marketing:campaigns/new-name"
    } else {
        tagManager.moveTag(oldTag, "marketing:campaigns/new-name")
        resourceResolver.commit()
        println "Tag moved successfully"
    }
} else {
    println "Tag not found"
}
```

---

## 11. Best Practices

**Thiết kế taxonomy trước khi build.** Lên kế hoạch namespaces, độ sâu hierarchy, governance rules trước khi tạo tags. Tái cấu trúc taxonomy sau khi content đã gắn tag rất tốn công.

**Dùng closed namespace cho controlled vocabulary.** Ngăn tag sprawl bằng cách đóng namespace, chỉ giao `tag-administrators` cho taxonomy owners.

**Giữ hierarchy nông.** Hai đến ba level thường đủ. Tags nest quá sâu khó navigate và ít mang lại giá trị phân loại thực tế.

**Luôn dùng tag ID, không dùng JCR path.** Tag ID ổn định qua move và export. JCR path (`/content/cq:tags/...`) sẽ hỏng khi tag được di chuyển.

**Dịch tag title nếu site multi-language.** Thêm `jcr:title.&lt;locale&gt;` trên tag node. Framework tự xử lý locale resolution.

**Activate tags lên Publish.** Tags phải được replicate, nếu không publish instance sẽ không resolve được tag ID. Kiểm tra replication status trong Tagging Console.

---

## 12. Lỗi Thường Gặp

| Lỗi | Giải pháp |
|---|---|
| Tags không hiển thị trên Publish | Tags chưa được activate/replicate. Kiểm tra replication status trong Tagging Console. |
| `TagManager` trả về `null` | `ResourceResolver` thiếu bundle `com.day.cq.tagging`. Kiểm tra OSGi console. |
| Tag picker hiển thị tất cả tags | Set `rootPath` trên tag field để restrict theo namespace. |
| Duplicate tags giữa namespaces | Xác lập namespace ownership rõ ràng. Dùng shared namespace cho cross-cutting concerns. |
| Query tag chậm | Dùng `tagid` predicate thay vì property-based query. Cân nhắc Oak index trên `cq:tags`. |
| Tags bị mất khi copy content | Include `/content/cq:tags/` trong content package filter khi migrate. |
| Author tự tạo tags bừa bãi | Đóng namespace, restrict tag creation cho administrators. |

---

## Tham Khảo

- [AEM Tagging Framework (6.5)](https://experienceleague.adobe.com/en/docs/experience-manager-65/content/implementing/developing/platform/tagging/framework) — Adobe Experience League
- [Tag API Javadoc](https://developer.adobe.com/experience-manager/reference-materials/6-5/javadoc/com/day/cq/tagging/package-summary.html)
