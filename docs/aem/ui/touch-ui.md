# Touch UI (Author UI) trong AEM 6.5

> Nguồn học chính: [Touch UI | Luca Nerlich](https://lucanerlich.com/aem/ui/touch-ui/).
> Note này viết lại bằng tiếng Việt để mình đọc, ôn và áp dụng cho AEM 6.5 on-premise.

## Ý chính cần nhớ

**Touch UI** là giao diện authoring hiện đại của AEM, thay thế Classic UI. Tên chính thức hiện tại là **Author UI** (từng được gọi là TouchUI trước đây).

Touch UI bao gồm toàn bộ giao diện tác giả: page editor, Sites console, DAM console, component dialogs và các admin tools. Nó được xây dựng dựa trên **Granite UI** (server-side) và **Coral UI 3** (client-side).

```text
Classic UI (ExtJS) → đã deprecated, không dùng nữa
Touch UI / Author UI → giao diện mặc định và duy nhất được support trong AEM 6.5
```

> **Quan trọng:** Adobe đã completely remove Classic UI trong AEM 6.5. Không còn option chuyển đổi sang Classic UI. Mọi custom UI phải build cho Touch UI.

---

## Kiến trúc Touch UI

Touch UI chia thành các layer rõ ràng:

| Layer | Công nghệ | Vai trò |
|---|---|---|
| **Granite UI** | Server-side Sling | Render HTML markup từ dialog XML, cung cấp container và form logic |
| **Coral UI 3** | Client-side Web Components | Cung cấp interactive widgets: buttons, dialogs, tables, tabs... |
| **Author JS API** | Client-side (Granite.author) | Cung cấp API cho page editor, editable toolbar, drag-and-drop |

Cách làm việc:
1. Dialog XML (`_cq_dialog/.content.xml`) định nghĩa cấu trúc UI bằng Granite UI resource types.
2. Granite UI render server-side thành HTML với Coral classes.
3. Coral UI JavaScript enhance HTML thành interactive components trong browser.

---

## Thêm Styles Plugin vào RTE

### Styles Plugin là gì

RTE Styles Plugin cho phép author áp dụng CSS class lên một đoạn text được chọn. AEM sẽ wrap selection bằng một tag (thường là `&lt;span&gt;`) với class được định nghĩa.

```html
<span class="p1">đoạn text được chọn</span>
```

Use case phổ biến:
- Highlight text với màu/font riêng
- Tạo các paragraph styles (lead, caption, disclaimer)
- Định nghĩa inline styles mà không cần nhớ class name

### Cách cấu hình

Ví dụ dưới đây extend **Text Core Component v2** (`core/wcm/components/text/v2/text`), sử dụng Sling Resource Merger để kế thừa dialog gốc và chỉ thêm Styles Plugin.

#### Bước 1: Tạo component extend Text Core Component

**File:** `ui.apps/.../apps/myproject/components/text/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="cq:Component"
    jcr:title="Text with Styles"
    sling:resourceSuperType="core/wcm/components/text/v2/text"
    componentGroup="content"/>
```

#### Bước 2: Overlay dialog và thêm styles node

**File:** `ui.apps/.../apps/myproject/components/text/_cq_dialog/.content.xml`

Vì component extends Text Core Component, Sling Resource Merger sẽ tự động pull in các nodes từ dialog gốc (`/libs/core/wcm/components/text/v2/text/_cq_dialog/.content.xml`). Mình chỉ cần thêm nodes liên quan đến Styles Plugin.

Có 3 chỗ cần sửa trong dialog XML:

**1. Thêm `styles` node vào `rtePlugins`**

```xml
<rtePlugins jcr:primaryType="nt:unstructured">
    <styles
        jcr:primaryType="nt:unstructured"
        features="*">
        <styles jcr:primaryType="cq:WidgetCollection">
            <p1
                jcr:primaryType="nt:unstructured"
                cssName="p1"
                text="Paragraph Lead"/>
            <p2
                jcr:primaryType="nt:unstructured"
                cssName="p2"
                text="Caption"/>
            <p3
                jcr:primaryType="nt:unstructured"
                cssName="p3"
                text="Disclaimer"/>
        </styles>
    </styles>
</rtePlugins>
```

| Property | Ý nghĩa |
|---|---|
| `cssName` | Tên CSS class được apply |
| `text` | Label hiển thị trong dropdown |
| `features="*"` | Bật toàn bộ features của styles plugin |

**2. Thêm `#styles` vào inline toolbar**

```xml
<inline
    jcr:primaryType="nt:unstructured"
    toolbar="[format#bold,format#italic,format#underline,#justify,#lists,links#modifylink,links#unlink,#paraformat,#styles]">
</inline>
```

> `#styles` phải xuất hiện trong toolbar array. Nếu thiếu, button styles sẽ không hiển thị.

**3. Thêm styles vào popovers node**

```xml
<popovers jcr:primaryType="nt:unstructured">
    <styles
        jcr:primaryType="nt:unstructured"
        items="styles:getStyles:styles-pulldown"
        ref="styles"/>
</popovers>
```

`items="styles:getStyles:styles-pulldown"` định nghĩa command để load styles list và dạng UI là dropdown (pulldown).

#### Bước 3: Full dialog XML example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:granite="http://www.adobe.com/jcr/granite/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="nt:unstructured"
    jcr:title="Text with Styles"
    helpPath="https://www.aemcomponents.dev/content/core-components-examples/library/page-authoring/text.html"
    sling:resourceType="cq/gui/components/authoring/dialog">

    <content
        jcr:primaryType="nt:unstructured"
        sling:resourceType="granite/ui/components/coral/foundation/container">
        <items jcr:primaryType="nt:unstructured">
            <tabs
                jcr:primaryType="nt:unstructured"
                sling:resourceType="granite/ui/components/coral/foundation/tabs"
                maximized="{Boolean}true">
                <items jcr:primaryType="nt:unstructured">
                    <properties
                        jcr:primaryType="nt:unstructured"
                        jcr:title="Properties"
                        sling:resourceType="granite/ui/components/coral/foundation/container"
                        margin="{Boolean}true">
                        <items jcr:primaryType="nt:unstructured">
                            <columns
                                jcr:primaryType="nt:unstructured"
                                sling:resourceType="granite/ui/components/coral/foundation/fixedcolumns"
                                margin="{Boolean}true">
                                <items jcr:primaryType="nt:unstructured">
                                    <column
                                        jcr:primaryType="nt:unstructured"
                                        granite:class="cq-RichText-FixedColumn-column"
                                        sling:resourceType="granite/ui/components/coral/foundation/container">
                                        <items
                                            jcr:primaryType="nt:unstructured"
                                            sling:hideChildren="[id]">
                                            <text
                                                jcr:primaryType="nt:unstructured"
                                                sling:resourceType="cq/gui/components/authoring/dialog/richtext"
                                                name="./text"
                                                useFixedInlineToolbar="{Boolean}true">
                                                <rtePlugins jcr:primaryType="nt:unstructured">
                                                    <styles
                                                        jcr:primaryType="nt:unstructured"
                                                        features="*">
                                                        <styles jcr:primaryType="cq:WidgetCollection">
                                                            <p1
                                                                jcr:primaryType="nt:unstructured"
                                                                cssName="p1"
                                                                text="P1"/>
                                                            <p2
                                                                jcr:primaryType="nt:unstructured"
                                                                cssName="p2"
                                                                text="P2"/>
                                                            <p3
                                                                jcr:primaryType="nt:unstructured"
                                                                cssName="p3"
                                                                text="P3"/>
                                                        </styles>
                                                    </styles>
                                                </rtePlugins>
                                                <uiSettings jcr:primaryType="nt:unstructured">
                                                    <cui jcr:primaryType="nt:unstructured">
                                                        <inline
                                                            jcr:primaryType="nt:unstructured"
                                                            toolbar="[format#bold,format#italic,format#underline,#justify,#lists,links#modifylink,links#unlink,#paraformat,#styles]">
                                                            <popovers jcr:primaryType="nt:unstructured">
                                                                <styles
                                                                    jcr:primaryType="nt:unstructured"
                                                                    items="styles:getStyles:styles-pulldown"
                                                                    ref="styles"/>
                                                            </popovers>
                                                        </inline>
                                                        <dialogFullScreen
                                                            jcr:primaryType="nt:unstructured"
                                                            toolbar="[format#bold,format#italic,format#underline,#justify,#lists,links#modifylink,links#unlink,#paraformat,#styles]">
                                                            <popovers jcr:primaryType="nt:unstructured">
                                                                <justify
                                                                    jcr:primaryType="nt:unstructured"
                                                                    items="[justify#justifyleft,justify#justifycenter,justify#justifyright,justify#justifyjustify]"
                                                                    ref="justify"/>
                                                                <lists
                                                                    jcr:primaryType="nt:unstructured"
                                                                    items="[lists#unordered,lists#ordered,lists#outdent,lists#indent]"
                                                                    ref="lists"/>
                                                                <paraformat
                                                                    jcr:primaryType="nt:unstructured"
                                                                    items="paraformat:getFormats:paraformat-pulldown"
                                                                    ref="paraformat"/>
                                                                <styles
                                                                    jcr:primaryType="nt:unstructured"
                                                                    items="styles:getStyles:styles-pulldown"
                                                                    ref="styles"/>
                                                            </popovers>
                                                        </dialogFullScreen>
                                                    </cui>
                                                </uiSettings>
                                            </text>
                                        </items>
                                    </column>
                                </items>
                            </columns>
                        </items>
                    </properties>
                </items>
            </tabs>
        </items>
    </content>
</jcr:root>
```

> **Lưu ý:** Sử dụng `sling:hideChildren="[id]"` để ẩn field `id` từ parent dialog nếu không cần. Các nodes khác từ Text Core Component dialog được tự động merge nhờ Sling Resource Merger.

#### Bước 4: Định nghĩa CSS cho styles

Các class (`p1`, `p2`, `p3`) phải được định nghĩa trong CSS của site. Thường đặt trong:
- Clientlib của component
- Global site clientlib
- Editor-specific clientlib (nếu muốn preview styles trong RTE)

**Ví dụ CSS:**

```css
.p1 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
}

