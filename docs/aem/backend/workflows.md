# AEM Workflows — AEM 6.5 On-Premise

---

## 1. Workflow Models và Instances

### Model

Workflow model la blueprint dinh nghia cac buoc, routes, va logic. Luu tai:

```
/conf/global/settings/workflow/models/   ← editable (draft)
/var/workflow/models/                    ← runtime (compiled, sau khi Sync)
```

Khi edit model trong Workflow Editor, AEM tao version moi. **Phai click Sync** de publish model sang `/var/workflow/models/`. Chua Sync = chua co hieu luc.

### Instance

Khi model duoc start voi payload, AEM tao workflow instance — ban running theo doi current step, assignments, metadata:

```
/var/workflow/instances/            ← active instances
/var/workflow/instances/server0/    ← clustered: phan chia theo server
```

### Lifecycle states

| State | Mo ta |
|---|---|
| RUNNING | Dang chay, cho step hoan thanh |
| COMPLETED | Tat ca steps da xong |
| ABORTED | Admin da terminate |
| SUSPENDED | Tam dung, co the resume |
| STALE | Instance tham chieu model version khong con ton tai |

---

## 2. Workflow Launchers

Launcher tu dong start workflow khi JCR event match dieu kien. Cau hinh tai:

```
/conf/global/settings/workflow/launcher/config/
```

### Cac thuoc tinh launcher

| Property | Muc dich | Vi du |
|---|---|---|
| `eventType` | JCR event type (1 = node added, 16 = modified) | `\{Long\}16` |
| `nodetype` | Node type match | `cq:PageContent` |
| `glob` | Path pattern | `/content/mysite/.*` |
| `workflow` | Model de start | `/var/workflow/models/request_for_activation` |
| `runModes` | Run modes hoat dong | `author` |
| `condition` | Dieu kien bo sung | `jcr:content/cq:template==/conf/.../page` |
| `excludeList` | Properties bo qua (chong re-trigger) | `jcr:lastModified,cq:lastModified` |
| `enabled` | Bat/tat | `\{Boolean\}true` |

**`excludeList` la bat buoc** khi workflow modify payload. Khong co excludeList = workflow tu re-trigger chinh no = infinite loop.

### Disable launcher qua overlay (deploy trong code package)

Tao overlay tai `/conf/global/settings/workflow/launcher/config/&lt;launcher-name&gt;/.content.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
    jcr:primaryType="cq:WorkflowLauncher"
    enabled="{Boolean}false"
    eventType="{Long}1"
    glob="/var/mailimport"
    nodetype="nt:unstructured"
    runModes="author"
    workflow="/var/workflow/models/newsletter_bounce_check"/>
```

Them vao `META-INF/vault/filter.xml`:

```xml
<filter root="/conf/global/settings/workflow/launcher/config/newsletter_bounce_check"/>
```

---

## 3. Cac Loai Workflow Step

| Step | Muc dich | Assignment |
|---|---|---|
| **Participant Step** | Gan task cho user/group qua Inbox | Static user/group |
| **Dialog Participant Step** | Nhu Participant nhung mo dialog de dien data | Static + form |
| **Dynamic Participant Step** | Route toi user/group xac dinh runtime boi `ParticipantStepChooser` | Programmatic |
| **Process Step** | Chay Java `WorkflowProcess` tu dong | None (system) |
| **OR Split** | Decision point: evaluate dieu kien tren moi branch | Rule-based |
| **AND Split / AND Join** | Chia parallel branches, cho tat ca hoan thanh | Parallel |
| **Goto Step** | Nhay ve step truoc (tao loop) | N/A |
| **External Process Step** | Goi external system, cho callback | External |

---

## 4. Custom Process Step

Implement `WorkflowProcess` de chay Java code tu dong khi workflow den step do:

