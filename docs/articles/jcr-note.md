# CRX/DE & JCR — Debug Tips

Ghi chú các kỹ thuật sử dụng CRX/DE Lite để khám phá JCR, debug page content và rendering trong AEM 6.5.

## Truy cập CRX/DE Lite

```
http://localhost:4502/crx/de/index.jsp
```

## Cấu trúc JCR cần nắm

| Path | Mô tả |
|------|--------|
| `/content/&lt;site&gt;` | Page content tree |
| `/apps/&lt;project&gt;` | Custom components, templates, configs |
| `/libs/` | OOTB AEM components (read-only, overlay via `/apps`) |
| `/conf/&lt;site&gt;` | Editable templates, policies, cloud configs |
| `/etc/` | Miscellaneous configs, designs, data stores |
| `/var/` | Audit logs, workflow instances, eventing |
| `/home/users` | User nodes |
| `/home/groups` | Group nodes |
| `/oak:index` | Lucene/Property index definitions |

---

## Debug Page Content

### Xem node structure của 1 page

Mỗi AEM page = 1 node `cq:Page` + child node `jcr:content`:

```
/content/mysite/en/my-page
  └── jcr:content                    ← cq:PageContent
        ├── sling:resourceType       ← component render page
        ├── cq:template              ← template path
        ├── jcr:title                ← page title
        ├── cq:lastModified          ← last edit timestamp
        └── root/                    ← parsys container
              └── container/
                    ├── text
                    ├── image
                    └── ...
```

### Các property quan trọng trên `jcr:content`

| Property | Ý nghĩa |
|----------|----------|
| `sling:resourceType` | Component dùng để render page |
| `cq:template` | Editable/static template |
| `cq:lastModified` | Thời điểm author chỉnh sửa lần cuối |
| `cq:lastModifiedBy` | User chỉnh sửa lần cuối |
| `jcr:title` | Title hiển thị |
| `cq:tags` | Tag array |
| `hideInNav` | Ẩn khỏi navigation |

### Xem nhanh JSON của page

```
GET /content/mysite/en/my-page.infinity.json
GET /content/mysite/en/my-page.1.json         ← depth 1
GET /content/mysite/en/my-page/jcr:content.json
```

Dùng `.tidy.infinity.json` để format đẹp hơn.

---

## Debug Rendering (Sling Resolution)

### Hiểu Sling Resource Resolution

AEM dùng Sling để resolve URL → Resource → Script/Component:

```
URL: /content/mysite/en/my-page.html
  → Resource: /content/mysite/en/my-page/jcr:content
  → sling:resourceType: mysite/components/page/content-page
  → Script lookup: /apps/mysite/components/page/content-page/content-page.html
```

### Tool debug resolution

**Sling Resource Resolver** — test URL resolution:
```
http://localhost:4502/system/console/jcrresolver
```

Nhập path → xem resource resolve tới đâu.

**Sling Script Resolution** — xem script nào được chọn:
```
http://localhost:4502/system/console/scriptresolver
```

### Recent Requests (Request Log)

```
http://localhost:4502/system/console/requests
```

Xem chi tiết từng request: timing, included scripts, selectors.

---

## Query Builder — Tìm content trong JCR

### Dùng UI

```
http://localhost:4502/libs/cq/search/content/querydebug.html
```

### Dùng API URL

```
http://localhost:4502/bin/querybuilder.json?path=/content/mysite&type=cq:Page&p.limit=10
```

### Các query hữu ích cho debug

**Tìm tất cả page dùng 1 template:**
```
path=/content/mysite
type=cq:Page
property=jcr:content/cq:template
property.value=/conf/mysite/settings/wcm/templates/article-page
```

**Tìm component theo resourceType:**
```
path=/content/mysite
property=sling:resourceType
property.value=mysite/components/content/hero
```

**Tìm node chứa 1 property value cụ thể:**
```
path=/etc/mysitedatabase
property=eventTitle
property.value=Reception Art 2023
```

**Full-text search:**
```sql
SELECT * FROM [nt:base] WHERE CONTAINS(*, 'keyword') AND ISDESCENDANTNODE('/content/mysite')
```

---

## Debug Component Dialog & Content

### Xác định component nào render 1 section

