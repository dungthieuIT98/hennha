// DiDateHong server: serves the static site, handles Google sign-in, keeps accounts in SQLite.
// Usage: node --env-file=.env server/index.mjs   (Node 22.13+, no dependencies)
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.mjs";
import { openDb, SESSION_MS, ATTEMPT_MS } from "./db.mjs";
import { authUrl, fetchProfile, isCode, isState, newState, newVerifier } from "./google.mjs";
import { makeDrive } from "./drive.mjs";
import { makeInviteValidator } from "./invite.mjs";
import { makeStatic } from "./static.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = loadConfig(root);
const db = openDb(cfg.dbPath);
const drive = makeDrive(cfg);
const validateInvite = makeInviteValidator(root);
const MAX_BODY = 8 * 1024;
db.purgeExpired();
setInterval(() => db.purgeExpired(), 3600 * 1000).unref();

const SESSION_COOKIE = "hn_session";
const OAUTH_COOKIE = "hn_oauth";
const SECURITY_HEADERS = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "frame-ancestors 'self'" };

/* ---------- small helpers ---------- */
function send(res, status, body, headers = {}) {
  res.writeHead(status, Object.assign({}, SECURITY_HEADERS, headers));
  res.end(body);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
const redirect = (res, to, cookies = []) => {
  res.setHeader("Set-Cookie", cookies);
  send(res, 302, "", { Location: to, "Cache-Control": "no-store" });
};
const parseCookies = (header) => {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
};
const cookie = (name, value, maxAgeMs) =>
  `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${cfg.secureCookies ? "; Secure" : ""}`;
const sameStr = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
const sessionToken = (req) => {
  const t = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t) ? t : null;
};

// fixed-window rate limit per client address
function limiter(max, windowMs) {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, 60 * 1000).unref();
  return (key) => {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset <= now) { h = { count: 0, reset: now + windowMs }; hits.set(key, h); }
    h.count++;
    return h.count <= max;
  };
}
const authLimit = limiter(20, 60 * 1000);
const apiLimit = limiter(120, 60 * 1000);
const saveLimit = limiter(10, 60 * 1000); // per signed-in user
const clientIp = (req) => {
  if (cfg.trustProxy) {
    const last = String(req.headers["x-forwarded-for"] || "").split(",").pop().trim();
    if (last) return last;
  }
  return req.socket.remoteAddress || "unknown";
};

/* ---------- Google sign-in ---------- */
function startLogin(res) {
  const state = newState(), verifier = newVerifier();
  db.addAttempt(state, verifier);
  // the cookie ties the callback to the browser that started the login
  redirect(res, authUrl(cfg, state, verifier), [cookie(OAUTH_COOKIE, state, ATTEMPT_MS)]);
}

async function finishLogin(req, res, url) {
  const clearOauth = cookie(OAUTH_COOKIE, "", 0);
  const back = (kind) => redirect(res, cfg.origin + "/#/login/" + kind, [clearOauth]);
  const state = url.searchParams.get("state");
  // fail closed: any missing or mismatching piece ends the login
  if (!isState(state) || !sameStr(state, parseCookies(req.headers.cookie)[OAUTH_COOKIE])) return back("error");
  const verifier = db.takeAttempt(state);
  if (!verifier) return back("error");
  const err = url.searchParams.get("error");
  if (err) return back(err === "access_denied" ? "denied" : "error");
  const code = url.searchParams.get("code");
  if (!isCode(code)) return back("error");

  let profile;
  try { profile = await fetchProfile(cfg, code, verifier); } catch (e) { console.error("google login failed: " + e.message); return back("error"); }
  const userId = db.upsertUser(profile);
  const old = sessionToken(req);
  if (old) db.deleteSession(old);
  const token = db.createSession(userId);
  console.log("login ok user#" + userId);
  redirect(res, cfg.origin + "/#/login", [cookie(SESSION_COOKIE, token, SESSION_MS), clearOauth]);
}

/* ---------- save an invite to Drive ---------- */
// reads at most MAX_BODY bytes of JSON; null when it is not JSON, TOO_LARGE as soon as the limit is passed
const TOO_LARGE = Symbol("too large");
function readJson(req) {
  return new Promise((resolve) => {
    if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) { resolve(null); return; }
    const chunks = [];
    let size = 0, settled = false;
    const settle = (v) => { if (!settled) { settled = true; resolve(v); } };
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { chunks.length = 0; settle(TOO_LARGE); } else if (!settled) chunks.push(c);
    });
    req.on("end", () => { try { settle(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (_) { settle(null); } });
    req.on("error", () => settle(null));
  });
}

