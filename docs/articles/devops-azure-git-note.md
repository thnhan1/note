---
title: Git Cheatsheet cho Azure DevOps Workflow
tags: [ams, git, azure-devops, cheatsheet]
---

# Git Cheatsheet — Azure DevOps

Personal quick-ref cho AMS workflow: Azure Repos, multi-project AEM, rebase, cherry-pick, hotfix, `az repos` CLI.

---

## 1. Setup ban đầu cho Azure DevOps

### 1.1 Identity

```bash
git config --global user.name  "Nguyen Van A"
git config --global user.email "a.nguyen@company.com"
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global rebase.autoStash true
git config --global core.autocrlf true   # Windows
git config --global core.longpaths true  # Windows + AEM (path > 260 chars)
```

### 1.2 Authentication

**GCM (recommend)** — bundle sẵn Git for Windows, tự xử lý MFA:
```bash
git config --global credential.helper manager
```

**PAT** — tạo tại User Settings → Personal Access Tokens (scope `Code Read & Write`):
```bash
git clone https://YOUR_PAT@dev.azure.com/{org}/{project}/_git/{repo}
```

**SSH:**
```bash
ssh-keygen -t ed25519 -C "email@company.com"
# Upload ~/.ssh/id_ed25519.pub → Azure DevOps → SSH Public Keys
git clone git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
```

---

## 2. Clone & Remote

```bash
git clone https://dev.azure.com/{org}/{project}/_git/{repo}
git clone --depth=1 <url>                                        # shallow
git clone -b release/v1.2 --single-branch <url>

git remote add upstream https://dev.azure.com/.../_git/{repo}
git remote set-url origin git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
git remote -v
git fetch --all --prune
```

---

## 3. Branching

**Naming convention:**
```text
main / develop / release/v1.2
feature/{work-item-id}-desc
bugfix/{work-item-id}-desc
hotfix/{work-item-id}-desc
users/{alias}/scratch
```

```bash
git switch -c feature/12345-add-login
git switch main

git branch -a                        # list local + remote
git branch -vv                       # kèm tracking info
git branch --merged main
git branch --no-merged main

git branch -m old-name new-name
git branch -d feature/done           # safe delete
git branch -D feature/abandoned      # force
git push origin --delete feature/x   # xóa remote
```

> Work Item link: dùng `#12345` trong commit message hoặc PR description — Azure tự link.

---

## 4. Commit

```bash
git status -sb
git add file1 file2
git add -p                           # interactive hunk
git add -u                           # tracked only

git commit -m "feat(login): add Azure AD SSO #12345"
git commit -am "Subject"
git commit --amend
git commit --amend --no-edit
```

Conventional commits: `feat|fix|refactor|chore|docs(scope): message #work-item`

### 4.1 Diff & log

```bash
git diff                             # working dir vs index
git diff --staged                    # index vs HEAD
git diff main...feature/x
git diff --stat / --name-only

git log --oneline --graph --all --decorate -20
git log --author="Nguyen" --since="1 week ago"
git log -p path/to/file
git log -S"functionName"             # tìm commit đụng symbol
git log --follow path/file           # trace qua rename
```

### 4.2 Blame

```bash
git blame -L 50,100 file.java
git blame -w -M -C file.java         # ignore whitespace, detect move/copy
```

---

## 5. Sync với remote

```bash
git fetch origin
git fetch --prune
git fetch --all --tags

git pull --rebase origin main
git pull --ff-only

git push -u origin feature/12345
git push --force-with-lease         # KHÔNG push --force lên main/develop/release/*
git push --tags
```

---

## 6. Rebase

### 6.1 Sync feature với main

```bash
git switch feature/12345
git fetch origin
git rebase origin/main
# conflict → sửa → git add → git rebase --continue
# abort    → git rebase --abort
git push --force-with-lease
```

### 6.2 Interactive rebase — dọn commit trước PR

```bash
git rebase -i origin/main
```

| Action | Tác dụng |
|---|---|
| `pick` | giữ nguyên |
| `reword` | sửa message |
| `squash` | gộp vào commit trên, merge message |
| `fixup` | gộp, bỏ message |
| `drop` | xóa commit |
| `edit` | dừng để amend |

### 6.3 Autosquash

```bash
git commit --fixup=<sha>
git rebase -i --autosquash origin/main
```

---

## 7. Merge

