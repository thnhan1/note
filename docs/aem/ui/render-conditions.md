# Render Conditions trong AEM 6.5

> Nguồn học chính: [Render Conditions | Luca Nerlich](https://lucanerlich.com/aem/ui/render-conditions/).
> Note này viết lại bằng tiếng Việt để mình ôn và áp dụng cho AEM 6.5 on-premise.

## Ý chính cần nhớ

**Render Condition** là cơ chế kiểm soát xem một element trong Granite UI (dialog field, tab, toolbar button, hay bất kỳ widget nào) có được render hay không. Evaluation diễn ra **server-side trước khi HTML được gửi về browser** — element bị ẩn sẽ không bao giờ xuất hiện trong DOM.

Đây là cơ chế chính cho:
- Show/hide dialog field dựa trên group membership của user
- Ẩn/hiện tab hoặc field dựa trên content path hoặc độ sâu của path
- Ẩn author-only controls trên Publish instance
- Giới hạn UI element theo run mode, permissions, hoặc business logic tuỳ chỉnh

> **Quan trọng:** Render conditions khác với `showhide` client-side. Client-side chỉ ẩn DOM element — vẫn có thể reveal bằng DevTools. Render conditions ẩn element trước khi HTML được tạo ra — an toàn hơn cho fields nhạy cảm.

---

## Cơ chế hoạt động

```text
Dialog XML node
    └── granite:rendercondition
            └── sling:resourceType → Sling Servlet evaluate condition
                                          ↓
                        request.setAttribute(RenderCondition, SimpleRenderCondition(true/false))
                                          ↓
                        Granite UI framework đọc attribute → render hoặc skip element
```

Các bước cụ thể:

1. Bất kỳ Granite UI element nào cũng có thể chứa child node `granite:rendercondition`.
2. `sling:resourceType` của node đó trỏ tới một Sling Servlet để evaluate.
3. Servlet set `SimpleRenderCondition(true/false)` vào request attribute với key `RenderCondition.class.getName()`.
4. Granite UI framework đọc attribute đó và quyết định render hay bỏ qua element.

### API classes quan trọng

| Class | Vai trò |
|---|---|
| `com.adobe.granite.ui.components.rendercondition.RenderCondition` | Interface, dùng làm key cho request attribute |
| `com.adobe.granite.ui.components.rendercondition.SimpleRenderCondition` | Triển khai đơn giản, nhận `boolean` |
| `com.adobe.granite.ui.components.Config` | Đọc property từ XML node của render condition |

---

## Built-in Render Conditions

AEM cung cấp sẵn một số render conditions không cần viết Java code. Tất cả nằm dưới base path:

```text
granite/ui/components/coral/foundation/renderconditions/
```

### User permissions (`privilege`)

Hiện element chỉ khi user có quyền cụ thể trên một resource:

```xml
<granite:rendercondition
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/renderconditions/privilege"
    path="${requestPathInfo.suffix}"
    privileges="[rep:write]"/>
```

`path` thường là `$\{requestPathInfo.suffix\}` — path của content đang được edit (AEM truyền qua URL suffix khi mở dialog).

### Group membership (`group`)

Hiện element chỉ khi user thuộc group được chỉ định:

```xml
<granite:rendercondition
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/renderconditions/group"
    groups="[administrators,content-authors]"
    matchAll="{Boolean}false"/>
```

| Property | Type | Ý nghĩa |
|---|---|---|
| `groups` | `String[]` | Danh sách group IDs |
| `matchAll` | `Boolean` | `true` = user phải thuộc **tất cả** groups; `false` (default) = thuộc **ít nhất một** là đủ |

### Simple expression (`simple`)

Evaluate một EL expression đơn giản:

```xml
<granite:rendercondition
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/renderconditions/simple"
    expression="${requestPathInfo.suffix != null}"/>
```

### AND / OR kết hợp nhiều conditions

Khi cần kết hợp nhiều điều kiện:

**AND — tất cả điều kiện phải đúng:**

```xml
<granite:rendercondition
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/renderconditions/and">

    <condition1
        jcr:primaryType="nt:unstructured"
        sling:resourceType="granite/ui/components/coral/foundation/renderconditions/privilege"
        path="${requestPathInfo.suffix}"
        privileges="[rep:write]"/>

    <condition2
        jcr:primaryType="nt:unstructured"
        sling:resourceType="granite/ui/components/coral/foundation/renderconditions/group"
        groups="[content-authors]"/>
</granite:rendercondition>
```

**OR — ít nhất một điều kiện đúng:**

```xml
<granite:rendercondition
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/renderconditions/or">

    <condition1
        jcr:primaryType="nt:unstructured"
        sling:resourceType="granite/ui/components/coral/foundation/renderconditions/group"
        groups="[administrators]"/>

    <condition2
        jcr:primaryType="nt:unstructured"
        sling:resourceType="granite/ui/components/coral/foundation/renderconditions/group"
        groups="[super-authors]"/>
</granite:rendercondition>
```

### Bảng tham chiếu built-in conditions

| Resource type (suffix) | Mô tả |
|---|---|
| `renderconditions/privilege` | Kiểm tra JCR privilege của user |
| `renderconditions/group` | Kiểm tra group membership |
| `renderconditions/simple` | EL expression đơn giản |
| `renderconditions/and` | Tất cả child conditions phải true |
| `renderconditions/or` | Ít nhất một child condition true |
| `renderconditions/not` | Đảo ngược kết quả của child condition |
| `renderconditions/emptytext` | Kiểm tra một field có giá trị hay không |

---

## Custom Render Conditions

Khi built-in conditions không đủ, viết custom render condition servlet.

### Sling Servlet

Servlet đầy đủ với OSGi injection, testable, là cách hiện đại và recommended:

**File:** `core/src/main/java/com/myproject/core/servlets/GroupRenderConditionServlet.java`

```java
package com.myproject.core.servlets;

import com.adobe.granite.ui.components.Config;
import com.adobe.granite.ui.components.rendercondition.RenderCondition;
import com.adobe.granite.ui.components.rendercondition.SimpleRenderCondition;
import org.apache.jackrabbit.api.JackrabbitSession;
import org.apache.jackrabbit.api.security.user.Authorizable;
import org.apache.jackrabbit.api.security.user.Group;
import org.apache.jackrabbit.api.security.user.UserManager;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import javax.jcr.Session;
import javax.servlet.Servlet;
import javax.servlet.ServletException;
import java.util.Iterator;

@Component(
    service = Servlet.class,
    property = {
        "sling.servlet.resourceTypes=" + GroupRenderConditionServlet.RESOURCE_TYPE,
        "sling.servlet.methods=GET"
    }
)
public class GroupRenderConditionServlet extends SlingSafeMethodsServlet {

    private static final Logger LOG = LoggerFactory.getLogger(GroupRenderConditionServlet.class);

    // Virtual resource type — không cần file vật lý trên disk, chỉ dùng trong dialog XML
    static final String RESOURCE_TYPE = "myproject/renderconditions/group-check";

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws ServletException {
        boolean shouldRender = false;

        // Đọc config từ node XML của render condition
        Resource conditionResource = request.getResource();
        Config config = new Config(conditionResource);
        String requiredGroup = config.get("group", String.class);

        if (requiredGroup != null) {
            shouldRender = isUserInGroup(request, requiredGroup);
        }

        request.setAttribute(
            RenderCondition.class.getName(),
            new SimpleRenderCondition(shouldRender)
        );
    }

    private boolean isUserInGroup(SlingHttpServletRequest request, String groupName) {
        try {
            Session session = request.getResourceResolver().adaptTo(Session.class);
            if (session instanceof JackrabbitSession) {
                UserManager userManager = ((JackrabbitSession) session).getUserManager();
                Authorizable currentUser = userManager.getAuthorizable(session.getUserID());
                if (currentUser != null) {
                    Iterator<Group> groups = currentUser.memberOf();
                    while (groups.hasNext()) {
                        if (groups.next().getID().equals(groupName)) {
                            return true;
                        }
                    }
                }
            }
        } catch (RepositoryException e) {
            LOG.error("Error checking group membership", e);
        }
        return false;
    }
}
```

**Dùng trong dialog XML:**

```xml
<myField
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
    fieldLabel="Admin-only field"
    name="./adminNote">

    <granite:rendercondition
        jcr:primaryType="nt:unstructured"
        sling:resourceType="myproject/renderconditions/group-check"
        group="administrators"/>
</myField>
```

---

## Truyền config vào Render Condition

Dùng class `Config` để đọc property từ node `granite:rendercondition` trong XML. Mọi property đặt trên node đó đều có thể đọc được:

**XML:**

```xml
<granite:rendercondition
    jcr:primaryType="nt:unstructured"
    sling:resourceType="myproject/renderconditions/custom-check"
    group="content-authors"
    minDepth="{Long}3"
    allowedPaths="[/content/myproject,/content/dam/myproject]"
    enabled="{Boolean}true"/>
```

**Java (trong Servlet):**

```java
Config config = new Config(request.getResource());

String group      = config.get("group", String.class);          // "content-authors"
Long minDepth     = config.get("minDepth", Long.class);         // 3
String[] paths    = config.get("allowedPaths", new String[0]);  // ["/content/myproject", ...]
Boolean enabled   = config.get("enabled", Boolean.class);       // true
```

**Type hints trong XML:**

| Syntax | Kiểu Java |
|---|---|
| `\{Long\}3` | `Long` |
| `\{Boolean\}true` | `Boolean` |
| `[val1,val2]` | `String[]` |
| Không có hint | `String` |

---

## Practical Examples

### Hiện field chỉ trên content pages (không phải template)

```java
@Component(
    service = Servlet.class,
    property = {
        "sling.servlet.resourceTypes=myproject/renderconditions/content-page-only",
        "sling.servlet.methods=GET"
    }
)
public class ContentPageRenderCondition extends SlingSafeMethodsServlet {

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws ServletException {
        String contentPath = request.getRequestPathInfo().getSuffix();

        // Hiện trên content pages (/content/...), ẩn trên template structure (/conf/...)
        boolean isContentPage = contentPath != null
            && contentPath.startsWith("/content/")
            && !contentPath.contains("/conf/");

        request.setAttribute(
            RenderCondition.class.getName(),
            new SimpleRenderCondition(isContentPage)
        );
    }
}
```

### Hiện tab chỉ cho component types cụ thể

```java
@Component(
    service = Servlet.class,
    property = {
        "sling.servlet.resourceTypes=myproject/renderconditions/resource-type-check",
        "sling.servlet.methods=GET"
    }
)
public class ResourceTypeRenderCondition extends SlingSafeMethodsServlet {

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws ServletException {
        Config config = new Config(request.getResource());
        String[] allowedTypes = config.get("allowedResourceTypes", new String[0]);
        String contentPath = request.getRequestPathInfo().getSuffix();
        boolean shouldRender = false;

        if (contentPath != null && allowedTypes.length > 0) {
            Resource contentResource = request.getResourceResolver().getResource(contentPath);
            if (contentResource != null) {
                String resourceType = contentResource.getResourceType();
                for (String allowed : allowedTypes) {
                    if (allowed.equals(resourceType)) {
                        shouldRender = true;
                        break;
                    }
                }
            }
        }

        request.setAttribute(
            RenderCondition.class.getName(),
            new SimpleRenderCondition(shouldRender)
        );
    }
}
```

**Dùng trong dialog:**

```xml
<advancedTab
    jcr:primaryType="nt:unstructured"
    jcr:title="Advanced"
    sling:resourceType="granite/ui/components/coral/foundation/container">

    <granite:rendercondition
        jcr:primaryType="nt:unstructured"
        sling:resourceType="myproject/renderconditions/resource-type-check"
        allowedResourceTypes="[myproject/components/hero,myproject/components/teaser]"/>

    <items jcr:primaryType="nt:unstructured">
        <!-- fields chỉ hiện cho hero và teaser -->
    </items>
</advancedTab>
```

### Hiện field theo WCM Mode

```java
@Component(
    service = Servlet.class,
    property = {
        "sling.servlet.resourceTypes=myproject/renderconditions/wcm-mode",
        "sling.servlet.methods=GET"
    }
)
public class WcmModeRenderCondition extends SlingSafeMethodsServlet {

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws ServletException {
        Config config = new Config(request.getResource());
        String[] allowedModes = config.get("modes", new String[]{"EDIT"});
        WCMMode currentMode = WCMMode.fromRequest(request);
        boolean shouldRender = false;

        for (String mode : allowedModes) {
            if (currentMode.name().equalsIgnoreCase(mode)) {
                shouldRender = true;
                break;
            }
        }

        request.setAttribute(
            RenderCondition.class.getName(),
            new SimpleRenderCondition(shouldRender)
        );
    }
}
```

### Feature flag từ OSGi config

Combine render condition với OSGi service để làm feature flags:

```java
@Component(
    service = Servlet.class,
    property = {
        "sling.servlet.resourceTypes=myproject/renderconditions/feature-flag",
        "sling.servlet.methods=GET"
    }
)
public class FeatureFlagRenderCondition extends SlingSafeMethodsServlet {

    @Reference
    private FeatureFlagService featureFlagService;

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws ServletException {
        Config config = new Config(request.getResource());
        String featureName = config.get("feature", String.class);
        boolean shouldRender = featureName != null && featureFlagService.isEnabled(featureName);

        request.setAttribute(
            RenderCondition.class.getName(),
            new SimpleRenderCondition(shouldRender)
        );
    }
}
```

**Dùng trong dialog:**

```xml
<experimentalField
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
    fieldLabel="Experimental Feature"
    name="./experimentalValue">

    <granite:rendercondition
        jcr:primaryType="nt:unstructured"
        sling:resourceType="myproject/renderconditions/feature-flag"
        feature="enable-experimental-dialog"/>
</experimentalField>
```

---

## Áp dụng Render Conditions ở đâu

Render conditions hoạt động trên **bất kỳ Granite UI element nào**, không chỉ form fields:

| Element | Đặt `granite:rendercondition` trên |
|---|---|
| Dialog field | Node của field (`textfield`, `select`, ...) |
| Dialog tab | Node của tab container |
| Toàn bộ dialog | Node `content` (hiếm dùng) |
| Toolbar button | Node của button trong toolbar definition |
| Admin console item | Node item trong console structure |
| Navigation item | Node overlay trong `/apps/cq/core/content/nav` |

### Ví dụ: Ẩn toàn bộ tab với group condition

```xml
<tabs
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/tabs">
    <items jcr:primaryType="nt:unstructured">

        <!-- Tab luôn hiện -->
        <general
            jcr:primaryType="nt:unstructured"
            jcr:title="General"
            sling:resourceType="granite/ui/components/coral/foundation/container">
            <items jcr:primaryType="nt:unstructured">
                <!-- ... general fields ... -->
            </items>
        </general>

        <!-- Tab chỉ hiện cho administrators -->
        <advanced
            jcr:primaryType="nt:unstructured"
            jcr:title="Advanced"
            sling:resourceType="granite/ui/components/coral/foundation/container">

            <granite:rendercondition
                jcr:primaryType="nt:unstructured"
                sling:resourceType="granite/ui/components/coral/foundation/renderconditions/group"
                groups="[administrators]"/>

            <items jcr:primaryType="nt:unstructured">
                <!-- ... admin-only fields ... -->
            </items>
        </advanced>

    </items>
</tabs>
```

---

## Render Conditions vs các cách ẩn/hiện khác

| Cách | Khi nào dùng | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **Render Conditions** | Ẩn field nhạy cảm theo user/permission | Server-side, an toàn, không thể bypass | Cần deploy Java code |
| **`data-sly-test`** (HTL) | Ẩn element trong component template | Đơn giản, inline trong HTL | Chỉ dùng khi render component, không dùng trong dialog |
| **`showhide` (client JS)** | Ẩn/hiện field dựa trên giá trị field khác | Reactive, không cần server | Không an toàn — có thể bypass bằng DevTools |
| **`sling:hideResource`** | Ẩn element UI cố định qua Overlay | Không cần code, chỉ cần JCR | Ẩn với mọi user, không conditional |

> **Quy tắc:** Nếu field ẩn vì lý do **bảo mật hoặc permission** → dùng Render Conditions. Nếu ẩn vì **UX/flow** (ví dụ: field A chỉ hiện khi chọn giá trị X ở field B) → dùng `showhide` client-side.

---

## Best practices

### 1. Dùng built-in conditions trước

Trước khi viết custom servlet, kiểm tra `privilege`, `group`, `simple`, `and/or/not` có cover nhu cầu chưa. Built-in conditions không cần code, không cần deploy.

### 2. Giữ condition logic nhanh

Render conditions chạy trong quá trình render dialog. Logic chậm (gọi external API, query JCR phức tạp) sẽ làm dialog mở chậm. Nếu cần, cache kết quả trong OSGi service hoặc precompute.

### 3. Dùng virtual resource types

`sling:resourceType` của render condition servlet không cần file vật lý trên disk. Đây là virtual identifier do Sling servlet registration resolve. Không cần tạo node dưới `/apps` cho resource type này.

```text
Không cần:  /apps/myproject/renderconditions/group-check/.content.xml
Chỉ cần:    @Component property "sling.servlet.resourceTypes=myproject/renderconditions/group-check"
```

### 4. Test bằng AEM Mocks

```java
@ExtendWith(AemContextExtension.class)
class GroupRenderConditionServletTest {

    private final AemContext context = new AemContext();

    @Test
    void shouldRenderForAdministrators() throws Exception {
        context.create().resource("/apps/test/rendercondition",
            "sling:resourceType", "myproject/renderconditions/group-check",
            "group", "administrators");
        context.currentResource("/apps/test/rendercondition");

        GroupRenderConditionServlet servlet = new GroupRenderConditionServlet();
        servlet.doGet(context.request(), context.response());

        RenderCondition condition = (RenderCondition) context.request()
            .getAttribute(RenderCondition.class.getName());
        assertNotNull(condition);
    }
}
```

### 5. Document render conditions

Render conditions "vô hình" với author — nếu field không hiện, họ không biết tại sao. Nên:
- Thêm `fieldDescription` giải thích tại sao field bị ẩn trong một số trường hợp.
- Ghi chú trong project docs: condition nào kiểm soát element nào, group/permission nào được phép.

---

## Pitfalls thường gặp

| Vấn đề | Nguyên nhân / Cách xử lý |
|---|---|
| Field không bao giờ hiện, kể cả admin | Sai `sling:resourceType` — kiểm tra servlet đã registered chưa bằng `/system/console/servletresolver` |
| `requestPathInfo.suffix` trả về `null` | Dialog không được mở qua URL có suffix (ví dụ: mở trực tiếp không qua page editor) |
| `@Reference` trong servlet không inject được | Servlet không được OSGi resolve đúng — kiểm tra `@Component` annotation và bundle active |
| `showhide` client-side không ẩn đủ | Không dùng showhide cho field nhạy cảm; phải dùng render condition server-side |
| Condition không có tác dụng sau deploy | Clear cache `/libs/granite/ui/content/dumplibs.rebuild.html` và restart bundle nếu cần |
| `Config.get()` trả về `null` khi có value | Sai type — dùng đúng Java type tương ứng với hint trong XML (`\{Long\}`, `\{Boolean\}`) |
| Condition chậm làm dialog lag | Logic trong condition quá nặng (query JCR, external call) — cache kết quả hoặc refactor |

---

## Checklist khi implement thật

1. [ ] Xác định loại condition: built-in (group/privilege/simple) hay cần custom.
2. [ ] Nếu built-in đủ: thêm node `granite:rendercondition` trực tiếp vào dialog XML.
3. [ ] Nếu cần custom: tạo Sling Servlet với `sling.servlet.resourceTypes` = virtual resource type.
4. [ ] Đọc config từ XML node bằng `Config` class trong servlet.
5. [ ] Set `request.setAttribute(RenderCondition.class.getName(), new SimpleRenderCondition(bool))`.
6. [ ] Reference `sling:resourceType` trong dialog XML `granite:rendercondition` node.
7. [ ] Deploy, mở dialog trong author, test với user thuộc group có quyền và không có quyền.
8. [ ] Verify qua `/system/console/servletresolver` nếu condition không hoạt động.
9. [ ] Viết unit test bằng AEM Mocks.

---

## See also

- [Coral UI](./coral-ui.md) - Web components và Granite UI fields
- [Overlays](./overlays.md) - Custom UI có sẵn của AEM
- [Touch UI](./touch-ui-2.md) - Author UI architecture và RTE customisation
- Component dialogs - Dialog field types và XML structure
- Client libraries - Loading JS/CSS

---

## Tài liệu tham khảo

- [Render Conditions | Luca Nerlich](https://lucanerlich.com/aem/ui/render-conditions/)
- [Granite UI Render Conditions (AEM 6.5)](https://experienceleague.adobe.com/docs/experience-manager-65/developing/extending-aem/granite-ui.html)
- [Sling Servlet Resolver](http://localhost:4502/system/console/servletresolver)