```java
package com.myproject.core.workflow;

import com.adobe.granite.workflow.WorkflowException;
import com.adobe.granite.workflow.WorkflowSession;
import com.adobe.granite.workflow.exec.WorkItem;
import com.adobe.granite.workflow.exec.WorkflowProcess;
import com.adobe.granite.workflow.metadata.MetaDataMap;
import org.apache.sling.api.resource.ModifiableValueMap;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;

@Component(
    service = WorkflowProcess.class,
    property = {
        "process.label=My Project - Auto Tag Pages"
    }
)
public class AutoTagProcessStep implements WorkflowProcess {

    private static final Logger LOG = LoggerFactory.getLogger(AutoTagProcessStep.class);

    @Override
    public void execute(WorkItem workItem, WorkflowSession workflowSession,
                        MetaDataMap metaDataMap) throws WorkflowException {

        String payloadPath = workItem.getWorkflowData().getPayload().toString();
        LOG.info("Processing payload: {}", payloadPath);

        // Doc process step arguments (cau hinh trong model editor)
        String tagNamespace = metaDataMap.get("PROCESS_ARGS", "myproject:");

        ResourceResolver resolver = workflowSession.adaptTo(ResourceResolver.class);
        if (resolver == null) {
            throw new WorkflowException("Could not obtain ResourceResolver");
        }

        Resource contentResource = resolver.getResource(payloadPath + "/jcr:content");
        if (contentResource == null) {
            LOG.warn("No jcr:content at {}", payloadPath);
            return;
        }

        ModifiableValueMap properties = contentResource.adaptTo(ModifiableValueMap.class);
        if (properties == null) return;

        String title = properties.get("jcr:title", "");
        if (title.toLowerCase().contains("news")) {
            String[] existingTags = properties.get("cq:tags", new String[0]);
            String newTag = tagNamespace + "content-type/news";

            if (!Arrays.asList(existingTags).contains(newTag)) {
                String[] updatedTags = Arrays.copyOf(existingTags, existingTags.length + 1);
                updatedTags[existingTags.length] = newTag;
                properties.put("cq:tags", updatedTags);
                LOG.info("Tagged {} with {}", payloadPath, newTag);
            }
        }

        try {
            resolver.commit();
        } catch (Exception e) {
            throw new WorkflowException("Failed to commit changes", e);
        }
    }
}
```

`process.label` la ten hien thi trong step configuration dropdown cua model editor.

**Process Step Arguments:** Truyen arguments trong model editor, doc qua `metaDataMap.get("PROCESS_ARGS", String.class)`. Nhieu arguments thi dung delimiter (comma) va parse trong code.

### Truy cap payload

```java
// Path
String payloadPath = workItem.getWorkflowData().getPayload().toString();

// Payload type: "JCR_PATH", "JCR_UUID", "URL"
String payloadType = workItem.getWorkflowData().getPayloadType();

// Adapt
ResourceResolver resolver = workflowSession.adaptTo(ResourceResolver.class);
Resource resource = resolver.getResource(payloadPath);

// Page
PageManager pageManager = resolver.adaptTo(PageManager.class);
Page page = pageManager.getPage(payloadPath);

// Asset
Asset asset = resource.adaptTo(Asset.class);
```

---

## 5. Custom Participant Chooser

`ParticipantStepChooser` xac dinh nguoi xu ly step tai runtime. Dung voi Dynamic Participant Step.

```java
package com.myproject.core.workflow;

import com.adobe.granite.workflow.WorkflowException;
import com.adobe.granite.workflow.WorkflowSession;
import com.adobe.granite.workflow.exec.ParticipantStepChooser;
import com.adobe.granite.workflow.exec.WorkItem;
import com.adobe.granite.workflow.metadata.MetaDataMap;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ValueMap;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component(
    service = ParticipantStepChooser.class,
    property = {
        "chooser.label=My Project - Content Owner Chooser"
    }
)
public class ContentOwnerChooser implements ParticipantStepChooser {

    private static final Logger LOG = LoggerFactory.getLogger(ContentOwnerChooser.class);
    private static final String DEFAULT_GROUP = "content-authors";

    @Override
    public String getParticipant(WorkItem workItem, WorkflowSession workflowSession,
                                  MetaDataMap metaDataMap) throws WorkflowException {

        String payloadPath = workItem.getWorkflowData().getPayload().toString();
        ResourceResolver resolver = workflowSession.adaptTo(ResourceResolver.class);

        if (resolver != null) {
            Resource jcrContent = resolver.getResource(payloadPath + "/jcr:content");
            if (jcrContent != null) {
                ValueMap props = jcrContent.getValueMap();
                String reviewer = props.get("reviewer", String.class);
                if (reviewer != null && !reviewer.isEmpty()) {
                    LOG.info("Routing {} to reviewer: {}", payloadPath, reviewer);
                    return reviewer;
                }
            }
        }

        LOG.info("No reviewer for {}, fallback to {}", payloadPath, DEFAULT_GROUP);
        return DEFAULT_GROUP;
    }
}
```