```bash
git merge --no-ff feature/12345     # giữ merge commit
git merge --ff-only feature/12345   # fast-forward only
git merge --squash feature/12345    # squash thành 1 commit
git merge --abort
```

| Strategy | Khi dùng |
|---|---|
| **Squash** | Feature nhiều commit nhỏ, muốn main sạch |
| **Rebase + FF** | Linear history, giữ từng commit |
| **Merge no-FF** | Ghi rõ điểm merge |

> Cấu hình merge strategy: **Repos → Branches → main → Branch policies → Limit merge types**.

---

## 8. Cherry-pick — port fix sang release branch

```bash
git switch release/v1.2
git cherry-pick <sha>
git cherry-pick <sha1> <sha2> <sha3>
git cherry-pick A..B                 # range (exclusive..inclusive)
git cherry-pick -n <sha>             # không tự commit

# conflict → git add → git cherry-pick --continue
#             abort  → git cherry-pick --abort
```

---

## 9. Stash

```bash
git stash push -m "WIP login form"
git stash push -u                    # bao gồm untracked
git stash list
git stash show -p stash@{0}
git stash pop                        # apply + xóa
git stash apply stash@{0}            # apply, giữ stash
git stash drop stash@{0}
git stash clear
git stash branch new-branch          # convert thành branch
```

---

## 10. Undo & Recovery

| Tình huống | Command |
|---|---|
| Bỏ thay đổi file chưa add | `git restore &lt;file&gt;` |
| Bỏ thay đổi đã add (unstage) | `git restore --staged &lt;file&gt;` |
| Untrack file | `git rm --cached &lt;file&gt;` |
| Reset giữ working dir | `git reset --soft HEAD~1` |
| Reset bỏ index, giữ file | `git reset --mixed HEAD~1` |
| Reset cứng, mất tất cả | `git reset --hard HEAD~1` |
| Revert tạo commit ngược | `git revert &lt;sha&gt;` |
| Revert merge commit | `git revert -m 1 &lt;merge-sha&gt;` |
| Tìm commit đã mất | `git reflog` |
| Khôi phục branch đã xóa | `git switch -c feature/x &lt;sha-từ-reflog&gt;` |
| Khôi phục file đã xóa | `git checkout HEAD~1 -- path/file` |

---

## 11. Tag & Release

```bash
git tag -a v1.2.0 -m "Release 1.2.0"   # annotated (recommend)
git tag v1.2.0-rc1                       # lightweight
git tag -a v1.2.0 <sha> -m "..."        # tag commit cũ

git push origin v1.2.0
git push --tags

git tag -d v1.2.0
git push origin --delete v1.2.0

git tag --sort=-creatordate | head
```

Pipeline trigger theo tag:
```yaml
trigger:
  tags:
    include: [v*]
```

---

## 12. Submodule

```bash
git submodule add https://dev.azure.com/.../_git/project-a project-a
git submodule update --init --recursive
git submodule update --remote --merge
git clone --recurse-submodules <url>
```

> Với AEM monorepo, **monorepo + path-based pipeline trigger** dễ vận hành hơn submodule.

---

## 13. Sparse-checkout — chỉ lấy 1 sub-project

```bash
git clone --filter=blob:none --no-checkout <url>
cd repo
git sparse-checkout init --cone
git sparse-checkout set project-a shared-libs
git checkout main

git sparse-checkout add project-b
git sparse-checkout disable
```

---

## 14. Pull Request — Azure CLI

```bash
az extension add --name azure-devops
az devops login
az devops configure --defaults organization=https://dev.azure.com/{org} project={project}
```

```bash
az repos pr create \
  --repository my-repo \
  --source-branch feature/12345-add-login \
  --target-branch main \
  --title "feat(login): Add Azure AD SSO #12345" \
  --work-items 12345 \
  --reviewers a@company.com b@company.com \
  --delete-source-branch true \
  --auto-complete true \
  --squash true

az repos pr list --status active
az repos pr show --id 123
az repos pr set-vote --id 123 --vote approve
az repos pr update --id 123 --status completed
az repos pr work-item add --id 123 --work-items 12345
```

---

## 15. Pipeline trigger

```yaml
trigger:
  branches:
    include: [main, release/*]
  paths:
    include: [project-a/**]
    exclude: ['**/*.md', docs/**]

pr:
  branches:
    include: [main]
  paths:
    include: [project-a/**]
```

Skip CI: thêm `[skip ci]` hoặc `***NO_CI***` vào commit message.

