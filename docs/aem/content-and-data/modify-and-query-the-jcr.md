# Hướng dẫn Truy vấn & Sửa đổi JCR trong AEM 6.5

## Tổng quan: 3 Cách Query JCR trong AEM

| Phương pháp | Khi nào dùng | Ưu điểm | Nhược điểm |
|---|---|---|---|
| QueryBuilder API | Query phức tạp, có input từ user | Tự động sanitize, dễ maintain | Cú pháp dài hơn |
| SQL2 (JCR-SQL2) | Query đơn giản, performance cao | Cú pháp giống SQL, nhanh | Cần tự handle injection |
| JCR Session API | Thao tác CRUD node trực tiếp | Control toàn bộ JCR | Dễ leak session, verbose |

---

## 1. QueryBuilder API

```java
import com.day.cq.search.PredicateGroup;
import com.day.cq.search.Query;
import com.day.cq.search.QueryBuilder;
import com.day.cq.search.result.Hit;
import com.day.cq.search.result.SearchResult;
import org.apache.sling.api.SlingHttpServletRequest;
import org.osgi.service.component.annotations.Reference;
import javax.jcr.Session;
import java.util.*;

public class MyQueryBuilderService {

    @Reference
    private QueryBuilder queryBuilder;

    public List<Hit> executeCustomQuery(SlingHttpServletRequest request, String locale) {
        Session session = request.getResourceResolver().adaptTo(Session.class);
        if (session == null) return Collections.emptyList();

        Map<String, String> predicates = new HashMap<>();
        predicates.put("path", "/content/experience-fragments");
        predicates.put("type", "nt:unstructured");

        predicates.put("group.p.or", "false");
        predicates.put("group.1_property", "sling:resourceType");
        predicates.put("group.1_property.value", "myproject/components/testModel");
        predicates.put("group.2_property", "jcr:content/@locale");
        predicates.put("group.2_property.value", locale.toLowerCase());

        predicates.put("p.offset", "0");
        predicates.put("p.limit", "-1");
        predicates.put("p.hits", "full");

        Query query = queryBuilder.createQuery(PredicateGroup.create(predicates), session);
        SearchResult result = query.getResult();
        return result.getHits();
    }
}
```

**Lưu ý:** Tránh `p.limit="-1"` trong production với dataset lớn — dùng pagination thay thế.

---

## 2. SQL2 Query

```java
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import javax.jcr.query.Query;
import java.util.Iterator;

public class Sql2QueryExample {

    // Cách 1: Sanitize input trước khi concatenate
    public Iterator<Resource> findResourcesByLocale(ResourceResolver resolver, String locale, String resourceType) {
        String safeLocale = locale.replaceAll("[^a-zA-Z0-9_-]", "");
        String safeResourceType = resourceType.replaceAll("[^a-zA-Z0-9/:_-]", "");

        String sql2 = String.format(
            "SELECT * FROM [nt:unstructured] AS s " +
            "WHERE ISDESCENDANTNODE([/content/experience-fragments]) " +
            "AND [sling:resourceType] = '%s' " +
            "AND LOWER([jcr:content/@locale]) = '%s' " +
            "ORDER BY [jcr:created] DESC",
            safeResourceType, safeLocale.toLowerCase()
        );

        return resolver.findResources(sql2, Query.JCR_SQL2);
    }

    // Cách 2: Bind variables (AEM 6.5 SP10+)
    public Iterator<Resource> findWithBindVars(ResourceResolver resolver, String locale) {
        String sql2 = "SELECT * FROM [nt:unstructured] AS s " +
                      "WHERE ISDESCENDANTNODE([/content/myproject]) " +
                      "AND [jcr:content/@locale] = $locale";

        Map<String, Object> bindings = new HashMap<>();
        bindings.put("locale", locale.toLowerCase());

        return resolver.findResources(sql2, Query.JCR_SQL2, bindings);
    }
}
```

---

## 3. JCR Session API

```java
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import javax.jcr.Node;
import javax.jcr.Session;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Component(service = JcrContentService.class)
public class JcrContentService {

    @Reference
    private ResourceResolverFactory resolverFactory;

    private static final String SERVICE_USER = "myproject-content-service";

    public void storeContent(String contentPath, String message) {
        Map<String, Object> params = new HashMap<>();
        params.put(ResourceResolverFactory.SUBSERVICE, SERVICE_USER);

        try (ResourceResolver resolver = resolverFactory.getServiceResourceResolver(params)) {
            Session session = resolver.adaptTo(Session.class);
            if (session == null) return;

            Node root = session.getRootNode();
            Node adobe = root.hasNode("adobe") ? root.getNode("adobe") : root.addNode("adobe");
            Node day = adobe.hasNode("day") ? adobe.getNode("day") : adobe.addNode("day");

            day.setProperty("message", message);
            day.setProperty("jcr:lastModified", Calendar.getInstance());

            session.save();

        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(JcrContentService.class)
                .error("Failed to store content at {}", contentPath, e);
        }
    }

    public String retrieveContent(String nodePath) {
        Map<String, Object> params = Collections.singletonMap(
            ResourceResolverFactory.SUBSERVICE, SERVICE_USER);

        try (ResourceResolver resolver = resolverFactory.getServiceResourceResolver(params)) {
            Session session = resolver.adaptTo(Session.class);
            if (session == null) return null;

            if (session.nodeExists(nodePath)) {
                Node node = session.getNode(nodePath);
                return node.hasProperty("message")
                    ? node.getProperty("message").getString()
                    : null;
            }
            return null;

        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(JcrContentService.class)
                .error("Failed to retrieve content from {}", nodePath, e);
            return null;
        }
    }
}
```

