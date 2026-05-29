---
title: Granite Shell + Vue + JCR Scaffolding — Schema-driven Admin Portal
description: Phân tích kiến trúc admin portal AEM dùng Granite UI shell làm khung trang, Vue 2 SPA mount bên trong, và XML scaffolding ở JCR làm schema để render form động.
---

# Granite Shell + Vue + JCR Scaffolding

## TL;DR

| Layer | Công nghệ | Vai trò |
| --- | --- | --- |
| Page chrome | `granite/ui/components/shell/collectionpage` | Header, nav, breadcrumb của AEM admin |
| Page renderer | JSP (`edit-page.jsp`) | Đọc OSGi config + page properties → render `<div id="app">` + clientlib |
| Page descriptor | `cq:Page` ở `/apps/.../pages/edit-property` | Khai báo `data_path`, `meta_path`, `edit_path`, `pageURITemplate`... |
| Form schema | XML ở `/etc/.../scaffolding/<entity>/.content.xml` | Mô tả field → type → datasource → validation |
| Renderer | Vue 2 + Vuetify SPA | Đọc schema JSON, map `_x0040_type` → component, render form |
| Data | Sling Servlet / `.json` GET-POST | CRUD JCR node ở `data_path` |

Đây là **schema-driven UI**: muốn thêm/đổi field trong form, chỉ cần sửa XML scaffolding, **không build lại Vue**.

---

## 1. Layer 1 — Granite UI shell (page chrome)

### `edit-page/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
    jcr:primaryType="cq:Component"
    jcr:title="Edit Page"
    sling:resourceSuperType="granite/ui/components/shell/collectionpage"/>
```

`sling:resourceSuperType=granite/ui/components/shell/collectionpage` ⇒ component thừa kế **toàn bộ HTML của console page AEM** (giống `/sites`, `/assets`): header bar, rail nav, breadcrumb, omnisearch, action bar.

Không có template HTML riêng. Cái `<body>` của trang được Granite render. JSP chỉ override một số phần (head, content area).

### `edit-page.jsp`

```html
<%@page import="java.util.Date"%>
<%@include file="/libs/granite/ui/global.jsp" %>
<%@page session="false"
    import="com.adobe.granite.i18n.LocaleUtil,
            com.adobe.granite.ui.components.AttrBuilder,
            com.adobe.granite.ui.components.Config,
            org.apache.commons.collections.IteratorUtils,
            org.apache.sling.resourcemerger.api.ResourceMergerService,
            java.util.Iterator,
            java.util.List,
            java.util.Dictionary,
            com.google.gson.Gson"%>
<!DOCTYPE html>
<html>
<head>
<%
    Config cfg = cmp.getConfig();
    org.osgi.service.cm.ConfigurationAdmin configAdmin =
        sling.getService(org.osgi.service.cm.ConfigurationAdmin.class);
    org.osgi.service.cm.Configuration configuration =
        configAdmin.getConfiguration("com.capitaland.ascott.commons.services.impl.SyncLanguagesConfig");
    Dictionary<String, Object> configProperties = configuration.getProperties();
    String[] syncLanguages = new String[0];
    if (configProperties != null) {
        syncLanguages = (String[]) configProperties.get("sync.languages");
    }
    Gson gson = new Gson();
    String syncLanguagesJson = gson.toJson(syncLanguages);
