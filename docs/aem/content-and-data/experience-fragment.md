# Experience Fragments (XF) — AEM 6.5 On-Premise

---

## 1. Experience Fragment là gì?

**Experience Fragment (XF)** là một “mảnh trải nghiệm” có thể tái sử dụng, bao gồm **nội dung + layout + các AEM components** (tức là đã mang tính trình bày). Bạn có thể tham chiếu XF vào nhiều nơi: AEM Sites pages, AEM Screens, hoặc export ra hệ thống khác (ví dụ Adobe Target).

Nói ngắn gọn:

- **Content Fragment (CF)**: dữ liệu có cấu trúc (fields), không “tự render UI”.
- **Experience Fragment (XF)**: một đoạn UI/experience hoàn chỉnh (components + style + layout), có thể “render như một trang con”.

---

## 2. XF khác gì so với CF?

| Tiêu chí | Experience Fragment (XF) | Content Fragment (CF) |
|---|---|---|
| **Bạn đang quản lý** | “Trải nghiệm” (UI + bố cục) | “Dữ liệu” (structured fields) |
| **Cách author** | Visual editor (giống Page Editor) | Form-based editor (theo Model) |
| **Đơn vị lưu trữ** | `cq:Page` (cây page + components) | `dam:Asset` trong DAM |
| **Nơi lưu phổ biến** | `/content/experience-fragments/...` | `/content/dam/...` |
| **Variations** | Theo kênh/ngữ cảnh (web, social, email, A/B…) | Variations của dữ liệu (master/summary/…) |
| **Headless** | Có thể xuất JSON model (component tree) nhưng không có GraphQL query “đẹp” như CF | Mạnh nhất cho headless (GraphQL, persisted queries, filtering) |
| **Personalization** | Tích hợp export sang Adobe Target (HTML/JSON offer) | Không trực tiếp; thường dùng qua API/GraphQL |

**Rule of thumb:** dùng **CF cho data**, dùng **XF cho trải nghiệm tái sử dụng** (header, footer, promo banner, CTA…).

---

## 3. Khi nào nên dùng XF?

Bạn nên dùng XF khi:

- Cần **reuse một đoạn UI** trên nhiều trang (để tránh copy/paste).
- Cần nhiều biến thể của cùng một trải nghiệm theo **kênh hoặc ngữ cảnh** (web vs email, market vs market).
- Muốn đưa nội dung/experience sang **Adobe Target** làm offer để A/B test hoặc personalization.
- Cần quản lý trải nghiệm độc lập với vòng đời của các trang cụ thể (cập nhật XF → ảnh hưởng tất cả nơi đang reference).

---

## 4. Cấu trúc XF trong JCR (hình dung nhanh)

Một XF thường nằm dưới `/content/experience-fragments/&lt;site&gt;/&lt;lang&gt;/&lt;xf-name&gt;/...` và có nhiều **variation**.

Ví dụ (minh họa):

```text
/content/experience-fragments/mysite/en/
  └── promo-banner/                 ← XF (gốc)
      ├── jcr:content               ← metadata của XF root
      ├── master/                   ← variation "master" (thường là web)
      │   └── jcr:content
      │       └── root/
      │           └── responsivegrid/
      │               ├── image
      │               ├── text
      │               └── button
      └── email/                    ← variation cho email (nếu có)
          └── jcr:content
              └── root/...
```

Điểm quan trọng:

- XF bản chất là **một (nhóm) page** với component tree giống AEM page.
- Mỗi variation là một “page” con dưới XF root.
- Variation có thể được cấu hình theo **kiểu kênh** (web/social/email/plain text/custom) tùy template.

---

## 5. Variations trong XF (và cách dùng đúng)

**Variation** giúp bạn tạo các phiên bản khác nhau của cùng một trải nghiệm:

- **Web variation**: dùng trong AEM Sites, hoặc export sang Adobe Target.
- **Email/Social/Plain text**: tối ưu markup/format cho kênh tương ứng.
- **A/B variations**: 2+ variations để test nội dung (kết hợp với Target hoặc logic riêng).

Nguyên tắc thực tế:

- Nếu chỉ khác “trình bày theo kênh” → tạo **variations** trong cùng một XF.
- Nếu khác mục tiêu/campaign hoàn toàn → tạo XF khác (đừng nhồi quá nhiều thứ vào 1 XF).

---

## 6. Templates cho XF (Editable Templates)

XF được tạo dựa trên **Editable Template** (không dùng static template). Template quyết định:

- Allowed components
- Policies (style system, allowed clientlibs, responsive behavior)
- Cấu trúc ban đầu của XF variation

Best practice:

- Tổ chức XF theo folder và **set Allowed Templates ở folder level** (đỡ bị overwrite khi upgrade).
- Tách template “XF Web” và template “XF Email/Social” nếu rule/policy khác nhau.

---

## 7. Dùng XF trong AEM Sites pages

Trong AEM, cách phổ biến nhất là dùng **Experience Fragment component** (Core Component / AEM built-in XF component) để render một variation của XF trong page.

Điểm cần nhớ:

- Thường property quan trọng là **đường dẫn variation** (không phải XF root), ví dụ:
  - ✅ `/content/experience-fragments/mysite/en/promo-banner/master`
  - ❌ `/content/experience-fragments/mysite/en/promo-banner`

### Localized references (đa ngôn ngữ)

