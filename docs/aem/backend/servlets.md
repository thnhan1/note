# Sling Servlets — AEM 6.5 On-Premise

---

## 1. Cơ chế resolution của Sling Servlet

Sling route request tới servlet dựa trên resource type, selector, extension, method:

```
GET /content/myproject/en.search.json

  Resource path : /content/myproject/en
  Resource type : myproject/components/page   ← từ sling:resourceType
  Selector      : search
  Extension     : json
  Method        : GET
```

Sling match theo thứ tự ưu tiên:

1. `sling.servlet.resourceTypes` + `sling.servlet.selectors` + `sling.servlet.extensions` + `sling.servlet.methods`
2. `sling.servlet.paths` (path-based, ít ưu tiên hơn)

---

## 2. Resource Type vs Path Registration

| | Resource Type | Path-based |
|---|---|---|
| Ưu tiên | Cao | Thấp |
| ACL/Security | Tuân theo Sling ACL | **Bypass** Sling ACL |
| Cần resource tồn tại | Có | Không |
| Khi dùng | Mặc định | Chỉ khi thực sự cần endpoint độc lập |

Path-based servlet bypass JCR access control. Trên AEM 6.5, vẫn luôn ưu tiên resource-type. Nếu bắt buộc dùng path, giới hạn trong `/bin/`.

---

## 3. Annotation Đăng Ký Servlet

### Chuẩn hiện tại (AEM 6.5 + Sling 2.5+)

```java
// GET — read-only
@Component(service = Servlet.class)
@SlingServletResourceTypes(
    resourceTypes = "myproject/components/page",
    methods       = HttpConstants.METHOD_GET,
    selectors     = "search",
    extensions    = "json"
)
public class SearchServlet extends SlingSafeMethodsServlet { ... }

// POST — write
@Component(service = Servlet.class)
@SlingServletResourceTypes(
    resourceTypes = "myproject/components/contactform",
    methods       = HttpConstants.METHOD_POST,
    selectors     = "submit",
    extensions    = "json"
)
public class ContactFormServlet extends SlingAllMethodsServlet { ... }

// Path-based (dùng hạn chế)
@Component(service = Servlet.class)
@SlingServletPaths("/bin/myproject/api/search")
public class SearchApiServlet extends SlingSafeMethodsServlet { ... }
```

### Annotation cũ — không dùng

```java
// Deprecated kể từ Sling 2.5
@SlingServlet(resourceTypes = "...", methods = "GET")

// Cũ hơn — không bao giờ dùng trong dự án mới
@Component
@Service(value = Servlet.class)
@Properties({
    @Property(name = "sling.servlet.resourceTypes", value = "..."),
    @Property(name = "sling.servlet.methods", value = "GET")
})
```

### Properties tham khảo

| Property | Mục đích | Ví dụ |
|---|---|---|
| `resourceTypes` | Sling resource type servlet xử lý | `"myproject/components/form"` |
| `methods` | HTTP method | `HttpConstants.METHOD_POST` |
| `selectors` | URL selector | `"submit"`, `"action"` |
| `extensions` | URL extension | `"json"`, `"html"` |
| `resourceSuperType` | Parent resource type | `"sling/servlet/default"` |

---

## 4. Base Class

| Class | Override methods | Khi nào dùng |
|---|---|---|
| `SlingSafeMethodsServlet` | `doGet`, `doHead`, `doOptions` | Read-only (GET endpoint, DataSource) |
| `SlingAllMethodsServlet` | Tất cả + `doPost`, `doPut`, `doDelete` | Write (form submit, mutation API) |

Luôn extend `SlingSafeMethodsServlet` nếu chỉ cần GET. Dùng `SlingAllMethodsServlet` chỉ khi cần xử lý POST/PUT/DELETE.

---

## 5. GET Servlet — JSON API