%>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<link href="/apps/ascott/admin-portal-mysite/clientlibs/clientlib-site/css/app.vue.css" rel="stylesheet">
<link rel="shortcut icon" href="<%= request.getContextPath() %>/libs/granite/core/content/login/favicon.ico">
<link rel="stylesheet" href="/apps/ascott/admin-portal-mysite/clientlibs/libs/style_font.css" />
<link href='/apps/ascott/admin-portal-mysite/clientlibs/libs/icon.css' rel="stylesheet">
<body>
  <%-- Vue mount point + truyền page properties cho Vue --%>
  <div id="app">
    <%-- Custom tag tương ứng pageURITemplate sẽ được inject ở đây --%>
  </div>
  <script>
    window.__APP_CONFIG__ = {
      syncLanguages: <%= syncLanguagesJson %>,
      consoleId:    "<%= cfg.get("consoleId", "") %>",
      dataPath:     "<%= cfg.get("data_path", "") %>",
      metaPath:     "<%= cfg.get("meta_path", "") %>",
      editPath:     "<%= cfg.get("edit_path", "") %>",
      createPath:   "<%= cfg.get("create_path", "") %>",
      redirectPath: "<%= cfg.get("redirect_path", "") %>",
      pageURITemplate: "<%= cfg.get("pageURITemplate", "") %>"
    };
  </script>
  <script src="/apps/ascott/admin-portal-mysite/clientlibs/clientlib-site/js/app.vue.js"></script>
</body>
</html>
```

> JSP có 2 nhiệm vụ: (1) đọc **OSGi configuration** và **page properties** (qua `cmp.getConfig()`), serialize thành JSON nhúng vào `window.__APP_CONFIG__`. (2) load clientlib chứa Vue bundle.

---

## 2. Layer 2 — Page descriptor (`cq:Page`)

### `pages/edit-property/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:sling="..." xmlns:cq="..." xmlns:jcr="..."
    jcr:primaryType="cq:Page">
    <jcr:content
        jcr:mixinTypes="[sling:VanityPath]"
        jcr:primaryType="nt:unstructured"
        jcr:title="Edit Property"
        sling:resourceType="ascott/admin-portal-mysite/components/structure/edit-page"
        sling:vanityOrder="{Long}100"
        sling:vanityPath="/mysite/property-detail"
        consoleId="ascott-id-property-management"
        coral2="{Boolean}true"
        create_path="/mysite/create-property.html"
        data_path="/etc/asrdatabasemanagement/ascottpropertydatabase"
        edit_path="/mysite/property-detail.html"
        meta_path="/etc/asrdatabasemanagement/config/scaffolding"
        modeGroup="cq-commerce-products-admin-childpages"
        node_type="none"
        only_publish="false"
        pageURITemplate="/mysite/property-detail.html"
        path_workflow_page="/mysite/publish-non-master-data.html"
        redirect_path="/mysite/property-management.html"
        targetCollection=".cq-commerce-products-admin-childpages"
        workflow_model=""/>
</jcr:root>
```

**Đây là điểm cốt lõi.** Mỗi trang admin (Edit Property, Edit Event, Edit Country…) là **một `cq:Page`** chỉ chứa **properties** — không có markup riêng. `sling:resourceType` trỏ đến `edit-page` component (mục 1) → Granite shell + JSP render giống nhau cho mọi trang.

Sự khác biệt giữa các trang nằm ở **giá trị của properties**:

| Property | Ý nghĩa | Vue dùng để… |
| --- | --- | --- |
| `consoleId` | ID page cho Granite shell | Highlight nav |
| `data_path` | JCR path chứa dữ liệu thật | CRUD endpoint |
| `meta_path` | JCR path chứa scaffolding XML | Fetch schema để render form |
| `edit_path` | URL trang edit | Build link "Edit" trong table |
| `create_path` | URL trang create | Nút "+ New" |
| `redirect_path` | URL về sau khi save | `router.push` |
| `pageURITemplate` | Tag/template trang nào dùng | Tên custom tag Vue mount |
| `node_type` | Loại JCR node tạo mới | Set `jcr:primaryType` khi POST |
| `only_publish` | Chỉ publish, không edit | Ẩn nút Save |
| `path_workflow_page` | Trang chạy workflow publish | Link workflow |
| `workflow_model` | Workflow model path | Trigger AEM workflow |

> Đây là pattern **declarative page configuration**: thay vì code trang riêng cho mỗi entity, định nghĩa 1 component generic + truyền config qua properties.

---

## 3. Layer 3 — Scaffolding XML (form schema)

### `scaffolding/events/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
    jcr:mixinTypes="[rep:AccessControllable]"
    jcr:primaryType="nt:unstructured"
    _x0040_type="asc-container"
    header="Events Article"
    name="events"
    parent="[_ref_country|@parentName]"
    title_field="title">
    <items jcr:primaryType="nt:unstructured">
        <language
            jcr:primaryType="nt:unstructured"
            jcr:title="Language"
            _x0040_type="asc-dropdown"
            default="/etc/mysitedatabase/config/languages/en"
            name="_ref_language"
            readonly="this.editor.mode === 'COPY'"
            required="true">
            <datasource
                jcr:primaryType="nt:unstructured"
                label="title"
                rootPath="/etc/mysitedatabase/config/languages"
                tag="true"
                value="@path"/>
        </language>
        <created-by
            jcr:primaryType="nt:unstructured"
            jcr:title="Created by (select your cluster)"
            _x0040_type="asc-dropdown"
            common="{Boolean}true"
            name="_ref_country"
            readonly="this.get('/_ref_country') || (this.get('/is_master') ? this.get('/is_master') : false)"
            required="true">
            <datasource ... />
        </created-by>
    </items>
