```json file:aem-htl.code-snippet.json
{
  "AEM sly-use": {
    "scope": "html",
    "prefix": "slyuse",
    "body": [
      "<sly data-sly-use.${1:model}=\"${2:com.example.Model}\">",
      "$0",
      "</sly>"
    ],
    "description": "data-sly-use model, fragment, clientlib"
  },

  "AEM sly-list": {
    "scope": "html",
    "prefix": "slylist",
    "body": [
      "<sly data-sly-list.${1:item}=\"\\${${2:items}}\">",
      "    \\${${1:item}}",
      "</sly>$0"
    ],
    "description": "AEM sly-use-list"
  },

  "AEM sly-repeat": {
    "scope": "html",
    "prefix": "slyrepeat",
    "body": [
      "<sly data-sly-list.${1:item}=\"\\${${2:list}}\">",
      "    ${1:item}",
      "</sly>$0"
    ],
    "description": "aem sly-use-repeat"
  },

  "AEM sly-test": {
    "scope": "html",
    "prefix": "slytest",
    "body": [
      "<sly data-use-test=\"\\${${1:condition}}\">",
      "    $0",
      "</sly>"
    ],
    "description": "data-sly-test AEM conditional rendering"
  },

  "AEM sly-set": {
    "scope": "html",
    "prefix": "slyset",
    "body": [
      "<sly data-sly-set.${1:var}=\"\\${${2:value}}\" />$0"
    ],
    "description": "sly-use-set"
  },

  "AEM sly-resource": {
    "scope": "html",
    "prefix": "slyres",
    "body": [
      "<sly data-sly-resource=\"\\${'${1:/content/…}' @ resourceType='${2:mysite/components/}'}\" />$0"
    ],
    "description": "data-sly-resource"
  },

  "AEM sly-include": {
    "scope": "html",
    "prefix": "slyinc",
    "body": [
      "<sly data-sly-include=\"${1:file.html}\" />$0"
    ],
    "description": "data-sly-include"
  },

  "AEM sly-call": {
    "scope": "html",
    "prefix": "slycall",
    "body": [
      "<sly data-sly-call=\"\\${${1:template} @ ${2:params}}\" />$0"
    ],
    "description": "data-sly-call"
  },

  "AEM sly-template": {
    "scope": "html",
    "prefix": ["slytpl", "slytmpl"],
    "body": [
      "<template data-sly-template.${1:name}=\"${2:params}\">",
      "    $0",
      "</template>"
    ],
    "description": "data-sly-template"
  },

  "AEM sly-unwrap": {
    "scope": "html",
    "prefix": "slyunwrap",
    "body": [
      "<div data-sly-unwrap=\"\\${${1:condition}}\">",
      "    $0",
      "</div>"
    ],
    "description": "data-sly-unwrap"
  },

  "AEM sly-attribute": {
    "scope": "html",
    "prefix": "slyattr",
    "body": [
      "<div data-sly-attribute.${1:attr}=\"\\${${2:value}}\">",
      "$0",
      "</div>"
    ],
    "description": "data-sly-attribute"
  },

  "AEM HTL text expression": {
    "scope": "html",
    "prefix": "slytext",
    "body": [
      "\\${${1:text}}$0"
    ],
    "description": "plain text HTL expression"
  },

  "AEM HTL raw html": {
    "scope": "html",
    "prefix": "slyraw",
    "body": [
      "\\${${1:html} @ context='html'}$0"
    ],
    "description": "raw html, rich text"
  },

  "AEM HTL comment": {
    "scope": "html",
    "prefix": "slycmt",
    "body": [
      "<!-- /* ${1:comment} */ -->$0"
    ],
    "description": "HTL comment"
  },

  "AEM Granite path component resource type": {
    "scope": "html",
    "prefix": "htl-granite-path-cmp",
    "body": [
      "granite/ui/components/coral/foundation/form/textfield$0"
    ],
    "description": "Granite UI textfield resource type path"
  }
}
```

- aem xml snippet

