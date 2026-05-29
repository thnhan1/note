# Debug Setup cho AEM Project Archetype

Hướng dẫn cấu hình debug đúng cách cho AEM 6.5 project tạo từ AEM Maven Archetype.

## 1. Enable Remote Debug trên AEM Instance

### Start script (Windows)

Thêm JVM debug args vào `start.bat` hoặc file start script:

```bat
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 ^
  -jar aem-author-p4502.jar -nointeractive
```

### Start script (Linux/Mac)

```bash
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 \
  -jar aem-author-p4502.jar -nointeractive
```

### Giải thích params

| Param | Ý nghĩa |
|-------|----------|
| `transport=dt_socket` | Dùng socket TCP |
| `server=y` | AEM là debug server, IDE connect tới |
| `suspend=n` | Không chờ debugger attach mới start (`y` nếu muốn debug startup) |
| `address=*:5005` | Listen trên port 5005, `*` cho phép remote connect |

### Verify debug port

```bash
netstat -an | findstr 5005
```

Nếu thấy `LISTENING` → debug port đã sẵn sàng.

---

## 2. IntelliJ IDEA — Remote Debug Config

### Tạo Run Configuration

1. **Run → Edit Configurations → + → Remote JVM Debug**
2. Cấu hình:
   - **Name**: `AEM Author Debug`
   - **Debugger mode**: Attach to remote JVM
   - **Host**: `localhost`
   - **Port**: `5005`
   - **Use module classpath**: chọn module `core` của project

### Module structure chuẩn archetype

```
mysite/
├── core/            ← Java bundle (Sling Models, Servlets, Services)
├── ui.apps/         ← Components, templates, configs (JCR content)
├── ui.content/      ← Content pages, DAM assets
├── ui.frontend/     ← Frontend build (webpack/vite)
├── ui.config/       ← OSGi configurations
├── it.tests/        ← Integration tests
└── dispatcher/      ← Dispatcher configs
```

**Chọn `core` module** vì đây là nơi chứa Java code cần debug.

### Attach debugger

1. Click **Debug** (icon con bọ) trên configuration vừa tạo
2. Console hiện: `Connected to the target VM, address: 'localhost:5005'`
3. Đặt breakpoint trong Sling Model / Servlet → trigger request tới AEM

---

## 3. VSCode — Remote Debug Config

Tạo `.vscode/launch.json`:

<Tabs>
  <Tab label=".vscode/launch.json">

  ```json
  {
      // Use IntelliSense to learn about possible attributes.
      // Hover to view descriptions of existing attributes.
      // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
      "version": "0.2.0",
      "configurations": [
          {
              "type": "java",
              "name": "Debug Attach",
              "request": "attach",
              "hostName": "localhost",
              "port": 30303,
              "projectName": "nhansite.core"
          }
      ]
  }
  ```

  </Tab>
</Tabs>
Cần extension **Extension Pack for Java** (Microsoft).

---

## 4. Debug Sling Model

### Đặt breakpoint đúng chỗ

```java
@Model(adaptables = SlingHttpServletRequest.class,
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class EventDetailModel {

    @ValueMapValue
    private String title;       // ← breakpoint ở đây không dừng

    @PostConstruct              // ← breakpoint ở đây SẼ dừng
    protected void init() {
        // logic khởi tạo
    }

    public String getTitle() {  // ← breakpoint ở đây dừng khi HTL gọi
        return title;
    }
}
```

**Lưu ý:**
- Field injection (`@ValueMapValue`) không có dòng code thực thi → không dừng breakpoint
- Dùng `@PostConstruct` method hoặc getter để đặt breakpoint

### Trigger Sling Model

Mở page trên browser hoặc curl:
```
http://localhost:4502/content/mysite/en/my-page.html
```

AEM sẽ adapt request → Sling Model → hit breakpoint.

---

## 5. Debug Servlet

```java
@Component(service = Servlet.class)
@SlingServletPaths("/bin/mysite/events")
public class EventServlet extends SlingAllMethodsServlet {

    @Override
    protected void doGet(SlingHttpServletRequest request, 
                         SlingHttpServletResponse response) {
        // ← breakpoint ở đây
        String path = request.getParameter("path");
    }
}
```

Trigger:
```
http://localhost:4502/bin/mysite/events?path=/etc/mysitedatabase/events/event-1
```

---

## 6. Debug Workflow Process

