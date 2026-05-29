# JCR Node Operations
---

## 1. Hai API Làm Việc Với JCR Node

| | Sling Resource API | JCR Node API |
|---|---|---|
| **Mức độ** | Cao (abstraction) | Thấp (trực tiếp) |
| **Object chính** | `Resource`, `ValueMap` | `Node`, `Property`, `Session` |
| **Testability** | Dễ mock | Khó mock hơn |
| **Nên dùng khi** | Mặc định | Khi Sling API không đủ |

**Nguyên tắc:** Dùng Sling Resource API cho mọi CRUD thông thường. Chỉ xuống JCR API khi cần: node ordering, versioning, workspace copy.

---

## 2. Tạo Node

### Sling API (khuyến nghị)

```java
public void createNode(ResourceResolver resolver) throws PersistenceException {
    Resource parent = resolver.getResource("/content/mysite/en");
    if (parent == null) return;

    Map<String, Object> props = new HashMap<>();
    props.put("jcr:primaryType", "nt:unstructured");
    props.put("myProperty", "Hello World");
    props.put("myNumber", 42L);

    resolver.create(parent, "newChild", props);
    resolver.commit();
}
```

### JCR API

```java
public void createNode(Session session) throws Exception {
    Node parent = session.getNode("/content/mysite/en");
    Node newNode = parent.addNode("newChild", "nt:unstructured");
    newNode.setProperty("myProperty", "Hello World");
    newNode.setProperty("myNumber", 42L);
    session.save();
}
```

> **Lưu ý AEM 6.5:** `ResourceResolver` và `Session` lấy từ service user, không dùng admin session trong production. Khai báo service user mapping trong OSGi config `org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended~myproject.cfg.json` dưới `ui.config`.

---

## 3. Đọc Properties

### Sling API — ValueMap

```java
public void readProperties(Resource resource) {
    ValueMap props = resource.getValueMap();

    // Đọc với default value để tránh NPE
    String title   = props.get("jcr:title", "Untitled");
    Long count     = props.get("visitCount", 0L);
    Boolean hidden = props.get("hideInNav", false);

    // Multi-value property
    String[] tags = props.get("cq:tags", String[].class);
}
```

### JCR API — Node

```java
public void readProperties(Node node) throws Exception {
    String title = node.getProperty("jcr:title").getString();
    long count   = node.getProperty("visitCount").getLong();
    boolean hidden = node.getProperty("hideInNav").getBoolean();

    // Multi-value
    javax.jcr.Value[] values = node.getProperty("cq:tags").getValues();
    for (javax.jcr.Value v : values) {
        System.out.println(v.getString());
    }
}
```

### Bảng kiểu dữ liệu

| JCR Type | Sling `ValueMap` class | JCR getter |
|----------|----------------------|------------|
| String | `String.class` | `.getString()` |
| Long | `Long.class` | `.getLong()` |
| Boolean | `Boolean.class` | `.getBoolean()` |
| Date | `Calendar.class` | `.getDate()` |
| Binary | `InputStream.class` | `.getBinary()` |
| String[] | `String[].class` | `.getValues()` |

---

## 4. Cập Nhật Properties

### Sling API — ModifiableValueMap

```java
public void updateProperties(Resource resource, ResourceResolver resolver)
        throws PersistenceException {

    ModifiableValueMap mvp = resource.adaptTo(ModifiableValueMap.class);
    if (mvp == null) {
        // Thường do service user thiếu quyền write
        log.warn("Cannot adapt to ModifiableValueMap: {}", resource.getPath());
        return;
    }

    mvp.put("jcr:title", "Updated Title");
    mvp.put("visitCount", 100L);
    mvp.remove("obsoleteProperty");

    resolver.commit();
}
```

### JCR API

```java
public void updateProperties(Session session) throws Exception {
    Node node = session.getNode("/content/mysite/en/jcr:content");
    node.setProperty("jcr:title", "Updated Title");
    node.setProperty("visitCount", 100L);

    if (node.hasProperty("obsoleteProperty")) {
        node.getProperty("obsoleteProperty").remove();
    }

    session.save();
}
```

> **Lưu ý:** `adaptTo(ModifiableValueMap.class)` trả về `null` khi service user thiếu quyền `jcr:write` trên path đó. Kiểm tra ACL trong CRX/DE: `/home/users/system/&lt;service-user&gt;`.

---

## 5. Xóa Node

### Sling API