.p2 {
    font-size: 0.875rem;
    font-style: italic;
    color: #666;
}

.p3 {
    font-size: 0.75rem;
    color: #999;
}
```

#### Bước 5: Load CSS trong editor (tùy chọn nhưng nên làm)

Để author thấy styles applied trong RTE khi edit, load CSS qua RTE `cssName` hoặc inline styles config. Cách phổ biến là đảm bảo site CSS được load trong page editor context.

---

## Checklist cấu hình RTE Styles Plugin

1. [ ] Component có `sling:resourceSuperType` pointing đúng đến Text Core Component (hoặc component có RTE dialog)
2. [ ] Dialog path `_cq_dialog/.content.xml` đúng cấu trúc
3. [ ] `rtePlugins/styles` node có `features="*"` và child `styles` widget collection
4. [ ] Mỗi style có `cssName` và `text` hợp lệ
5. [ ] Inline toolbar có `#styles` trong toolbar array
6. [ ] Fullscreen toolbar cũng có `#styles` trong toolbar array
7. [ ] `popovers/styles` node có `items="styles:getStyles:styles-pulldown"` và `ref="styles"`
8. [ ] CSS classes được define trong site/clientlib styles
9. [ ] Deploy và test trên local AEM instance

---

## Touch UI vs Classic UI (cho reference)

