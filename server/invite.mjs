// Server-side check of an invite sent by the browser. The rules mirror js/core.js (checkText, decodeInvite);
// the plan list comes straight from js/data.js, so there is one source for it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

export function makeInviteValidator(root) {
  const sandbox = { window: { HN: {} } };
  runInNewContext(readFileSync(join(root, "js", "data.js"), "utf8"), sandbox);
  const PLAN_IDS = new Set(sandbox.window.HN.PLANS.map((p) => p.id));

  const URL_RE = /(https?:\/\/|www\.|\.(com|vn|net|org|io|me|xyz|top|info|link|site|online|app|ly)\b)/i;
  const PHONE_RE = /(\d[\s.\-]?){8,}/;
  // control characters, zero-width and bidi override characters
  const BAD_CHAR = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/;
  const clean = (v) => String(v).normalize("NFC").replace(/\s+/g, " ").trim();
  const len = (s) => [...s].length;

  // text is required or empty-allowed; returns the cleaned string or null when it breaks a rule
  function text(v, max, required) {
    if (typeof v !== "string") return required ? null : "";
    if (BAD_CHAR.test(v)) return null;
    const s = clean(v);
    if (!s) return required ? null : "";
    if (len(s) > max || URL_RE.test(s) || PHONE_RE.test(s)) return null;
    return s;
  }
  function validDate(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  }

  // returns the invite with only the known fields, or null
  return function validateInvite(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    if (typeof o.code !== "string" || !/^[a-z0-9]{6,16}$/.test(o.code)) return null;
    const from = text(o.from, 20, true), to = text(o.to, 20, false), message = text(o.message, 100, true);
    if (from === null || to === null || message === null) return null;
    if (!Array.isArray(o.plans) || o.plans.length < 1 || o.plans.length > PLAN_IDS.size) return null;
    if (!o.plans.every((p) => typeof p === "string" && PLAN_IDS.has(p))) return null;
    const plans = [...new Set(o.plans)];
    // "pick": the sender left date and time to the receiver, so none may be sent
    if (o.timeMode === "pick") {
      if ((o.date !== "" && o.date !== null) || o.hour !== null || o.minute !== null) return null;
      return { code: o.code, from, to, message, plans, timeMode: "pick", date: null, hour: null, minute: null };
    }
    if (!validDate(o.date) || !Number.isInteger(o.hour) || o.hour < 0 || o.hour > 23 || (o.minute !== 0 && o.minute !== 30)) return null;
    return { code: o.code, from, to, message, plans, timeMode: "fixed", date: o.date, hour: o.hour, minute: o.minute };
  };
}