`chooser.label` hien thi trong Dynamic Participant Step configuration.

---

## 6. Custom OR Split Rule

OR Split evaluate dieu kien tren moi branch. Tra ve `true` = follow route do:

```java
package com.myproject.core.workflow;

import com.adobe.granite.workflow.WorkflowSession;
import com.adobe.granite.workflow.exec.WorkItem;
import com.adobe.granite.workflow.metadata.MetaDataMap;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ValueMap;

public class PublishReadyRule {

    public boolean evaluate(WorkItem workItem, WorkflowSession session, MetaDataMap args) {
        String payloadPath = workItem.getWorkflowData().getPayload().toString();
        ResourceResolver resolver = session.adaptTo(ResourceResolver.class);
        if (resolver == null) return false;

        Resource jcrContent = resolver.getResource(payloadPath + "/jcr:content");
        if (jcrContent == null) return false;

        ValueMap props = jcrContent.getValueMap();
        boolean hasTitle = props.containsKey("jcr:title");
        boolean hasDescription = props.containsKey("jcr:description");
        boolean hasImage = props.containsKey("featuredImage");

        return hasTitle && hasDescription && hasImage;
    }
}
```

Trong OR Split configuration, reference class nay la Rule tren 1 branch.

---

## 7. Workflow API — Programmatic

### Start workflow

```java
@Reference
private com.adobe.granite.workflow.WorkflowService workflowService;

public void startApprovalWorkflow(ResourceResolver resolver, String pagePath)
        throws WorkflowException {

    WorkflowSession wfSession = workflowService.getWorkflowSession(
        resolver.adaptTo(Session.class));

    WorkflowModel model = wfSession.getModel(
        "/var/workflow/models/request_for_activation");

    WorkflowData data = wfSession.newWorkflowData("JCR_PATH", pagePath);
    data.getMetaDataMap().put("comment", "Submitted for review");
    data.getMetaDataMap().put("urgency", "high");

    wfSession.startWorkflow(model, data);
}
```

### Query workflow status

```java
public List<String> getRunningWorkflowIds(ResourceResolver resolver)
        throws WorkflowException {

    WorkflowSession wfSession = resolver.adaptTo(WorkflowSession.class);
    Workflow[] allWorkflows = wfSession.getAllWorkflows();

    List<String> running = new ArrayList<>();
    for (Workflow wf : allWorkflows) {
        if ("RUNNING".equals(wf.getState())) {
            running.add(wf.getId());
        }
    }
    return running;
}
```

### Terminate tat ca running workflows

```java
public int terminateAllRunning(ResourceResolver resolver) {
    WorkflowSession wfSession = resolver.adaptTo(WorkflowSession.class);
    if (wfSession == null) return 0;

    int terminated = 0;
    try {
        for (Workflow wf : wfSession.getAllWorkflows()) {
            if ("RUNNING".equals(wf.getState())) {
                try {
                    wfSession.terminateWorkflow(wf);
                    terminated++;
                    LOG.info("Terminated: {}", wf.getId());
                } catch (WorkflowException e) {
                    LOG.error("Failed to terminate {}", wf.getId(), e);
                }
            }
        }
    } catch (WorkflowException e) {
        LOG.error("Error retrieving workflows", e);
    }
    return terminated;
}
```

### Disable/Enable launchers programmatically

