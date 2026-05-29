// Patch rspress-plugin-devkit & rspress-plugin-mermaid for ESM compatibility
// (upstream bug: https://github.com/linbudu599/rspress-plugins).
//   1. Add explicit .js extensions to relative imports in the devkit dist.
//   2. Inject __dirname shim into the mermaid plugin (it uses CJS __dirname
//      while package.json declares "type": "module").
import fs from 'node:fs';
import path from 'node:path';

const root = 'node_modules/rspress-plugin-devkit/dist';
if (!fs.existsSync(root)) {
  console.log('rspress-plugin-devkit not installed — nothing to patch.');
  process.exit(0);
}

function resolveSpec(fileDir, spec) {
  // strip any extension we may have added incorrectly
  const bare = spec.replace(/\.js$/, '');
  const abs = path.resolve(fileDir, bare);
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    return bare + '/index.js';
  }
  if (fs.existsSync(abs + '.js')) return bare + '.js';
  if (fs.existsSync(abs + '.mjs')) return bare + '.mjs';
  return bare; // leave unchanged
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else if (/\.js$/.test(e.name)) {
      let c = fs.readFileSync(fp, 'utf8');
      const o = c;
      const fileDir = path.dirname(fp);
      // Collapse accidental double slashes (e.g. './Utils//resolveSourcePath')
      c = c.replace(/(['"])(\.\.?\/[^'"]*?)\/{2,}/g, '$1$2/');
      // Resolve relative imports/exports
      c = c.replace(
        /((?:import|export)\s+(?:[^'";]*?\s+from\s+)?)(['"])(\.\.?\/[^'"]+?)\2/g,
        (m, prefix, quote, spec) => {
          // If spec already points to an existing file, leave it.
          const abs = path.resolve(fileDir, spec);
          if (/\.(m?js|json|cjs)$/.test(spec) && fs.existsSync(abs)) return m;
          const resolved = resolveSpec(fileDir, spec);
          return `${prefix}${quote}${resolved}${quote}`;
        }
      );
      if (c !== o) {
        fs.writeFileSync(fp, c);
        console.log('patched:', fp);
      }
    }
  }
}
walk(root);

// Patch the mermaid plugin entry to provide __dirname under ESM.
const mermaidEntry = 'node_modules/rspress-plugin-mermaid/dist/index.js';
if (fs.existsSync(mermaidEntry)) {
  let mc = fs.readFileSync(mermaidEntry, 'utf8');
  if (!mc.includes('fileURLToPath')) {
    const shim =
      "import { fileURLToPath as __rsp_furl } from 'node:url';\n" +
      "import { dirname as __rsp_dn } from 'node:path';\n" +
      'const __dirname = __rsp_dn(__rsp_furl(import.meta.url));\n';
    mc = shim + mc;
    fs.writeFileSync(mermaidEntry, mc);
    console.log('patched:', mermaidEntry);
  }
}

console.log('patch-devkit done.');