```java
public void deleteNode(ResourceResolver resolver) throws PersistenceException {
    Resource target = resolver.getResource("/content/mysite/en/obsolete-page");
    if (target != null) {
        resolver.delete(target);
        resolver.commit();
    }
}
```

### JCR API

```java
public void deleteNode(Session session) throws Exception {
    if (session.nodeExists("/content/mysite/en/obsolete-page")) {
        Node node = session.getNode("/content/mysite/en/obsolete-page");
        node.remove();
        session.save();
    }
}
```

### Xóa nhiều node trong vòng lặp — tránh ConcurrentModificationException

```java
// SAI: xóa trong khi đang iterate
for (Resource child : parent.getChildren()) {
    resolver.delete(child); // ConcurrentModificationException!
}

// ĐÚNG: collect trước, xóa sau
List<String> toDelete = new ArrayList<>();
for (Resource child : parent.getChildren()) {
    if (shouldDelete(child)) {
        toDelete.add(child.getPath());
    }
}
for (String path : toDelete) {
    Resource r = resolver.getResource(path);
    if (r != null) resolver.delete(r);
}
resolver.commit();
```

---

## 6. Move và Copy

### Move (atomic, cần save)

```java
public void moveNode(Session session) throws Exception {
    session.move(
        "/content/mysite/en/old-page",
        "/content/mysite/en/new-page"
    );
    session.save();
}
```

### Copy (immediate, không cần save)

```java
public void copyNode(Session session) throws Exception {
    Workspace workspace = session.getWorkspace();
    workspace.copy(
        "/content/mysite/en/source-page",
        "/content/mysite/en/copy-of-source"
    );
    // workspace.copy() commit ngay lập tức, không cần session.save()
}
```

| | `session.move()` | `workspace.copy()` |
|---|---|---|
| Cần `save()` | Có | Không |
| Atomic | Có | Không (copy ngay) |
| Kết quả | Di chuyển node | Duplicate toàn bộ subtree |

---

## 7. Duyệt Cây Node

### Lên/xuống/ngang

```java
public void navigate(Resource resource) {
    Resource parent = resource.getParent();
    Resource child  = resource.getChild("jcr:content");

    // Iterate direct children
    for (Resource c : resource.getChildren()) {
        log.info("Child: {} ({})", c.getName(), c.getResourceType());
    }
}
```

### Tìm node config theo cây cha (inheritance pattern)

Dùng khi config được set ở page cha và cần tìm từ page con đi lên:

```java
@Self
private Resource currentResource;

private Resource findInheritedConfig(Page page) {
    String relPath = "/jcr:content/customConfig";
    int depth = page.getDepth();

    for (int i = 1; i < depth; i++) {
        Resource config = currentResource.getChild(page.getPath() + relPath);
        if (config != null) return config;
        page = page.getParent();
    }
    return null;
}
```

### Duyệt đệ quy toàn bộ subtree

```java
// Java 11+: String.repeat() có sẵn
public void traverseRecursively(Resource resource, int depth) {
    String indent = "  ".repeat(depth);
    String type   = resource.getValueMap().get("jcr:primaryType", "unknown");
    log.info("{}{} [{}]", indent, resource.getName(), type);

    for (Resource child : resource.getChildren()) {
        traverseRecursively(child, depth + 1);
    }
}

// Java 8: dùng StringBuilder thay thế String.repeat()
public void traverseRecursively(Resource resource, int depth) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < depth; i++) sb.append("  ");
    String type = resource.getValueMap().get("jcr:primaryType", "unknown");
    log.info("{}{} [{}]", sb, resource.getName(), type);

    for (Resource child : resource.getChildren()) {
        traverseRecursively(child, depth + 1);
    }
}
```

> **Cảnh báo:** Duyệt đệ quy trên cây lớn (DAM, `/content`) có thể gây OOM. Luôn giới hạn depth hoặc dùng QueryBuilder thay thế.

---

## 8. Sắp Xếp Thứ Tự Child Node

Mặc định `nt:unstructured` và `cq:Page` giữ thứ tự insertion. Có thể sắp xếp lại bằng JCR API:

```java
public void reorderChildren(Session session) throws Exception {
    Node parent = session.getNode("/content/mysite/en");

    // Chuyển "page-b" lên trước "page-a"
    parent.orderBefore("page-b", "page-a");

    // Chuyển "page-c" xuống cuối (null = cuối danh sách)
    parent.orderBefore("page-c", null);

    session.save();
}
```

> Sling Resource API **không hỗ trợ** node ordering. Bắt buộc dùng JCR API cho tính năng này.

---

## 9. Versioning