```json
{
  "AEM Dialog root": {
    "scope": "xml",
    "prefix": "gdialog",
    "body": [
      "<jcr:root",
      "    xmlns:sling=\"http://sling.apache.org/jcr/sling/1.0\"",
      "    xmlns:jcr=\"http://www.jcp.org/jcr/1.0\"",
      "    xmlns:cq=\"http://www.day.com/jcr/cq/1.0\"",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    jcr:title=\"${1:Dialog}\"",
      "    sling:resourceType=\"cq/gui/components/authoring/dialog\">",
      "",
      "    <content",
      "        jcr:primaryType=\"nt:unstructured\"",
      "        sling:resourceType=\"granite/ui/components/coral/foundation/container\">",
      "",
      "        <items jcr:primaryType=\"nt:unstructured\">",
      "            $0",
      "        </items>",
      "",
      "    </content>",
      "",
      "</jcr:root>"
    ],
    "description": "AEM dialog root (jcr:root with container)"
  },

  "AEM Dialog tabs layout": {
    "scope": "xml",
    "prefix": "gtabs",
    "body": [
      "<tabs",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/tabs\">",
      "",
      "    <items jcr:primaryType=\"nt:unstructured\">",
      "        $0",
      "    </items>",
      "",
      "</tabs>"
    ],
    "description": "layout tabs"
  },

  "AEM Dialog single tab": {
    "scope": "xml",
    "prefix": "tab",
    "body": [
      "<${1:tab1}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    jcr:title=\"${2:Tab}\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/container\">",
      "",
      "    <items jcr:primaryType=\"nt:unstructured\">",
      "        $0",
      "    </items>",
      "",
      "</${1:tab1}>"
    ],
    "description": "Single tab in dialog"
  },

  "AEM Dialog textfield": {
    "scope": "xml",
    "prefix": "gtextfield",
    "body": [
      "<${1:title}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/form/textfield\"",
      "    fieldLabel=\"${2:title}\"",
      "    name=\"./${3:title}\" />"
    ],
    "description": "Granite UI textfield"
  },

  "AEM Dialog textarea": {
    "scope": "xml",
    "prefix": "gtextarea",
    "body": [
      "<${1:fieldName}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/form/textarea\"",
      "    fieldLabel=\"${2:Label}\"",
      "    name=\"./${3:propName}\" />"
    ],
    "description": "Granite UI textarea"
  },

  "AEM Dialog checkbox": {
    "scope": "xml",
    "prefix": "gcheckbox",
    "body": [
      "<${1:fieldName}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/form/checkbox\"",
      "    text=\"${2:Label}\"",
      "    name=\"./${3:propName}\"",
      "    value=\"true\" />"
    ],
    "description": "AEM dialog checkbox"
  },

  "AEM Dialog select": {
    "scope": "xml",
    "prefix": "gselect",
    "body": [
      "<${1:fieldName}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/form/select\"",
      "    fieldLabel=\"${2:Label}\"",
      "    name=\"./${3:propName}\">",
      "",
      "    <items jcr:primaryType=\"nt:unstructured\">",
      "        $0",
      "    </items>",
      "",
      "</${1:fieldName}>"
    ],
    "description": "select in dialog"
  },

  "AEM Dialog select option": {
    "scope": "xml",
    "prefix": "goption",
    "body": [
      "<${1:value}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    text=\"${2:Text}\"",
      "    value=\"${1:value}\" />"
    ],
    "description": "option for select in dialog"
  },

  "AEM Dialog pathfield": {
    "scope": "xml",
    "prefix": "gpathfield",
    "body": [
      "<${1:fieldName}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/form/pathfield\"",
      "    fieldLabel=\"${2:Label}\"",
      "    name=\"./${3:propName}\"",
      "    rootPath=\"${4:/content}\" />"
    ],
    "description": "dialog path field"
  },

  "AEM Dialog fileupload": {
    "scope": "xml",
    "prefix": "gfileupload",
    "body": [
      "<${1:image}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"cq/gui/components/authoring/dialog/fileupload\"",
      "    fieldLabel=\"${2:Label}\"",
      "    name=\"./file\"",
      "    fileNameParameter=\"./fileName\"",
      "    fileReferenceParameter=\"./fileReference\"",
      "    allowUpload=\"{Boolean}true\" />"
    ],
    "description": "fileupload in dialog"
  },

  "AEM Dialog multifield": {
    "scope": "xml",
    "prefix": "gmultifield",
    "body": [
      "<${1:fieldName}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/form/multifield\"",
      "    fieldLabel=\"${2:Label}\"",
      "    composite=\"{Boolean}true\">",
      "",
      "    <field",
      "        jcr:primaryType=\"nt:unstructured\"",
      "        sling:resourceType=\"granite/ui/components/coral/foundation/container\"",
      "        name=\"./${3:propName}\">",
      "",
      "        <items jcr:primaryType=\"nt:unstructured\">",
      "            $0",
      "        </items>",
      "",
      "    </field>",
      "",
      "</${1:fieldName}>"
    ],
    "description": "Granite UI multifield (composite)"
  },

  "AEM Dialog numberfield": {
    "scope": "xml",
    "prefix": "gnumber",
    "body": [
      "<${1:fieldName}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/form/numberfield\"",
      "    fieldLabel=\"${2:Label}\"",
      "    name=\"./${3:propName}\" />"
    ],
    "description": "Granite UI numberfield"
  },

  "AEM Dialog switch/toggle": {
    "scope": "xml",
    "prefix": ["gswitch", "gtoggle"],
    "body": [
      "<${1:fieldName}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/form/switch\"",
      "    fieldLabel=\"${2:Label}\"",
      "    name=\"./${3:propName}\" />"
    ],
    "description": "Granite UI switch/toggle"
  },

  "AEM Dialog hidden field": {
    "scope": "xml",
    "prefix": "ghidden",
    "body": [
      "<${1:fieldName}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/form/hidden\"",
      "    name=\"./${2:propName}\"",
      "    value=\"${3:value}\" />"
    ],
    "description": "Granite UI hidden field"
  },

  "AEM Dialog container": {
    "scope": "xml",
    "prefix": "gcontainer",
    "body": [
      "<${1:container}",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    sling:resourceType=\"granite/ui/components/coral/foundation/container\">",
      "",
      "    <items jcr:primaryType=\"nt:unstructured\">",
      "        $0",
      "    </items>",
      "",
      "</${1:container}>"
    ],
    "description": "Granite UI container"
  },

  "AEM Component Dialog (cq:dialog)": {
    "scope": "xml",
    "prefix": ["gcmpdialog", "cq:dialog", "cmp"],
    "body": [
      "<jcr:root",
      "    xmlns:sling=\"http://sling.apache.org/jcr/sling/1.0\"",
      "    xmlns:jcr=\"http://www.jcp.org/jcr/1.0\"",
      "    xmlns:cq=\"http://www.day.com/jcr/cq/1.0\"",
      "    jcr:primaryType=\"nt:unstructured\"",
      "    jcr:title=\"${1:Component Dialog}\"",
      "    sling:resourceType=\"cq/gui/components/authoring/dialog\">",
      "",
      "    <content",
      "        jcr:primaryType=\"nt:unstructured\"",
      "        sling:resourceType=\"granite/ui/components/coral/foundation/tabs\">",
      "",
      "        <items jcr:primaryType=\"nt:unstructured\">",
      "",
      "            <properties",
      "                jcr:primaryType=\"nt:unstructured\"",
      "                jcr:title=\"Properties\"",
      "                sling:resourceType=\"granite/ui/components/coral/foundation/container\">",
      "",
      "                <items jcr:primaryType=\"nt:unstructured\">",
      "                    $0",
      "                </items>",
      "",
      "            </properties>",
      "",
      "        </items>",
      "",
      "    </content>",
      "",
      "</jcr:root>"
    ],
    "description": "Full AEM component dialog with tabs and properties tab"
  },

  "AEM XML header": {
    "scope": "xml",
    "prefix": "g-xml-header",
    "body": [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>$0"
    ],
    "description": "XML declaration header"
  },

  "AEM Component .content.xml declaration": {
    "scope": "xml",
    "prefix": ["cmpxml", "gcmpxml"],
    "body": [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<jcr:root",
      "    xmlns:sling=\"http://sling.apache.org/jcr/sling/1.0\"",
      "    xmlns:jcr=\"http://www.jcp.org/jcr/1.0\"",
      "    xmlns:cq=\"http://www.day.com/jcr/cq/1.0\"",
      "    xmlns:nt=\"http://www.jcp.org/jcr/nt/1.0\"",
      "",
      "    jcr:primaryType=\"cq:Component\"",
      "    jcr:title=\"${1:Component Title}\"",
      "    componentGroup=\"${2:My Site}\"",
      "    sling:resourceSuperType=\"${3:core/wcm/components/}\"",
      "/>"
    ],
    "description": ".content.xml component declaration"
  },

  "AEM ClientLib .content.xml": {
    "scope": "xml",
    "prefix": "content.xml.clientlib",
    "body": [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<jcr:root",
      "    xmlns:cq=\"http://www.day.com/jcr/cq/1.0\"",
      "    xmlns:jcr=\"http://www.jcp.org/jcr/1.0\"",
      "    xmlns:sling=\"http://sling.apache.org/jcr/sling/1.0\"",
      "    jcr:primaryType=\"cq:ClientLibraryFolder\"",
      "    allowProxy=\"{Boolean}true\"",
      "    categories=\"[${1:mysite.public.css}]\"",
      "/>"
    ],
    "description": "jcr:root Client lib folder .content.xml"
  },

  "AEM Custom Component .content.xml": {
    "scope": "xml",
    "prefix": ".content.xml",
    "body": [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<jcr:root xmlns:sling=\"http://sling.apache.org/jcr/sling/1.0\"",
      "    xmlns:jcr=\"http://www.jcp.org/jcr/1.0\"",
      "    xmlns:cq=\"http://www.day.com/jcr/cq/1.0\"",
      "",
      "    jcr:primaryType=\"cq:Component\"",
      "    jcr:title=\"${1:ComponentName} Component\"",
      "    jcr:description=\"My ${1:ComponentName} Component From Crash\"",
      "    componentGroup=\"Novalane - Content\"",
      "/>"
    ],
    "description": ".content.xml for Custom Component Definition"
  },

  "AEM Core Component Extension .content.xml": {
    "scope": "xml",
    "prefix": ".content.xml.super",
    "body": [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<jcr:root xmlns:sling=\"http://sling.apache.org/jcr/sling/1.0\"",
      "    xmlns:jcr=\"http://www.jcp.org/jcr/1.0\"",
      "    xmlns:cq=\"http://www.day.com/jcr/cq/1.0\"",
      "",
      "    jcr:primaryType=\"cq:Component\"",
      "    jcr:title=\"${1:ComponentName} Component\"",
      "    jcr:description=\"My ${1:ComponentName} Component From Crash\"",
      "    sling:resourceSuperType=\"core/wcm/components/image/v2/image\"",
      "    componentGroup=\"My Site - Content\"",
      "/>"
    ],
    "description": ".content.xml for Extending Core Component"
  }
}

```

