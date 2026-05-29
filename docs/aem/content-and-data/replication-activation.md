# Replication và Activation — AEM 6.5 On-Premise

> Phạm vi: AEM 6.5 on-premise, kiến trúc Author → Publish → Dispatcher

---

## 1. Tổng Quan: Replication Là Gì?

Replication là cơ chế AEM dùng để chuyển nội dung từ **Author** sang một hoặc nhiều **Publish** instance. Khi author nhấn "Publish" (hay "Activate"), AEM thực hiện theo pipeline 4 bước:

```
Author (trigger) → Serialize JCR nodes → Transport HTTP(S) → Publish (deserialize & install)
```

1. **Trigger** — Author activate page thủ công, qua workflow, hoặc programmatically
2. **Serialize** — Replication agent đọc các node từ JCR, đóng gói thành payload
3. **Transport** — Payload được gửi qua HTTP/HTTPS tới publish receiver servlet
4. **Deserialize & Install** — Publish giải nén payload, ghi vào JCR của nó

> **Lưu ý quan trọng:** AEM chỉ serialize page node và subtree `jcr:content` của nó. **Assets và components được tham chiếu không tự động được include** — phải activate riêng hoặc qua workflow xử lý references.

---

## 2. Replication Agents

Replication agent là đối tượng cấu hình quyết định **gửi đi đâu** và **gửi như thế nào**.

### Vị trí mặc định trên Author

```
/etc/replication/agents.author/
```

Truy cập agent mặc định:
```
http://localhost:4502/etc/replication/agents.author/publish.html
```

### Các thuộc tính quan trọng

| Thuộc tính | Key | Mô tả |
|---|---|---|
| Transport URI | `transportUri` | URL của publish receiver, VD: `http://publish:4503/bin/receive?sling:authRequestLogin=1` |
| Transport User | `transportUser` | User trên publish instance để ghi content |
| Transport Password | `transportPassword` | Password đã được encrypt |
| Trigger | `triggers` | `onModification`, `onDistribute`, `onOffTime`, hoặc manual |
| Enabled | `enabled` | `true`/`false` — agent disabled sẽ drop request không báo lỗi |
| Retry Delay | `retryDelay` | Milliseconds giữa các lần retry (default: 60000) |
| Max Retries | `maxRetries` | Số lần retry trước khi mark failed |
| Log Level | `logLevel` | `error`, `info`, `debug` |

> **Bảo mật:** Luôn dùng **dedicated service user** với quyền tối thiểu cho `transportUser`. Không bao giờ dùng `admin` trong production.

### Tạo agent qua CRXDE

Tạo node type `cq:Page` tại `/etc/replication/agents.author/my-agent` với `jcr:content`:

```xml
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
           xmlns:cq="http://www.day.com/jcr/cq/1.0"
           jcr:primaryType="cq:Page">
    <jcr:content
        jcr:primaryType="nt:unstructured"
        jcr:title="Publish Agent – Region EU"
        sling:resourceType="cq/replication/components/agent"
        enabled="true"
        transportUri="http://publish-eu:4503/bin/receive?sling:authRequestLogin=1"
        transportUser="replication-service"
        transportPassword="{encrypted-value}"
        retryDelay="30000"
        logLevel="info"
        triggers="onDistribute"/>
</jcr:root>
```

---

## 3. Flush Agents — Dispatcher Cache Invalidation

Flush agent là loại replication agent đặc biệt: mục đích **không phải replicate content** mà là **báo cho Dispatcher xóa cache** khi content thay đổi.

### Cơ chế hoạt động

```
Author activate page
    → Flush agent gửi HTTP request đến Dispatcher
    → Dispatcher nhận request, xóa/đánh dấu stale các cached file
    → Request tiếp theo sẽ lấy nội dung mới từ Publish
```

### Cấu hình

Transport URI trỏ đến Dispatcher invalidation endpoint:
```
http://dispatcher:80/dispatcher/invalidate.cache
```

### Headers gửi đến Dispatcher