Pattern dung khi bulk import — tat launcher truoc import, bat lai sau:

```java
public void disableAllLaunchers(ResourceResolver resolver) {
    WorkflowLauncher launcherService = resolver.adaptTo(WorkflowLauncher.class);
    if (launcherService == null) return;

    Iterator<ConfigEntry> entries = launcherService.getConfigEntries();
    while (entries.hasNext()) {
        ConfigEntry entry = entries.next();
        if (entry.isEnabled()) {
            entry.setEnabled(false);
            LOG.info("Disabled launcher: {}", entry.getId());
        }
    }
}

public void enableAllLaunchers(ResourceResolver resolver) {
    WorkflowLauncher launcherService = resolver.adaptTo(WorkflowLauncher.class);
    if (launcherService == null) return;

    Iterator<ConfigEntry> entries = launcherService.getConfigEntries();
    while (entries.hasNext()) {
        ConfigEntry entry = entries.next();
        if (!entry.isEnabled()) {
            entry.setEnabled(true);
            LOG.info("Enabled launcher: {}", entry.getId());
        }
    }
}
```

---

## 8. DAM Update Asset Workflow

Workflow built-in xu ly asset khi upload hoac replace. Chay tu dong qua launcher.

Default pipeline:

1. **Metadata extraction** — doc EXIF, IPTC, XMP tu file
2. **Rendition generation** — tao thumbnails va web-optimized renditions
3. **Sub-asset extraction** — trich trang tu PDF, slides tu presentation
4. **XMP writeback** — ghi metadata thay doi nguoc vao binary
5. **Full-text extraction** — index text content cho search

### Custom DAM step (AEM 6.5)

Them custom step vao DAM Update Asset workflow:

```java
@Component(
    service = WorkflowProcess.class,
    property = {
        "process.label=My Project - Add Watermark Rendition"
    }
)
public class WatermarkRenditionStep implements WorkflowProcess {

    @Override
    public void execute(WorkItem workItem, WorkflowSession workflowSession,
                        MetaDataMap metaDataMap) throws WorkflowException {

        String payloadPath = workItem.getWorkflowData().getPayload().toString();
        ResourceResolver resolver = workflowSession.adaptTo(ResourceResolver.class);

        Resource assetResource = resolver.getResource(payloadPath);
        if (assetResource == null) return;

        Asset asset = assetResource.adaptTo(Asset.class);
        if (asset == null) return;

        Rendition original = asset.getOriginal();
        if (original == null) return;

        try (InputStream watermarked = applyWatermark(original.getStream())) {
            asset.addRendition("cq5dam.watermark.png", watermarked, "image/png");
            resolver.commit();
        } catch (Exception e) {
            throw new WorkflowException("Watermark generation failed", e);
        }
    }

    private InputStream applyWatermark(InputStream original) {
        // Image processing: Java2D, ImageMagick, etc.
        return original;
    }
}
```

---

## 9. Built-in Workflows (AEM 6.5)

| Workflow | Model path | Muc dich |
|---|---|---|
| Request for Activation | `/var/workflow/models/request_for_activation` | Approval truoc khi publish |
| DAM Update Asset | `/var/workflow/models/dam/update_asset` | Asset processing pipeline |
| Publish Page | `/var/workflow/models/publish_example` | Automated page publishing |
| Unpublish Page | `/var/workflow/models/unpublish_example` | Automated page deactivation |
| Scheduled Activation | `/var/workflow/models/scheduled_activation` | Hen gio activation |
| Scheduled Deactivation | `/var/workflow/models/scheduled_deactivation` | Hen gio deactivation |
| Translation | `/var/workflow/models/translation` | Translation pipeline |

---

## 10. Service User Cho Workflow

Workflow steps can quyen nang cao nen dung dedicated service user, khong dua vao session cua initiator:

```java
@Reference
private ResourceResolverFactory resolverFactory;

private ResourceResolver getServiceResolver() throws LoginException {
    Map<String, Object> params = Collections.singletonMap(
        ResourceResolverFactory.SUBSERVICE, "workflow-service"
    );
    return resolverFactory.getServiceResourceResolver(params);
}
```

