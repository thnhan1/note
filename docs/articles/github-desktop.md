# GitHub Desktop cho AEM Dev

GUI Git client miễn phí, đơn giản, phù hợp cho dev không thích command line hoặc muốn visualize history nhanh.

> **Lưu ý:** Tên là "GitHub Desktop" nhưng hoạt động được với mọi Git remote (Azure DevOps, GitLab, Bitbucket), không chỉ GitHub.

---

## Setup

1. Download từ [desktop.github.com](https://desktop.github.com/)
2. Sign in (GitHub) hoặc skip để dùng với remote khác
3. Configure Git identity: **File → Options → Git** → name, email

### Config cho Azure DevOps

GitHub Desktop dùng Git credential manager mặc định. Khi clone Azure DevOps repo lần đầu → popup login Microsoft.

```
File → Clone repository → URL tab
URL: https://dev.azure.com/{org}/{project}/_git/{repo}
```

---

## 1. Workflow cơ bản

### Clone repo
`File → Clone repository` → chọn từ list hoặc paste URL.

### Commit
1. Sửa file trong code editor
2. Quay về GitHub Desktop → tab **Changes** hiện tất cả files thay đổi
3. Check/uncheck files muốn commit
4. Nhập **Summary** (commit message) → **Description** (optional)
5. Click **Commit to \&lt;branch\&gt;**

### Push / Pull
- **Push origin** button ở top khi có commits chưa push
- **Fetch origin** → check updates từ remote
- **Pull origin** → khi remote có commits mới

---

## 2. Branch Management

### Create branch
`Branch → New branch` (`Ctrl+Shift+N`):
- Đặt tên: `feature/AMS-1234-add-component`
- Base: chọn từ branch nào
- **Publish branch** → push lên remote

### Switch branch
Top bar → click branch name → chọn branch khác.

### Delete branch
`Branch → Delete` → confirm.
Check option **Yes, delete this branch on remote**.

---

## 3. View History

Tab **History** bên trái:
- Hiện tất cả commits trên branch hiện tại
- Click commit → xem diff bên phải
- Right-click commit → các action:
  - Revert this commit
  - Reset to this commit
  - Cherry-pick to branch
  - Create branch from commit
  - Copy SHA

---

## 4. Diff Viewer

### Inline diff
Mặc định hiện inline (added/removed cùng panel).

### Side-by-side diff
Click icon **Split view** ở góc phải diff panel.

### Hide whitespace changes
File menu → **Hide Whitespace Changes** — hữu ích khi format code làm nhiều file thay đổi.

### Expand context lines
Click `+` hoặc `-` để mở rộng context xung quanh thay đổi.

---

## 5. Partial Commit (Commit từng dòng)

Use case: Đã sửa nhiều thứ trong cùng 1 file nhưng muốn commit thành nhiều commits riêng.

1. Click vào file trong **Changes**
2. Hover lên line number → checkbox xuất hiện
3. Check chỉ những dòng muốn commit
4. Commit → chỉ những dòng đó được include

Cách khác: hover lên hunk → click **Discard hunk** hoặc check chỉ hunks cần thiết.

---

## 6. Stashing

`Branch → Stash all changes` — lưu tạm thay đổi để switch branch.

`Branch → Restore stash` → khôi phục.

**Use case AEM:** Đang dev feature A, sếp gọi fix bug urgent → stash → switch branch fix → quay lại restore.

---

## 7. Pull Request

Click **Create Pull Request** sau khi push branch.

- GitHub Desktop mở browser → trang tạo PR
- Hỗ trợ GitHub natively
- Azure DevOps / GitLab → mở browser tới repo URL

---

## 8. Merge & Rebase

### Merge another branch into current
`Branch → Merge into current branch` (`Ctrl+Shift+M`):
- Chọn branch source
- Click **Create a merge commit**

### Rebase
`Branch → Rebase current branch` (`Ctrl+Shift+E`):
- Chọn base branch (thường là `develop` hoặc `main`)
- Click **Start rebase**

**AEM workflow điển hình:**
1. Tạo branch `feature/AMS-1234` từ `develop`
2. Code, commit
3. Trước khi merge: rebase với `develop` để có lịch sử sạch
4. Push (force-with-lease nếu đã push trước đó)
5. Tạo PR

---

## 9. Resolve Merge Conflicts

Khi merge/rebase có conflict:
1. GitHub Desktop hiện list files conflict
2. Click **Open in editor** (mở VSCode)
3. VSCode hiện markers: `<<<<<<<`, `=======`, `>>>>>>>`
4. Resolve trong editor → save
5. Quay lại GitHub Desktop → click **Continue merge** hoặc **Continue rebase**

---

## 10. Co-authors

Tại commit message → expand **Add Co-authors**:

```
Co-authored-by: Name <email@example.com>
```

GitHub recognize và hiện nhiều avatars trên commit.

---

## 11. Repository Settings

`Repository → Repository settings`:
- **Remote** — đổi remote URL
- **Branch** — đổi default branch
- **Git LFS** — manage LFS
- **Git Ignore** — edit `.gitignore` từ trong app
- **Git Config** — repo-specific config (user.name, email)

---

## 12. Useful Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Changes tab |
| `Ctrl+2` | History tab |
| `Ctrl+T` | Show all repositories |
| `Ctrl+P` | Push |
| `Ctrl+Shift+P` | Pull |
| `Ctrl+Shift+N` | New branch |
| `Ctrl+B` | Show branches |
| `Ctrl+Shift+M` | Merge into current |
| `Ctrl+Shift+E` | Rebase current |
| `Ctrl+Enter` | Commit |
| `Ctrl+,` | Options/Preferences |
| `Ctrl+Shift+G` | Show in Explorer |

---

## 13. Tích hợp với External Editor

`File → Options → Integrations`:
- **External Editor:** chọn VSCode, IntelliJ, etc.
- **Shell:** PowerShell, Git Bash, Command Prompt

Sau đó:
- `Ctrl+Shift+A` → Open in external editor
- `Ctrl+\`` → Open in shell

---

## 14. Multi-Repository Workflow

Top-left dropdown → list tất cả repos đã clone.

Switch repo nhanh: `Ctrl+T` → search.

**AEM project structure:**
```
- mysite (main project)
- mysite-dispatcher
- mysite-cicd
```

Mỗi cái mở tab riêng trong GitHub Desktop, switch nhanh.

---

## 15. Limitations & Workarounds

### Không hỗ trợ
- Submodules (chỉ clone main repo, submodules phải dùng CLI)
- Interactive rebase (squash, reword commits)
- Cherry-pick range
- Bisect

### Workaround: Mở Git CLI khi cần
`Repository → Open in Shell` (`Ctrl+\``) → dùng `git` command cho operations phức tạp.

```bash
# Squash 3 commits cuối
git rebase -i HEAD~3

# Cherry-pick range
git cherry-pick abc123..def456
```

---

## 16. Tips cho AEM Dev

### Commit message convention
Dùng format: `[AMS-1234] Add hero component dialog`

GitHub Desktop có **Length ruler** — soft limit 50 chars cho summary.

### Ignore AEM build artifacts
`.gitignore` cho AEM project:
```
target/
node_modules/
.vlt
.DS_Store
*.log
crx-quickstart/
```

Edit qua `Repository → Repository settings → Git Ignore`.

### Workflow safe khi dev AEM

1. **Pull develop** mỗi sáng → tránh conflict cuối ngày
2. **Branch riêng** cho mỗi ticket/feature
3. **Commit nhỏ** — mỗi commit 1 logical change (dễ revert)
4. **Pull request review** trước khi merge vào develop
5. **Đừng commit `target/`, IDE configs** — kiểm tra `.gitignore`

---

## 17. So sánh GitHub Desktop vs Git CLI vs SourceTree

| Feature | GitHub Desktop | Git CLI | SourceTree |
|---------|---------------|---------|------------|
| Visual diff | ✅ Tốt | ❌ | ✅ Tốt |
| Interactive rebase | ❌ | ✅ | ✅ |
| Submodules | ❌ | ✅ | ✅ |
| Speed | ✅ Nhanh | ✅ Nhanh | ⚠️ Chậm với repo lớn |
| Learning curve | ✅ Dễ | ⚠️ Khó | ⚠️ Trung bình |
| Cross-platform | ✅ Win/Mac | ✅ All | ✅ Win/Mac |

**Khuyên dùng:** GitHub Desktop cho daily workflow + Git CLI khi cần operations phức tạp.

---

## Tổng kết

GitHub Desktop tốt cho:
- Visual review changes trước commit
- Quick diff/history navigation
- Beginner-friendly Git workflow
- Multi-repository management

Hạn chế ở các tác vụ Git nâng cao → fallback CLI khi cần.