| Header | Ví dụ | Mô tả |
|--------|-------|-------|
| `CQ-Action` | `Activate` hoặc `Deactivate` | Loại action |
| `CQ-Handle` | `/content/mysite/en/page` | Path vừa được activate |
| `CQ-Path` | `/content/mysite/en/page` | Alias của `CQ-Handle` |
| `Content-Type` | `application/octet-stream` | Bắt buộc |
| `Content-Length` | `0` | Không có body |

> Cấu hình section `/invalidate` trong `dispatcher.any` để giới hạn path nào được flush, tránh cache miss lan rộng sang các site tree khác.

---

## 4. Programmatic Replication

AEM 6.5 expose service `Replicator` để trigger replication từ Java code — dùng trong workflow, servlet, hoặc scheduled job.

### Activate / Deactivate cơ bản

```java
import com.day.cq.replication.ReplicationActionType;
import com.day.cq.replication.ReplicationException;
import com.day.cq.replication.Replicator;

@Reference
private Replicator replicator;

public void activatePage(ResourceResolver resolver, String path)
        throws ReplicationException {
    Session session = resolver.adaptTo(Session.class);
    replicator.replicate(session, ReplicationActionType.ACTIVATE, path);
}

public void deactivatePage(ResourceResolver resolver, String path)
        throws ReplicationException {
    Session session = resolver.adaptTo(Session.class);
    replicator.replicate(session, ReplicationActionType.DEACTIVATE, path);
}
```

### Replicate tới agent cụ thể

```java
import com.day.cq.replication.AgentFilter;
import com.day.cq.replication.ReplicationOptions;

public void activateToSpecificAgent(ResourceResolver resolver, String path)
        throws ReplicationException {

    ReplicationOptions options = new ReplicationOptions();

    // Chỉ gửi tới agent có ID "publish-eu"
    options.setFilter(agent -> "publish-eu".equals(agent.getId()));

    // Không tạo version mới khi replicate
    options.setSuppressVersions(true);

    Session session = resolver.adaptTo(Session.class);
    replicator.replicate(session, ReplicationActionType.ACTIVATE, path, options);
}
```

> **Lưu ý:** `Session` phải đến từ service user có quyền replication — không dùng session từ HTTP request trong servlet context.

---

## 5. Tree Activation

Tree Activation publish toàn bộ một subtree chỉ với một thao tác, thay vì activate từng page.

### Qua UI

1. Vào **Tools → Replication → Tree Activation**
2. Set **Start Path** (VD: `/content/mysite/en`)
3. Tùy chọn **Modified Only** — bỏ qua các page chưa thay đổi
4. Tùy chọn **Dry Run** — preview trước khi thực thi
5. Nhấn **Activate**

### Programmatic

```java
public void activateTree(ResourceResolver resolver, String rootPath)
        throws ReplicationException {

    Session session = resolver.adaptTo(Session.class);
    Resource root = resolver.getResource(rootPath);
    if (root == null) return;

    replicator.replicate(session, ReplicationActionType.ACTIVATE, rootPath);

    for (Resource child : root.getChildren()) {
        String primaryType = child.getValueMap().get("jcr:primaryType", "");
        if ("cq:Page".equals(primaryType)) {
            activateTree(resolver, child.getPath());
        }
    }
}
```

> **Với subtree lớn (hàng nghìn page):** dùng **Managed Publishing** workflow hoặc Sling Job chạy background để tránh HTTP timeout và queue overload.

---

## 6. Reverse Replication

Reverse replication chuyển content ngược chiều — từ **Publish về Author**. Dùng khi content phát sinh trên publish tier.

### Cơ chế

```
Publish ghi vào outbox (/var/replication/outbox)
    → Author polling outbox định kỳ
    → Author kéo content về inbox (/var/replication/inbox)
    → Xử lý tự động hoặc review thủ công
```

### Nên dùng khi

- Form submission data cần tổng hợp về author
- User-generated content (UGC) từ AEM Communities
- Analytics hoặc feedback data phát sinh trên publish

### Không nên dùng khi

