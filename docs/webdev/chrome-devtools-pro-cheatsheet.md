---
title: Chrome DevTools — Pro Cheatsheet
description: Note kỹ thuật cá nhân về các tính năng Chrome DevTools cho web dev chuyên nghiệp.
---

# Chrome DevTools — Pro Cheatsheet

## Command Menu

`Ctrl+Shift+P` — fuzzy search mọi command. Thuộc cái này = thuộc DevTools.

| Lệnh | Việc |
| --- | --- |
| `Disable JavaScript` | Test progressive enhancement |
| `Show coverage` | Đo % CSS/JS dead code |
| `Show rendering` | FPS meter, paint flashing, layout shift regions |
| `Capture full size screenshot` | Screenshot toàn page kể cả overflow |
| `Capture node screenshot` | Screenshot 1 element |
| `Show changes` | Diff tất cả CSS sửa trong DevTools |
| `Disable cache` | (chỉ khi DevTools mở) |
| `Show network conditions` | Override User-Agent, Accept-Language |
| `More tools → Animations` | Tua/slowdown CSS animation |

`Ctrl+P` — quick open file. `Ctrl+O` cũng được.
`Ctrl+Shift+F` — search trong **toàn bộ** loaded resources.
`Ctrl+G` — go to line.
`Ctrl+Shift+O` — go to symbol trong file hiện tại.

---

## Elements

### Selection / navigation

- `H` — hide element (`visibility: hidden`).
- `Delete` — remove element khỏi DOM.
- `Ctrl+Z` — undo DOM/CSS changes trong DevTools.
- `$0` = element đang chọn. `$1`..`$4` = các element đã chọn trước.
- Drag node trong tree để đổi vị trí.
- Chuột phải → **Copy → Copy selector / Copy JS path / Copy XPath**. `Copy JS path` cho selector duy nhất an toàn (vd `document.querySelector("body > div:nth-child(2)")`).

### Styles panel

- Click property name → Tab → autocomplete value.
- `Shift+↑/↓` — tăng/giảm số 10 đơn vị. `Alt+↑/↓` — 0.1. `↑/↓` — 1.
- `:hov` — force pseudo-state (`:hover`, `:focus`, `:focus-within`, `:focus-visible`, `:active`, `:visited`, `:target`).
- `cls` — toggle class on/off real-time.
- `+` — thêm `element.style` rule mới.
- Click màu → color picker → click icon contrast → check WCAG AA/AAA.
- Section **Inherited from** — biết property kế thừa từ đâu.

### Computed tab

- Filter ô tìm property nhanh.
- Tick **Show all** để xem cả property browser default (vd `display: block` từ user agent stylesheet).
- Click property → expand → thấy **chain rule** override, gạch ngang rule thua specificity.

### Layout tab

- Grid overlay: click badge `grid` cạnh element. Tuỳ chỉnh: show line numbers, track sizes, area names.
- Flexbox overlay: tương tự với badge `flex`.
- Container queries: badge `container` nếu element là container.

### DOM breakpoint

Chuột phải element → **Break on**:
- `subtree modifications` — bất kỳ con nào thay đổi.
- `attribute modifications` — class/style/data-* đổi.
- `node removal` — element bị xoá.

Cực hữu ích khi không biết ai sửa DOM.

---

## Console

### API ngoài `console.log`

| API | Dùng khi |
| --- | --- |
| `console.table(arr, ['col1','col2'])` | Array of objects |
| `console.dir(node)` | Xem element dưới dạng object JS (thấy property internal) |
| `console.group/groupCollapsed/groupEnd` | Gom log theo cây |
| `console.time(label)` / `timeEnd(label)` / `timeLog(label)` | Đo thời gian |
| `console.count(label)` / `countReset` | Đếm số lần chạy |
| `console.assert(cond, msg)` | Log chỉ khi sai |
| `console.trace()` | Stack trace tại đây |
| `console.profile()` / `profileEnd()` | CPU profile có thể view ở Performance |
| `console.memory` | Heap size hiện tại (Chrome) |
| `%c text` | CSS-styled log: `console.log('%cHello', 'color:red;font-size:20px')` |
| `%o`, `%O`, `%d`, `%s` | Format specifiers như C printf |

### Console utilities (chỉ trong DevTools, không phải JS chuẩn)

