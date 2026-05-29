Điểm câu hỏi: 9/10

Câu hỏi đề xuất:
“Trong AEM 6.5, khi support production hoặc debug issue trên một page cụ thể thì cần hiểu relationship giữa page, template, component, policy, resourceType như thế nào và cách trace từ URL → Page → Template → Component tree → HTL/Model/Servlet ra sao?”

Trả lời:

# 1. Đây là kỹ năng core nhất của AEM dev

Vì AEM toàn bộ runtime rendering đều xoay quanh:

```text
URL
→ Page
→ Template
→ Structure/Initial Content
→ Component Tree
→ sling:resourceType
→ HTL / Model / Servlet
```

Nếu không trace được flow này thì gần như không debug được production issue.

---

# 2. Flow thực tế của một page trong AEM

Ví dụ URL:

```text
/content/site/en/home.html
```

AEM xử lý:

```text
Page Node
/content/site/en/home
```

Node này có:

```text
cq:template
```

Ví dụ:

```text
/conf/site/settings/wcm/templates/content-page
```

Template lại define:

* layout
* structure component
* allowed component
* policy
* responsive grid

Sau đó page render component tree.

---

# 3. Cách xác định page đang dùng template nào

## Cách production-ready nhất

Mở:

```text
CRXDE
```

Tới:

```text
/content/site/en/home/jcr:content
```

Xem:

```text
cq:template
```

Ví dụ:

```text
cq:template = /conf/site/settings/wcm/templates/content-page
```

Đây là source of truth.

---

# 4. Template thực tế render cái gì

Template node:

```text
/conf/site/settings/wcm/templates/content-page
```

Quan trọng:

```text
structure/
initial/
policies/
```

---

# 5. Component tree nằm ở đâu

Quan trọng nhất:

```text
/content/site/en/home/jcr:content
```

Ví dụ:

```text
root
  ├── container
  │     ├── hero
  │     ├── text
  │     └── carousel
```

Mỗi node là 1 component.

Mỗi node có:

```text
sling:resourceType
```

Ví dụ:

```text
myproject/components/content/hero
```

Đây là key quan trọng nhất của AEM rendering.

---

# 6. Debug page đang dùng component nào

Ví dụ:

```text
/content/site/en/home/jcr:content/root/hero
```

Có:

```text
sling:resourceType=myproject/components/content/hero
```

AEM sẽ lookup:

```text
/apps/myproject/components/content/hero
```

Ở đó sẽ có:

* hero.html
* HeroModel.java
* dialog
* cq:editConfig

---

# 7. Cách trace từ URL → component

Production workflow chuẩn:

## Step 1

Lấy URL:

```text
/content/site/en/home.html
```

---

## Step 2

Mở:

```text
/content/site/en/home/jcr:content
```

---

## Step 3

Xem component tree:

```text
root/*
```

---

## Step 4

Check:

```text
sling:resourceType
```

---

## Step 5

Search codebase:

```text
/apps/myproject/components/content/hero
```

hoặc:

```text
grep -R "components/content/hero"
```

---

# 8. Quan trọng nhất: resourceType hierarchy

AEM render theo:

```text
sling:resourceType
```

KHÔNG phải component name.

Ví dụ:

```text
myproject/components/content/hero
```

có thể:

```text
sling:resourceSuperType
```

trỏ tới:

```text
core/wcm/components/teaser/v2/teaser
```

Lúc này rendering thật có thể nằm ở Core Component.

Đây là chỗ junior debug rất hay sai.

---

# 9. Cách biết component thật đang render ở đâu

Check:

```text
sling:resourceSuperType
```

Ví dụ:

```text
/apps/myproject/components/content/hero
```

inherits:

```text
core/wcm/components/teaser/v2/teaser
```

HTL thật có thể resolve từ:

```text
/libs/core/wcm/components/teaser/v2/teaser
```

---

# 10. Debug runtime component nhanh nhất

## Dùng:

```text
?debug=layout
```

Ví dụ:

```text
/content/site/en/home.html?debug=layout
```

Hoặc:

```text
wcmmode=disabled
```

để xem publish-like rendering.

---

# 11. Cách debug page bị lỗi rendering

## Check:

### 1. error.log

Search:

```text
Exception
```

hoặc:

```text
Cannot get DefaultSlingScript
```

---

### 2. component missing

Thường thấy:

```text
No renderer for extension html
```

hoặc:

```text
Cannot find script
```

---

### 3. Sling Model fail

Ví dụ:

```text
ModelClassException
```

---

### 4. HTL error

Ví dụ:

```text
SightlyException
```

---

# 12. Page editor và page render khác nhau

Quan trọng.

## Editor mode

```text
/editor.html/content/site/en/home.html
```

có:

* authoring JS
* overlay
* granite UI

## Direct render

```text
/content/site/en/home.html
```

giống publish hơn.

Nhiều bug chỉ xảy ra ở editor mode.

---

# 13. Cách biết page dùng editable template hay static template

## Editable template

Có:

```text
/conf/...
```

## Static template

Có:

```text
/apps/...
```

AEM modern production gần như luôn dùng editable template.

---

# 14. Phải master những node/property nào

## Quan trọng nhất

### Page level

```text
cq:template
cq:lastModified
sling:resourceType
```

---

### Component level

```text
sling:resourceType
sling:resourceSuperType
```

---

### Template level

```text
structure
initial
policies
```

---

# 15. Production debug mindset

Khi có issue:

```text
URL lỗi
→ page node nào
→ template nào
→ component nào
→ HTL/model nào
→ service nào
→ query nào
→ external API nào
```

Senior AEM dev trace theo chain này rất nhanh.

---

# 16. Tools quan trọng nhất

## Runtime

* `/system/console/status-slingsettings`
* `/system/console/bundles`
* `/system/console/components`
* `/system/console/requests`
* `/system/console/depfinder`

---

## Repository

* CRXDE
* Query Performance
* Explain Query

---

## Frontend

* browser devtools
* network
* source map

---

# 17. Kỹ năng phải luyện mỗi ngày

## Khi mở page bất kỳ phải tự hỏi:

1. Template gì?
2. Root container nào?
3. Component nào render section này?
4. Có inherit Core Component không?
5. Sling Model nào chạy?
6. Query nào gọi?
7. Cache layer nào ảnh hưởng?
8. Author vs publish render khác gì?

Nếu trả lời được nhanh các câu này thì mới debug production hiệu quả được.