</jcr:root>
```

### Tại sao XML này có thể scaffold thành form?

#### 3.1. JCR `_x0040_` encoding

JCR không cho phép ký tự `@` trong tên node/property. AEM dùng [ISO 9075 encoding](https://docs.adobe.com/content/help/en/experience-manager-65/developing/platform/jcr-2.html): `@` (Unicode `\u0040`) → `_x0040_`.

Vậy `_x0040_type` ⇔ `@type`. Dùng `@` là quy ước nội bộ để phân biệt **prop điều khiển render** (`@type`) với **prop dữ liệu** của field (`name`, `default`).

Bảng các encoding hay gặp:

| Ký tự | Encode |
| --- | --- |
| `@` | `_x0040_` |
| `:` | `_x003a_` |
| ` ` | `_x0020_` |
| `-` | (không cần, hợp lệ) |

#### 3.2. Sling biến XML thành JSON

JCR repo expose mọi node thành JSON qua **Sling default GET servlet**:

```http
GET /etc/asrdatabasemanagement/config/scaffolding/events.infinity.json
```

→ trả về:

```json
{
  "jcr:primaryType": "nt:unstructured",
  "@type": "asc-container",
  "header": "Events Article",
  "name": "events",
  "parent": "[_ref_country|@parentName]",
  "title_field": "title",
  "items": {
    "language": {
      "@type": "asc-dropdown",
      "name": "_ref_language",
      "default": "/etc/mysitedatabase/config/languages/en",
      "readonly": "this.editor.mode === 'COPY'",
      "required": "true",
      "datasource": {
        "label": "title",
        "rootPath": "/etc/mysitedatabase/config/languages",
        "tag": "true",
        "value": "@path"
      }
    },
    "created-by": { "@type": "asc-dropdown", ... }
  }
}
```

Sling tự decode `_x0040_type` → `@type` khi serialize JSON.

> Suffix `.infinity.json` = lấy toàn bộ subtree. `.1.json` = depth 1. `.tidy.json` = pretty-print.

#### 3.3. Vue đọc JSON → recursive render

Pseudo-code render engine (giả định trong `AbcContainer.vue` / `DynamicSection.vue`):

```vue
<!-- ScaffoldRenderer.vue -->
<template>
  <component
    :is="resolveComponent(schema['@type'])"
    v-bind="passProps(schema)"
    :name="schema.name"
    :readonly="evalExpr(schema.readonly)"
    :required="schema.required === 'true'"
  >
    <!-- recursive render cho items -->
    <ScaffoldRenderer
      v-for="(child, key) in schema.items"
      :key="key"
      :schema="child"
      :path="path + '/' + (child.name || key)"
    />
  </component>