| Util | Việc |
| --- | --- |
| `$_` | Kết quả expression cuối |
| `$0..$4` | Element đã chọn |
| `$(sel)` | `document.querySelector(sel)` |
| `$$(sel)` | `Array.from(document.querySelectorAll(sel))` |
| `$x('//xpath')` | XPath query |
| `copy(obj)` | Copy object vào clipboard (JSON nếu được) |
| `keys(obj)` / `values(obj)` | Liệt kê |
| `monitor(fn)` / `unmonitor(fn)` | Log mỗi lần fn được gọi với args |
| `monitorEvents(node, 'click')` | Log mọi event trên node |
| `getEventListeners(node)` | Trả về object `{click: [...], ...}` |
| `queryObjects(Class)` | Tìm mọi instance của Class còn trên heap |
| `inspect(node)` / `inspect(fn)` | Nhảy tới Elements/Sources |
| `debug(fn)` / `undebug(fn)` | Auto-break khi fn được gọi |
| `clear()` | Xoá console |

### Filter

- Top filter input:
  - `text` plain — substring.
  - `-text` — exclude.
  - `/regex/` — regex.
  - `url:foo.js` / `-url:foo.js` — theo source URL.
- Log level dropdown — Verbose/Info/Warning/Error.
- **Selected context only** — chỉ context (frame) đang chọn.
- Console sidebar (icon `≡`) — group theo source.

### Settings (gear)

- **Preserve log** — giữ log qua reload.
- **Selected context only**.
- **Eager evaluation** — preview kết quả khi gõ (tắt nếu gõ chậm).
- **Autocomplete from history**.
- **Group similar messages**.

### Live Expression

Icon mắt 👁 cạnh filter. Pin expression đánh giá liên tục (vd `performance.now()`, `document.activeElement`).

### Snippets

Sources → Snippets → New. Script reuse. `Ctrl+Enter` chạy. Chạy trong context của page hiện tại.

---

## Sources / Debugger

### Workspace

Sources → Filesystem → **+ Add folder to workspace** → cấp quyền. DevTools map file local ↔ network resource theo URL. Sửa CSS/JS trong DevTools = ghi thẳng file local.

### Overrides (khác workspace)

Override = lưu **copy local** mọi file đã sửa, browser dùng copy đó thay vì server response. Có thể override cả file của origin khác. Right-click request trong Network → **Override content** / **Override headers**.

### Breakpoint types

| Loại | Đặt ở đâu | Khi nào |
| --- | --- | --- |
| Line | Click số dòng | Cơ bản |
| Conditional | Right-click số dòng → Add conditional | `i === 100` |
| Logpoint | Right-click → Add logpoint | Log không cần sửa code |
| DOM | Elements panel | Bắt sửa DOM |
| XHR / fetch | Sources sidebar → XHR/fetch BPs → `+` | URL chứa substring |
| Event listener | Sources sidebar → Event Listener BPs | Mọi `click`, `keydown`, animation event… |
| Exception | Pause icon (||●) trên thanh debug | Caught / uncaught |
| Function | Console: `debug(fn)` | Khi fn được gọi |
| Trusted Type | Sources sidebar | CSP Trusted Types violation |

### Khi đang pause

- `F8` — resume.
- `F10` — step over.
- `F11` — step into.
- `Shift+F11` — step out.
- `F9` — step (theo từng statement).
- Right-click frame trong Call Stack → **Restart frame** — chạy lại function từ đầu mà không reset state ngoài.
- Right-click → **Copy stack trace**.
- **Scope** panel — local/closure/global. Hover variable trong code để xem value.
- **Watch** panel — pin expression.
- **Never pause here** — chuột phải breakpoint → bỏ qua hẳn dòng đó.

### Ignore list

Settings → **Ignore List** → regex pattern (vd `/node_modules/`, `webpack-internal:`). Stack trace ẩn frame match, step không nhảy vào, breakpoint không trigger. Chrome 110+ auto add các framework phổ biến.

Right-click stack frame → **Add script to ignore list**.

### Pretty print

Icon `{}` góc dưới — format file minified.

### Long stack traces

Async stack traces bật mặc định. Stack vẫn xuyên qua `setTimeout`, `Promise`, `fetch`. Tắt nếu chậm: Sources → ⋮ → **Disable async stack traces**.

### Source maps

Settings → Sources → tick **Enable JS source maps**, **Enable CSS source maps**. Trong panel, `Ctrl+P` → gõ tên file gốc (`.ts`, `.vue`, `.scss`). File có dấu `()` cuối là từ source map.

---

## Network

### Filter cú pháp

| Filter | Việc |
| --- | --- |
| `domain:example.com` | |
| `-domain:cdn.example.com` | Exclude |
| `method:POST` | |
| `status-code:404` | |
| `mime-type:application/json` | |
| `larger-than:100k` | |
| `is:from-cache` / `is:running` | |
| `priority:High` | |
| `has-response-header:Set-Cookie` | |
| `cookie-name:sessionid` | |
| `cookie-domain:.example.com` | |
| `set-cookie-domain:` | |

