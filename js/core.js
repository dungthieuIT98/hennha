"use strict";
/* Core: DOM helpers, route lifecycle, storage, text rules, dates, calendar links, invite codec. */
(() => {
  const HN = window.HN;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const IN_FRAME = window.self !== window.top;
  Object.assign(HN, { $, $$, el, reduce, fine, IN_FRAME, SCREENS: {} });
  if (reduce) gsap.globalTimeline.timeScale(20);
  if (IN_FRAME) document.body.classList.add("in-frame");

  /* ---------- route lifecycle ---------- */
  let disposers = [], visit = 0;
  HN.onLeave = (fn) => { disposers.push(fn); return fn; };
  // changes on every route change, so async work can tell whether its screen is still up
  HN.visit = () => visit;
  HN.leave = () => {
    visit++;
    const list = disposers;
    disposers = [];
    for (let i = list.length - 1; i >= 0; i--) { try { list[i](); } catch (e) { console.error(e); } }
  };
  HN.loop = (tween) => {
    if (reduce) { tween.kill(); return null; }
    HN.onLeave(() => tween.kill());
    return tween;
  };

  /* ---------- storage (falls back to memory when storage is blocked) ---------- */
  function makeStore(area) {
    const mem = {};
    return {
      get(k, def) {
        try { const v = area().getItem(k); if (v != null) return JSON.parse(v); } catch (_) { /* blocked or corrupt */ }
        return k in mem ? mem[k] : def;
      },
      set(k, v) { mem[k] = v; try { area().setItem(k, JSON.stringify(v)); } catch (_) { /* blocked */ } },
      del(k) { delete mem[k]; try { area().removeItem(k); } catch (_) { /* blocked */ } },
    };
  }
  HN.local = makeStore(() => localStorage);
  HN.session = makeStore(() => sessionStorage);

  // signed-in user ({ name, email }) or null; throws when the server can't be reached
  HN.fetchMe = async (signal) => {
    const res = await fetch("/api/me", { credentials: "same-origin", headers: { Accept: "application/json" }, signal });
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    return data && data.user && typeof data.user.email === "string" ? data.user : null;
  };

  HN.draft = {
    get() { const d = HN.session.get("hn-draft", {}); return d && typeof d === "object" ? Object.assign({}, d) : {}; },
    set(patch) { const d = Object.assign(HN.draft.get(), patch); HN.session.set("hn-draft", d); return d; },
    clear() { HN.session.del("hn-draft"); },
  };
  // the browser keeps invites, their answers and unsent copies for a week; the server copy (Drive) stays
  HN.KEEP_DAYS = 7;
  const fresh = (stamp) => { const t = typeof stamp === "number" ? stamp : Date.parse(stamp); return !t || Date.now() - t <= HN.KEEP_DAYS * 24 * 3600 * 1000; };
  HN.invites = {
    list() {
      const raw = HN.local.get("hn-invites", []);
      const all = Array.isArray(raw) ? raw.filter((x) => x && typeof x === "object") : [];
      const kept = all.filter((x) => fresh(x.at || x.created));
      if (kept.length !== all.length) HN.local.set("hn-invites", kept);
      return kept;
    },
    add(inv) { const l = HN.invites.list(); l.unshift(Object.assign({ at: Date.now() }, inv)); HN.local.set("hn-invites", l.slice(0, 50)); },
  };
  HN.responses = {
    all() {
      const r = HN.local.get("hn-responses", {});
      if (!r || typeof r !== "object" || Array.isArray(r)) return {};
      let changed = false;
      Object.keys(r).forEach((code) => {
        if (!Array.isArray(r[code])) return;
        const kept = r[code].filter((x) => x && typeof x === "object" && fresh(x.at));
        if (kept.length === r[code].length) return;
        changed = true;
        if (kept.length) r[code] = kept; else delete r[code];
      });
      if (changed) HN.local.set("hn-responses", r);
      return r;
    },
    for(code) { const r = HN.responses.all()[code]; return Array.isArray(r) ? r.filter((x) => x && typeof x === "object") : []; },
    add(code, resp) {
      const all = HN.responses.all();
      const list = Array.isArray(all[code]) ? all[code] : [];
      list.push(resp);
      all[code] = list.slice(-100);
      HN.local.set("hn-responses", all);
    },
  };

  // new invites are copied to the server in the background; the copy waits here until the server confirms it
  HN.outbox = {
    list() {
      const raw = HN.local.get("hn-outbox", []);
      const all = Array.isArray(raw) ? raw.filter((x) => x && typeof x === "object" && x.invite && typeof x.invite === "object") : [];
      const kept = all.filter((x) => fresh(x.at));
      if (kept.length !== all.length) HN.local.set("hn-outbox", kept);
      return kept;
    },
    add(invite) { const l = HN.outbox.list(); l.push({ at: Date.now(), invite }); HN.local.set("hn-outbox", l.slice(-50)); },
    remove(code) { HN.local.set("hn-outbox", HN.outbox.list().filter((x) => x.invite.code !== code)); },
  };
  // each list drops what is past its week when it is read, so reading them once at load clears everything
  HN.invites.list(); HN.responses.all(); HN.outbox.list();
  let syncing = false;
  // sends the waiting invites one by one and stops at the first failure; the next call picks up from there
  HN.syncOutbox = async () => {
    if (syncing) return;
    syncing = true;
    try {
      for (const item of HN.outbox.list()) {
        const res = await fetch("/api/invites", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(item.invite),
        });
        if (res.ok) { HN.outbox.remove(item.invite.code); continue; }
        const body = await res.json().catch(() => ({}));
        // the server will never take these as they are, so they are not sent again
        const final = res.status === 400 || res.status === 413 || (res.status === 409 && (body.error === "taken" || body.error === "full"));
        if (!final) break; // signed out, busy, rate limited or Drive down: keep it for later
        HN.outbox.remove(item.invite.code);
      }
    } catch (_) { /* offline: try again later */ } finally { syncing = false; }
  };

  /* ---------- text rules ---------- */
  const URL_RE = /(https?:\/\/|www\.|\.(com|vn|net|org|io|me|xyz|top|info|link|site|online|app|ly)\b)/i;
  const PHONE_RE = /(\d[\s.\-]?){8,}/;
  const BAD_RANGES = [[0x0, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069]];
  const hasBadChar = (s) => [...s].some((ch) => { const c = ch.codePointAt(0); return BAD_RANGES.some(([a, b]) => c >= a && c <= b); });
  HN.clean = (v) => String(v == null ? "" : v).normalize("NFC").replace(/\s+/g, " ").trim();
  HN.len = (v) => [...String(v == null ? "" : v)].length;
  HN.cut = (v, n) => [...String(v)].slice(0, n).join("");
  HN.checkText = (value, { required = true, max = 20, emptyMsg = HN.t("err.required") } = {}) => {
    const s = HN.clean(value);
    if (!s) return required ? emptyMsg : "";
    if (HN.len(s) > max) return HN.t("err.max", { n: max });
    if (hasBadChar(s)) return HN.t("err.char");
    if (URL_RE.test(s)) return HN.t("err.link");
    if (PHONE_RE.test(s)) return HN.t("err.phone");
    return "";
  };
  HN.renderTemplate = (text, to) => {
    const name = HN.clean(to) || HN.t("you");
    const out = text.replace(/\{to\}/g, () => name);
    return out.charAt(0).toUpperCase() + out.slice(1);
  };
  const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
  HN.graphemes = (s) => (seg ? [...seg.segment(s)].map((x) => x.segment) : [...s.normalize("NFC")]);

  HN.planById = (id) => HN.PLANS.find((p) => p.id === id);
  HN.planList = (ids) => (ids || []).map(HN.planById).filter(Boolean);
  HN.planName = (p) => HN.t("plan." + p.id);
  HN.planText = (ids) => HN.planList(ids).map(HN.planName).join(", ");

  /* ---------- dates (formats come from strings.js "fmt.*") ---------- */
  const pad2 = (n) => String(n).padStart(2, "0");
  HN.pad2 = pad2;
  HN.iso = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  HN.parseISO = (s) => {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  HN.validDate = (s) => { const d = HN.parseISO(s); return !!d && HN.iso(d) === s; };
  HN.today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  HN.addYears = (d, n) => { const e = new Date(d); e.setFullYear(e.getFullYear() + n); return e; };
  HN.addDays = (d, n) => { const e = new Date(d); e.setDate(e.getDate() + n); return e; };
  const dateVars = (d) => ({
    dow: HN.t("dow")[d.getDay()], dows: HN.t("dowShort")[d.getDay()], d: d.getDate(), dd: pad2(d.getDate()), mm: pad2(d.getMonth() + 1),
    mon: HN.t("months")[d.getMonth()], month: HN.t("monthsLong")[d.getMonth()], yyyy: d.getFullYear(),
  });
  // style: "date" (weekday, full date), "short" (weekday, day and month), "day" (full date), "month" (month and year)
  HN.fmtDate = (d, style = "date") => HN.t("fmt." + style, dateVars(d));
  HN.fmtWhen = (isoDate, h, m) => {
    const d = HN.parseISO(isoDate);
    if (!d || h == null || m == null) return "";
    return HN.t("fmt.when", { date: HN.fmtDate(d), time: pad2(h) + ":" + pad2(m) });
  };
  HN.fmtVnd = (n) => (n ? HN.t("price.vnd", { n: n.toLocaleString(HN.t("locale")) }) : HN.t("price.zero"));
  HN.nextSaturday = () => { const d = HN.today(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return d; };
  HN.isPast = (isoDate, h, m) => {
    if (!isoDate || h == null) return false;
    const d = HN.parseISO(isoDate);
    if (!d) return false;
    d.setHours(h, m == null ? 59 : m, 0, 0);
    return d <= new Date();
  };

  /* ---------- calendar links (every date lasts two hours) ---------- */
  HN.eventRange = (isoDate, h, m) => {
    const start = HN.parseISO(isoDate);
    if (!start) return null;
    start.setHours(h, m, 0, 0);
    return { start, end: new Date(start.getTime() + 2 * 3600 * 1000) };
  };
  const localStamp = (x) => x.getFullYear() + pad2(x.getMonth() + 1) + pad2(x.getDate()) + "T" + pad2(x.getHours()) + pad2(x.getMinutes()) + "00";
  const utcStamp = (x) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const icsEscape = (s) => s.replace(/[\\;,]/g, (c) => "\\" + c);
  HN.gcalUrl = (title, details, { start, end }) => "https://calendar.google.com/calendar/render?" + new URLSearchParams({
    action: "TEMPLATE", text: title, dates: localStamp(start) + "/" + localStamp(end), details, ctz: "Asia/Ho_Chi_Minh",
  });
  HN.icsText = (title, details, { start, end }) => [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//didatehong//vi", "BEGIN:VEVENT",
    "UID:" + HN.randomCode(12) + "@" + HN.DOMAIN, "DTSTAMP:" + utcStamp(new Date()), "DTSTART:" + utcStamp(start), "DTEND:" + utcStamp(end),
    "SUMMARY:" + icsEscape(title), "DESCRIPTION:" + icsEscape(details), "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");

  /* ---------- invite <-> link (demo without backend: the invite rides in the URL hash) ---------- */
  function b64e(bytes) {
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64d(s) {
    if (typeof s !== "string" || !/^[A-Za-z0-9_-]{8,2400}$/.test(s)) return null;
    let t = s.replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    return Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
  }
  // v1 (first links): base64url of JSON. Still read, and still written when v2 cannot hold the invite.
  const encodeV1 = (inv) => b64e(new TextEncoder().encode(JSON.stringify({
    v: 1, c: inv.code, f: inv.from, t: inv.to || "", m: inv.message,
    tm: inv.timeMode === "fixed" ? 1 : 0, d: inv.date || "", h: inv.hour ?? -1, i: inv.minute ?? -1, p: inv.plans,
  })));

  /* v2 (23/10): packed bytes, about 4x shorter than v1 with a template message and 2x with a typed one.
     [flags] [code: length, then 5 bits a char] [fixed time only: 2 bytes days since 2024-01-01, 1 byte half-hour slot]
     [plans: byte count, then a bitmask over HN.PLANS] [from] [to] [message, or the HN.TEMPLATES index]
     Text is 1 byte a char from TEXT_CHARS (ASCII + Vietnamese letters); any other code point is 0xFF + 3 bytes.
     HN.PLANS, HN.TEMPLATES, TEXT_CHARS and CODE_CHARS are read by position: only ever append to them. */
  const V2 = 2, FIXED = 0x10, TEMPLATE = 0x20, TEMPLATE_EN = 0x40, ESC = 0xff, EPOCH = Date.UTC(2024, 0, 1), DAY = 864e5;
  const CODE_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
  const VI_CHARS = "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ";
  const TEXT_CHARS = [...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)), ...VI_CHARS, ...VI_CHARS.toUpperCase()];
  const TEXT_INDEX = new Map(TEXT_CHARS.map((ch, i) => [ch, i]));
  const templateText = (lang, i) => (HN.TEMPLATES[i] && HN.I18N[lang] && HN.I18N[lang]["tpl." + HN.TEMPLATES[i].id]) || null;

  function encodeV2(inv) {
    const out = [];
    const text = (s) => {
      // a half emoji (maxlength can cut a pair) becomes U+FFFD, as TextEncoder did for v1
      const chars = [...HN.clean(s).replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "�")];
      if (chars.length > 255) throw new Error("text");
      out.push(chars.length);
      chars.forEach((ch) => {
        const i = TEXT_INDEX.get(ch);
        if (i != null) { out.push(i); return; }
        const cp = ch.codePointAt(0);
        out.push(ESC, cp >> 16, (cp >> 8) & 255, cp & 255);
      });
    };
    const code = String(inv.code);
    if (!code.length || code.length > 16 || [...code].some((ch) => !CODE_CHARS.includes(ch))) throw new Error("code");
    // a template left as it is (in either language) travels as its index
    const to = HN.clean(inv.to);
    let tpl = -1, en = false;
    for (let i = 0; to && tpl < 0 && i < HN.TEMPLATES.length; i++) {
      for (const lang of ["vi", "en"]) {
        const t = templateText(lang, i);
        if (t && HN.clean(HN.renderTemplate(t, to)) === HN.clean(inv.message)) { tpl = i; en = lang === "en"; break; }
      }
    }
    const fixed = inv.timeMode === "fixed";
    out.push(V2 | (fixed ? FIXED : 0) | (tpl >= 0 ? TEMPLATE : 0) | (en ? TEMPLATE_EN : 0));
    out.push(code.length);
    let acc = 0, bits = 0;
    for (const ch of code) {
      acc = (acc << 5) | CODE_CHARS.indexOf(ch); bits += 5;
      while (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); acc &= (1 << bits) - 1; }
    }
    if (bits) out.push((acc << (8 - bits)) & 255);
    if (fixed) {
      const [y, m, d] = String(inv.date).split("-").map(Number);
      const days = Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY);
      if (!(days >= 0 && days < 65536) || !(inv.minute === 0 || inv.minute === 30)) throw new Error("time");
      out.push(days >> 8, days & 255, inv.hour * 2 + inv.minute / 30);
    }
    const mask = new Array(Math.ceil(HN.PLANS.length / 8)).fill(0);
    (inv.plans || []).forEach((id) => { const i = HN.PLANS.findIndex((p) => p.id === id); if (i >= 0) mask[i >> 3] |= 1 << (i & 7); });
    out.push(mask.length, ...mask);
    text(inv.from);
    text(inv.to || "");
    if (tpl >= 0) out.push(tpl); else text(inv.message);
    return b64e(out);
  }

  // reads a v2 link into the v1 object shape, so both formats go through the same checks in HN.decodeInvite
  function readV2(b) {
    let k = 0;
    const byte = () => { if (k >= b.length) throw new Error("short"); return b[k++]; };
    const text = () => {
      let s = "";
      for (let n = byte(); n > 0; n--) {
        const i = byte();
        if (i !== ESC) { if (i >= TEXT_CHARS.length) throw new Error("char"); s += TEXT_CHARS[i]; continue; }
        const cp = (byte() << 16) | (byte() << 8) | byte();
        if (cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) throw new Error("char");
        s += String.fromCodePoint(cp);
      }
      return s;
    };
    const flags = byte();
    if ((flags & 0x0f) !== V2) return null;
    const len = byte();
    if (!len || len > 16) return null;
    let code = "", acc = 0, bits = 0;
    for (let n = Math.ceil((len * 5) / 8); n > 0; n--) {
      acc = (acc << 8) | byte(); bits += 8;
      while (bits >= 5 && code.length < len) { bits -= 5; code += CODE_CHARS[(acc >> bits) & 31]; acc &= (1 << bits) - 1; }
    }
    let d = "", h = -1, i = -1;
    if (flags & FIXED) {
      d = new Date(EPOCH + ((byte() << 8) | byte()) * DAY).toISOString().slice(0, 10);
      const slot = byte();
      h = slot >> 1; i = (slot & 1) * 30;
    }
    const p = [];
    for (let n = byte(), j = 0; j < n; j++) {
      const m = byte();
      for (let bit = 0; bit < 8; bit++) if (m & (1 << bit) && HN.PLANS[j * 8 + bit]) p.push(HN.PLANS[j * 8 + bit].id);
    }
    const f = text(), t = text();
    let msg;
    if (flags & TEMPLATE) {
      const tpl = templateText(flags & TEMPLATE_EN ? "en" : "vi", byte());
      if (!tpl || !t) return null;
      msg = HN.renderTemplate(tpl, t);
    } else msg = text();
    if (k !== b.length) return null;
    return { v: 1, c: code, f, t, m: msg, tm: flags & FIXED ? 1 : 0, d, h, i, p };
  }

  // v2 when it can hold the invite; an invite it cannot pack (an odd code, a date out of range) falls back to v1
  HN.encodeInvite = (inv) => { try { return encodeV2(inv); } catch (_) { return encodeV1(inv); } };
  HN.decodeInvite = (s) => {
    let o;
    try {
      const bytes = b64d(s);
      if (!bytes || !bytes.length) return null;
      // v1 is JSON, so its first byte is "{"; v2 starts with its flags byte
      o = bytes[0] === 0x7b ? JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) : readV2(bytes);
    } catch (_) { return null; }
    if (!o || typeof o !== "object" || o.v !== 1) return null;
    const str = (x) => (typeof x === "string" ? x : "");
    const from = HN.clean(str(o.f)), to = HN.clean(str(o.t)), message = HN.clean(str(o.m));
    if (HN.checkText(from, { max: 20 }) || HN.checkText(to, { max: 20 }) || HN.checkText(message, { max: 100 })) return null;
    if (typeof o.c !== "string" || !/^[a-z0-9]{6,16}$/.test(o.c)) return null;
    if (!Array.isArray(o.p) || o.p.length > HN.PLANS.length) return null;
    const plans = HN.PLANS.filter((p) => o.p.includes(p.id)).map((p) => p.id);
    if (!plans.length) return null;
    // "pick": the sender leaves the date and time to the receiver, so none is stored
    if (o.tm === 0) {
      if (o.d !== "" || o.h !== -1 || o.i !== -1) return null;
      return { code: o.c, from, to, message, plans, timeMode: "pick", date: null, hour: null, minute: null };
    }
    if (o.tm !== 1 || !HN.validDate(o.d) || !Number.isInteger(o.h) || o.h < 0 || o.h > 23 || (o.i !== 0 && o.i !== 30) || HN.isPast(o.d, o.h, o.i)) return null;
    return { code: o.c, from, to, message, plans, timeMode: "fixed", date: o.d, hour: o.h, minute: o.i };
  };
  HN.baseUrl = () => location.href.split("#")[0];
  // key is an encoded invite or "demo", optionally followed by "/preview"
  HN.inviteUrl = (key) => HN.baseUrl() + "#/n/" + key;
  HN.randomCode = (n = 8) => {
    const a = CODE_CHARS;
    const r = new Uint32Array(n);
    crypto.getRandomValues(r);
    let s = "";
    r.forEach((x) => { s += a[x % a.length]; });
    return s;
  };
})();
