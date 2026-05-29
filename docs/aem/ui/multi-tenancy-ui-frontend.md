# Multi-Tenancy Theme cho UI Frontend Module

> Nguồn học chính: [Multi-Tenancy UI Frontend Themes | Luca Nerlich](https://lucanerlich.com/aem/ui/multi-tenancy-support-ui-frontend/).
> Note này viết lại bằng tiếng Việt để mình ôn và áp dụng cho AEM 6.5 on-premise.

## Ý chính cần nhớ

Khi một AEM project phục vụ **nhiều brands / sites / tenants** từ cùng một codebase, mỗi tenant cần visual identity riêng — colours, typography, spacing, component variants, đôi khi cả JavaScript behaviour khác nhau.

Hướng tiếp cận: cấu hình `ui.frontend` module để build ra **nhiều Client Libraries riêng biệt cho từng tenant**, trong khi backend components và HTL templates **vẫn share chung**.

**Kết quả:** một lệnh `mvn clean install` build ra nhiều clientlibs (`clientlib-site-x`, `clientlib-site-y`, ...) — page template của từng tenant load đúng clientlib tương ứng.

> **Tiền điều kiện:** đã quen với AEM Client Libraries và webpack/Node.js cơ bản.

---

## Architecture tổng quan

```text
┌─────────────────────────────────────────────────────┐
│  ui.frontend (Node/webpack/Vite build)              │
│                                                      │
│  shared/         ← variables, mixins, utilities     │
│  components/     ← HTL components dùng chung        │
│      site-X/     ← override styles cho site-X       │
│      site-Y/     ← override styles cho site-Y       │
│  site-X/main.ts  ← entry file cho site-X           │
│  site-Y/main.ts  ← entry file cho site-Y           │
└──────────────────┬──────────────────────────────────┘
                   ↓ webpack build
        ┌──────────┴──────────┐
        ↓                     ↓
  /dist/clientlib-site-X  /dist/clientlib-site-Y
        ↓                     ↓
        └──────────┬──────────┘
                   ↓ aem-clientlib-generator
   /apps/myproject/clientlibs/clientlib-site-X (category: site-X.site)
   /apps/myproject/clientlibs/clientlib-site-Y (category: site-Y.site)
                   ↓
           Page template HTL: data-sly-call clientLib.css/js với category tương ứng
```

Cốt lõi:
1. **Shared code** trong common directories (variables, mixins, utilities, shared components)
2. **Per-tenant entry files** import shared code + tenant-specific overrides
3. **Webpack** build separate bundles per tenant trong `/dist`
4. **`aem-clientlib-generator`** convert mỗi bundle thành 1 AEM Client Library
5. **Page templates** reference đúng tenant clientlib qua category

### Khi nào cần multi-tenancy?

- Multi-brand trong cùng 1 AEM instance (`brand-A.com`, `brand-B.com`)
- Regional sites khác visual identity (US vs APAC)
- Light/Dark mode dưới dạng 2 clientlibs riêng
- White-label products — client tự tuỳ chỉnh styling
- Microsites share components nhưng design khác

---

## Project structure

```text
ui.frontend/
├── clientlib.config.js          ← aem-clientlib-generator config
├── webpack.common.js
├── webpack.dev.js
├── webpack.prod.js
├── package.json
└── src/main/webpack/
    ├── shared/                  ← shared cho mọi tenants
    │   ├── _variables.scss      ← default design tokens
    │   ├── _mixins.scss
    │   ├── _reset.scss
    │   └── _utilities.scss
    ├── components/              ← component styles & scripts
    │   ├── header/
    │   │   ├── _header.scss     ← shared base
    │   │   ├── site-X/
    │   │   │   └── _header.scss ← override site-X
    │   │   └── site-Y/
    │   │       └── _header.scss ← override site-Y
    │   └── teaser/
    │       ├── _teaser.scss
    │       ├── teaser.ts
    │       ├── site-X/_teaser.scss
    │       └── site-Y/_teaser.scss
    ├── site-X/                  ← entry files cho site-X
    │   ├── main.ts
    │   ├── main.scss
    │   └── _variables.scss      ← brand overrides
    ├── site-Y/
    │   ├── main.ts
    │   ├── main.scss
    │   └── _variables.scss
    └── resources/               ← static assets (fonts, images)
        ├── site-X/
        │   ├── favicon.ico
        │   └── fonts/
        └── site-Y/
            ├── favicon.ico
            └── fonts/
```

### Design token strategy

Mỗi tenant override design tokens được định nghĩa shared. Shared file định nghĩa default; tenants chỉ override những gì khác:

**File:** `shared/_variables.scss`

```scss
// Default design tokens (có thể override per tenant)
$color-primary:        #0066cc;
$color-secondary:      #333333;
$color-background:     #ffffff;
$color-text:           #1a1a1a;
$font-family-base:     'Helvetica Neue', Arial, sans-serif;
$font-size-base:       16px;
$line-height-base:     1.5;
$spacing-unit:         8px;
$border-radius:        4px;
$max-content-width:    1200px;
```

**File:** `site-X/_variables.scss`

```scss
// Site-X brand overrides
$color-primary:    #e63946;
$color-secondary:  #1d3557;
$font-family-base: 'Roboto', sans-serif;
$border-radius:    8px;
```

**File:** `site-Y/_variables.scss`

```scss
// Site-Y brand overrides
$color-primary:    #2a9d8f;
$color-secondary:  #264653;
$font-family-base: 'Open Sans', sans-serif;
$border-radius:    0;
```

---

## Step-by-step configuration

### 1. Tenant entry files

Mỗi tenant có 1 SCSS entry và 1 TypeScript entry. Các file này import shared code trước, rồi tenant-specific overrides.

**File:** `site-X/main.scss`

```scss
// 1. Tenant variables (override shared defaults)
@import './variables';

// 2. Shared base styles (dùng overridden variables)
@import '../shared/variables';   // defaults cho gì site-X chưa override
@import '../shared/reset';
@import '../shared/mixins';
@import '../shared/utilities';

// 3. Shared component styles
@import '../components/header/header';
@import '../components/teaser/teaser';

// 4. Tenant-specific component overrides
@import '../components/header/site-X/header';
@import '../components/teaser/site-X/teaser';
```

> **Quan trọng — thứ tự import SCSS:** Import tenant variables **trước**, rồi đến shared code. Như vậy shared stylesheets dùng các giá trị `$color-primary` đã được tenant override. Nếu tenant không override variable nào, shared default sẽ apply.

**File:** `site-X/main.ts`

```typescript
// Import stylesheets (webpack xử lý SCSS qua loaders)
import './main.scss';

// Shared TypeScript components
import '../components/header/header';
import '../components/teaser/teaser';

// Tenant-specific TypeScript (optional)
import '../components/teaser/site-X/teaser';
```

### 2. Webpack configuration

Sửa `webpack.common.js` để build separate bundles per tenant. 3 phần cần config: entry points, output filenames, copy static assets.

**File:** `webpack.common.js`

```javascript
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Định nghĩa tất cả tenants
const SITES = ['site-X', 'site-Y'];

// === 1. Entry points: 1 entry per tenant ===
const entry = {};
SITES.forEach(site => {
    entry[site] = path.resolve(__dirname, `src/main/webpack/${site}/main.ts`);
});

module.exports = {
    entry,

    // === 2. Output: thư mục riêng per tenant ===
    output: {
        filename: (chunkData) => {
            return chunkData.chunk.name === 'dependencies'
                ? 'clientlib-dependencies/[name].js'
                : `clientlib-${chunkData.chunk.name}/${chunkData.chunk.name}.js`;
        },
        path: path.resolve(__dirname, 'dist'),
    },

    module: {
        rules: [
            { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'postcss-loader',
                    'sass-loader',
                ],
            },
        ],
    },

    plugins: [
        new CleanWebpackPlugin(),

        // Extract CSS thành file riêng per tenant
        new MiniCssExtractPlugin({
            filename: (chunkData) =>
                `clientlib-${chunkData.chunk.name}/${chunkData.chunk.name}.css`,
        }),

        // === 3. Copy static assets per tenant ===
        new CopyWebpackPlugin({
            patterns: SITES.map(site => ({
                from: path.resolve(__dirname, `src/main/webpack/resources/${site}`),
                to:   `clientlib-${site}/resources`,
                noErrorOnMissing: true,
            })),
        }),
    ],

    resolve: { extensions: ['.ts', '.tsx', '.js'] },
};
```

Sau khi chạy `npm run build`, thư mục `/dist`:

```text
dist/
├── clientlib-site-X/
│   ├── site-X.js
│   ├── site-X.css
│   └── resources/
│       ├── favicon.ico
│       └── fonts/
└── clientlib-site-Y/
    ├── site-Y.js
    ├── site-Y.css
    └── resources/
        ├── favicon.ico
        └── fonts/
```

### 3. Client Library generation

Plugin `aem-clientlib-generator` đọc webpack output và tạo AEM Client Library folder structure copy về `ui.apps`.

**File:** `clientlib.config.js`

```javascript
const path = require('path');

// Base config dùng chung cho mọi clientlibs
const libsBaseConfig = {
    allowProxy: true,
    serializationFormat: 'xml',
    cssProcessor: ['default:none', 'min:none'],
    jsProcessor:  ['default:none', 'min:none'],
};

const SITES = ['site-X', 'site-Y'];

// Generate 1 clientlib config cho mỗi tenant
const CLIENT_LIBS = SITES.map(siteName => ({
    ...libsBaseConfig,
    name: `clientlib-${siteName}`,
    categories: [`${siteName}.site`],
    dependencies: ['myproject.dependencies'],  // shared vendor
    assets: {
        js: {
            cwd: `clientlib-${siteName}`,
            files: ['**/*.js'],
            flatten: false,
        },
        css: {
            cwd: `clientlib-${siteName}`,
            files: ['**/*.css'],
            flatten: false,
        },
        resources: {
            cwd: `clientlib-${siteName}`,
            files: ['**/*.*'],
            flatten: true,                     // flatten cho consistent sub-paths
            ignore: ['**/*.js', '**/*.css'],
        },
    },
}));

// Shared dependencies clientlib (jQuery, polyfills...)
CLIENT_LIBS.push({
    ...libsBaseConfig,
    name: 'clientlib-dependencies',
    categories: ['myproject.dependencies'],
    assets: {
        js: { cwd: 'clientlib-dependencies', files: ['**/*.js'], flatten: false },
    },
});

module.exports = {
    context: path.resolve(__dirname, 'dist'),
    clientLibRoot: path.resolve(__dirname, '..',
        'ui.apps', 'src', 'main', 'content', 'jcr_root',
        'apps', 'myproject', 'clientlibs'),
    libs: CLIENT_LIBS,
};
```

> **Flatten resources:** `flatten: true` ở phần `resources` copy mọi static files (fonts, images, favicons) vào root `resources/` của clientlib. Như vậy relative path như `url('../resources/fonts/roboto.woff2')` chạy giống nhau cho mọi tenant clientlibs.

### 4. Load tenant clientlibs trong page templates

Page template của mỗi tenant reference clientlib category riêng. Trong `customheaderlibs.html` và `customfooterlibs.html` của page component:

**File:** `customheaderlibs.html`

```html
<!--/* Load tenant-specific CSS trong <head> */-->
<sly data-sly-use.clientLib="/libs/granite/sightly/templates/clientlib.html"
     data-sly-call="${clientLib.css @ categories='site-X.site'}"/>
```

**File:** `customfooterlibs.html`

```html
<!--/* Load tenant-specific JS trước </body> */-->
<sly data-sly-use.clientLib="/libs/granite/sightly/templates/clientlib.html"
     data-sly-call="${clientLib.js @ categories='site-X.site'}"/>
```

#### Dynamic theme — đọc category từ template policy

Để authors chọn theme trong template editor mà không cần đụng code, lưu clientlib category trong template policy:

**File:** `customheaderlibs.html`

```html
<sly data-sly-use.clientLib="/libs/granite/sightly/templates/clientlib.html"
     data-sly-use.model="com.myproject.core.models.PageModel"/>

<!--/* Đọc clientlib category từ template policy */-->
<sly data-sly-call="${clientLib.css @ categories=model.themeCategory}"/>
```

**File:** `core/.../models/PageModel.java`

```java
@Model(
    adaptables = SlingHttpServletRequest.class,
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
)
public class PageModel {

    @ScriptVariable
    private Style currentStyle;

    /**
     * Trả về clientlib category từ template policy.
     * Authors config qua template editor's page policy.
     */
    public String getThemeCategory() {
        if (currentStyle != null) {
            return currentStyle.get("themeClientLibCategory", "site-X.site");
        }
        return "site-X.site";
    }
}
```

---

## Thêm 1 tenant mới (site-Z)

Chỉ 4 bước, **không** đụng vào backend code, components, hay HTL templates:

1. Thêm vào `SITES` array trong cả `webpack.common.js` và `clientlib.config.js`:

   ```javascript
   const SITES = ['site-X', 'site-Y', 'site-Z'];
   ```

2. Tạo entry files: `src/main/webpack/site-Z/main.ts` và `main.scss`.

3. Thêm tenant-specific overrides ở `src/main/webpack/components/*/site-Z/` (chỉ cho components khác shared base).

4. Tạo hoặc update page template để reference category `site-Z.site`.

---

## Tích hợp với AEM Style System

Multi-tenancy approach kết hợp tốt với Style System của AEM. Shared components định nghĩa style variations qua BEM classes; tenant-specific stylesheets cung cấp visual implementation:

**File:** `components/teaser/_teaser.scss` (shared)

```scss
// Base teaser styles (shared cho mọi tenants)
.cmp-teaser {
    padding: $spacing-unit * 3;
    border-radius: $border-radius;

    &__title {
        font-family: $font-family-base;
        font-size: 1.5rem;
        color: $color-text;
    }

    &__description {
        line-height: $line-height-base;
    }

    // Style System variant: "featured"
    &--featured {
        border-left: 4px solid $color-primary;
    }

    // Style System variant: "compact"
    &--compact {
        padding: $spacing-unit;
        .cmp-teaser__title { font-size: 1.125rem; }
    }
}
```

**File:** `components/teaser/site-X/_teaser.scss`

```scss
// Site-X teaser customisations
.cmp-teaser {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &--featured {
        background: linear-gradient(135deg, lighten($color-primary, 40%), #fff);
    }
}
```

Style System classes (ví dụ `cmp-teaser--featured`) là shared, nhưng stylesheet của mỗi tenant có visual interpretation riêng. Authors chỉ cần chọn "Featured" trong dropdown — không cần biết đang ở tenant nào.

---

## Vite thay vì Webpack

Cho dự án mới, [Vite](https://vitejs.dev/) là alternative nhanh hơn webpack. Concept multi-tenancy giống nhau, chỉ khác cách config:

**File:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import path from 'path';

const SITES = ['site-X', 'site-Y'];

const input: Record<string, string> = {};
SITES.forEach(site => {
    input[site] = path.resolve(__dirname, `src/main/webpack/${site}/main.ts`);
});

export default defineConfig({
    build: {
        rollupOptions: {
            input,
            output: {
                entryFileNames: `clientlib-[name]/[name].js`,
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        return `clientlib-[name]/[name].css`;
                    }
                    return `clientlib-[name]/resources/[name][extname]`;
                },
            },
        },
        outDir: 'dist',
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `@import "src/main/webpack/shared/variables";`,
            },
        },
    },
});
```

> Cấu hình `aem-clientlib-generator` không thay đổi dù dùng webpack hay Vite — nó chỉ care về structure của `/dist`.

---

## Shared dependencies

Tránh bundle các thư viện lớn (jQuery, polyfills, vendor) vào mọi tenant bundle — extract sang shared `clientlib-dependencies`:

**Webpack splitChunks config:**

```javascript
module.exports = {
    optimization: {
        splitChunks: {
            cacheGroups: {
                dependencies: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'dependencies',
                    chunks: 'all',
                },
            },
        },
    },
};
```

**Page template — load dependencies trước tenant clientlib:**

```html
<sly data-sly-call="${clientLib.js @ categories='myproject.dependencies'}"/>
<sly data-sly-call="${clientLib.js @ categories='site-X.site'}"/>
```

Hoặc dùng property `dependencies` trong tenant clientlib definition để AEM tự load:

```javascript
{
    categories: ['site-X.site'],
    dependencies: ['myproject.dependencies'],
}
```

---

## Best practices

### 1. Giữ tenant overrides tối thiểu

Tenant stylesheets chỉ nên chứa **differences** so với shared base. Nếu thấy duplicate large blocks of CSS giữa các tenants, extract về shared layer.

### 2. Dùng design tokens nhất quán

Mọi colours, fonts, spacings, visual properties đều phải đến từ SCSS variables. Re-theme 1 site = thay vài variables, không phải đi tìm hàng trăm CSS rules.

### 3. Tránh tenant-specific HTML

Nếu component cần markup cơ bản khác nhau cho từng tenant → đó là dấu hiệu nên tách thành 2 components riêng, không phải 2 themes của 1 component. Multi-tenancy phù hợp khi HTML và logic share, **chỉ visual presentation khác**.

### 4. Watch bundle size

Sau khi thêm vài tenants, monitor CSS/JS bundle sizes. Dùng `webpack-bundle-analyzer` hoặc Vite analysis built-in để check không vô tình bundle cùng code vào nhiều tenant bundles:

```bash
# Webpack
npx webpack --profile --json > stats.json
npx webpack-bundle-analyzer stats.json