---

## 16. Branch policy checklist

**Repos → Branches → main → Branch policies:**

- Min 2 reviewers, reset votes on new push
- Require linked Work Item
- Build validation trước merge
- Status check: CodeQL / SonarCloud / Snyk
- Comment resolution required
- Limit merge types: Squash hoặc Rebase only

---

## 17. Conflict resolution

```bash
# Rebase conflict
git mergetool                        # hoặc edit tay marker <<<<< ===== >>>>>
git add path/file
git rebase --continue
git rebase --abort                   # bỏ cuộc

# Lấy 1 bên
git checkout --ours   path/file      # giữ branch hiện tại
git checkout --theirs path/file      # lấy bên đang merge vào
git add path/file
```

**AEM `.content.xml` conflict** — thứ tự attribute hay conflict vô nghĩa:
```bash
echo "ui.content/**/.content.xml merge=ours" >> .gitattributes
git config merge.ours.driver true
```

---

## 18. Multi-project branch model

**Option 1 — Monorepo (recommend):**
```text
repo/
├── project-a/ | project-b/ | project-c/
└── azure-pipelines/
    ├── project-a.yml
    └── project-b.yml
```
Branch prefix: `feature/project-a/12345-desc`, `hotfix/project-b/67890-fix`

**Option 2 — Multi-repo + umbrella:**
Mỗi project = 1 Azure Repo riêng, repo `meta` dùng submodule pin commit.

---

## 19. Aliases — `~/.gitconfig`

```ini
[alias]
    st  = status -sb
    co  = checkout
    sw  = switch
    br  = branch
    cm  = commit -m
    ca  = commit --amend
    can = commit --amend --no-edit
    lg  = log --oneline --graph --all --decorate -30
    last = log -1 HEAD --stat
    unstage = restore --staged
    discard = restore
    pf  = push --force-with-lease
    cleanup = "!git branch --merged main | grep -v '^\\*\\|main\\|develop' | xargs -r git branch -d"
    pr-list = "!az repos pr list --status active --output table"
    sync = "!git fetch --all --prune && git rebase origin/$(git branch --show-current)"
    wip = "!git add -A && git commit -m 'WIP'"
    unwip = "reset HEAD~1 --mixed"
```

---

## 20. Troubleshooting

| Vấn đề | Fix |
|---|---|
| `fatal: Authentication failed` | PAT hết hạn → generate lại; GCM cache cũ → `git credential-manager erase` |
| Conditional Access block | PAT cần scope `vso.code_write` |
| `LF will be replaced by CRLF` | `git config --global core.autocrlf true` (Windows) |
| `filename too long` (AEM/Windows) | `git config --system core.longpaths true` |
| Push bị reject (branch policy) | Không push thẳng `main` → dùng PR |
| Repo quá lớn | `git clone --depth=20` hoặc `--filter=blob:none` |

**.gitattributes** chuẩn cho AEM project:
```text
* text=auto eol=lf
*.bat text eol=crlf
*.cmd text eol=crlf
*.sh  text eol=lf
```

**Lỡ commit secret:**
```bash
# Chưa push
git reset --soft HEAD~1   # sửa rồi commit lại

# Đã push — rewrite history + thông báo team
git filter-repo --invert-paths --path path/to/secret.txt
git push --force-with-lease
# Revoke PAT/secret cũ ngay trong Azure DevOps Portal
```

---

## 21. Daily workflow

```bash
# Bắt đầu ngày
git fetch --all --prune
git switch main && git pull --rebase

# Feature mới
git switch -c feature/12345-desc
# ... code ...
git add -p
git commit -m "feat(scope): message #12345"

# Trước PR — dọn history
git fetch origin
git rebase -i origin/main
git push -u origin feature/12345-desc
# hoặc force-with-lease nếu đã push trước
git push --force-with-lease

# Tạo PR
az repos pr create --source-branch feature/12345-desc --target-branch main \
  --title "..." --work-items 12345 --auto-complete true --squash true

# Sau merge
git switch main && git pull --rebase
git branch -d feature/12345-desc
```

---

## 22. Tham khảo

- [Azure Repos Git Docs](https://learn.microsoft.com/en-us/azure/devops/repos/git/)
- [az repos CLI](https://learn.microsoft.com/en-us/cli/azure/repos)
- [Branch policies](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies)
- [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager)
- [Conventional Commits](https://www.conventionalcommits.org/)