</template>

<script>
const TYPE_MAP = {
  'asc-container':       'AbcContainer',
  'asc-dropdown':        'AbcDropdown',
  'asc-textfield':       'AbcTextfield',
  'asc-multifield':      'AbcMultifield',
  'asc-datatable':       'AbcDynamicDatatable',
  'asc-section':         'AbcSection',
  'asc-collapsible':     'AbcCollapsible',
  'asc-tabs':            'AbcTabs',
  // ... ánh xạ string ở scaffolding sang component đã đăng ký global
};

export default {
  name: 'ScaffoldRenderer',
  props: ['schema', 'path'],
  methods: {
    resolveComponent(type) {
      return TYPE_MAP[type] || 'AbcUnknown';
    },
    passProps(schema) {
      // Lọc bỏ các key meta, chuyển còn lại thành props
      const { '@type': _t, items, datasource, ...rest } = schema;
      return { ...rest, datasource };
    },
    evalExpr(expr) {
      if (typeof expr !== 'string') return expr;
      // expression scaffolding cho phép truy cập this.editor / this.get(path)
      try {
        return new Function('return ' + expr).call(this.contextProxy());
      } catch (e) {
        console.warn('[scaffolding] eval fail:', expr, e);
        return false;
      }
    },
    contextProxy() {
      // expose this.editor.mode, this.get('/path') cho expression trong XML
      return {
        editor: this.$store.state.editor,
        get: (path) => this.$store.getters.fieldValue(path),
      };
    },
  },
};
</script>
```

**Mấu chốt 3 điểm:**

1. `@type` (string) ⇄ tên component Vue đã đăng ký global qua `Vue.component('Abc-...', ...)`.
2. Field `items` đệ quy → cây schema trở thành cây Vue component.
3. Các field `readonly`, `required`, `parent` chứa **chuỗi expression** kiểu JS (`this.editor.mode === 'COPY'`, `this.get('/_ref_country')`) — Vue dùng `new Function(...)` (hoặc parser an toàn hơn) để evaluate runtime với `this` proxy.

#### 3.4. Datasource = field-level data fetcher

```xml
<datasource label="title" rootPath="/etc/mysitedatabase/config/languages" tag="true" value="@path"/>
```

→ component dropdown gọi:

```js
axios.get(`${rootPath}.infinity.json`).then(json => {
  this.options = Object.values(json)
    .filter(node => node['jcr:primaryType'])
    .map(node => ({
      label: node[this.datasource.label],   // node.title
      value: node[this.datasource.value.replace('@', 'jcr:')] || node['jcr:path'], // node.jcr:path
    }));
});
```

Cũng metadata-driven — không hardcode endpoint trong Vue component.

---

## 4. Layer 4 — Vue bundle entry

### `index.js` (rút gọn theo screenshot)

```js
import Vue from 'vue';
import Vuetify from 'vuetify';
import draggable from 'vuedraggable';
import VueColor from 'vue-color';
import VueLocalStorage from 'vue-localstorage';
import axios from 'axios';
import wrapper from 'axios-cache-plugin';
import DatetimePicker from './components/controls/inputs/datetimepicker/DatetimePicker.vue';
import store from '@/store';

// === Pages ===
import PropertyLandingPage from './components/pages/property-landing-page';
import PropertyDetailsPage from './components/pages/property-details-page';
import EmailRoutingPage    from './components/pages/email-routing-page';
import RegistrationPage    from './components/pages/registration-page';
import RolloutPage         from './components/pages/rollout-page';
import mysiteMasterDataPage from './components/pages/mysite-master-data-page';
import mysiteTranslatorPage from '@/components/pages/translator-page/mysite-translator-page';
import PublishNonMasterdataPage from './components/pages/publish-non-masterdata-page';

