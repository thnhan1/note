## Vscode Setting

## Minimal extension vscode settings.json

```json
{
    // ── Theme & UI ──────────────────────────────────────────────
    "workbench.colorTheme": "GitHub Dark",
    "workbench.iconTheme": "material-icon-theme",
    // "workbench.activityBar.location": "hidden",
    "workbench.statusBar.visible": true,
    "workbench.editor.showTabs": "multiple",
    "workbench.editor.tabSizing": "shrink",
    "workbench.editor.enablePreview": false,
    "workbench.startupEditor": "none",
    "workbench.tips.enabled": false,
    "workbench.tree.indent": 14,

    // ── Window ──────────────────────────────────────────────────
    "window.zoomLevel": 1,
    "window.menuBarVisibility": "classic",
    "window.commandCenter": false,
    "window.titleBarStyle": "custom",
    "window.title": "${activeEditorShort}${separator}${rootName}",

    // ── Editor ──────────────────────────────────────────────────
    "editor.fontFamily": "Fira Code",
    "editor.fontSize": 16,
    "editor.fontLigatures": true,
    "editor.lineHeight": 1.6,
    "editor.tabSize": 4,
    "editor.insertSpaces": true,
    "editor.detectIndentation": true,
    "editor.rulers": [120],
    "editor.wordWrap": "off",
    "editor.minimap.enabled": false,
    "editor.scrollbar.vertical": "auto",
    "editor.scrollbar.horizontal": "auto",
    "editor.overviewRulerBorder": false,
    "editor.glyphMargin": false,
    "editor.folding": true,
    "editor.showFoldingControls": "mouseover",
    "editor.bracketPairColorization.enabled": true,
    "editor.guides.bracketPairs": "active",
    "editor.stickyScroll.enabled": true,
    "editor.cursorBlinking": "smooth",
    "editor.cursorSmoothCaretAnimation": "on",
    "editor.smoothScrolling": true,
    "editor.inlineSuggest.enabled": true,
    "editor.tabCompletion": "on",
    "editor.quickSuggestions": {
        "other": "on",
        "comments": "off",
        "strings": "off"
    },
    // LEGACY PROJECT: nghiêm cấm auto format để tránh noise trong git diff
    "editor.formatOnSave": false,
    "editor.formatOnPaste": false,
    "editor.formatOnType": false,
    "editor.codeActionsOnSave": {},

    // ── Files ────────────────────────────────────────────────────
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 1000,
    "files.trimTrailingWhitespace": false,
    "files.insertFinalNewline": true,
    "files.trimFinalNewlines": true,
    "files.encoding": "utf8",
    "files.eol": "\n",
    "files.exclude": {
        "**/.git": true,
        "**/.DS_Store": true,
        "**/target": true,
        "**/node_modules": true
    },
    "files.watcherExclude": {
        "**/target/**": true,
        "**/node_modules/**": true,
        "**/.git/objects/**": true
    },
    "search.exclude": {
        "**/target": true,
        "**/node_modules": true,
        "**/*.min.js": true,
        "**/*.min.css": true
    },

    // ── Java ─────────────────────────────────────────────────────
    "java.configuration.runtimes": [
        {
            "name": "JavaSE-11",
            "path": "C:\\Users\\nhan\\.jdks\\azul-11.0.31",
            "default": true
        }
    ],
    "java.compile.nullAnalysis.mode": "automatic",
    "java.completion.importOrder": ["java", "javax", "org", "com", ""],
    "java.inlayHints.parameterNames.enabled": "literals",
    "java.server.launchMode": "Standard",
    "java.autobuild.enabled": false,

    // ── Maven ────────────────────────────────────────────────────
    "maven.executable.path": "mvn",
    "maven.terminal.useJavaHome": true,
    "maven.pomfile.autoUpdateEffectivePOM": false,
    "maven.view": "hierarchical",

    // ── Language-specific (formatOnSave off toàn bộ) ─────────────
    "html.autoClosingTags": true,
    "xml.validation.enabled": true,
    "xml.format.preserveAttributeLineBreaks": true,
    "[java]": {
        "editor.formatOnSave": false,
        "editor.tabSize": 4
    },
    "[xml]": {
        "editor.formatOnSave": false,
        "editor.tabSize": 4
    },
    "[javascript]": {
        "editor.formatOnSave": false,
        "editor.tabSize": 2
    },
    "[typescript]": {
        "editor.formatOnSave": false,
        "editor.tabSize": 2
    },
    "[html]": {
        "editor.formatOnSave": false,
        "editor.tabSize": 2
    },
    "[css]": {
        "editor.formatOnSave": false
    },
    "[json]": {
        "editor.defaultFormatter": "vscode.json-language-features",
        "editor.formatOnSave": false,
        "editor.tabSize": 2
    },
    "[jsonc]": {
        "editor.defaultFormatter": "vscode.json-language-features",
        "editor.formatOnSave": false
    },
    "[markdown]": {
        "editor.formatOnSave": false,
        "editor.wordWrap": "on",
        "editor.tabSize": 2
    },

    // ── Terminal ─────────────────────────────────────────────────
    "terminal.integrated.fontFamily": "Fira Code",
    "terminal.integrated.fontSize": 14.5,
    "terminal.integrated.cursorBlinking": true,
    "terminal.integrated.scrollback": 5000,
    "terminal.integrated.defaultProfile.windows": "PowerShell",

    // ── Git ──────────────────────────────────────────────────────
    "git.autofetch": true,
    "git.confirmSync": true,
    "git.enableSmartCommit": false,
    "git.pruneOnFetch": true,
    "git.openRepositoryInParentFolders": "always",

    // ── Misc ─────────────────────────────────────────────────────
    "grunt.autoDetect": "off",
    "npm.autoDetect": "off",
    "jake.autoDetect": "off",
    "gulp.autoDetect": "off",
    "breadcrumbs.enabled": true,
    "problems.showCurrentInStatus": true,
    "security.workspace.trust.untrustedFiles": "open"
}
```
