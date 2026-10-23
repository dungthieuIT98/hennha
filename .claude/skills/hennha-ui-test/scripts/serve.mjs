// Test-only server: serves dist/ through the real static code (server/static.mjs: allowlist, brotli/gzip, cache
// headers, ETag) and stubs the API so the app runs without Google credentials.
// Usage: node serve.mjs [--dir dist] [--port 8765]
// Binds to 127.0.0.1 only. Never deploy this file.
import { createServer } from "node:http";
import { resolve } from "node:path";
import { makeStatic } from "../../../../server/static.mjs";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1] : def; };
const port = Number(arg("port", "8765"));
if (!Number.isInteger(port) || port < 1024 || port > 65535) { console.error("bad --port"); process.exit(1); }

const send = (res, status, body, headers = {}) => { res.writeHead(status, headers); res.end(body); };
const serveStatic = makeStatic(resolve(arg("dir", "dist")), send);

createServer(async (req, res) => {
  const p = new URL(req.url, "http://127.0.0.1").pathname;
  if (p === "/api/me") return send(res, 200, '{"user":null}', { "Content-Type": "application/json", "Cache-Control": "no-store" });
  if (p === "/api/invites" || p === "/api/logout") { req.resume(); req.on("end", () => send(res, 204, "")); return; }
  try { await serveStatic(req, res, p); } catch (_) { if (!res.headersSent) send(res, 500, "error"); }
}).on("error", (e) => { console.error(`cannot listen on ${port}: ${e.code}`); process.exit(1); })
  .listen(port, "127.0.0.1", () => console.log(`serving ${resolve(arg("dir", "dist"))} at http://127.0.0.1:${port}`));
