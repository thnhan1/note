# AEM SPA Editor

AEM SPA Editor cho phép content author chỉnh sửa trực quan **Single Page Applications** (React hoặc Angular) ngay trong môi trường AEM Author — kéo thả component, inline editing, layout mode, đầy đủ tính năng authoring quen thuộc từ AEM Pages truyền thống.

SPA render từ **JSON model** do AEM cung cấp, và SPA Editor SDK làm cầu nối giữa SPA framework và authoring layer của AEM.

::: tip AEM 6.5
SPA Editor được hỗ trợ từ AEM 6.4 SP2 trở đi. Trên AEM 6.5, cần Service Pack 6 trở lên để có đầy đủ tính năng ổn định. Kiến trúc và API ở đây áp dụng cho cả AEM 6.5 và AEMaaCS.
:::

---

## 1. Cơ chế hoạt động

### Luồng kiến trúc

5 bước cốt lõi:

1. **AEM serve JSON model** của page qua Sling Model Exporter (endpoint `.model.json`)
2. **SPA đọc JSON** và render các React/Angular component tương ứng
3. **SPA Editor SDK** bổ sung authoring overlays (selection, drag targets, placeholder) lên trên SPA
4. **Edits từ Author UI** được ghi xuống JCR → JSON model cập nhật → SPA re-render
5. **Trên Publish**, SPA render từ cùng JSON nhưng không có editor overlay nào

```
Browser (Author)
    │
    ▼
AEM SPA Editor Frame
    ├── Editor Overlays (authoring SDK)
    └── SPA iframe
          │
          ▼
    ModelManager → GET /content/myproject/home.model.json
          │
          ▼
    React Component Tree (renders from JSON)
```

### Cấu trúc JSON model

Page model là một JSON tree lồng nhau. Mỗi component map với một JCR node:

```json
{
  ":type": "myproject/components/page",
  ":path": "/content/myproject/en/home",
  ":children": {
    "root": {
      ":type": "wcm/foundation/components/responsivegrid",
      ":items": {
        "hero": {
          ":type": "myproject/components/hero",
          "title": "Welcome",
          "backgroundImage": "/content/dam/myproject/hero.jpg"
        },
        "cards": {
          ":type": "myproject/components/cards",
          ":items": {}
        }
      },
      ":itemsOrder": ["hero", "cards"]
    }
  }
}
```

`:type` là key kết nối JSON node với React component thông qua `MapTo`.

---

## 2. Project Setup

### Tạo project từ AEM Archetype