# Vite
npx vite build --report
```

### 5. Test all tenants

Khi thay đổi shared components, verify tất cả tenant builds đều OK. Thêm CI step build mọi tenants và check CSS/JS errors:

```bash
npm run build

# Verify mọi expected clientlib directories tồn tại
for site in site-X site-Y; do
    test -d "dist/clientlib-${site}" || (echo "Missing ${site}" && exit 1)
done
```

### 6. Không mix tenant styles tại runtime

Đảm bảo **chỉ 1 tenant clientlib được load per page**. Load nhiều tenant clientlibs cùng lúc → CSS conflicts và styling không predictable. Dùng template policies để enforce category đúng.

### 7. AEMaaCS considerations

Trên AEM as a Cloud Service, build `ui.frontend` chạy trong Cloud Manager pipeline. Cùng config multi-tenancy chạy không cần thay đổi. Cần đảm bảo:

- Mọi npm dependencies được khai báo trong `package.json` (pipeline chạy `npm install`).
- `aem-clientlib-generator` được config làm build step trong `package.json` scripts.
- Static assets (fonts) dùng relative paths tương thích với clientlib `allowProxy`.

> **AEM 6.5 on-prem:** Hoàn toàn áp dụng được. `ui.frontend` module tồn tại trong cả AEM 6.5 archetype và AEMaaCS. Build chạy local hoặc qua Maven trong CI.

---

## Pitfalls thường gặp

| Vấn đề | Nguyên nhân / Cách xử lý |
|---|---|
| CSS variables không được override | Sai thứ tự `@import` — tenant variables phải đến **trước** shared code |
| Mọi tenant load cùng 1 clientlib | Page template hardcode category — phải reference theo tenant hoặc qua template policy |
| Bundle size phình to | Vendor code bị bundle vào mọi tenants — dùng `splitChunks` để extract `clientlib-dependencies` |
| Resources path bị broken | Quên `flatten: true` ở `resources` section của clientlib config |
| Build OK nhưng clientlib không load trên AEM | Quên thêm category vào page template, hoặc clientlib chưa được install (check `/system/console/status-clientlibs`) |
| Style conflict giữa tenants trên cùng page | Loaded multiple tenant clientlibs — verify chỉ 1 category được include qua template policy |
| Component cần markup khác nhau theo tenant | Đó là 2 components khác nhau — tách ra, đừng cố nhét vào multi-theme |

---

## Checklist khi setup thật

1. [ ] Tạo structure `src/main/webpack/\{shared,components,site-X,site-Y,resources\}`.
2. [ ] Định nghĩa default design tokens trong `shared/_variables.scss`.
3. [ ] Tạo `_variables.scss` per tenant chỉ chứa overrides.
4. [ ] Tạo `main.ts` và `main.scss` per tenant với thứ tự import đúng.
5. [ ] Update `webpack.common.js` với `SITES` array, dynamic entry, output, copy resources.
6. [ ] Update `clientlib.config.js` để generate 1 clientlib per tenant + 1 shared dependencies.
7. [ ] Setup `splitChunks` để extract vendor code.
8. [ ] Update page template HTL để load tenant clientlib (hoặc dynamic qua PageModel + template policy).
9. [ ] Build, verify `/dist` có structure đúng và `ui.apps` được populate.
10. [ ] Test: mở page của từng tenant, kiểm tra DOM chỉ load 1 tenant clientlib + shared dependencies.
11. [ ] Add CI step build và verify all tenants.

---

## See also

- [Coral UI](./coral-ui.md) - Granite UI fields trong dialogs
- [Overlays](./overlays.md) - Customise UI có sẵn của AEM
- [Touch UI](./touch-ui-2.md) - Author UI architecture
- [Render Conditions](./render-conditions.md) - Conditional UI elements
- [Custom Dialog Widgets](./custom-dialog-widgets.md) - Multi-tenant dialog widgets
- Client Libraries - Loading clientlibs với categories
- Editable Templates và Template Policies

---

## Tài liệu tham khảo

- [Multi-Tenancy UI Frontend Themes | Luca Nerlich](https://lucanerlich.com/aem/ui/multi-tenancy-support-ui-frontend/)
- [aem-clientlib-generator (npm)](https://www.npmjs.com/package/aem-clientlib-generator)
- [AEM Client Libraries — Adobe Docs](https://experienceleague.adobe.com/docs/experience-manager-65/developing/introduction/clientlibs.html)
- [AEM Style System](https://experienceleague.adobe.com/docs/experience-manager-65/authoring/siteandpage/style-system.html)
- [Vite](https://vitejs.dev/)