Plus filter type buttons: All / Doc / CSS / JS / Fetch/XHR / Font / Img / Media / Manifest / WS / Wasm / Other.

### Request inspect

Click request:
- **Headers** — request/response headers, query string.
- **Payload** — body (JSON/form-data parse sẵn).
- **Preview** — JSON tree, image preview, HTML render.
- **Response** — raw body.
- **Initiator** — stack trace tới điểm phát request.
- **Timing** — DNS / Connect / TLS / Stalled / TTFB / Download breakdown.
- **Cookies**.

### Replay request

Right-click → **Copy → Copy as fetch / cURL / PowerShell / Node.js fetch**. Paste vào Console để replay.
Right-click → **Replay XHR** (chỉ XHR/fetch).

### Throttling

- Top: throttle Network speed (Fast 3G / Slow 3G / Offline / custom).
- Performance tab: throttle CPU 4x/6x.

### Save / Load

Right-click → **Save all as HAR with content**. Drop file HAR vào panel để load. Đính HAR vào bug report.

### Other

- **Preserve log** — giữ log qua navigation.
- **Disable cache** — chỉ khi DevTools mở.
- **Big request rows** — thấy URL + path.
- **Group by frame** — gom request theo iframe.
- **Overview** — strip chart top, drag để filter timeline.

---

## Performance

### Record

`Ctrl+E` start/stop record. Để DevTools không lệch kết quả: throttle CPU 4x, throttle Network "Slow 3G", record `Reload`.

### Track

- **Frames** — screenshot từng frame, click để jump.
- **Timings** — User Timing API (`performance.mark`), Web Vitals markers (LCP, FCP, CLS, INP).
- **Network** — request waterfall.
- **Main** — JS execution, Style/Layout/Paint của main thread.
- **GPU**, **Compositor**, **Raster**.

### Reading

- Long task (>50ms) = thanh đỏ trên Main → JS block UI thread.
- Khối tím = Style/Layout (reflow). Quá nhiều = layout thrashing (đọc + ghi DOM xen kẽ).
- Khối xanh lá = Paint. Khối đỏ = Composite Layers.
- **Bottom-Up** — sort theo Self Time. Tìm function tốn nhất.
- **Call Tree** — top-down từ root call.
- **Event Log** — chronological flat list.

### Web Vitals

- LCP (Largest Contentful Paint) marker — element vẽ to nhất.
- CLS shift regions — hover marker → highlight element gây shift.
- INP (Interaction to Next Paint) — Chrome 121+, thay FID.

---

## Memory

### 3 cách

1. **Heap snapshot** — chụp instant heap. So sánh 2 snapshot (chọn dropdown "Comparison") để tìm leak.
2. **Allocation instrumentation on timeline** — record liên tục, thấy dải nào không được GC.
3. **Allocation sampling** — sampling thay full instrumentation, ít overhead.

### Quy trình tìm leak

1. Snapshot 1.
2. Tương tác app (open/close modal, navigate qua lại 5 lần).
3. Force GC (icon thùng rác).
4. Snapshot 2.
5. So sánh → filter **Objects allocated between Snapshot 1 and Snapshot 2** → object còn sót.
6. Mở reference chain → tìm "Retainer" giữ object sống.

Tips: `queryObjects(MyClass)` trong Console — liệt kê mọi instance còn live.

---

## Application

| Mục | Việc |
| --- | --- |
| **Manifest** | PWA manifest, install |
| **Service Workers** | Update / Unregister / push test / offline simulate |
| **Storage** | Quota, clear all |
| **Local / Session Storage** | Edit, delete |
| **IndexedDB** | Browse, edit value JSON |
| **Cookies** | Edit `HttpOnly` / `Secure` / `SameSite` / partition |
| **Cache Storage** | Service Worker cache |
| **Background Services** | Background Fetch, Sync, Push, Notifications — record event |
| **Frames** | Iframe tree, security context, headers, permissions policy |
| **Reporting API** | Deprecation, intervention reports |

---

## Rendering tab

Command menu → **Show Rendering**:

