# OSGi Configuration

---

## 1. Quy ước lưu cấu hình trong code (bắt buộc cho production)

OSGi config phải được deploy bằng code (content package), không chỉnh tay trong Felix Console.

- Dễ review qua PR
- Có lịch sử Git
- Đồng nhất giữa môi trường
- Tránh drift cấu hình do thao tác thủ công

Felix Console chỉ dùng để debug nhanh, sau đó phải “chuyển hóa” lại thành `.cfg.json` trong repo.

---

## 2. Cấu trúc thư mục `ui.config` và run modes

Vị trí chuẩn:

```text
ui.config/
└── src/main/content/jcr_root/apps/<app>/osgiconfig/
    ├── config/                 # all
    ├── config.author/          # author only
    ├── config.publish/         # publish only
    ├── config.author.dev/      # author + dev
    ├── config.author.stage/    # author + stage
    ├── config.author.prod/     # author + prod
    ├── config.publish.dev/     # publish + dev
    ├── config.publish.stage/   # publish + stage
    └── config.publish.prod/    # publish + prod
```

### Resolution rule

AEM chọn config theo mức độ “cụ thể” từ cao xuống thấp. PID xuất hiện ở nhiều folder thì folder “cụ thể hơn” sẽ thắng.

Ví dụ: đặt cùng PID ở `config/` và `config.author.dev/` thì Author chạy run modes `author,dev` sẽ lấy bản `config.author.dev/`.

### Run mode folder case-sensitive

Chỉ dùng lowercase. `config.Author/` sẽ bị bỏ qua.

---

## 3. Quy tắc đặt tên file (PID)

Tất cả dùng `.cfg.json`.

### Singleton config

Một instance cấu hình duy nhất:

```text
com.myproject.core.services.impl.MyServiceImpl.cfg.json
```

### Factory config

Nhiều instance, dùng `~&lt;id&gt;`:

```text
com.myproject.core.services.impl.MyServiceImpl~site-a.cfg.json
com.myproject.core.services.impl.MyServiceImpl~site-b.cfg.json
```

`&lt;id&gt;` chỉ để phân biệt, không ảnh hưởng logic runtime.

### Lỗi nguy hiểm nhất: PID typo

Sai 1 ký tự trong filename = config bị ignore “im lặng”. Cách tránh:

- Copy-paste FQCN của component/`@Designate` PID từ code
- Thêm CI check (xem mục 10)

---

## 4. Kiểu dữ liệu trong `.cfg.json`

| JSON | OSGi | Ví dụ |
|---|---|---|
| string | `String` | `"https://api.example.com"` |
| boolean | `Boolean` | `true` |
| number | `Integer`/`Long` | `100` |
| float | `Float`/`Double` | `3.14` |
| array | `String[]` | `["jpg","png"]` |

Ví dụ đầy đủ:

```json
{
  "enabled": true,
  "syncIntervalMinutes": 30,
  "endpoint": "https://dam-api.example.com/v2",
  "allowedMimeTypes": [
    "image/jpeg",
    "image/png",
    "application/pdf"
  ],
  "maxRetries": 3,
  "connectionTimeoutMs": 5000,
  "verboseLogging": false
}
```

---

## 5. Typed config (chuẩn code AEM 6.5)

Mục tiêu: schema rõ ràng, có UI trong `/system/console/configMgr`, inject type-safe.

### 5.1. `@ObjectClassDefinition`

```java
package com.myproject.core.config;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

@ObjectClassDefinition(
    name = "MyProject - Asset Sync Service",
    description = "Controls the remote DAM synchronisation service."
)
public @interface AssetSyncConfig {

    @AttributeDefinition(
        name = "Enabled",
        description = "Enable or disable the sync service."
    )
    boolean enabled() default false;

    @AttributeDefinition(
        name = "Sync Interval (minutes)",
        description = "How often the sync job runs."
    )
    int syncIntervalMinutes() default 30;

    @AttributeDefinition(
        name = "Remote Endpoint",
        description = "Base URL of the remote DAM API."
    )
    String endpoint() default "https://dam-api.example.com/v2";

    @AttributeDefinition(
        name = "Allowed MIME Types",
        description = "List of MIME types that will be synchronised."
    )
    String[] allowedMimeTypes() default { "image/jpeg", "image/png" };

    @AttributeDefinition(
        name = "Max Retries",
        description = "Number of retry attempts on failure."
    )
    int maxRetries() default 3;
}
```

### 5.2. `@Designate` + `@Activate/@Modified`

