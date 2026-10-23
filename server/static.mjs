// Static files for the DiDateHong server: allowlisted paths under one root, brotli/gzip, ETag revalidation.
// Shared with the UI test server (.claude/skills/hennha-ui-test/scripts/serve.mjs) so tests run this exact code.
import { readFile, stat } from "node:fs/promises";
import { realpathSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { brotliCompressSync, constants as Z, gzipSync } from "node:zlib";
import { extname, relative, resolve, sep } from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8",
};
const ALLOWED_DIRS = new Set(["css", "fonts", "img", "js", "vendor", "lottie"]);
const BUNDLE = /^app\.[a-f0-9]{10}\.js$/;
// woff2 and png are already compressed; tiny files are not worth the header
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".svg", ".txt"]);
const MIN_COMPRESS = 1024;

// app.<hash>.js gets a new name with every build, so browsers keep it for a year; fonts are never edited in place.
// Everything else keeps its name across deploys and is revalidated with its ETag on every visit.
function cacheControl(rel) {
  if (BUNDLE.test(rel)) return "public, max-age=31536000, immutable";
  if (rel.startsWith("fonts" + sep)) return "public, max-age=2592000";
  return "no-cache";
}

// "br;q=0" means not acceptable, so the q value matters
function accepts(header, coding) {
  for (const part of String(header || "").split(",")) {
    const [name, ...params] = part.trim().toLowerCase().split(";");
    if (name !== coding) continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    return !q || Number(q.slice(2)) > 0;
  }
  return false;
}

// send(res, status, body, headers) comes from the caller so its security headers apply here too
export function makeStatic(dir, send) {
  const root = realpathSync(dir);
  // one entry per file, rebuilt when its size or mtime changes; the allowlist keeps this to the site's own files
  const cache = new Map();

  function staticPath(pathname) {
    let rel;
    try { rel = decodeURIComponent(pathname); } catch (_) { return null; }
    if (rel.includes("\0")) return null;
    if (rel === "/") rel = "/index.html";
    let real;
    try { real = realpathSync(resolve(root, "." + rel)); } catch (_) { return null; }
    if (!real.startsWith(root + sep) || !statSync(real).isFile()) return null;
    const parts = relative(root, real).split(sep);
    const ok = parts.length === 1 ? parts[0] === "index.html" || BUNDLE.test(parts[0]) : ALLOWED_DIRS.has(parts[0]);
    return ok && MIME[extname(real).toLowerCase()] ? real : null;
  }

  async function load(file) {
    const st = await stat(file);
    const hit = cache.get(file);
    if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit;
    const raw = await readFile(file);
    const tag = createHash("sha256").update(raw).digest("base64url").slice(0, 22);
    // each encoding is a different representation, so each gets its own strong ETag
    const reps = { identity: { body: raw, etag: `"${tag}"` } };
    if (COMPRESSIBLE.has(extname(file).toLowerCase()) && raw.length >= MIN_COMPRESS) {
      reps.br = { body: brotliCompressSync(raw, { params: { [Z.BROTLI_PARAM_QUALITY]: 11, [Z.BROTLI_PARAM_SIZE_HINT]: raw.length } }), etag: `"${tag}-br"` };
      reps.gzip = { body: gzipSync(raw, { level: 9 }), etag: `"${tag}-gz"` };
    }
    const entry = { mtimeMs: st.mtimeMs, size: st.size, reps };
    cache.set(file, entry);
    return entry;
  }

  return async function serveStatic(req, res, pathname) {
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed", { Allow: "GET, HEAD" });
    const file = staticPath(pathname);
    if (!file) return send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    const { reps } = await load(file);
    const ae = req.headers["accept-encoding"];
    const coding = reps.br && accepts(ae, "br") ? "br" : reps.gzip && accepts(ae, "gzip") ? "gzip" : "identity";
    const rep = reps[coding];
    const headers = { "Cache-Control": cacheControl(relative(root, file)), ETag: rep.etag };
    if (reps.br) headers.Vary = "Accept-Encoding";
    const inm = String(req.headers["if-none-match"] || "");
    if (inm && inm.split(",").some((t) => t.trim() === rep.etag || t.trim() === "*")) return send(res, 304, "", headers);
    headers["Content-Type"] = MIME[extname(file).toLowerCase()];
    headers["Content-Length"] = rep.body.length;
    if (coding !== "identity") headers["Content-Encoding"] = coding;
    send(res, 200, req.method === "HEAD" ? "" : rep.body, headers);
  };
}