OSGi config service user mapping:

```json
{
    "user.mapping": [
        "com.myproject.core:workflow-service=myproject-workflow-service"
    ]
}
```

Luu file tai: `ui.config/src/main/content/jcr_root/apps/myproject/osgiconfig/config.author/org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-workflow.cfg.json`

---

## 11. Unit Test Workflow Step

```java
@ExtendWith(AemContextExtension.class)
class AutoTagProcessStepTest {

    private final AemContext context = new AemContext();

    @Test
    void shouldTagNewsPages() throws WorkflowException {
        context.create().page("/content/test", "/conf/template",
            Collections.singletonMap("jcr:title", "Breaking News Today"));

        WorkItem workItem = mock(WorkItem.class);
        WorkflowData workflowData = mock(WorkflowData.class);
        when(workItem.getWorkflowData()).thenReturn(workflowData);
        when(workflowData.getPayload()).thenReturn("/content/test");

        WorkflowSession wfSession = mock(WorkflowSession.class);
        when(wfSession.adaptTo(ResourceResolver.class))
            .thenReturn(context.resourceResolver());

        MetaDataMap metaData = new SimpleMetaDataMap();
        metaData.put("PROCESS_ARGS", "myproject:");

        AutoTagProcessStep step = new AutoTagProcessStep();
        step.execute(workItem, wfSession, metaData);

        Resource jcrContent = context.resourceResolver()
            .getResource("/content/test/jcr:content");
        String[] tags = jcrContent.getValueMap().get("cq:tags", new String[0]);
        assertTrue(Arrays.asList(tags).contains("myproject:content-type/news"));
    }
}
```

---

## 12. Best Practices Production

### Transient workflows cho high-volume

Transient workflow khong persist intermediate step data vao JCR — chi luu payload va completion. Hieu nang cao hon nhieu khi xu ly hang loat (DAM Update Asset).

Bat: **Workflow model editor > Page Properties > check Transient**.

| Mode | JCR writes | Performance | Audit trail |
|---|---|---|---|
| Normal | Moi step change persist | Cham hon | Full history |
| Transient | Chi payload + completion | Nhanh hon | Han che |

### Purge workflow instances

Completed instances tich luy tai `/var/workflow/instances/` gay cham repository. Cau hinh purge thuong xuyen:

- **UI:** Tools > Workflow > Instances > chon completed > Purge
- **Maintenance task:** Operations Dashboard > Workflow Purge
- **Khuyen nghi:** giu toi da 30 ngay cho completed instances

### Chong launcher infinite loop

3 cach:

1. **`excludeList`** — liet ke properties ma launcher bo qua:
```
jcr:lastModified,cq:lastModified,jcr:lastModifiedBy,cq:lastRolledout
```

2. **Condition** — launcher kiem tra flag "processed"

3. **Workflow logic** — process step set flag property, kiem tra truoc khi xu ly lai

### Tranh long-running process steps

Workflow step chay tren AEM server thread pool. Step mat nhieu phut (goi slow API) block thread, lam starve workflow engine.

Giai phap:
- Dung **Sling Job** (`JobManager`): workflow step start job, dung External Process Step cho callback
- Set timeout cho HTTP calls
- Xem xet async pattern voi polling step

### Bulk import pattern

```
1. Disable tat ca launchers
2. Chay import
3. Enable lai launchers
4. Start workflow thu cong cho cac items can xu ly
```

Tranh tao hang nghin workflow instances cho moi imported node.

---

## Tham Khao

- [Administering Workflows (AEM 6.5)](https://experienceleague.adobe.com/docs/experience-manager-65/administering/operations/workflows.html) — Adobe Experience League
- [Developing and Extending Workflows (AEM 6.5)](https://experienceleague.adobe.com/docs/experience-manager-65/developing/extending-aem/extending-workflows/workflows.html) — Adobe Experience League
- [Granite Workflow API Javadoc](https://developer.adobe.com/experience-manager/reference-materials/6-5/javadoc/com/adobe/granite/workflow/package-summary.html)
