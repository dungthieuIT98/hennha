// Google sign-in: authorization-code flow with PKCE. The server swaps the code for an access token over TLS,
// then reads the profile from Google's userinfo endpoint. No ID token is decoded here.
import { createHash, randomBytes } from "node:crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const TIMEOUT_MS = 8000;

export const newState = () => randomBytes(32).toString("base64url");
export const newVerifier = () => randomBytes(32).toString("base64url");
export const isState = (s) => typeof s === "string" && /^[A-Za-z0-9_-]{43}$/.test(s);
export const isCode = (s) => typeof s === "string" && /^[A-Za-z0-9\-._~/]{10,512}$/.test(s);

export function authUrl(cfg, state, verifier) {
  return AUTH_URL + "?" + new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.origin + "/auth/google/callback",
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
}

const BAD_CHARS = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;
const cleanName = (s) => String(s).normalize("NFC").replace(BAD_CHARS, "").replace(/\s+/g, " ").trim();

// returns { sub, email, name }; throws on anything unexpected (the caller then denies the login)
export async function fetchProfile(cfg, code, verifier) {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code, code_verifier: verifier, client_id: cfg.clientId, client_secret: cfg.clientSecret,
      redirect_uri: cfg.origin + "/auth/google/callback", grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!tokenRes.ok) throw new Error("token endpoint " + tokenRes.status);
  const token = await tokenRes.json();
  if (!token || typeof token.access_token !== "string" || !token.access_token) throw new Error("no access token");

  const infoRes = await fetch(USERINFO_URL, {
    headers: { Authorization: "Bearer " + token.access_token, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!infoRes.ok) throw new Error("userinfo " + infoRes.status);
  const p = await infoRes.json();
  if (!p || typeof p.sub !== "string" || !p.sub || p.sub.length > 255) throw new Error("bad sub");
  if (typeof p.email !== "string" || p.email.length > 254 || !p.email.includes("@")) throw new Error("bad email");
  if (p.email_verified !== true) throw new Error("email not verified");
  const name = cleanName(typeof p.name === "string" ? p.name : "").slice(0, 100) || p.email.split("@")[0];
  return { sub: p.sub, email: p.email, name };
}
