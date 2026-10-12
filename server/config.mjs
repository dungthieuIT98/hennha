// Reads settings from the environment. Missing secrets stop the server at start: there are no fallback values.
import { createPrivateKey } from "node:crypto";
import { resolve } from "node:path";

const fail = (msg) => { console.error("config: " + msg + " (see .env.example)"); process.exit(1); };
const need = (key) => {
  const v = (process.env[key] || "").trim();
  if (!v) fail("missing " + key);
  return v;
};

export function loadConfig(root) {
  let base;
  try { base = new URL(need("BASE_URL")); } catch (_) { fail("BASE_URL is not a valid URL"); }
  const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
  // plain http only on this machine; anywhere else the sign-in cookies and the Google redirect need TLS
  if (base.protocol !== "https:" && !(base.protocol === "http:" && local)) fail("BASE_URL must be https (http is allowed for localhost only)");
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail("PORT must be 1-65535");

  // Drive: a service account that is a member of the Shared Drive; invites are written into DRIVE_FOLDER_ID
  const driveFolderId = need("DRIVE_FOLDER_ID");
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(driveFolderId)) fail("DRIVE_FOLDER_ID is not a Drive folder id");
  const driveEmail = need("DRIVE_SA_EMAIL");
  if (!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(driveEmail)) fail("DRIVE_SA_EMAIL is not a service account email");
  // .env keeps the PEM on one line with \n escapes
  const drivePrivateKey = need("DRIVE_SA_PRIVATE_KEY").replace(/\\n/g, "\n");
  try { createPrivateKey(drivePrivateKey); } catch (_) { fail("DRIVE_SA_PRIVATE_KEY is not a valid private key"); }

  return {
    origin: base.origin,
    secureCookies: base.protocol === "https:",
    host: (process.env.HOST || "127.0.0.1").trim(),
    port,
    clientId: need("GOOGLE_CLIENT_ID"),
    clientSecret: need("GOOGLE_CLIENT_SECRET"),
    driveFolderId,
    driveEmail,
    drivePrivateKey,
    dbPath: resolve(root, process.env.DB_PATH || "data/hennha.db"),
    staticDir: resolve(root, process.env.STATIC_DIR || "."),
    // only behind a reverse proxy you control: the last X-Forwarded-For entry becomes the rate-limit key
    trustProxy: process.env.TRUST_PROXY === "1",
  };
}
