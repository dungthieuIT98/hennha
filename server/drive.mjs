// Google Drive upload with a service account (JWT bearer grant, RS256 signed with node:crypto).
// The account only sees what is shared with it, so the folder lives in a Shared Drive it is a member of.
import { createSign, randomBytes } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id";
const SCOPE = "https://www.googleapis.com/auth/drive";
const TIMEOUT_MS = 10000;
const b64u = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

export function makeDrive(cfg) {
  let cached = null; // { promise, until }

  async function requestToken() {
    const iat = Math.floor(Date.now() / 1000);
    const head = b64u({ alg: "RS256", typ: "JWT" });
    const claims = b64u({ iss: cfg.driveEmail, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 });
    const sig = createSign("RSA-SHA256").update(head + "." + claims).sign(cfg.drivePrivateKey).toString("base64url");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + claims + "." + sig }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error("drive token " + res.status);
    const body = await res.json();
    if (!body || typeof body.access_token !== "string" || !body.access_token) throw new Error("drive token missing");
    return { token: body.access_token, until: Date.now() + Math.max(60, Number(body.expires_in) || 3600) * 1000 - 60 * 1000 };
  }

  // one shared token request at a time; a failed one is not kept
  async function accessToken() {
    if (!cached || cached.until <= Date.now()) {
      const entry = { until: Date.now() + 30 * 1000, promise: null };
      entry.promise = requestToken().then((t) => { entry.until = t.until; return t.token; }, (e) => { if (cached === entry) cached = null; throw e; });
      cached = entry;
    }
    return cached.promise;
  }

  // creates <name> in the configured folder and returns the Drive file id
  async function saveJson(name, data) {
    const boundary = "hn" + randomBytes(16).toString("hex");
    const meta = JSON.stringify({ name, parents: [cfg.driveFolderId], mimeType: "application/json" });
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + (await accessToken()), "Content-Type": `multipart/related; boundary=${boundary}`, Accept: "application/json" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error("drive upload " + res.status);
    const file = await res.json();
    if (!file || typeof file.id !== "string" || !file.id) throw new Error("drive upload missing id");
    return file.id;
  }

  return { saveJson };
}