Với cấu trúc nhất quán theo ngôn ngữ, AEM có thể resolve variation theo ngôn ngữ trang:

```text
Page: /content/mysite/de/home
XF reference: /content/experience-fragments/mysite/en/promo-banner/master
→ Nếu tồn tại /content/experience-fragments/mysite/de/promo-banner/master
  thì hệ thống sẽ ưu tiên dùng bản /de (tùy implementation/component wrapper).
```

Khi build site đa ngôn ngữ, hãy mirror cấu trúc XF theo locale để fallback/resolve dễ dự đoán.

---

## 8. Building Blocks (tái sử dụng “mảnh nhỏ” trong XF)

**Building blocks** giúp bạn tái sử dụng một nhóm components bên trong/giữa các variations:

- Author một group components trong XF
- Convert sang building block
- Kéo thả building block vào variation khác (hoặc XF khác) như “lego”

Mục tiêu: giảm duplicate, tăng tính chuẩn hóa (đặc biệt hữu ích cho banner/CTA patterns).

---

## 9. XF và Adobe Target (Export Offers)

Một use case rất “đắt giá” của XF trong AEM 6.5 là **export sang Adobe Target** để dùng làm **offers** trong các activity (A/B test, XT, personalization…).

Các điểm kỹ thuật hay gặp:

- **Chỉ Web variations** mới export được sang Target (đây là ràng buộc phổ biến).
- Offer có thể export ở format:
  - **HTML** (mặc định): phù hợp web/hybrid delivery
  - **JSON**: phù hợp headless delivery (thường cần custom handling phía consumer)
- **Asset (ảnh, media)** thường chỉ export **reference**; vì vậy cần đảm bảo assets + XF đã được **publish/activate** trước khi export, nếu không Target render sẽ thiếu resource.

### Checklist nhanh khi export fail

- Đã cấu hình **Adobe Target Cloud Configuration** cho folder/XF chưa?
- Credentials/IMS integration ok chưa?
- XF variation đã publish chưa? assets referenced đã publish chưa?
- Dispatcher/CDN có chặn endpoint export/Target integration không?

---

## 10. Headless/JSON export cho XF (khi nào dùng)

XF có thể được “đọc” như một page model:

- Ví dụ (minh họa): `GET .../master.model.json`

Nhưng cần phân biệt:

- JSON của XF thường là **component tree + HTML snippets**, phù hợp khi frontend muốn “render theo component mapping”.
- Nếu bạn cần query/filter/pagination mạnh, **CF + GraphQL** thường là lựa chọn đúng hơn.

---

## 11. XF trong MSM (Multi Site Management) và Language Copies

Vì XF là một phần của “trải nghiệm như trang”, nên có thể áp dụng MSM/language copies tương tự pages:

- Tạo language copy cho XF root theo locale
- Duy trì cấu trúc path tương đồng giữa các locale để dễ reference/resolve

Lưu ý vận hành:

- Khi dùng live copy/rollout, cần định nghĩa rõ phần nào “được phép local override”, phần nào phải “inherit”.

---

## 12. Publishing/Replication: lỗi hay gặp

XF là content dạng page → cần **activate** sang publish giống như page. Một số “bẫy” phổ biến:

| Vấn đề | Triệu chứng | Cách xử lý |
|---|---|---|
| Page đã publish nhưng XF không cập nhật | Trang render “cũ” hoặc thiếu đoạn XF | Publish/activate **XF riêng** (và assets referenced) |
| XF component render trống | Cấu hình trỏ nhầm path (trỏ XF root thay vì variation) | Kiểm tra lại `fragmentVariationPath` (hoặc field tương đương) |
| Target offer render thiếu hình | Offer export chỉ mang reference | Publish assets trước, kiểm tra URL rewrite/permissions |
| Quá nhiều XF trên 1 page → chậm | Nhiều includes / render fragments | Giảm số XF, tối ưu cache (Dispatcher), dùng patterns gọn hơn |

---

## 13. Best practices (thực dụng)

- **Giữ XF “nhỏ và rõ mục tiêu”**: một XF nên đại diện cho một trải nghiệm cohesive (banner, header, footer…).
- **Ưu tiên variations thay vì copy XF**: chỉ tách XF mới khi concept khác hẳn.
- **Chuẩn hóa folder + allowed templates**: set ở folder level, hạn chế lẫn lộn template.
- **Versioning trước thay đổi lớn**: XF được reference rộng, thay đổi có thể impact toàn site.
- **Publish dependencies có kỷ luật**: XF, assets, clientlibs/templates/policies liên quan phải đồng bộ.

---

## Tham khảo

- [Experience Fragments (AEM 6.5) — Adobe Experience League](https://experienceleague.adobe.com/en/docs/experience-manager-65/content/sites/authoring/authoring/experience-fragments)
- [Exporting Experience Fragments to Adobe Target (AEM 6.5) — Adobe Experience League](https://experienceleague.adobe.com/en/docs/experience-manager-65/content/sites/administering/integration/experience-fragments-target)
- [Content Fragments vs Experience Fragments — Adobe (AEM Learn)](https://experienceleague.adobe.com/docs/experience-manager-learn/sites/content-fragments/understand-content-fragments-and-experience-fragments.html)
- [Experience Fragments — Luca Nerlich (bài gốc)](https://lucanerlich.com/aem/content/experience-fragments/)