1. Trên page, bật **Developer Mode** (User icon → Developer)
2. Hover lên component → thấy `sling:resourceType` và path
3. Hoặc view page source → tìm comment `\{/*  cq:include  */\}` markers

### Tìm component code từ resourceType

```
sling:resourceType = mysite/components/content/event-detail
→ Code ở: /apps/mysite/components/content/event-detail/
  ├── event-detail.html        ← HTL template
  ├── _cq_dialog/              ← Touch UI dialog
  │     └── .content.xml
  └── clientlibs/              ← component-specific CSS/JS
```

### Xem dialog field → JCR property mapping

Mở dialog XML trong CRX/DE:
```
/apps/mysite/components/content/event-detail/_cq_dialog/content/items/tabs/items/properties/items/columns/items/column/items
```

Mỗi field có `name` property → map trực tiếp thành JCR property trên node.

Ví dụ:
```xml
<location jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
    fieldLabel="Location"
    name="./location"/>
```
→ Property `location` trên `jcr:content` node.

---

## Debug Tips nâng cao

### So sánh node giữa 2 language versions

Mở 2 tab CRX/DE, navigate tới cùng path nhưng khác language:
```
Tab 1: /content/mysite/en/events/event-1/jcr:content
Tab 2: /content/mysite/ja/events/event-1/jcr:content
```

So sánh property list → thấy ngay field nào bị thiếu.

Hoặc dùng JSON diff:
```bash
curl -u admin:admin "http://localhost:4502/content/mysite/en/events/event-1/jcr:content.infinity.json" > en.json
curl -u admin:admin "http://localhost:4502/content/mysite/ja/events/event-1/jcr:content.infinity.json" > ja.json
diff en.json ja.json
```

### Tìm ai/cái gì đã modify node

Kiểm tra property trên node:
- `jcr:lastModified` — timestamp
- `jcr:lastModifiedBy` — user
- `cq:lastReplicated` — last publish time
- `cq:lastReplicatedBy` — who published
- `cq:lastReplicationAction` — Activate/Deactivate

### Tìm tất cả references tới 1 path

```
http://localhost:4502/bin/querybuilder.json?path=/content&property=fileReference&property.value=/content/dam/mysite/image.jpg
```

### Xem node version history

```
/content/mysite/en/my-page/jcr:content → Tools → Versioning
```

Hoặc navigate trong CRX/DE:
```
/jcr:system/jcr:versionStorage/...
```

### Debug Sling Model đọc data

Nếu component dùng Sling Model inject property:

```java
@Model(adaptables = Resource.class)
public class EventDetailModel {
    @ValueMapValue
    private String location;  // ← đọc từ jcr:content/location

    @ValueMapValue
    private String host;      // ← đọc từ jcr:content/host
}
```

Nếu property không tồn tại trên node → field = `null` → UI render trống.

### Check OSGi config ảnh hưởng rendering

```
http://localhost:4502/system/console/configMgr
```

Search `Sling`, `Mapping`, `ResourceResolver` → xem có URL mapping hay vanity URL nào redirect.

---

## Checklist khi debug page hiển thị sai

1. **Mở CRX/DE** → navigate tới page node → kiểm tra property có đúng không
2. **Check `.infinity.json`** → xem data thực tế trả về
3. **Xem `sling:resourceType`** → tìm component code
4. **Đọc HTL/Sling Model** → xem logic render, có condition nào skip field không
5. **Check Sling Script Resolver** → đúng script được pick chưa
6. **Kiểm tra dispatcher cache** → có phải đang serve cached version cũ
7. **So sánh giữa author vs publish** → data có được replicate chưa

---

## Useful Bookmarks

| URL | Mục đích |
|-----|----------|
| `/crx/de` | CRX/DE Lite |
| `/system/console/bundles` | OSGi Bundles |
| `/system/console/components` | OSGi Components |
| `/system/console/configMgr` | OSGi Configs |
| `/system/console/jcrresolver` | Sling Resource Resolver |
| `/system/console/requests` | Recent Requests |
| `/libs/cq/search/content/querydebug.html` | Query Builder Debug |
| `/libs/granite/ui/content/dumplibs.html` | Client Libraries |
| `/mnt/overlay/dam/gui/content/assets.html` | DAM Assets |
| `/system/console/status-slinglogs` | Log config |
