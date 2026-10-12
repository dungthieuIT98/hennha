// SQLite store (node:sqlite, built in): Google accounts, login sessions, and in-flight login attempts.
// Every statement is parameterized. Session tokens and OAuth state are stored as SHA-256 hashes only.
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const SESSION_MS = 7 * 24 * 3600 * 1000;
export const ATTEMPT_MS = 10 * 60 * 1000;
const PENDING_MS = 2 * 60 * 1000;
const MAX_INVITES = 50; // per account, same cap as the 50 invites the browser keeps
const sha = (s) => createHash("sha256").update(s).digest("hex");

export function openDb(file) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY,
      google_sub    TEXT NOT NULL UNIQUE,
      email         TEXT NOT NULL,
      name          TEXT NOT NULL,
      created_at    INTEGER NOT NULL,
      last_login_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS invites (
      code          TEXT PRIMARY KEY,
      owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      drive_file_id TEXT,
      created_at    INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS invites_owner ON invites(owner_id);
    CREATE TABLE IF NOT EXISTS login_attempts (
      state_hash TEXT PRIMARY KEY,
      verifier   TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    ) STRICT;
  `);

  const q = {
    addAttempt: db.prepare("INSERT INTO login_attempts (state_hash, verifier, expires_at) VALUES (?, ?, ?)"),
    // one statement reads and deletes, so a state can be used once even with parallel callbacks
    takeAttempt: db.prepare("DELETE FROM login_attempts WHERE state_hash = ? AND expires_at > ? RETURNING verifier"),
    upsertUser: db.prepare(`
      INSERT INTO users (google_sub, email, name, created_at, last_login_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name, last_login_at = excluded.last_login_at
      RETURNING id`),
    addSession: db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
    userBySession: db.prepare(`
      SELECT u.id AS id, u.name AS name, u.email AS email FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`),
    delSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
    purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
    purgeAttempts: db.prepare("DELETE FROM login_attempts WHERE expires_at <= ?"),
    // a row without drive_file_id is a save in progress; one that never finished (crash) is dropped after PENDING_MS
    purgeStale: db.prepare("DELETE FROM invites WHERE drive_file_id IS NULL AND created_at <= ?"),
    // claims a code in one statement: only if the owner is under the cap and nobody holds the code yet
    claimInvite: db.prepare(`
      INSERT INTO invites (code, owner_id, created_at)
      SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM invites WHERE owner_id = ?) < ?
      ON CONFLICT(code) DO NOTHING RETURNING code`),
    getInvite: db.prepare("SELECT owner_id, drive_file_id FROM invites WHERE code = ?"),
    setDriveFile: db.prepare("UPDATE invites SET drive_file_id = ? WHERE code = ? AND owner_id = ?"),
    dropPending: db.prepare("DELETE FROM invites WHERE code = ? AND owner_id = ? AND drive_file_id IS NULL"),
  };

  return {
    addAttempt(state, verifier) { q.addAttempt.run(sha(state), verifier, Date.now() + ATTEMPT_MS); },
    takeAttempt(state) { const r = q.takeAttempt.get(sha(state), Date.now()); return r ? r.verifier : null; },
    upsertUser({ sub, email, name }) { const now = Date.now(); return q.upsertUser.get(sub, email, name, now, now).id; },
    createSession(userId) {
      const token = randomBytes(32).toString("base64url");
      q.addSession.run(sha(token), userId, Date.now() + SESSION_MS);
      return token;
    },
    userBySession(token) { return q.userBySession.get(sha(token), Date.now()) || null; },
    deleteSession(token) { q.delSession.run(sha(token)); },
    purgeExpired() { const now = Date.now(); q.purgeSessions.run(now); q.purgeAttempts.run(now); q.purgeStale.run(now - PENDING_MS); },
    // "claimed" (caller uploads now), "saved" (already in Drive), "busy" (another request is uploading),
    // "taken" (code belongs to someone else) or "full" (owner reached MAX_INVITES)
    claimInvite(code, ownerId) {
      q.purgeStale.run(Date.now() - PENDING_MS);
      if (q.claimInvite.get(code, ownerId, Date.now(), ownerId, MAX_INVITES)) return "claimed";
      const row = q.getInvite.get(code);
      if (!row) return "full";
      if (row.owner_id !== ownerId) return "taken";
      return row.drive_file_id ? "saved" : "busy";
    },
    finishInvite(code, ownerId, fileId) { q.setDriveFile.run(fileId, code, ownerId); },
    dropPending(code, ownerId) { q.dropPending.run(code, ownerId); },
    close() { db.close(); },
  };
}