| Aspect | Classic UI | Touch UI / Author UI |
|---|---|---|
| Framework | ExtJS (Sencha) | Granite UI + Coral UI 3 |
| Page editor | WCM Edit | Touch-optimized editor |
| Dialogs | ExtJS dialogs | Coral UI dialogs (`_cq_dialog`) |
| Component browser | Sidekick | Left rail panel |
| Responsive | Không | Có (responsive grid) |
| Status | **Removed in AEM 6.5** | Default và duy nhất |
| Custom UI | ExtJS widgets | Coral UI web components |

---

## Xem thêm

- **[Coral UI](./coral-ui.md)** - Web components và Granite UI fields
- **[Overlays](./overlays.md)** - Custom UI có sẵn của AEM
- **Component Dialogs** - Dialog field types và cấu trúc XML
- **Client Libraries** - Load JS/CSS cho authoring
- **Custom Component Guide** - Xây dựng component với dialog

---

## Tài liệu tham khảo

- [Touch UI | Luca Nerlich](https://lucanerlich.com/aem/ui/touch-ui/)
- [AEM 6.5 Author UI Documentation](https://experienceleague.adobe.com/docs/experience-manager-65/content/sites/authoring/introduction.html)
- [Configure RTE in Touch UI](https://experienceleague.adobe.com/docs/experience-manager-65/content/implementing/developing/extending-aem/configure-rich-text-editor-plug-ins.html)
- [Text Core Component Dialog](https://github.com/adobe/aem-core-wcm-components/blob/master/content/src/content/jcr_root/apps/core/wcm/components/text/v2/text/_cq_dialog/.content.xml)
- [Sling Resource Merger](https://experienceleague.adobe.com/docs/experience-manager-65/developing/platform/sling-resource-merger.html)