### Cấu hình Service User

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-myproject.cfg`

```properties
user.mapping=[ \
    "myproject:content-service=[myproject-content-service]" \
]
```

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-myproject.cfg.json`

```json
{
  "user.mapping": [
    "myproject:content-service=[myproject-content-service]"
  ]
}
```

---

## 4. Groovy Console Scripts

### SQL2 Query

```groovy
import javax.jcr.query.Query

def buildSafeQuery(pagePath, resourceType) {
    def safePath = pagePath.replaceAll(/['\\]/, '')
    def safeType = resourceType.replaceAll(/['\\]/, '')

    def statement = "SELECT * FROM [nt:unstructured] WHERE " +
                    "ISDESCENDANTNODE(['${safePath}']) AND " +
                    "[sling:resourceType] = '${safeType}'"

    session.workspace.queryManager.createQuery(statement, Query.JCR_SQL2)
}

def query = buildSafeQuery('/content/geometrixx/en', 'geometrixx/components/contentpage')
def result = query.execute()

result.nodes.each { node ->
    println node.path
}
```

### Delete Property

```groovy
import javax.jcr.query.Query

def statement = "/jcr:root/content/eurowings//*[@jcr:language]"
def query = session.workspace.queryManager.createQuery(statement, Query.XPATH)
def result = query.execute()
def deletedCount = 0

result.nodes.each { node ->
    if (node.path.contains('/backoffice/') && node.hasProperty('jcr:language')) {
        node.getProperty('jcr:language').remove()
        deletedCount++
    }
}

if (deletedCount > 0) {
    session.save()
    println "Saved: ${deletedCount} properties deleted"
} else {
    println "No changes made"
}
```

**Lưu ý:** Gọi `session.save()` một lần sau loop, không save trong từng iteration.

---

## 5. Delete Inbox Notifications

```java
public void cleanupInboxTasks(ResourceResolver resolver, String taskPrefix) {
    Resource tasksRoot = resolver.getResource("/var/taskmanagement/tasks");
    if (tasksRoot == null) return;

    tasksRoot.listChildren().forEachRemaining(task -> {
        if (task.getName().startsWith(taskPrefix)) {
            try {
                resolver.delete(task);
                log.info("Deleted task: {}", task.getPath());
            } catch (PersistenceException e) {
                log.error("Failed to delete task: {}", task.getPath(), e);
            }
        }
    });

    resolver.commit();
}
```

---

## Cheat Sheet: Query Patterns AEM 6.5

```java
// QueryBuilder: Tìm component theo resourceType + property
predicates.put("type", "nt:unstructured");
predicates.put("path", "/content/myproject");
predicates.put("1_property", "sling:resourceType");
predicates.put("1_property.value", "myproject/components/hero");
predicates.put("2_property", "jcr:content/@published");
predicates.put("2_property.operation", "exists");

// SQL2: Tìm page theo template + language
"SELECT * FROM [cq:Page] AS p " +
"WHERE ISDESCENDANTNODE([/content/myproject]) " +
"AND [jcr:content/cq:template] = '/conf/myproject/settings/wcm/templates/landing' " +
"AND [jcr:language] = 'vi'"

// XPath (tránh dùng nếu có thể):
"/jcr:root/content/myproject//element(*, cq:Page)[@jcr:language='vi']"

// Fulltext search:
predicates.put("fulltext", "keyword");
predicates.put("fulltext.relPath", "jcr:content");
```

---

## Common Pitfalls & Fixes

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `QueryFormatException` | Input chưa escape trong SQL2 | Dùng bind variables hoặc sanitize input |
| `LoginException` | Service user chưa config | Kiểm tra `ServiceUserMapperImpl` config |
| Query chậm | Thiếu index, query quá rộng | Tạo Oak index, thêm `p.limit`, filter path |
| Memory leak | Không close ResourceResolver | Dùng try-with-resources |
| Save không effect | Quên `session.save()` hoặc `resolver.commit()` | Commit sau khi modify |
| Permission denied | Service user thiếu ACL | Grant permission qua `rep:policy` node |

---

## Performance Tips

1. Tạo Oak index cho property thường query tại `/oak:index`
2. Luôn set `p.limit` hoặc dùng cursor-based pagination
3. Tránh `ISDESCENDANTNODE([/])` — luôn chỉ định path cụ thể
4. Với query nặng, dùng `JobManager` để chạy background

```json
{
  "jcr:primaryType": "oak:QueryIndexDefinition",
  "type": "property",
  "propertyNames": ["sling:resourceType"],
  "declaringNodeTypes": ["nt:unstructured"]
}
```