AEM 6.5 dùng JCR versioning để quản lý lịch sử nội dung. Node cần có mixin `mix:versionable`.

```java
public void versioningExample(Session session) throws Exception {
    VersionManager vm = session.getWorkspace().getVersionManager();
    String path = "/content/mysite/en/jcr:content";

    // Tạo version mới (check-in + check-out)
    vm.checkpoint(path);

    // Liệt kê lịch sử versions
    VersionHistory history = vm.getVersionHistory(path);
    VersionIterator versions = history.getAllVersions();
    while (versions.hasNext()) {
        Version v = versions.nextVersion();
        log.info("Version {} — {}", v.getName(), v.getCreated().getTime());
    }

    // Restore về version cụ thể
    vm.restore(path, "1.0", true);
    // true = xóa conflicting nodes nếu có (thường là true)
}
```

> **Lưu ý:** `vm.restore()` ghi đè nội dung hiện tại. Dùng cẩn thận trong môi trường production. Versioning chỉ áp dụng cho node có mixin `mix:versionable` (mặc định có trên `cq:PageContent`).

---

## 10. Batch Operations

Khi update hàng nghìn node, không save sau mỗi thay đổi — sẽ rất chậm và gây nhiều transaction nhỏ.

```java
public void batchUpdate(ResourceResolver resolver, List<Resource> resources)
        throws PersistenceException {

    final int BATCH_SIZE = 1000;
    int count = 0;

    for (Resource resource : resources) {
        ModifiableValueMap mvp = resource.adaptTo(ModifiableValueMap.class);
        if (mvp == null) continue;

        mvp.put("migrationFlag", Boolean.TRUE);
        count++;

        if (count % BATCH_SIZE == 0) {
            resolver.commit();
            log.info("Committed {} nodes", count);
        }
    }

    // Commit phần còn lại
    if (count % BATCH_SIZE != 0) {
        resolver.commit();
    }

    log.info("Batch update hoàn tất: {} nodes", count);
}
```

**Chọn batch size:**
- Node thông thường: **1000**
- Node có binary property lớn: giảm xuống **100–200**
- Groovy Console: dùng built-in batching utilities của Groovy Console

---

## 11. Sling API vs JCR API — Tóm Tắt

| Thao tác | Sling Resource API | JCR Node API |
|----------|-------------------|--------------|
| Tạo node | `resolver.create()` | `node.addNode()` |
| Đọc property | `resource.getValueMap()` | `node.getProperty()` |
| Cập nhật property | `ModifiableValueMap.put()` | `node.setProperty()` |
| Xóa node | `resolver.delete()` | `node.remove()` |
| Persist | `resolver.commit()` | `session.save()` |
| Node ordering | Không hỗ trợ | `node.orderBefore()` |
| Versioning | Không hỗ trợ | `VersionManager` |
| Move | `resolver.move()` | `session.move()` |
| Copy | Không hỗ trợ trực tiếp | `workspace.copy()` |
| Testability | Dễ mock (MockResource) | Khó mock hơn |

---

## 12. Patterns Thường Gặp Trong AEM 6.5

### Lấy jcr:content từ một Page resource

```java
Resource pageResource = resolver.getResource("/content/mysite/en/about");
Resource jcrContent = pageResource.getChild("jcr:content");
ValueMap props = jcrContent.getValueMap();
String title = props.get("jcr:title", "");
```

### Adapt Resource sang Page (CQ API)

```java
Page page = resource.adaptTo(Page.class);
if (page != null) {
    String title = page.getTitle();
    String path  = page.getPath();
    Page parent  = page.getParent();
}
```

### Lấy Session từ ResourceResolver

```java
Session session = resolver.adaptTo(Session.class);
```

### Không hardcode credentials trong OSGi Service

```java
// SAI trong production
Session session = repository.login(new SimpleCredentials("admin", "admin".toCharArray()));

// ĐÚNG: dùng service user
@Reference
private ResourceResolverFactory resolverFactory;

Map<String, Object> authInfo = Collections.singletonMap(
    ResourceResolverFactory.SUBSERVICE, "my-service-user"
);
try (ResourceResolver resolver = resolverFactory.getServiceResourceResolver(authInfo)) {
    // thao tác với resolver
}
```

---

## Tham Khảo

- [Sling Resource API (Javadoc)](https://sling.apache.org/apidocs/sling11/org/apache/sling/api/resource/ResourceResolver.html)
- [JCR 2.0 Specification](https://developer.adobe.com/experience-manager/reference-materials/spec/jcr/2.0/index.html)