```java
package com.myproject.core.servlets;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.servlets.HttpConstants;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.apache.sling.servlets.annotations.SlingServletResourceTypes;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import javax.servlet.ServletException;
import java.io.IOException;

@Component(service = Servlet.class)
@SlingServletResourceTypes(
    resourceTypes = "myproject/components/page",
    methods       = HttpConstants.METHOD_GET,
    selectors     = "search",
    extensions    = "json"
)
public class SearchServlet extends SlingSafeMethodsServlet {

    private static final long serialVersionUID = 1L;
    private static final Gson GSON = new Gson();

    @Override
    protected void doGet(SlingHttpServletRequest request,
                         SlingHttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String query = request.getParameter("q");
        int limit = parseIntParam(request, "limit", 10);

        JsonObject result = new JsonObject();
        JsonArray items = new JsonArray();

        if (query != null && !query.trim().isEmpty()) {
            Resource root = request.getResource();
            int count = 0;
            for (Resource child : root.getChildren()) {
                if (count >= limit) break;
                String title = child.getValueMap().get("jcr:title", "");
                if (title.toLowerCase().contains(query.toLowerCase())) {
                    JsonObject item = new JsonObject();
                    item.addProperty("path", child.getPath());
                    item.addProperty("title", title);
                    items.add(item);
                    count++;
                }
            }
        }

        result.add("results", items);
        result.addProperty("total", items.size());
        response.getWriter().write(GSON.toJson(result));
    }

    private int parseIntParam(SlingHttpServletRequest request,
                              String name, int defaultValue) {
        String value = request.getParameter(name);
        if (value == null) return defaultValue;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
```

Request: `GET /content/myproject/en.search.json?q=news&limit=5`

---

## 6. POST Servlet — Form Submission

```java
package com.myproject.core.servlets;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.myproject.core.services.EmailService;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.HttpConstants;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.apache.sling.servlets.annotations.SlingServletResourceTypes;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.Servlet;
import javax.servlet.ServletException;
import java.io.IOException;

@Component(service = Servlet.class)
@SlingServletResourceTypes(
    resourceTypes = "myproject/components/contactform",
    methods       = HttpConstants.METHOD_POST,
    selectors     = "submit",
    extensions    = "json"
)
public class ContactFormServlet extends SlingAllMethodsServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger LOG = LoggerFactory.getLogger(ContactFormServlet.class);
    private static final Gson GSON = new Gson();

    @Reference
    private EmailService emailService;

    @Override
    protected void doPost(SlingHttpServletRequest request,
                          SlingHttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        JsonObject result = new JsonObject();

        try {
            String name    = request.getParameter("name");
            String email   = request.getParameter("email");
            String message = request.getParameter("message");

            if (StringUtils.isAnyBlank(name, email, message)) {
                sendJson(response, SlingHttpServletResponse.SC_BAD_REQUEST,
                    false, "All fields are required.");
                return;
            }

            emailService.sendContactEmail(name, email, message);
            sendJson(response, SlingHttpServletResponse.SC_OK,
                true, "Thank you for your message.");

        } catch (Exception e) {
            LOG.error("Error processing contact form submission", e);
            sendJson(response, SlingHttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                false, "An internal error occurred.");
        }
    }

    private void sendJson(SlingHttpServletResponse response,
                          int status, boolean success, String message)
            throws IOException {
        response.setStatus(status);
        JsonObject json = new JsonObject();
        json.addProperty("success", success);
        json.addProperty("message", message);
        response.getWriter().write(GSON.toJson(json));
    }
}
```

Request URL: `POST /content/myproject/en/contact/jcr:content/root/container/form.submit.json`

URL hình thành từ: page path + vị trí component trong parsys + selector + extension.

---

## 7. DataSource Servlet — Dynamic Dialog Dropdown

DataSource servlet populate dropdown/select trong component dialog. Không ghi ra response, set vào request attribute.

### Dialog XML