- Luồng data lớn — reverse replication không thiết kế cho bulk transfer
- Yêu cầu realtime — polling có độ trễ
- Nên dùng external database hoặc API riêng khi data volume cao

---

## 7. Replication Queue Monitoring

Monitoring queue là thiết yếu để đảm bảo pipeline publish ổn định.

### Truy cập Queue

```
/etc/replication/agents.author/publish/queue
```

Hoặc qua Touch UI:
```
Tools → Deployment → Replication → Agents on Author → publish → Queue
```

### Nguyên nhân queue bị stall

| Nguyên nhân | Triệu chứng | Giải pháp |
|---|---|---|
| Publish instance down | "Connection refused" trong agent log | Restart publish, kiểm tra network |
| Sai credentials | 401 Unauthorized trong agent log | Cập nhật `transportUser` / `transportPassword` |
| Asset binary quá lớn | Queue item stuck, transfer chậm | Tăng timeout, xem xét async transfer |
| Serialization error | `ReplicationException` trong log | Kiểm tra content integrity, xóa corrupt nodes |
| Item failed chặn queue | Các item sau không được xử lý | Clear hoặc retry item failed từ Queue UI |

### Retry behavior

Khi replicate thất bại, agent retry theo `retryDelay` và `maxRetries`. Sau khi hết retry, item ở trạng thái **failed** — admin phải retry hoặc xóa thủ công.

> **FIFO blocking:** Một item failed sẽ block tất cả item phía sau trong queue. Cần monitor proactively và set alert khi queue depth vượt ngưỡng.

---

## 8. Lỗi Thường Gặp

**1. References không được activate**
Publish một page không tự động publish assets liên kết, Content Fragments, hay Experience Fragments được reference. Dùng panel **References** trong Sites console để kiểm tra và publish dependencies.

**2. Queue backlog làm chậm publish**
Tree activation lớn hoặc bulk import có thể làm ngập queue. Chia nhỏ hoặc schedule vào off-peak.

**3. Publish content chưa hoàn thiện**
Không có workflow review/approval → author vô tình publish page draft. Enforce workflow trên các content path quan trọng.

**4. Quên activate templates và policies**
Page sẽ không render đúng trên publish nếu template, editable template policies, hoặc clientlibs chưa được deploy/activate. Luôn verify infrastructure content đồng bộ.

**5. Credentials của transport user hết hạn**
Nếu password của transport user thay đổi trên publish nhưng không cập nhật trong agent config, replication fail mà không có cảnh báo rõ ràng. Dùng service user với non-expiring credentials.

**6. Thiếu Dispatcher flush**
Content đã activate trên publish nhưng visitor vẫn thấy nội dung cũ vì Dispatcher cache chưa được invalidate. Đảm bảo flush agent được cấu hình và healthy.

**7. Circular replication**
Cấu hình nhầm khiến author replicate sang publish và publish replicate ngược lại author → vòng lặp vô tận. Kiểm tra kỹ outbox/inbox path của reverse replication agent.

---

## 9. Checklist Cấu Hình Replication AEM 6.5

- [ ] Replication agent sử dụng dedicated service user, không dùng `admin`
- [ ] `transportPassword` được encrypt (không plaintext trong JCR)
- [ ] Flush agent đã cấu hình đúng Transport URI tới Dispatcher
- [ ] Test queue bằng cách activate một page thủ công, kiểm tra log agent
- [ ] Monitor queue tại `/etc/replication/agents.author/publish/queue`
- [ ] Có alert khi queue depth vượt ngưỡng hoặc có item failed
- [ ] References panel được kiểm tra trước khi publish page quan trọng
- [ ] Template và clientlibs đã được deploy lên publish trước khi publish content

---

## Tham Khảo

- [Replication (AEM 6.5)](https://experienceleague.adobe.com/en/docs/experience-manager-65/content/implementing/deploying/configuring/replication) — Adobe Experience League
- [Dispatcher Configuration](https://experienceleague.adobe.com/en/docs/experience-manager-dispatcher/using/configuring/dispatcher-configuration) — Adobe Experience League