- vscode settings json

```json file:settings.json
{
    // === PERFORMANCE ===
    "files.watcherExclude": {
        "**/.git/objects/**": true,
        "**/.git/subtree-cache/**": true,
        "**/node_modules/**": true,
        "**/dist/**": true,
        "**/.cache/**": true,
        "**/target/**": true,
        "**/.idea/**": true,
        "**/.hg/store/**": true,
        "**/bower_components/**": true
    },
    "search.exclude": {
        "**/target": true,
        "**/node_modules": true,
        "**/.vlt": true,
        "**/.vlt-sync": true,
        "**/bower_components": true
    },
    "files.exclude": {
        "**/.vlt": true,
        "**/.project": true,
        "**/.settings": true,
        "**/.vlt-sync": true,
        "**/target": true,
        "**/node_modules": true
    },
    "search.followSymlinks": false,
    "workbench.list.smoothScrolling": true,
    "editor.smoothScrolling": true,
    "editor.minimap.renderCharacters": false,
    "editor.minimap.maxColumn": 80,
    "extensions.autoCheckUpdates": false,
    "extensions.autoUpdate": false,
    // === UI & EXPERIENCE ===
    "window.commandCenter": false,
    "workbench.startupEditor": "none",
    "workbench.colorTheme": "GitHub Dark",
    "explorer.compactFolders": false,
    "material-icon-theme.activeIconPack": "angular",
    // === EDITOR ===
    "editor.fontSize": 17,
    "editor.fontFamily": "'Jetbrains Mono', Consolas, monospace",
    "editor.fontLigatures": true,
    "editor.cursorSmoothCaretAnimation": "on",
    "editor.tabSize": 2,
    "editor.rulers": [
        80,
        120
    ],
    "editor.guides.bracketPairs": true,
    "editor.guides.indentation": true,
    // File handling
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 1000,
    "files.associations": {
        "*.vue": "vue",
        "*.model.json": "json",
        "*.template.html": "html",
        "*.content.xml": "xml",
        "*.dialog.xml": "xml",
        "*.htl": "html",
        "*.html": "html",
        "_cq_dialog/.content.xml": "xml"
    },
    // Formatting & Linting
    "editor.defaultFormatter": "rvest.vs-code-prettier-eslint",
    "editor.formatOnPaste": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit",
        "source.organizeImports": "explicit"
    },
    "eslint.validate": [
        "javascript",
        "javascriptreact",
        "vue"
    ],
    // Language-specific
    "[java]": {
        "editor.tabSize": 4
    },
    "[html]": {
        "editor.defaultFormatter": "vscode.html-language-features"
    },
    "[css]": {
        "editor.defaultFormatter": "sibiraj-s.vscode-scss-formatter"
    },
    "[json]": {
        "editor.defaultFormatter": "rvest.vs-code-prettier-eslint"
    },
    "[jsonc]": {
        "editor.defaultFormatter": "vscode.json-language-features"
    },
    "[typescript]": {
        "editor.defaultFormatter": "rvest.vs-code-prettier-eslint"
    },
    // === JAVA ===
    "java.jdt.ls.java.home": "C:\\Users\\nhan\\.jdks\\azul-11.0.31",
    "java.configuration.runtimes": [
        {
            "name": "JavaSE-11",
            "path": "C:\\Users\\nhan\\.jdks\\azul-11.0.31",
            "default": true
        }
    ],
    "java.jdt.ls.vmargs": "-XX:+UseParallelGC -XX:GCTimeRatio=4 -XX:AdaptiveSizePolicyWeight=90 -Dsun.zip.disableMemoryMapping=true -Xmx2G -Xms512m -Xlog:disable",
    "java.gradle.buildServer.enabled": "off",
    "java.import.gradle.enabled": false,
    "java.configuration.updateBuildConfiguration": "interactive",
    "java.maxConcurrentBuilds": 1,
    "java.maven.downloadSources": true,
    "java.referencesCodeLens.enabled": true,
    "java.autobuild.enabled": true,
    "maven.executable.path": "mvn",
    "maven.terminal.useJavaHome": true,
    "maven.view": "hierarchical",
    // === TOOLS & EXTENSIONS ===
    "emmet.includeLanguages": {
        "html": "htl"
    },
    "aemsync.syncDelay": 300,
    "auto-rename-tag.activationOnLanguage": [
        "html",
        "htl",
        "vue",
        "xml"
    ],
    "path-intellisense.autoSlashAfterDirectory": true,
    "security.workspace.trust.untrustedFiles": "open",
    "debug.onTaskErrors": "showErrors",
    "diffEditor.ignoreTrimWhitespace": false,
}
```