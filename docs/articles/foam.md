# Foam — Advanced Note-Taking trên VSCode

[Foam](https://foambubble.github.io/foam/) là extension biến VSCode thành personal knowledge management system kiểu Zettelkasten, tương tự Obsidian nhưng chạy trực tiếp trong VSCode.

## Setup

1. Install extension **Foam** từ marketplace
2. Hoặc clone template: `foam-template` repo
3. Workspace cần có `.vscode/settings.json` và `.vscode/extensions.json`

Extensions khuyên dùng kèm:
- **Markdown All in One** — shortcuts, TOC, preview
- **Markdown Links** — clickable wikilinks
- **Paste Image** — dán ảnh từ clipboard

---

## Wikilinks

Cú pháp:
```md
[[note-name]]              ← link tới file note-name.md
[[note-name#heading]]      ← link tới heading cụ thể
[[note-name|Display Text]] ← custom display text
```

Tạo note mới: gõ `[[new-note]]` → `Ctrl+Click` → Foam tự tạo file.

---

## Daily Notes

`Foam: Open Daily Note` (`Alt+D`):
- Tự tạo file theo format `yyyy-mm-dd.md`
- Template tùy chỉnh trong `.foam/templates/daily-note.md`

Template mẫu:
```md
# ${FOAM_DATE_YEAR}-${FOAM_DATE_MONTH}-${FOAM_DATE_DATE}

## Tasks
- [ ] 

## Notes

## Links
```

---

## Note Templates

Tạo templates trong `.foam/templates/`:

```md
---
foam_template:
  name: Meeting Note
  description: Template cho meeting
---
# ${FOAM_TITLE}

**Date:** ${FOAM_DATE_YEAR}-${FOAM_DATE_MONTH}-${FOAM_DATE_DATE}
**Attendees:** 

## Agenda

## Action Items
- [ ] 
```

Trigger: `Foam: Create New Note From Template`

---

## Tags

```md
#project #aem #debug
```

Dùng command `Foam: Find notes by tag` để filter.

---

## Graph Visualization

`Foam: Show Graph` — hiển thị knowledge graph:
- Nodes = notes
- Edges = wikilinks giữa các notes
- Filter theo tag, folder
- Click node → mở note

---

## Backlinks

Panel **Backlinks** (sidebar) hiển thị tất cả notes đang trỏ tới note hiện tại.

Hữu ích để:
- Xem context xung quanh 1 concept
- Tìm orphan notes (không ai link tới)

---

## Note Properties (Front Matter)

```md
---
title: My Note
type: reference
tags: [aem, debug]
created: 2024-01-15
---
```

Foam index front matter → dùng cho filter/search.

---

## Placeholders & Variables

Dùng trong templates:

| Variable | Giá trị |
|----------|---------|
| `$\{FOAM_TITLE\}` | Tên file (titlecase) |
| `$\{FOAM_DATE_YEAR\}` | Năm hiện tại |
| `$\{FOAM_DATE_MONTH\}` | Tháng (2 digit) |
| `$\{FOAM_DATE_DATE\}` | Ngày (2 digit) |
| `$\{FOAM_DATE_DAY_NAME\}` | Tên thứ (Monday, ...) |

---

## Embed Notes

```md
![[other-note]]          ← embed toàn bộ note
![[other-note#section]]  ← embed 1 section
```

Preview sẽ render inline content.

---

## File Structure khuyên dùng

```
workspace/
├── .foam/
│   └── templates/
│       ├── daily-note.md
│       ├── meeting.md
│       └── new-note.md
├── .vscode/
│   ├── settings.json
│   └── extensions.json
├── daily/           ← daily notes
├── projects/        ← project-specific notes
├── references/      ← reference/permanent notes
├── inbox/           ← quick capture
└── attachments/     ← images, files
```

---

## Settings quan trọng

`.vscode/settings.json`:

```json
{
  "foam.openDailyNote.directory": "daily",
  "foam.files.newNotePath": "inbox",
  "foam.edit.linkReferenceDefinitions": "withExtensions",
  "foam.graph.titleMaxLength": 24,
  "foam.dateSnippets.afterCompletion": "createNote",
  "editor.wordWrap": "on",
  "markdown.preview.breaks": true
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+D` | Open Daily Note |
| `Ctrl+Click` trên wikilink | Navigate tới note |
| `[[` + gõ | Autocomplete wikilinks |
| `Ctrl+Shift+P` → "Foam" | Tất cả Foam commands |

---

## Tips nâng cao

- **Zettelkasten IDs:** đặt tên file dạng `202401151030-concept-name.md` để sort theo thời gian
- **MOC (Map of Content):** tạo note tổng hợp link tới các notes liên quan, thay cho folder structure
- **Combine với Git:** commit notes hàng ngày → version history + backup
- **Foam + VitePress:** dùng wikilinks khi note, convert sang markdown links khi publish
- **Orphan notes:** chạy `Foam: Show Graph` → tìm nodes không connected → review lại