[AEM Project Archetype](https://github.com/adobe/aem-project-archetype) sinh ra project SPA hoàn chỉnh khi chọn `frontendModule=react`:

```bash
mvn -B archetype:generate \
  -DarchetypeGroupId=com.adobe.aem \
  -DarchetypeArtifactId=aem-project-archetype \
  -DarchetypeVersion=49 \
  -DappTitle="My SPA Project" \
  -DappId="myspa" \
  -DgroupId="com.myproject" \
  -DfrontendModule=react
```

Cấu trúc được sinh ra:

```text
myspa/
├── core/               # Java backend (Sling Models, Exporters)
├── ui.apps/            # AEM components, templates, clientlibs
├── ui.content/         # Sample content
├── ui.config/          # OSGi configs
└── ui.frontend/        # React SPA
    ├── src/
    │   ├── components/ # React components mapped tới AEM components
    │   ├── App.js
    │   └── index.js
    ├── package.json
    └── webpack.config.js
```

### Các npm package quan trọng

| Package | Vai trò |
|---|---|
| `@adobe/aem-react-editable-components` | `MapTo`, `Page`, `withModel`, `ResponsiveGrid` |
| `@adobe/aem-spa-page-model-manager` | `ModelManager`, `ModelClient`, `AuthoringUtils` |
| `@adobe/aem-spa-component-mapping` | Component registry cấp thấp |
| `@adobe/aem-core-components-react-base` | React wrappers cho Core Components |
| `@adobe/aem-core-components-react-spa` | SPA-specific Core Component wrappers |

```bash
npm install @adobe/aem-react-editable-components \
  @adobe/aem-spa-page-model-manager \
  @adobe/aem-spa-component-mapping
```

::: warning Phiên bản
Trên AEM 6.5, dùng `@adobe/aem-react-editable-components@^1.x` và React 16/17. Phiên bản `2.x` nhắm tới AEMaaCS và React 18. Kiểm tra compatibility matrix trước khi nâng cấp.
:::

---

## 3. Component Mapping với `MapTo`

`MapTo()` là khái niệm trung tâm: kết nối một React component với một AEM resource type. Khi JSON model có node với `:type = "myproject/components/hero"`, SPA render React component đã được map.

### Mapping cơ bản

```jsx
import React from 'react';
import { MapTo } from '@adobe/aem-react-editable-components';

const HeroEditConfig = {
  emptyLabel: 'Hero',
  isEmpty: function(props) {
    return !props || !props.title;
  }
};

const Hero = ({ title, backgroundImage, ctaText, ctaLink }) => (
  <section
    className="hero"
    style={{ backgroundImage: `url(${backgroundImage})` }}
  >
    <div className="hero-content">
      <h1>{title}</h1>
      {ctaText && (
        <a href={ctaLink} className="hero-cta">{ctaText}</a>
      )}
    </div>
  </section>
);

export default MapTo('myproject/components/hero')(Hero, HeroEditConfig);
```

### Cơ chế hoạt động

1. JSON model chứa field `:type` cho từng component
2. `MapTo('myproject/components/hero')(HeroComponent, editConfig)` đăng ký mapping vào registry
3. Khi Page Model Manager gặp resource type đó trong JSON, nó render React component tương ứng
4. `editConfig` cho editor biết cách xử lý trạng thái rỗng và placeholder

### Các tùy chọn `editConfig`

| Tùy chọn | Kiểu | Mô tả |
|---|---|---|
| `emptyLabel` | `string` | Text hiển thị trong placeholder khi component rỗng |
| `isEmpty(props)` | `function → boolean` | Trả về `true` khi component chưa có nội dung |
| `resourceType` | `string` | Override resource type nếu khác với `MapTo` key |

---

## 4. Container Components

Container component (như Responsive Grid) chứa các child component. Chúng nhận `:items` và `:itemsOrder` từ JSON model.

### Map Responsive Grid chuẩn

```jsx
import { MapTo, ResponsiveGrid } from '@adobe/aem-react-editable-components';

MapTo('wcm/foundation/components/responsivegrid')(ResponsiveGrid);
```

### Custom container

Với container tùy chỉnh (tabbed section, accordion...), cần implement phía backend `ContainerExporter` và frontend nhận `:items`/`:itemsOrder`:

```jsx
import React from 'react';
import { MapTo, withComponentMappingContext } from '@adobe/aem-react-editable-components';

const TabContainer = ({ cqItems, cqItemsOrder }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  return (
    <div className="tab-container">
      <div className="tab-nav">
        {cqItemsOrder.map((key, idx) => (
          <button key={key} onClick={() => setActiveTab(idx)}>
            Tab {idx + 1}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {cqItemsOrder[activeTab] && cqItems[cqItemsOrder[activeTab]]}
      </div>
    </div>
  );
};

export default MapTo('myproject/components/tab-container')(
  withComponentMappingContext(TabContainer)
);
```

---

## 5. Page Component (Entry Point)

### `App.js` — Root component

```jsx
import React from 'react';
import { Page, withModel } from '@adobe/aem-react-editable-components';

import './components/Hero/Hero';
import './components/Cards/Cards';
import './components/Text/Text';

function App() {
  return <Page />;
}

export default withModel(App);
```

`withModel` là HOC tự động fetch page model và truyền xuống dưới dạng props. Import các component file ở đây để đảm bảo `MapTo` được gọi và đăng ký vào registry trước khi render.

### `index.js` — Entry point

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { ModelManager } from '@adobe/aem-spa-page-model-manager';
import App from './App';

ModelManager.initialize().then((pageModel) => {
  ReactDOM.render(
    <App
      cqChildren={pageModel[':children']}
      cqItems={pageModel[':items']}
      cqItemsOrder={pageModel[':itemsOrder']}
      cqPath={pageModel[':path']}
    />,
    document.getElementById('spa-root')
  );
});
```

`ModelManager.initialize()` fetch JSON model từ AEM và trả về pageModel để boot SPA.

---

## 6. Backend: Sling Model Exporter

Mỗi AEM component xuất hiện trong SPA cần một **Sling Model Exporter** sinh ra JSON representation tương ứng.

```java
import com.adobe.cq.export.json.ComponentExporter;
import com.adobe.cq.export.json.ExporterConstants;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(
    adaptables = SlingHttpServletRequest.class,
    adapters = { HeroModel.class, ComponentExporter.class },
    resourceType = HeroModel.RESOURCE_TYPE
)
@Exporter(
    name = ExporterConstants.SLING_MODEL_EXPORTER_NAME,
    extensions = ExporterConstants.SLING_MODEL_EXTENSION
)
public class HeroModel implements ComponentExporter {

    static final String RESOURCE_TYPE = "myproject/components/hero";

    @ValueMapValue(optional = true)
    private String title;

    @ValueMapValue(optional = true)
    private String backgroundImage;

    @ValueMapValue(optional = true)
    private String ctaText;

    @ValueMapValue(optional = true)
    private String ctaLink;

    public String getTitle()           { return title; }
    public String getBackgroundImage() { return backgroundImage; }
    public String getCtaText()         { return ctaText; }
    public String getCtaLink()         { return ctaLink; }

    @Override
    public String getExportedType() { return RESOURCE_TYPE; }
}
```

**Hai điểm quan trọng:**

- `@Exporter` + implements `ComponentExporter` → model được include vào page JSON
- `getExportedType()` trả về resource type → map ngược lại với `:type` trong JSON

Kiểm tra JSON tại: `http://localhost:4502/content/myproject/en/home.model.json`

---

## 7. SPA Routing và Navigation

SPA xử lý client-side routing. SPA Editor SDK tích hợp với React Router:

```jsx
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { Page } from '@adobe/aem-react-editable-components';
import { ModelManager } from '@adobe/aem-spa-page-model-manager';

function App() {
  return (
    <Router>
      <Route
        path="/:pagePath*"
        render={(routeProps) => (
          <Page
            cqPath={routeProps.match.url}
            {...routeProps}
          />
        )}
      />
    </Router>
  );
}
```

Khi user navigate sang page mới:

1. React Router xử lý URL change
2. `ModelManager` fetch JSON model cho page mới (nếu chưa cache)
3. `Page` component re-render với model mới
4. Trong author mode, editor overlays cập nhật tự động

---

## 8. Remote SPA

Remote SPA là SPA hosted bên ngoài AEM (Vercel, Netlify, CDN tùy chỉnh) nhưng vẫn có thể edit trong AEM SPA Editor thông qua iframe.

### Cấu hình

1. Host SPA trên external server
2. Cấu hình AEM cho phép remote origin (CORS, CSP headers)
3. SPA fetch page model từ AEM JSON endpoint
4. SPA Editor load remote SPA trong iframe để authoring

```js
ModelManager.initialize({
  modelClient: new ModelClient('https://author.myproject.com')
});
```

### Khi nào dùng Remote SPA

| Trường hợp | Khuyến nghị |
|---|---|
| SPA đã có, muốn tích hợp AEM authoring | ✅ Remote SPA |
| CI/CD pipeline SPA độc lập với AEM deploy | ✅ Remote SPA |
| SPA mới, build từ đầu với AEM | Embedded SPA (`ui.frontend`) |
| Cần full control authoring experience | Embedded SPA |

---

## 9. SPA vs Headless vs Edge Delivery

| Tiêu chí | SPA Editor | Headless (GraphQL) | Edge Delivery |
|---|---|---|---|
| **Authoring** | WYSIWYG đầy đủ | JSON/CF Editor | Document authoring |
| **Frontend tech** | React/Angular SDK | Bất kỳ framework | HTML/JS thuần |
| **Tích hợp AEM** | Chặt chẽ (SDK) | Lỏng (API) | Git-based |
| **Build complexity** | Cao | Trung bình | Thấp |
| **Publish performance** | Phụ thuộc SPA | CDN-friendly | Rất cao (edge) |
| **Phù hợp** | Team đã quen AEM + muốn WYSIWYG cho SPA | Omnichannel, nhiều consumers | Marketing sites tốc độ cao |

---

## 10. Authoring Experience

### Edit mode

Author thấy SPA với **blue overlays** trên mỗi editable component:

- Click để select component
- Component toolbar: edit, configure, delete, move
- Kéo component từ side panel vào trang
- Inline-edit text component trực tiếp

### Layout mode

Author resize component bên trong responsive grid, giống AEM Pages truyền thống.

### Preview mode

Render SPA không có editor overlay — đúng như visitor sẽ thấy.

### Placeholder handling

Khi component rỗng, SPA Editor SDK hiển thị placeholder dựa vào `emptyLabel` từ edit config:

```js
const TextEditConfig = {
  emptyLabel: 'Text -- click to edit',
  isEmpty: (props) => !props || !props.text || props.text.trim().length === 0
};
```

---

## 11. Common Patterns

### Conditional authoring scaffolding

Hiển thị markup bổ sung chỉ trong edit mode để guide author:

```jsx
import { AuthoringUtils } from '@adobe/aem-spa-page-model-manager';

const MyComponent = (props) => {
  const isInEditor = AuthoringUtils.isInEditor();

  return (
    <div className="my-component">
      {isInEditor && (
        <div className="author-hint">Kéo items vào đây</div>
      )}
      {/* Component content */}
    </div>
  );
};
```

### Map Core Components

Tái sử dụng AEM Core Component React wrappers:

```jsx
import { TitleV2IsEmptyFn } from '@adobe/aem-core-components-react-base';
import { MapTo } from '@adobe/aem-react-editable-components';

const Title = ({ text, type }) => {
  const HeadingTag = type || 'h2';
  return <HeadingTag>{text}</HeadingTag>;
};

MapTo('myproject/components/title')(Title, {
  emptyLabel: 'Title',
  isEmpty: TitleV2IsEmptyFn
});
```

---

## 12. Best Practices

- **Map mọi editable component** — component thiếu `MapTo` sẽ tạo ra vùng trắng trong editor, không có thông báo lỗi
- **`isEmpty()` chính xác** — placeholder chỉ xuất hiện khi component thực sự rỗng; implement sai gây confuse author
- **Test cả hai mode** — SPA hoạt động khác nhau giữa author mode (có overlay) và publish mode (render sạch)
- **Không thao tác DOM trực tiếp** — jQuery hay `document.querySelector` xung đột với editor overlay, gây rendering glitch
- **Toàn bộ editable content qua JSON model** — không fetch data client-side cho content cần authoring; mọi content phải đi qua Sling Model Exporter

---

## 13. Common Pitfalls

| Vấn đề | Nguyên nhân | Cách sửa |
|---|---|---|
| Component trắng trong editor | Thiếu `MapTo` hoặc resource type sai | Kiểm tra `:type` trong JSON khớp với `MapTo` key |
| Placeholder luôn hiển thị dù có content | `isEmpty()` logic sai | Debug props thực tế, đảm bảo field name đúng |
| Layout mode không hoạt động | Thiếu map `ResponsiveGrid` | Thêm `MapTo('wcm/foundation/components/responsivegrid')(ResponsiveGrid)` |
| JSON model thiếu component | Sling Model không implement `ComponentExporter` | Thêm `@Exporter` và `implements ComponentExporter` |
| SPA không load trong Author | `page` component thiếu `sling:resourceSuperType` | Set `sling:resourceSuperType = core/wcm/components/page/v3/page` |
| `ModelManager` lỗi init | Gọi trước khi DOM ready hoặc thiếu config | Gọi `ModelManager.initialize()` trong entry point, sau DOM ready |
| Lỗi CORS khi Remote SPA | AEM chưa whitelist remote origin | Cấu hình `com.adobe.granite.cors.impl.CORSPolicyImpl` |

---

## Tham khảo

- [AEM SPA Editor overview — Experience League](https://experienceleague.adobe.com/docs/experience-manager-cloud-service/content/implementing/developing/hybrid/introduction.html)
- [Getting started with SPA Editor (React)](https://experienceleague.adobe.com/docs/experience-manager-learn/getting-started-with-aem-headless/spa-editor/react/overview.html)
- [SPA Editor SDK — npm](https://www.npmjs.com/package/@adobe/aem-react-editable-components)
- [Remote SPA documentation](https://experienceleague.adobe.com/docs/experience-manager-learn/getting-started-with-aem-headless/spa-editor/remote-spa/overview.html)
- [AEM Project Archetype — GitHub](https://github.com/adobe/aem-project-archetype)