```xml
<category
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/select"
    fieldLabel="Category"
    name="./category">
    <datasource
        jcr:primaryType="nt:unstructured"
        sling:resourceType="/apps/myproject/datasource/categories"/>
</category>
```

### Servlet (hardcoded options)

```java
package com.myproject.core.servlets;

import com.adobe.granite.ui.components.ds.DataSource;
import com.adobe.granite.ui.components.ds.SimpleDataSource;
import com.adobe.granite.ui.components.ds.ValueMapResource;
import com.day.cq.commons.jcr.JcrConstants;
import org.apache.commons.collections4.iterators.TransformIterator;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.ResourceMetadata;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.servlets.HttpConstants;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.apache.sling.api.wrappers.ValueMapDecorator;
import org.apache.sling.servlets.annotations.SlingServletResourceTypes;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

@Component(service = Servlet.class)
@SlingServletResourceTypes(
    methods       = HttpConstants.METHOD_GET,
    resourceTypes = "/apps/myproject/datasource/categories"
)
public class CategoryDataSourceServlet extends SlingSafeMethodsServlet {

    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(SlingHttpServletRequest request,
                         SlingHttpServletResponse response) {

        ResourceResolver resolver = request.getResourceResolver();

        List<String[]> options = Arrays.asList(
            new String[]{ "news",    "News" },
            new String[]{ "blog",    "Blog" },
            new String[]{ "product", "Product" },
            new String[]{ "event",   "Event" }
        );

        DataSource dataSource = new SimpleDataSource(
            new TransformIterator<>(options.iterator(), entry -> {
                HashMap<String, Object> map = new HashMap<>();
                map.put("value", entry[0]);
                map.put("text",  entry[1]);
                return new ValueMapResource(
                    resolver,
                    new ResourceMetadata(),
                    JcrConstants.NT_UNSTRUCTURED,
                    new ValueMapDecorator(map)
                );
            })
        );

        // Set trên request — Granite UI tự đọc, không ghi ra response
        request.setAttribute(DataSource.class.getName(), dataSource);
    }
}
```

### DataSource từ JCR tags

```java
@Override
protected void doGet(SlingHttpServletRequest request,
                     SlingHttpServletResponse response) {

    ResourceResolver resolver = request.getResourceResolver();
    List<String[]> options = new ArrayList<>();

    Resource tagRoot = resolver.getResource(
        "/content/cq:tags/myproject/categories");
    if (tagRoot != null) {
        for (Resource child : tagRoot.getChildren()) {
            String value = child.getName();
            String text  = child.getValueMap().get("jcr:title", child.getName());
            options.add(new String[]{ value, text });
        }
    }

    // build DataSource như trên...
}
```

---

## 8. Validate và Sanitize Input

**Không bao giờ tin tưởng request parameter.**

```java
String path = request.getParameter("path");

// Kiểm tra null và prefix hợp lệ
if (path == null || !path.startsWith("/content/")) {
    response.sendError(SlingHttpServletResponse.SC_BAD_REQUEST, "Invalid path");
    return;
}

// Ngăn path traversal
path = ResourceUtil.normalize(path);
if (path == null) {
    response.sendError(SlingHttpServletResponse.SC_BAD_REQUEST, "Invalid path");
    return;
}

// Kiểm tra resource tồn tại
Resource target = request.getResourceResolver().getResource(path);
if (target == null) {
    response.sendError(SlingHttpServletResponse.SC_NOT_FOUND);
    return;
}
```

---

## 9. CSRF Protection

AEM bảo vệ POST endpoint bằng CSRF token. POST không có token → `403 Forbidden`.

### Lấy token bằng curl

```bash
# 1. Authenticate
curl -u admin:admin -c cookies.txt \
  http://localhost:4502/libs/granite/core/content/login.html

# 2. Lấy CSRF token
TOKEN=$(curl -s -b cookies.txt \
  http://localhost:4502/libs/granite/csrf/token.json | jq -r '.token')

# 3. POST kèm token
curl -b cookies.txt \
  -X POST \
  -H "CSRF-Token: $TOKEN" \
  -d "name=John&email=john@example.com&message=Hello" \
  http://localhost:4502/content/myproject/en/contact/jcr:content/root/container/form.submit.json
```

