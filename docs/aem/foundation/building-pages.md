---
tags: [project, active, aem, wcm, pages]
created: 2026-04-26
modified: 2026-04-26
title: Building Pages — Homepage & Article Page
aliases: [building-pages]
---


## 0) Output mong muốn

- 1 homepage (hero + section + list + CTA)
- 1 article page (page properties + content components)
- header/footer dùng **locked structure** (thường qua **Experience Fragment**)


## 1) Core Components: danh sách “hay dùng”

| Component | Dùng để |
|---|---|
| **Title** | heading H1–H6 (+ link) |
| **Text** | rich text |
| **Image** | responsive image + lazy loading |
| **Button** | CTA link |
| **Teaser** | card: image + title + desc + CTA |
| **List** | list child pages / tagged pages / search |
| **Navigation** | menu tree |
| **Language Navigation** | switch locale |
| **Breadcrumb** | breadcrumbs |
| **Container** | responsive grid / layout container |
| **Tabs / Accordion / Carousel** | UI layout |
| **Experience Fragment** | reuse blocks (header/footer/sections) |
| **Content Fragment** | render CF |
| **Embed** | embed external (YouTube, …) |
| **Separator** | divider |

Notes:

- Dự án archetype thường tạo **proxy components** cho nhóm core components này.
- Policy quyết định component nào xuất hiện trong component browser.

---

## 2) Page anatomy (pattern)

| Zone | Thường chứa | Template mode |
|---|---|---|
| **Header** | logo + nav + language nav (+ search) | **Structure** (locked) |
| **Main** | responsive grid (authors drag-drop) | editable |
| **Footer** | links + legal + social | **Structure** (locked) |

Nguồn dữ liệu header/footer:

- Experience Fragment (khuyến nghị) hoặc
- page properties / config

---

## 3) Build Homepage (step-by-step)

### 3.1 Tạo page

- Sites → `&lt;site&gt;` → `&lt;lang-root&gt;`
- Create → Page
- Template: landing/home template
- Title: `Home`
- Name: `home`

### 3.2 Add Hero (Teaser / custom Hero)

Checklist cấu hình:

- [ ] Title: `Welcome to My Site`
- [ ] Description: `We build amazing digital experiences`
- [ ] Image: DAM
- [ ] Link: trỏ article page
- [ ] CTA label: `Learn More`

### 3.3 Add content sections (Container)

Trong main responsive grid:

1) **Container** (section wrapper)  
2) Bên trong Container:
   - **Title**: `Latest Articles`
   - **List**:
     - Source: child pages dưới `/content/&lt;site&gt;/&lt;lang&gt;/blog`
     - Sort: by date
     - Limit: `3`
   - **Button**: `View All Articles` → blog listing page

### 3.4 Layout mode (responsive)

Layout mode (ruler icon):

- Desktop: `4 + 4 + 4`
- Tablet: `6 + 6`
- Phone: `12`

---

## 4) Build Article Page

### 4.1 Tạo page

- Sites → `&lt;site&gt;` → `&lt;lang-root&gt;` → `blog`
- Create page với template article
- Title: `Getting Started with AEM Components`

### 4.2 Set page properties (quan trọng)

Page Information → Open Properties:

| Tab | Property | Value (ví dụ) |
|---|---|---|
| Basic | Title | Getting Started with AEM Components |
| Basic | Subtitle | A guide for new AEM developers |
| Basic | Description | Learn how to create your first AEM component… |
| Basic | Tags | chọn tags liên quan |
| Advanced | Featured Image | chọn DAM asset |
| Social Media | og:title / og:description | cho share |

### 4.3 Add content (trên page)

Order gợi ý:

1) Title (thường map từ page title)  
2) Image (featured)  
3) Text (body)  
4) Accordion (FAQ)  
5) Teaser (related)  

### 4.4 Preview + publish

- Preview mode để check output
- Publish Page → Publish instance

---

## 5) Page properties trong code (Sling Model)

Node storage:

- page node: `/content/&lt;site&gt;/&lt;lang&gt;/&lt;page&gt;`
- properties: `/content/.../&lt;page&gt;/jcr:content`

Snippet:

```java
@Model(adaptables = SlingHttpServletRequest.class)
public class ArticlePageModel {

  @ScriptVariable
  private Page currentPage;

  public String getTitle() { return currentPage.getTitle(); }

  public String getDescription() { return currentPage.getDescription(); }

  public Calendar getLastModified() { return currentPage.getLastModified(); }

  public String getFeaturedImage() {
    ValueMap props = currentPage.getProperties();
    return props.get("featuredImage", String.class);
  }

  public String[] getTags() {
    Tag[] tags = currentPage.getTags();
    return Arrays.stream(tags).map(Tag::getTitle).toArray(String[]::new);
  }
}
```

TagManager (khi cần resolve theo locale / xử lý tag id):

```java
public String getLocalizedTagTitle(String tagId, Locale locale) {
  TagManager tagManager = resource.getResourceResolver().adaptTo(TagManager.class);
  Tag tag = tagManager.resolve(tagId);
  return tag != null ? tag.getTitle(locale) : tagId;
}
```

---

## 6) Troubleshooting (ráp page)

| Symptom | Check | Fix |
|---|---|---|
| Component không thấy trong side panel | policy allowed components | enable trong container policy |
| Component chỉ placeholder | dialog values + model defaults | set required fields / `@Default` an toàn |
| Header/footer mất ở vài page | template structure + locked items | reapply structure; verify XF path |
| Navigation thiếu item | nav root/depth + hide-in-nav | chỉnh config + page properties |
| Author vs Publish khác | publish content + clientlibs + dispatcher cache | publish dependencies + invalidate caches |

---

## 7) Navigation (core component)

Site tree mẫu:

```text
/content/<site>/<lang>
├── home
├── about
├── services
│   ├── consulting
│   └── development
├── blog
│   ├── article-1
│   └── article-2
└── contact
```

Config gợi ý:

| Property | Value | Effect |
|---|---|---|
| Navigation Root | `/content/&lt;site&gt;/&lt;lang&gt;` | start point |
| Exclude Root Level | `1` | skip root |
| Structure Depth | `2` | show 2 levels |
| Collect all child pages | `No` | chỉ show navigable |

Page opt-out: `Hide in Navigation`.

---

## 8) Reuse với Experience Fragments (header/footer)

### 8.1 Create header XF

- Experience Fragments console
- Create dưới `/content/experience-fragments/&lt;site&gt;/&lt;lang&gt;/header`
- Add: Logo + Navigation + Language Navigation
- Publish XF

### 8.2 Include vào template structure

- Template editor → **Structure**
- Add **Experience Fragment** component (locked)
- Point tới XF header

Kết quả:

- mọi page dùng template → dùng chung header
- update XF → reflect toàn site (sau publish + cache invalidation nếu có)

---

## 9) Authoring tips (cho editor)

### 9.1 Drag/drop

- drag từ side panel → page
- reorder trong container
- toolbar: edit/config/copy/cut/delete

### 9.2 Quick edit vs Dialog

- Quick edit: inline text
- Dialog: wrench icon / double click

### 9.3 Modes

| Mode | Hiển thị |
|---|---|
| Edit | chrome + placeholders |
| Layout | resize columns |
| Preview | visitor view |
| Targeting | personalization |
| Timewarp | view at time |

---

## Liên kết nội bộ

- [Templates & Policies](./templates-and-policies)
- [Client Libraries](./client-libraries)
- [Content Fragments & GraphQL](../content-and-data/graphql)