```java
@Component(service = WorkflowProcess.class,
           property = {"process.label=My Custom Step"})
public class CustomWorkflowStep implements WorkflowProcess {

    @Override
    public void execute(WorkItem workItem, WorkflowSession session, 
                        MetaDataMap args) {
        // ← breakpoint ở đây
    }
}
```

Trigger bằng cách chạy workflow trên 1 page/asset trong AEM.

---

## 7. Debug OSGi Service

```java
@Component(service = EventService.class)
public class EventServiceImpl implements EventService {

    @Activate
    protected void activate(ComponentContext ctx) {
        // ← breakpoint: debug service startup
    }

    @Override
    public List<Event> getEvents(String path) {
        // ← breakpoint: debug khi service được gọi
        return Collections.emptyList();
    }
}
```

---

## 8. Hot Deploy code khi debug

### Dùng Maven auto-deploy

```bash
cd core
mvn clean install -PautoInstallBundle
```

Chỉ build và deploy module `core` → nhanh hơn full build.

### Profile trong parent `pom.xml`

```xml
<profile>
    <id>autoInstallBundle</id>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.sling</groupId>
                <artifactId>sling-maven-plugin</artifactId>
                <executions>
                    <execution>
                        <id>install-bundle</id>
                        <goals><goal>install</goal></goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</profile>
```

### Auto-deploy ui.apps (components, HTL, dialog)

```bash
cd ui.apps
mvn clean install -PautoInstallPackage
```

### IntelliJ HotSwap

Khi đang debug, sửa code nhỏ (method body) → **Build → Recompile** → IntelliJ sẽ HotSwap bytecode vào AEM process mà không cần redeploy. Chỉ hoạt động với thay đổi nhỏ (không thêm method/field mới).

---

## 9. Debug Frontend (ui.frontend)

### Proxy dev server tới AEM

Trong `ui.frontend/webpack.dev.js` hoặc `vite.config.js`:

```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/content': 'http://localhost:4502',
      '/etc.clientlibs': 'http://localhost:4502',
      '/libs': 'http://localhost:4502',
    }
  }
}
```

### Sync clientlibs

```bash
cd ui.frontend
npm run dev        # watch mode
# Hoặc
npm run build && cd ../ui.apps && mvn install -PautoInstallPackage
```

---

## 10. Logging cho debug

### Thêm logger trong code

```java
private static final Logger LOG = LoggerFactory.getLogger(EventDetailModel.class);

@PostConstruct
protected void init() {
    LOG.debug("EventDetailModel init - path: {}", resource.getPath());
    LOG.debug("title={}, location={}", title, location);
}
```

### Cấu hình log level runtime

**Felix Console** → `http://localhost:4502/system/console/slinglog`

Hoặc tạo OSGi config:

```
/ui.config/src/main/content/jcr_root/apps/mysite/osgiconfig/config.author/
  org.apache.sling.commons.log.LogManager.factory.config-mysite.cfg.json
```

```json
{
  "org.apache.sling.commons.log.level": "DEBUG",
  "org.apache.sling.commons.log.file": "logs/mysite.log",
  "org.apache.sling.commons.log.names": [
    "com.mysite"
  ]
}
```

### Xem log realtime

```bash
tail -f crx-quickstart/logs/error.log | grep "com.mysite"
tail -f crx-quickstart/logs/mysite.log
```

---

## 11. Common Issues

| Vấn đề | Nguyên nhân | Fix |
|---------|-------------|-----|
| Breakpoint không dừng | Code chưa deploy hoặc class version mismatch | Redeploy `core` bundle |
| `Connection refused` port 5005 | AEM chưa start với debug flag | Check start script |
| Breakpoint dừng nhưng variables `null` | Build không có debug info | Thêm `-g` flag hoặc check Maven compiler plugin |
| HotSwap failed | Thay đổi quá lớn (thêm field/method) | Redeploy bundle |
| Source mismatch | Local code khác deployed code | `mvn clean install -PautoInstallBundle` lại |

### Kiểm tra bundle đã deploy đúng version

```
http://localhost:4502/system/console/bundles
```

Search tên bundle → xem **Version** và **Status** (phải là `Active`).

---

## 12. Debug Publish Instance

Cùng setup, thay port:

```bash
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5006 \
  -jar aem-publish-p4503.jar -nointeractive
```

IntelliJ config thứ 2 với port `5006`.
