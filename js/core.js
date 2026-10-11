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

  HN.draft = {
    get() { const d = HN.session.get("hn-draft", {}); return d && typeof d === "object" ? Object.assign({}, d) : {}; },
    set(patch) { const d = Object.assign(HN.draft.get(), patch); HN.session.set("hn-draft", d); return d; },
    clear() { HN.session.del("hn-draft"); },
  };
  HN.invites = {
    list() { const l = HN.local.get("hn-invites", []); return Array.isArray(l) ? l.filter((x) => x && typeof x === "object") : []; },
    add(inv) { const l = HN.invites.list(); l.unshift(inv); HN.local.set("hn-invites", l.slice(0, 50)); },
  };
  HN.responses = {
    all() { const r = HN.local.get("hn-responses", {}); return r && typeof r === "object" && !Array.isArray(r) ? r : {}; },
    for(code) { const r = HN.responses.all()[code]; return Array.isArray(r) ? r.filter((x) => x && typeof x === "object") : []; },
    add(code, resp) {
      const all = HN.responses.all();
      const list = Array.isArray(all[code]) ? all[code] : [];
      list.push(resp);
      all[code] = list.slice(-100);
      HN.local.set("hn-responses", all);
    },
  };

  /* ---------- text rules ---------- */
  const URL_RE = /(https?:\/\/|www\.|\.(com|vn|net|org|io|me|xyz|top|info|link|site|online|app|ly)\b)/i;
  const PHONE_RE = /(\d[\s.\-]?){8,}/;
  const BAD_RANGES = [[0x0, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069]];
  const hasBadChar = (s) => [...s].some((ch) => { const c = ch.codePointAt(0); return BAD_RANGES.some(([a, b]) => c >= a && c <= b); });
  HN.clean = (v) => String(v == null ? "" : v).normalize("NFC").replace(/\s+/g, " ").trim();
  HN.len = (v) => [...String(v == null ? "" : v)].length;
  HN.cut = (v, n) => [...String(v)].slice(0, n).join("");
  HN.checkText = (value, { required = true, max = 20, emptyMsg = "Bạn chưa nhập" } = {}) => {
    const s = HN.clean(value);
    if (!s) return required ? emptyMsg : "";
    if (HN.len(s) > max) return "Dài quá, tối đa " + max + " ký tự";
    if (hasBadChar(s)) return "Có ký tự không hợp lệ";
    if (URL_RE.test(s)) return "Không được chứa link";
    if (PHONE_RE.test(s)) return "Không được chứa số điện thoại";
    return "";
  };
  HN.renderTemplate = (text, to) => {
    const out = text.replace(/\{to\}/g, HN.clean(to) || "cậu");
    return out.charAt(0).toUpperCase() + out.slice(1);
  };
  const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
  HN.graphemes = (s) => (seg ? [...seg.segment(s)].map((x) => x.segment) : [...s.normalize("NFC")]);

  HN.planById = (id) => HN.PLANS.find((p) => p.id === id);
  HN.planList = (ids) => (ids || []).map(HN.planById).filter(Boolean);
  HN.planText = (ids) => HN.planList(ids).map((p) => p.name).join(", ");

  /* ---------- dates ---------- */
  const DOW = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
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
  HN.fmtDate = (d) => DOW[d.getDay()] + ", " + pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear();
  HN.fmtWhen = (isoDate, h, m) => {
    const d = HN.parseISO(isoDate);
    if (!d || h == null || m == null) return "";
    return HN.fmtDate(d) + " lúc " + pad2(h) + ":" + pad2(m);
  };
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
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//hennha//vi", "BEGIN:VEVENT",
    "UID:" + HN.randomCode(12) + "@" + HN.DOMAIN, "DTSTAMP:" + utcStamp(new Date()), "DTSTART:" + utcStamp(start), "DTEND:" + utcStamp(end),
    "SUMMARY:" + icsEscape(title), "DESCRIPTION:" + icsEscape(details), "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");

  /* ---------- invite <-> link (demo without backend: the invite rides in the URL hash) ---------- */
  function b64e(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64d(s) {
    if (typeof s !== "string" || !/^[A-Za-z0-9_-]{8,2400}$/.test(s)) return null;
    let t = s.replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    const bin = atob(t);
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  HN.encodeInvite = (inv) => b64e(JSON.stringify({
    v: 1, c: inv.code, f: inv.from, t: inv.to || "", m: inv.message,
    tm: inv.timeMode === "fixed" ? 1 : 0, d: inv.date || "", h: inv.hour ?? -1, i: inv.minute ?? -1, p: inv.plans,
  }));
  HN.decodeInvite = (s) => {
    let o;
    try { const txt = b64d(s); if (!txt) return null; o = JSON.parse(txt); } catch (_) { return null; }
    if (!o || typeof o !== "object" || o.v !== 1) return null;
    const str = (x) => (typeof x === "string" ? x : "");
    const from = HN.clean(str(o.f)), to = HN.clean(str(o.t)), message = HN.clean(str(o.m));
    if (HN.checkText(from, { max: 20 }) || HN.checkText(to, { max: 20 }) || HN.checkText(message, { max: 100 })) return null;
    if (typeof o.c !== "string" || !/^[a-z0-9]{6,16}$/.test(o.c)) return null;
    if (!Array.isArray(o.p) || o.p.length > HN.PLANS.length) return null;
    const plans = HN.PLANS.filter((p) => o.p.includes(p.id)).map((p) => p.id);
    if (!plans.length) return null;
    if (o.tm !== 1 || !HN.validDate(o.d) || !Number.isInteger(o.h) || o.h < 0 || o.h > 23 || (o.i !== 0 && o.i !== 30) || HN.isPast(o.d, o.h, o.i)) return null;
    return { code: o.c, from, to, message, plans, timeMode: "fixed", date: o.d, hour: o.h, minute: o.i };
  };
  HN.baseUrl = () => location.href.split("#")[0];
  // key is an encoded invite or "demo", optionally followed by "/preview"
  HN.inviteUrl = (key) => HN.baseUrl() + "#/n/" + key;
  HN.randomCode = (n = 8) => {
    const a = "abcdefghijkmnpqrstuvwxyz23456789";
    const r = new Uint32Array(n);
    crypto.getRandomValues(r);
    let s = "";
    r.forEach((x) => { s += a[x % a.length]; });
    return s;
  };
})();