// === Controls (form primitives) ===
import AbcTabs               from '@/components/controls/containers/tabs';
import AbcContainer          from '@/components/controls/containers/container';
import AbcCollapsible        from '@/components/controls/containers/collapsible';
import AbcSection            from '@/components/controls/containers/section';
import AbcMultifield         from '@/components/controls/containers/multifield';
import AbcTable              from '@/components/controls/containers/table';
import AbcDynamicDatatable   from '@/components/controls/containers/dynamic-datatable';
import AbcDynamicSection     from '@/components/controls/containers/dynamic-section';
import AbcMultifieldCreditCard from '@/components/controls/containers/multifield-credit-card';
import AbcContainerNoMaxWidth  from '@/components/controls/containers/container-no-maxwidth';
import AbcNewsRoomMultifield   from '@/components/controls/containers/newsroom-multifield';

Vue.use(Vuetify);
Vue.use(VueLocalStorage);

// Axios với cache layer (giảm hit JCR cho datasource lặp)
const http = wrapper(axios, { maxCacheSize: 50 });
Vue.prototype.$http = http;

// === Đăng ký GLOBAL component ===
// Mỗi page = 1 custom tag; pageURITemplate ở cq:Page sẽ inject tag tương ứng
Vue.component('Abc-property-landing-page', PropertyLandingPage);
Vue.component('Abc-property-details-page', PropertyDetailsPage);
Vue.component('Abc-email-routing-page',    EmailRoutingPage);
Vue.component('Abc-registration-page',     RegistrationPage);
Vue.component('Abc-publish-non-masterdata-page', PublishNonMasterdataPage);
Vue.component('Abc-rollout-page',          RolloutPage);
Vue.component('Abc-multifield-credit-card', AbcMultifieldCreditCard);
Vue.component('mysite-master-data-page',   mysiteMasterDataPage);
Vue.component('mysite-translator-page',    mysiteTranslatorPage);

// Controls — TYPE_MAP trong renderer dùng tên này
Vue.component('Abc-container',         AbcContainer);
Vue.component('Abc-tabs',              AbcTabs);
Vue.component('Abc-collapsible',       AbcCollapsible);
Vue.component('Abc-section',           AbcSection);
Vue.component('Abc-multifield',        AbcMultifield);
Vue.component('Abc-table',             AbcTable);
Vue.component('Abc-dynamic-datatable', AbcDynamicDatatable);
Vue.component('Abc-dynamic-section',   AbcDynamicSection);

// Single root mount (Granite shell render <div id="app">)
new Vue({
  el: '#app',
  store,
  // Không có template ở đây — template do JSP render ra
  // <div id="app"><mysite-master-data-page :meta-path="..."/></div>
});
```

### Vì sao là **single root** chứ không phải bootstrap loop?

1. JSP chỉ render **đúng 1** custom tag root tương ứng `pageURITemplate` (mỗi URL admin → 1 page component).
2. Cần **Vuex store** dùng chung toàn page (form state, validation, submit pipeline).
3. Cần **Vue template compiler** runtime để compile các custom tag trong HTML JSP → import `vue/dist/vue.esm.js` (full build), không phải `vue.runtime.esm.js`.
4. Đơn giản: 1 instance, 1 store, không phải đồng bộ state giữa nhiều instance.

> Trade-off: bundle nặng hơn ~30KB (compiler), nhưng đáng giá vì độ flexibility của template-in-HTML.

---

## 5. Luồng hoạt động end-to-end

```
1. User mở /mysite/property-detail.html
        │
        ▼
2. Sling resolve cq:Page edit-property → resourceType edit-page
        │
        ▼
3. Granite shell + edit-page.jsp render:
   - HTML head có app.vue.css
   - <div id="app">
   - window.__APP_CONFIG__ = { dataPath, metaPath, ... }
   - <script src="app.vue.js">
        │
        ▼
4. Vue bundle chạy:
   - new Vue({ el: '#app', store })
   - Compiler thấy custom tag <mysite-master-data-page>
        │
        ▼