### Fetch CSRF token trong frontend JavaScript

```javascript
async function submitForm(formData) {
    const tokenRes = await fetch('/libs/granite/csrf/token.json');
    const { token } = await tokenRes.json();

    const response = await fetch(formEndpoint, {
        method: 'POST',
        headers: { 'CSRF-Token': token },
        body: formData
    });
    return response.json();
}
```

---

## 10. Response Helpers

### Streaming binary (PDF, image...)

```java
@Override
protected void doGet(SlingHttpServletRequest request,
                     SlingHttpServletResponse response) throws IOException {

    response.setContentType("application/pdf");
    response.setHeader("Content-Disposition", "attachment; filename=\"report.pdf\"");

    try (InputStream in  = generatePdf();
         OutputStream out = response.getOutputStream()) {
        IOUtils.copy(in, out);
    }
}
```

### Redirect với URL mapping

```java
@Override
protected void doGet(SlingHttpServletRequest request,
                     SlingHttpServletResponse response) throws IOException {

    String targetPath = request.getParameter("target");
    if (StringUtils.isBlank(targetPath)) {
        response.sendError(SlingHttpServletResponse.SC_BAD_REQUEST,
            "Missing target parameter");
        return;
    }

    // Dùng ResourceResolver.map() để áp dụng URL mapping / vanity path
    String mappedUrl = request.getResourceResolver().map(request, targetPath);
    response.sendRedirect(mappedUrl);
}
```

---

## 11. Caching với Dispatcher

### Disable cache cho dynamic endpoint

```java
response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
response.setHeader("Pragma", "no-cache");
response.setDateHeader("Expires", 0);
response.setHeader("Dispatcher", "no-cache");
```

### Cho phép cache dữ liệu ổn định

```java
// 5 phút
response.setHeader("Cache-Control", "public, max-age=300");
```

Cấu hình Dispatcher cho phép cache `.json`:

```text
/cache/rules {
    /0100 { /glob "*.json" /type "allow" }
}
```

---

## 12. Path-based Servlet — Cấu hình Sling Servlet Resolver

Nếu cần dùng path-based servlet trên AEM 6.5, thêm path được phép trong OSGi config:

```json
// org.apache.sling.servlets.resolver.SlingServletResolver.cfg.json
{
    "servletresolver.servletRoot": "/bin",
    "servletresolver.paths": ["/bin/myproject"]
}
```

---

## 13. Khi Nào Dùng Servlet

| Dùng Servlet | Dùng Sling Model | Dùng Filter |
|---|---|---|
| Custom HTTP endpoint (API, webhook) | Cung cấp data cho HTL | Thêm response header |
| Trả về JSON/XML/PDF/CSV | Render component logic | Log request/response |
| Xử lý POST/PUT/DELETE | Đọc JCR cho template | Wrapping/transform response |
| DataSource cho dialog dropdown | | |

---

## 14. Best Practices

- Luôn set `Content-Type` và `charset` trước khi write response
- Không close `ResourceResolver` của request — Sling engine quản lý lifecycle
- Validate + normalize tất cả path parameter trước khi `resolver.getResource()`
- Bắt exception ở mức servlet, log đầy đủ, trả HTTP status code nghĩa lý
- Không expose internal stack trace hoặc path info trong response body
- Ưu tiên resource-type registration, giới hạn path-based trong `/bin/`
- `SlingSafeMethodsServlet` cho GET-only, `SlingAllMethodsServlet` chỉ khi cần write

---

## Tham Khảo

- [Sling Servlet Annotations](https://sling.apache.org/documentation/the-sling-engine/servlets.html)
- [Sling API Javadoc](https://sling.apache.org/apidocs/sling11/)