- **Paint flashing** — vùng repaint nháy xanh. Quá nhiều = optimize transform/opacity.
- **Layout shift regions** — flash xanh khi CLS xảy ra.
- **Layer borders**.
- **Frame rendering stats** — FPS, GPU mem.
- **Scrolling performance issues** — đánh dấu element gây jank khi scroll.
- **Highlight ad frames**.
- **Emulate CSS media** — `print`, `prefers-color-scheme: dark`, `prefers-reduced-motion`, `forced-colors`.
- **Emulate vision deficiencies** — blurred, achromatopsia, deuteranopia, protanopia, tritanopia.
- **Emulate focused page** — giữ focus state khi mở DevTools.

---

## Coverage tab

Command menu → **Show Coverage** → Record → reload. Output:
- Per file: % byte không dùng.
- Click file → highlight đỏ = unused.
- Export CSV/JSON.

Dùng để biết nên code-split / tree-shake file nào.

---

## Animations tab

Command menu → **Show Animations**. Capture group animation chạy gần đây.
- Slowdown 10% / 25% / 50%.
- Drag keyframe trên timeline.
- Edit `duration`, `delay` live.

---

## Lighthouse

Right panel built-in. Categories: Performance, Accessibility, Best Practices, SEO, PWA.

- Run trong **Incognito** + **disable extensions** để loại noise.
- "Treemap" sau khi run — xem bundle size composition.
- Lighthouse CLI: `npx lighthouse https://... --view`.

---

## Throttling cheatsheet

| Network preset | Latency | Down | Up |
| --- | ---: | ---: | ---: |
| Fast 4G | 20ms | 4Mb/s | 3Mb/s |
| Slow 4G | 150ms | 1.6Mb/s | 750Kb/s |
| 3G | 300ms | 750Kb/s | 250Kb/s |
| Offline | — | — | — |

CPU: 4x slowdown ~= mid-tier mobile. 6x ~= low-end.

---

## Device mode (`Ctrl+Shift+M`)

- Custom device → thêm device với UA + viewport + DPR riêng.
- **Show device frame** — bezel preview cho marketing screenshot.
- **Show media queries** — rulers hiển thị breakpoint.
- **Rulers** — px ruler quanh viewport.
- **Sensors** (More tools): Geolocation, Orientation, Idle state, Locale, Touch.

---

## Security tab

- Mixed content list.
- Cert details (issuer, expiry).
- Cookie SameSite/Secure issues.

---

## Issues tab

Aggregate panel cho: deprecation, mixed content, low contrast, CORS, cookie policy. Đỡ phải đọc Console hỗn loạn.

---

## Recorder (Ctrl+Shift+P → Show Recorder)

Ghi user flow → replay → export thành Puppeteer / Cypress / WebPageTest script. Có thể measure performance qua flow.

---

## Shortcut tổng hợp

| Shortcut | Việc |
| --- | --- |
| `F12` / `Ctrl+Shift+I` | Mở DevTools |
| `Ctrl+Shift+C` | Toggle Inspect element mode |
| `Ctrl+Shift+M` | Device toolbar |
| `Ctrl+Shift+P` | Command menu |
| `Ctrl+P` | Quick open file |
| `Ctrl+Shift+F` | Search all sources |
| `Ctrl+\` | Pause/resume debugger |
| `F8` | Resume |
| `F10/F11/Shift+F11` | Step over/into/out |
| `Ctrl+E` | Performance record start/stop |
| `Ctrl+R` / `F5` | Reload |
| `Ctrl+Shift+R` | Hard reload |
| `Esc` | Toggle Drawer (console dưới) |
| `Ctrl+[` / `Ctrl+]` | Tab trước/sau |

---

## Workflow mẫu

### Bug: "trang chậm load"

1. Performance → Throttle 4x CPU + Slow 4G → Record reload.
2. Đọc LCP marker → element nào là LCP?
3. Network → sort by Size, by Time → tìm asset to/chậm.
4. Coverage → record reload → JS/CSS unused %.
5. Lighthouse → audit để có recommendation cụ thể.

### Bug: "click không chạy"

1. Console → `getEventListeners($0)` → có listener không?
2. Event listener BP → click → bắt được không?
3. Nếu không bắt được → element bị `pointer-events: none` (Computed) hoặc bị overlay khác phủ (Elements → 3D view trong Layers).

### Bug: "memory leak"

1. Performance Monitor (Esc → tab Performance Monitor) — JS heap size, DOM Nodes theo thời gian.
2. Nếu thấy tăng dần không giảm → Memory → Heap snapshot diff (workflow ở mục Memory).

### Bug: "request 401 thỉnh thoảng"

1. Network → Preserve log + Disable cache.
2. Filter `status-code:401`.
3. Click request → Headers → so sánh Cookie/Authorization với request 200 trước đó.
4. Right-click → Copy as fetch → replay với cookie cũ trong Console để confirm.
