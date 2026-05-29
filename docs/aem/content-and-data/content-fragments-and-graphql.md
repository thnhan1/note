---
tags: [project, active, aem, headless, graphql, content-fragments]
created: 2026-04-26
modified: 2026-04-26
title: Content Fragments & GraphQL — AEM 6.5
aliases: [content-fragments-and-graphql, cf graphql]
---

## 0) Tóm tắt

- **Content Fragment (CF)** = structured content (data) trong DAM, không gắn layout.
- **GraphQL** = API tự sinh từ **Content Fragment Models**.
- Prod: **persisted queries** (GET) + cache (Dispatcher/CDN).

---

## 1) Content Fragments vs Pages

| Feature | Pages | Content Fragments |
|---|---|---|
| Layout | theo template | không có layout (pure data) |
| Delivery | AEM render HTML | client render (any) |
| Reuse | 1 page = 1 URL | 1 fragment = nhiều consumer |
| Editing | page editor | CF editor |
| API | `.model.json` (component export) | GraphQL |

---

## 2) Content Fragment Models (schema)

### 2.1 Tạo model

Tools → General → **Content Fragment Models**

- [ ] chọn config folder (`/conf/&lt;site&gt;`)
- [ ] Create → name (vd `Article`)
- [ ] Open → add fields

### 2.2 Field types hay dùng

| Field type | Mục đích | Ví dụ |
|---|---|---|
| Single line text | short | title, author |
| Multi line text | body | rich/plain |
| Number | int/float | rating, price |
| Boolean | true/false | featured |
| Date and Time | publish date | date/time |
| Enumeration | predefined | category |
| Tags | AEM tags | topics |
| Content Reference | link content | DAM asset |
| Fragment Reference | link CF khác | author fragment |
| Tab Placeholder | chia tab | organize fields |

> Ghi chú: “JSON Object field” phụ thuộc version/setup; on-prem 6.5 thường không đặt làm mặc định như Cloud. Nếu cần kiểu JSON, ưu tiên modelling bằng fields hoặc store text + parse.

### 2.3 Model mẫu: Article

| Field | Type | Config (gợi ý) |
|---|---|---|
| Title | Single line text | required |
| Slug | Single line text | required, unique (nếu enforce) |
| Body | Multi line text | rich text, required |
| Excerpt | Multi line text | plain text, max length |
| Featured Image | Content Reference | asset reference |
| Publish Date | Date and Time | date-only (nếu cần) |
| Featured | Boolean | default false |
| Author | Fragment Reference | Author model |
| Category | Enumeration | `tech/business/design` |
| Tags | Tags | - |

### 2.4 Model mẫu: Author

| Field | Type |
|---|---|
| Name | Single line text (required) |
| Bio | Multi line text |
| Avatar | Content Reference |
| Email | Single line text |

---

## 3) Tạo Content Fragments

Assets → Files:

- folder (vd `/content/dam/&lt;site&gt;/articles`)
- Create → **Content Fragment**
- chọn model (vd `Article`)
- đặt name + fill fields

### 3.1 Variations

| Concept | Notes |
|---|---|
| Master | default |
| Named variations | `Summary`, `Mobile`, `Newsletter`… |
| Field override | variation override từng field, phần còn lại inherit |

---

## 4) GraphQL API

### 4.1 Endpoint (pattern)

Endpoint thường gắn theo configuration:

```text
http://localhost:4502/content/_cq_graphql/<configuration>/endpoint.json
```

Notes:

- path cụ thể có thể khác theo setup/SP → verify trong UI GraphQL tooling.
- dùng GraphiQL để xem schema + thử query.

### 4.2 Field name mapping

- label field trong model → GraphQL field **camelCase**
- case-sensitive
- debug bằng schema explorer trong GraphiQL

---

## 5) Query patterns (copy/paste)

### 5.1 List articles

```graphql
{
  articleList {
    items {
      _path
      title
      slug
      excerpt
      publishDate
      featured
      category
    }
  }
}
```

### 5.2 Get by path

```graphql
{
  articleByPath(_path: "/content/dam/<site>/articles/getting-started") {
    item {
      title
      slug
      body {
        html
        plaintext
      }
      publishDate
      author {
        name
        bio
      }
    }
  }
}
```

### 5.3 Filtering

```graphql
{
  articleList(
    filter: {
      category: { _expressions: [{ value: "tech", _operator: EQUALS }] }
      featured: { _expressions: [{ value: true, _operator: EQUALS }] }
    }
  ) {
    items {
      title
      excerpt
      publishDate
    }
  }
}
```

### 5.4 Sorting + pagination

```graphql
{
  articleList(sort: "publishDate DESC", limit: 10, offset: 0) {
    items {
      title
      publishDate
    }
  }
}
```

### 5.5 Rich text formats (tuỳ version/setup)

```graphql
{
  articleByPath(_path: "/content/dam/<site>/articles/example") {
    item {
      body {
        html
        plaintext
        json
      }
    }
  }
}
```

### 5.6 Fragment references (nested)

```graphql
{
  articleList {
    items {
      title
      author {
        name
        bio
        avatar {
          ... on ImageRef {
            _path
            width
            height
          }
        }
      }
    }
  }
}
```

---

## 6) Persisted queries (prod default)

| Ad-hoc query | Persisted query |
|---|---|
| dev/GraphiQL | prod |
| thường POST | thường GET |
| khó cache Dispatcher/CDN | cacheable |
| client định nghĩa query | server control query |

### 6.1 Execute (ví dụ)

```bash
# Author (local) - cần auth
curl -u admin:admin "http://localhost:4502/graphql/execute.json/<conf>/article-list"

# Publish - public persisted query (tuỳ security)
curl "http://localhost:4503/graphql/execute.json/<conf>/article-list"
```

Naming:

- versioned name: `article-list-v1`
- giữ response shape tối thiểu

---

## 7) Production hardening checklist (headless)

| Area | Checklist |
|---|---|
| Caching | [ ] dùng GET persisted queries, cache via Dispatcher/CDN |
| Security | [ ] chỉ expose persisted queries cần thiết trên Publish |
| CORS | [ ] allowlist origins qua OSGi config CORS |
| Complexity | [ ] tránh list unbounded, limit/offset rõ ràng |
| Schema evolution | [ ] add fields backward-compatible; deprecate trước khi remove |
| Monitoring | [ ] latency, error rate, cache hit ratio |

---

## 8) Headless delivery flow (frontend)

```js
const res = await fetch(
  "https://publish.<site>.com/graphql/execute.json/<conf>/article-list"
);
const json = await res.json();
const items = json.data.articleList.items;
```

---

## 9) Render CF “truyền thống” trên Page

Content Fragment Core Component:

- add component lên page
- select fragment
- chọn fields render
- chọn variation (optional)

Use case:

- hybrid: page-based layout + structured CF data

---

## Liên kết nội bộ

- [Content Fragment](./content-fragment)
- [Headless GraphQL (on-prem)](./graphql)
- [MSM](./multi-site-manager-msm)