async function saveInvite(req, res) {
  // who is calling comes from the session only, never from the body
  const token = sessionToken(req);
  const user = token ? db.userBySession(token) : null;
  if (!user) return json(res, 401, { error: "auth" });
  if (req.headers.origin !== cfg.origin) return json(res, 403, { error: "origin" });
  if (!saveLimit(String(user.id))) { res.setHeader("Retry-After", "60"); return json(res, 429, { error: "rate" }); }

  const body = await readJson(req);
  if (body === TOO_LARGE) { res.setHeader("Connection", "close"); return json(res, 413, { error: "invalid" }); }
  const invite = validateInvite(body);
  if (!invite) return json(res, 400, { error: "invalid" });

  const claim = db.claimInvite(invite.code, user.id);
  if (claim === "saved") return json(res, 200, { saved: true });
  if (claim === "busy") return json(res, 409, { error: "busy" });
  if (claim === "taken") return json(res, 409, { error: "taken" });
  if (claim === "full") return json(res, 409, { error: "full" });
  try {
    const fileId = await drive.saveJson(invite.code + ".json", { v: 1, ownerId: user.id, savedAt: new Date().toISOString(), invite });
    db.finishInvite(invite.code, user.id, fileId);
  } catch (e) {
    console.error("drive save failed: " + e.message);
    db.dropPending(invite.code, user.id); // lets the user try again
    return json(res, 502, { error: "drive" });
  }
  console.log("invite saved user#" + user.id);
  return json(res, 201, { saved: true });
}

/* ---------- static files (allowlist, canonical path must stay under the root; see static.mjs) ---------- */
let serveStatic;
try { serveStatic = makeStatic(cfg.staticDir, send); } catch (_) { console.error("config: STATIC_DIR does not exist"); process.exit(1); }

/* ---------- server ---------- */
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, cfg.origin);
    const p = url.pathname;
    const ip = clientIp(req);

    if (p === "/auth/google" || p === "/auth/google/callback") {
      if (req.method !== "GET") return send(res, 405, "Method not allowed", { Allow: "GET" });
      if (!authLimit(ip)) return send(res, 429, "Too many requests", { "Retry-After": "60" });
      return p === "/auth/google" ? startLogin(res) : await finishLogin(req, res, url);
    }
    if (p === "/api/me") {
      if (req.method !== "GET") return send(res, 405, "Method not allowed", { Allow: "GET" });
      if (!apiLimit(ip)) return send(res, 429, "Too many requests", { "Retry-After": "60" });
      const token = sessionToken(req);
      const user = token ? db.userBySession(token) : null;
      return json(res, 200, { user: user ? { name: user.name, email: user.email } : null });
    }
    if (p === "/api/invites") {
      if (req.method !== "POST") return send(res, 405, "Method not allowed", { Allow: "POST" });
      if (!apiLimit(ip)) return send(res, 429, "Too many requests", { "Retry-After": "60" });
      return await saveInvite(req, res);
    }
    if (p === "/api/logout") {
      if (req.method !== "POST") return send(res, 405, "Method not allowed", { Allow: "POST" });
      if (!apiLimit(ip)) return send(res, 429, "Too many requests", { "Retry-After": "60" });
      if (req.headers.origin !== cfg.origin) return send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
      const token = sessionToken(req);
      if (token) db.deleteSession(token);
      res.setHeader("Set-Cookie", [cookie(SESSION_COOKIE, "", 0)]);
      return send(res, 204, "", { "Cache-Control": "no-store" });
    }
    await serveStatic(req, res, p);
  } catch (e) {
    console.error("request failed: " + (e && e.name));
    if (!res.headersSent) send(res, 500, "Something went wrong", { "Content-Type": "text/plain; charset=utf-8" });
    else res.destroy();
  }
});

server.listen(cfg.port, cfg.host, () => console.log(`DiDateHong at ${cfg.origin} (listening on ${cfg.host}:${cfg.port})`));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { server.close(); db.close(); process.exit(0); });
