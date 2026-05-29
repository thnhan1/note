# Note

- Data node nằm ở `/etc/mysitedatabase/events/japan/reception-art-2023/en`
- Page render dữ liệu đó là page khác (dạng `mysite/article-details.html?selected=events&path=/etc/...`)
- `/etc` không có `cq:LiveRelationship` nên không sync qua MSM

---

## Tìm page/component nào đang đọc data từ `/etc`

### Cách 1 — Tìm qua query param `path`

URL có `?path=/etc/mysitedatabase/events/japan/reception-art-2023/en` → page `article-details` đang **đọc path từ query param**, rồi fetch data từ node đó.

Tìm component/servlet xử lý param `path` này:

```
grep -r "path" /apps/mysite --include="*.java" | grep "request.getParameter"
grep -r "mysitedatabase" /apps/mysite
```

Hoặc trong CRXDE search full-text:
**Tools → Query** (Query Builder / SQL2):
```sql
SELECT * FROM [nt:base] WHERE CONTAINS(*, 'mysitedatabase')
```

---

### Cách 2 — Tìm component render article-details page

Vào CRXDE, tìm page template của `article-details`:
```
/content/mysite/en/article-details/jcr:content
  - cq:template → /conf/mysite/settings/wcm/templates/...
  - sling:resourceType → mysite/components/pages/article-details
```

Từ `sling:resourceType` → tìm component đó trong `/apps/mysite/components/pages/article-details` → xem nó đọc data như thế nào.

---

### Cách 3 — Trace qua Sling Model / Use Service

Nếu component dùng Sling Model, tìm class có annotation:
```java
@Model(adaptables = SlingHttpServletRequest.class)
```

Trong model đó sẽ có code đọc `path` param rồi `resourceResolver.getResource(path)` → đó là nơi lấy data từ `/etc`.

---

## Vấn đề thực sự ở đây

Data ở `/etc` không phải page, không dùng MSM/Language Copy. Nó là **content node thuần túy**. Các version `/ja`, `/ar`, `/zh` tương ứng sẽ là:

```
/etc/mysitedatabase/events/japan/reception-art-2023/en   ← tiếng Anh
/etc/mysitedatabase/events/japan/reception-art-2023/ja   ← tiếng Nhật?
/etc/mysitedatabase/events/japan/reception-art-2023/ar
/etc/mysitedatabase/events/japan/reception-art-2023/zh
```

**Kiểm tra ngay trong CRXDE**: các node `/ja`, `/ar`, `/zh` đó có tồn tại không? Có đủ property không?

Nếu **không tồn tại** → data chưa được tạo/import cho các language đó.
Nếu **tồn tại nhưng thiếu property** → quá trình tạo node bị thiếu field.

---

## Tìm nơi tạo/import data vào `/etc`

Đây mới là **root cause** cần tìm. Data vào `/etc` thường qua:

1. **Custom import job / workflow** — tìm trong `/apps/mysite/config` hoặc OSGi console
2. **ACS Commons - Automatic Package Replication** hoặc custom servlet
3. **Sling Event / Scheduled Job** — check **Felix Console** → `http://localhost:4502/system/console/components` search `scheduler` hoặc `importer`
4. **External API sync** — có thể có 1 servlet nhận POST từ hệ thống ngoài rồi write vào `/etc`

Search trong code:
```
grep -r "mysitedatabase" /apps --include="*.java"
grep -r "mysitedatabase" /apps --include="*.js"
```

Cái này sẽ ra ngay chỗ nào đang write/read node đó.

---

**Tóm lại:** Bước quan trọng nhất bây giờ là check `/etc/.../ja`, `/ar`, `/zh` có tồn tại trong CRXDE không, rồi search `mysitedatabase` trong `/apps` code để tìm component và import logic.
