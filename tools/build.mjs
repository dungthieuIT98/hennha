// Builds the deployable site into dist/: every <script src> in index.html is joined, in order, into one
// deferred app.<hash>.js. Development keeps the separate files; upload dist/ as a static site.
// Usage: node tools/build.mjs        (Node 18+, no dependencies)
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");
// copied as they are: stylesheets and fonts, plus the Lottie files js/fx.js loads after the first screen
const COPY = ["css", "fonts", "vendor/lottie_light.min.js", "lottie/animations.js"];
const SCRIPT_TAG = /<script src="([^"]+)"><\/script>\r?\n?/g;

const fail = (msg) => { console.error("build failed: " + msg); process.exit(1); };
const inRoot = (p) => { const r = resolve(root, p); if (!r.startsWith(root + sep)) fail("path outside the project: " + p); return r; };

const html = readFileSync(join(root, "index.html"), "utf8");
const srcs = [...html.matchAll(SCRIPT_TAG)].map((m) => m[1]);
if (!srcs.length) fail("no <script src> tags found in index.html");

// App files start with "use strict", which is only a directive at the top of a script or function,
// so each one gets its own function scope. Vendor files are UMD builds and are left untouched.
const parts = srcs.map((src) => {
  const file = inRoot(src);
  if (!existsSync(file)) fail("missing script " + src);
  const code = readFileSync(file, "utf8");
  return /^\s*"use strict";/.test(code) ? `// ${src}\n(function () {\n${code}\n})();` : `// ${src}\n${code}`;
});
const bundle = parts.join("\n;\n");
for (const src of COPY.filter((p) => p.endsWith(".js"))) if (!bundle.includes(`"${src}"`)) fail(`${src} is copied but no script loads it, check LOTTIE_SRC in js/fx.js`);

const name = "app." + createHash("sha256").update(bundle).digest("hex").slice(0, 10) + ".js";
const page = html.replace(SCRIPT_TAG, "").replace("</head>", `<script defer src="${name}"></script>\n</head>`);
if (!page.includes(name)) fail("no </head> in index.html");

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out);
writeFileSync(join(out, "index.html"), page);
writeFileSync(join(out, name), bundle);
for (const p of COPY) {
  const from = inRoot(p);
  if (!existsSync(from)) fail("missing " + p);
  mkdirSync(dirname(join(out, p)), { recursive: true });
  cpSync(from, join(out, p), { recursive: true });
}

const kb = (n) => (n / 1024).toFixed(1) + "KB";
console.log(`dist/${name}  ${kb(bundle.length)} (${kb(gzipSync(bundle).length)} gzip) from ${srcs.length} scripts`);
console.log("copied: " + COPY.join(", "));
console.log("upload " + relative(process.cwd(), out) + "/ (" + kb(dirSize(out)) + " total)");

function dirSize(dir) {
  return readdirSync(dir).reduce((sum, n) => { const p = join(dir, n); return sum + (statSync(p).isDirectory() ? dirSize(p) : statSync(p).size); }, 0);
}