5. mysite-master-data-page mounted():
   - Đọc window.__APP_CONFIG__
   - axios.get(metaPath + '.infinity.json')   → schema (XML đã thành JSON)
   - axios.get(dataPath + '.infinity.json')   → dữ liệu hiện có
        │
        ▼
6. Truyền schema vào <ScaffoldRenderer :schema="schema">
   - Recursive map @type → Vue.component(...)
   - Render tree form
        │
        ▼
7. User edit field → 2-way bind vào Vuex store
        │
        ▼
8. Click Save:
   - Vue gom store.state.formData → POST đến dataPath
   - Sling default POST servlet ghi xuống JCR node
   - 200 → redirect tới redirect_path
        │
        ▼
9. (Tuỳ): trigger workflow_model qua /bin/wcmcommand → publish
```

---

## 6. Lý do team chọn kiến trúc này

| Yêu cầu | Cách giải |
| --- | --- |
| Admin portal cần ~20 page CRUD na ná nhau | 1 component `edit-page` + N `cq:Page` config |
| Business hay đổi field trong form | Chỉ sửa scaffolding XML, **không build/deploy Vue** |
| Cần nhiều loại field phức tạp (datatable, multifield, datepicker) | Vue + Vuetify giàu component, nhanh hơn dùng Coral 3 |
| Vẫn cần auth + permission của AEM | Granite shell tự kiểm `cq:Page` permission |
| Cần workflow publish | Tận dụng AEM workflow qua property `workflow_model` |
| Datasource là chính JCR data | `datasource rootPath` đọc trực tiếp JCR JSON |

So với SPA Editor:

| | SPA Editor (chuẩn Adobe) | Architecture này |
| --- | --- | --- |
| Mục đích | Author content page | Admin portal CRUD |
| Schema | Sling Model JSON | Scaffolding XML |
| Page chrome | Không (front-end full SPA) | Granite shell |
| Editing UX | In-place visual | Form-based |
| Phù hợp | Marketing site | Internal data tool |

---

## 7. Pitfall hay gặp khi maintain

### 7.1. Tên component không khớp `@type`

XML có `_x0040_type="asc-fancy-input"` nhưng `index.js` quên `Vue.component('Abc-fancy-input', ...)` → Vue render `<asc-fancy-input>` thành HTMLUnknownElement, **không có error đỏ** (nếu để `Vue.config.silent = true` hoặc `ignoredElements`).

Cách phát hiện: Console snippet:

```js
const knownTags = Object.keys(Vue.options.components);
console.table(knownTags);
// Compare với @type unique trong scaffolding JSON
```

### 7.2. JCR cache khi sửa scaffolding

Sửa scaffolding XML trong CRX, Vue gọi `.infinity.json` vẫn ra phiên bản cũ vì:
- Browser cache (Disable cache trong DevTools).
- Dispatcher cache (`/etc/...` thường được cache).
- AEM bundle cache (`Sling Resource Resolver` cache).

Hard reload, hoặc append query `?cb=<timestamp>` khi gọi axios trong dev.

### 7.3. Expression eval không sandbox

`new Function('return ' + expr)` chạy mọi JS trong scaffolding. Nếu cho phép author chỉnh scaffolding XML → **XSS / RCE trên session admin**. Cần:
- Whitelist symbol (chỉ `this.get(...)`, `this.editor`).
- Hoặc dùng parser nhỏ (vd `expr-eval`, `jsep`) thay `new Function`.

### 7.4. Property name dùng `_ref_` prefix

Convention `_ref_language`, `_ref_country` = field tham chiếu node JCR khác (lưu path, không lưu value). Khi serialize gửi POST, cần resolve `_ref_country` thành `cq:Reference` hoặc property string path tuỳ servlet.

### 7.5. `parent="[_ref_country|@parentName]"`

Cú pháp internal: `[fieldName|@attribute]` = lấy giá trị field `_ref_country`, sau đó đọc property `parentName` của node đó. Render engine phải parse pattern này.

---

## 8. Checklist khi thêm 1 admin page mới

1. **Tạo `cq:Page`** ở `/apps/.../pages/edit-<entity>/.content.xml` với đủ properties (`data_path`, `meta_path`, `pageURITemplate`, …).
2. **Tạo scaffolding XML** ở `/etc/.../scaffolding/<entity>/.content.xml` mô tả field.
3. **Đảm bảo các `@type` đã có Vue component** đăng ký global. Nếu thiếu, tạo `.vue` mới + `Vue.component(...)` trong `index.js`.
4. **Tạo page-level component** (vd `MyEntityPage.vue`) → `Vue.component('Abc-my-entity-page', ...)` → đặt tên trùng `pageURITemplate` để JSP render đúng tag.
5. **Build clientlib**: `npm run build` trong `ui.frontend` → output vào `clientlib-site/js/app.vue.js`.
6. **Deploy** `ui.apps` + `ui.content` → kiểm tra `/mysite/<entity>-detail.html`.
7. **Test datasource**: gọi tay `<datasource.rootPath>.infinity.json` xem có đúng cấu trúc.
8. **Test workflow**: nếu page có `workflow_model`, kiểm tra workflow ở `/etc/workflow/models/...`.

---

## 9. Tham chiếu nội bộ

- Granite shell components: `/libs/granite/ui/components/shell/`
- Sling default GET/POST servlets: docs Apache Sling.
- JCR ISO 9075 encoding: [docs.adobe.com](https://experienceleague.adobe.com/en/docs/experience-manager-65/content/implementing/developing/platform/jcr-2-and-aem).
- ResourceMergerService: dùng để override `/libs` từ `/apps`.
- `cmp.getConfig()`: helper trong `/libs/granite/ui/global.jsp` đọc resource hiện tại như Granite UI Config.

---

## 10. Sơ đồ tổng

```
┌──────────────────────────────────────────────────────────────────┐
│                         AEM JCR Repository                        │
│                                                                   │
│  /apps/ascott/admin-portal-mysite/                                │
│    components/structure/edit-page/         ← cq:Component         │
│      .content.xml (resourceSuperType=collectionpage)              │
│      edit-page.jsp                                                │
│    pages/edit-property/                    ← cq:Page              │
│      .content.xml (data_path, meta_path, pageURITemplate, ...)    │
│    clientlibs/clientlib-site/                                     │
│      js/app.vue.js  ← built từ ui.frontend                        │
│      css/app.vue.css                                              │
│                                                                   │
│  /etc/asrdatabasemanagement/                                      │
│    config/scaffolding/events/.content.xml  ← FORM SCHEMA          │
│    ascottpropertydatabase/...              ← DATA (CRUD target)   │
└──────────────────────────────────────────────────────────────────┘
                               │
                       Sling resolves
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                          Browser                                  │
│                                                                   │
│  Granite Shell HTML                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Header / Nav / Breadcrumb (Granite)                        │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ <div id="app">                                       │   │  │
│  │ │   <mysite-master-data-page                           │   │  │
│  │ │      :meta-path="window.__APP_CONFIG__.metaPath"     │   │  │
│  │ │      :data-path="window.__APP_CONFIG__.dataPath" />  │   │  │
│  │ │ </div>                                               │   │  │
│  │ │   ↓ Vue compile + mount                              │   │  │
│  │ │ <ScaffoldRenderer :schema="...">                     │   │  │
│  │ │   <Abc-container>                                    │   │  │
│  │ │     <Abc-dropdown name="_ref_language" .../>         │   │  │
│  │ │     <Abc-dropdown name="_ref_country" .../>          │   │  │
│  │ │     <Abc-multifield>...</Abc-multifield>             │   │  │
│  │ │   </Abc-container>                                   │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```
