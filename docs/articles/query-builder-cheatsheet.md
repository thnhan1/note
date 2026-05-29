
## Pages within a Content Node

Path: `/content/aem-demo/de`
Type: `cq:Page`

## Page Name contains Specific Word

Path: `/content/aem-demo/de`
Type: `cq:Page`
Node Name: `*product*`

## Total Components within a Page

Path: `/content/aem-demo/de/de/jcr:content`
Property: `sling:resourceType`
Property Operation: `like`
Property Value: `%aem-demo/components%`

## Search by Multiple Properties

Path: `/content/aem-demo/de`
1 Property: `sling:resourceType`
1 Property Value: `aem-demo/components/container`
2 Property: `layout`
2 Property Value: `simple`

## Search by Multiple Property Values

Path: `/content/aem-demo/de`
1 Property: `sling:resourceType`
1 Property Value: `aem-demo/components/container`
2 Property: `layout`
2 Property Value: `simple`, `responsiveGrid`

## Search under Multiple Paths

Group: `true`
1 Path: `/content/aem-demo/de`
1 Path: `/content/aem-demo/it`
1 Property: `sling:resourceType`
1 Property Value: `aem-demo/components/container`

## Return Selective Properties

Path: `/content/aem-demo/de`
Type: `cq:Page`
Hits: `selective`
Properties: `jcr:path`, `jcr:content/jcr:title`, `jcr:content/sling:alias`

## Assets within a Folder

Path: `/content/dam/aem-demo/de`
Type: `dam:Asset`