```java
package com.myproject.core.services.impl;

import com.myproject.core.config.AssetSyncConfig;
import com.myproject.core.services.AssetSyncService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.metatype.annotations.Designate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component(service = AssetSyncService.class, immediate = true)
@Designate(ocd = AssetSyncConfig.class)
public class AssetSyncServiceImpl implements AssetSyncService {

    private static final Logger LOG = LoggerFactory.getLogger(AssetSyncServiceImpl.class);

    private volatile boolean enabled;
    private volatile int syncIntervalMinutes;
    private volatile String endpoint;
    private volatile String[] allowedMimeTypes;
    private volatile int maxRetries;

    @Activate
    @Modified
    protected void activate(AssetSyncConfig config) {
        this.enabled = config.enabled();
        this.syncIntervalMinutes = config.syncIntervalMinutes();
        this.endpoint = config.endpoint();
        this.allowedMimeTypes = config.allowedMimeTypes();
        this.maxRetries = config.maxRetries();

        LOG.info("AssetSync enabled={}, interval={}m, endpoint={}",
            enabled, syncIntervalMinutes, endpoint);
    }

    @Override
    public void sync() {
        if (!enabled) {
            return;
        }
        // sync logic...
    }
}
```

Gắn `@Modified` để AEM apply config runtime mà không restart bundle.

---

## 6. Secret values trên AEM 6.5 (on-prem)

Không commit secret plaintext vào Git.

Cách phổ biến trên AEM 6.5:

1. Mở `http://&lt;host&gt;:4502/system/console/crypto`
2. Encrypt secret → nhận chuỗi dạng `\{enc:...\}`
3. Put giá trị `\{enc:...\}` vào `.cfg.json`

Ghi chú vận hành:

- Key crypto mang tính instance-specific → chuyển encrypted string sang instance khác có thể không decrypt được, thường phải encrypt lại theo từng môi trường.
- Trong prod, quản trị secret nên đi qua quy trình vận hành (vault/secrets manager + automation). Nếu chưa có, crypto console là baseline tối thiểu.

---

## 7. Felix Console — dùng để quan sát, không dùng để “cấu hình thật”

Các URL hay dùng:

| URL | Dùng để |
|---|---|
| `/system/console/configMgr` | xem/edit config runtime (debug) |
| `/system/console/bundles` | trạng thái bundle |
| `/system/console/components` | DS component status |
| `/system/console/services` | danh sách OSGi services |

Nếu chỉnh trong console, config sẽ nằm ở JCR (thường dưới `/apps/system/config`) và **bị overwrite** ở lần deploy kế tiếp.

---

## 8. Các PID AEM hay cấu hình (AEM 6.5)

| Service | PID | Nội dung hay chỉnh |
|---|---|---|
| Sling Referrer Filter | `org.apache.sling.security.impl.ReferrerFilter` | allowed hosts, allow empty |
| Externalizer | `com.day.cq.commons.impl.ExternalizerImpl` | domain mappings theo run mode |
| Sling Logging | `org.apache.sling.commons.log.LogManager` | level, file, pattern |
| Sling Logger (factory) | `org.apache.sling.commons.log.LogManager.factory.config` | per-package log level |
| CSRF Filter | `com.adobe.granite.csrf.impl.CSRFFilter` | excluded paths |
| CORS Policy | `com.adobe.granite.cors.impl.CORSPolicyImpl` | origins/methods/headers |

---

## 9. Pitfalls và checklist deploy

Pitfalls:

- Sai run mode folder (đặt publish config vào `config.author/`)
- Quên `~id` cho factory config
- PID typo (config bị ignore)
- Quên `.cfg.json`
- `filter.xml` không include `/apps/&lt;app&gt;/osgiconfig`

Checklist:

- [ ] File nằm đúng folder run mode
- [ ] Filename PID đúng tuyệt đối
- [ ] Factory config có `~&lt;id&gt;`
- [ ] Package filter include path `.../osgiconfig`
- [ ] Sau deploy, check `/system/console/configMgr` thấy config đã apply

---

## 10. Validate config trong CI (giảm lỗi production)

Mục tiêu: bắt lỗi PID typo trước khi lên môi trường.

Hướng làm thực dụng:

- Parse filenames dưới `ui.config/.../osgiconfig/**`
- Với singleton: lấy PID = filename (bỏ `.cfg.json`)
- Với factory: lấy PID = phần trước `~`
- So sánh PID với:
  - `@Component` FQCN (nếu dùng PID theo class)
  - hoặc `@Designate(ocd=...)` PID tuỳ cách project đặt

Chỉ cần fail build khi có PID không match (hoặc nằm ngoài whitelist) là đã giảm đáng kể lỗi “config không ăn”.

---

## Tham khảo

- [OSGi Metatype Annotations](https://docs.osgi.org/specification/osgi.cmpn/7.0.0/service.metatype.html)
