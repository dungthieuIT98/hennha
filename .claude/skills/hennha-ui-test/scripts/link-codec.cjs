// Invite link codec test (js/core.js HN.encodeInvite / HN.decodeInvite) without a browser: runs the real
// data.js, strings.js and core.js in a sandbox. Round trips 3000 random invites, checks that v1 links still open,
// that odd codes fall back to v1, fuzzes 20000 damaged links, and prints link lengths for three sample invites.
// Usage: node .claude/skills/hennha-ui-test/scripts/link-codec.cjs .
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = process.argv[2];
const ctx = { console, TextEncoder, TextDecoder, btoa, atob, crypto: globalThis.crypto, Uint32Array, Uint8Array, Map, Date, Math, JSON, Number, String, Array, Object, Error, RangeError,
  matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, navigator: { userAgent: "node", language: "vi" },
  location: { href: "https://didatehong.com/", hash: "" }, document: { documentElement: {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, setTimeout, clearTimeout };
ctx.window = ctx; ctx.self = ctx; ctx.top = ctx;
vm.createContext(ctx);
for (const f of ["js/data.js", "js/strings.js", "js/core.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const HN = ctx.HN;
HN.lang = "vi"; if (!HN.t) HN.t = (k) => HN.I18N.vi[k];
let fail = 0; const kinds = {}; const bad = (m) => { fail++; const k = m.split(" ")[0]; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 3) console.log("FAIL", m.slice(0, 400)); };
const rnd = (n) => Math.floor(Math.random() * n);
const VI = "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ";
const pool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.?!'\"-" + VI + VI.toUpperCase() + "😀❤️🎉";
const word = (n) => HN.clean(Array.from({ length: n }, () => [...pool][rnd([...pool].length)]).join("")) || "An";
const future = () => { const d = new Date(Date.now() + (2 + rnd(300)) * 864e5); return d.toISOString().slice(0, 10); };
// v1 kept a half emoji as is, v2 turns it into U+FFFD: both show a broken glyph, compare them as equal
const LONE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;
const wf = (x) => JSON.stringify(x, (k, v) => (typeof v === "string" ? v.replace(LONE, "\uFFFD") : v));
const same = (a, b) => wf(a) === wf(b);

// 1. round trip
for (let n = 0; n < 3000; n++) {
  const fixed = Math.random() < 0.7, to = word(1 + rnd(20)).slice(0, 20);
  const useTpl = Math.random() < 0.3, lang = Math.random() < 0.5 ? "vi" : "en", ti = rnd(HN.TEMPLATES.length);
  const message = useTpl ? HN.renderTemplate(HN.I18N[lang]["tpl." + HN.TEMPLATES[ti].id], to) : word(1 + rnd(100));
  const plans = HN.PLANS.filter(() => Math.random() < 0.15).map((p) => p.id); if (!plans.length) plans.push(HN.PLANS[rnd(HN.PLANS.length)].id);
  const inv = { code: HN.randomCode(8), from: word(1 + rnd(20)).slice(0, 20), to, message, timeMode: fixed ? "fixed" : "pick", date: fixed ? future() : null, hour: fixed ? rnd(24) : null, minute: fixed ? (rnd(2) ? 30 : 0) : null, plans };
  const want = HN.decodeInvite(Buffer.from(JSON.stringify({ v: 1, c: inv.code, f: inv.from, t: inv.to, m: inv.message, tm: fixed ? 1 : 0, d: inv.date || "", h: inv.hour ?? -1, i: inv.minute ?? -1, p: inv.plans })).toString("base64url"));
  if (!want) continue; // the generator made something the app itself rejects (e.g. length after clean)
  const enc = HN.encodeInvite(inv), got = HN.decodeInvite(enc);
  if (!same(got, want)) bad("roundtrip " + JSON.stringify(inv) + " -> " + JSON.stringify(got));
  if (enc.startsWith("ey")) bad("fell back to v1: " + JSON.stringify(inv));
  if (useTpl && !(Buffer.from(enc, "base64url")[0] & 0x20)) bad("template not packed: " + JSON.stringify(inv));
}
console.log("round trip done");
// 2. v1 links made before this change still open
const v1 = Buffer.from(JSON.stringify({ v: 1, c: "k3x9m2pq", f: "Minh", t: "Thảo", m: "Cuối tuần đi cà phê với tớ nhé?", tm: 1, d: future(), h: 19, i: 0, p: ["cafe", "xemphim"] })).toString("base64url");
if (!HN.decodeInvite(v1) || HN.decodeInvite(v1).message !== "Cuối tuần đi cà phê với tớ nhé?") bad("v1 link no longer opens");
// 3. codes outside the alphabet fall back to v1 and still round trip
const odd = { code: "hello01", from: "A", to: "B", message: "Hi there", timeMode: "pick", date: null, hour: null, minute: null, plans: ["cafe"] };
const oe = HN.encodeInvite(odd);
if (!oe.startsWith("ey") || !HN.decodeInvite(oe) || HN.decodeInvite(oe).code !== "hello01") bad("odd code fallback");
// 4. damaged or hostile input never throws and never yields an invalid invite
const base = [...Buffer.from(HN.encodeInvite({ code: "k3x9m2pq", from: "Minh", to: "Thảo", message: "Đi chơi không?", timeMode: "fixed", date: future(), hour: 19, minute: 30, plans: ["cafe", "rooftop"] }), "base64url")];
let opened = 0;
for (let n = 0; n < 20000; n++) {
  const b = n < 10000 ? base.map((x) => (Math.random() < 0.08 ? rnd(256) : x)) : Array.from({ length: 4 + rnd(80) }, () => rnd(256));
  if (Math.random() < 0.2) b.length = rnd(b.length);
  let r;
  try { r = HN.decodeInvite(Buffer.from(b).toString("base64url")); } catch (e) { bad("threw " + e.message); continue; }
  if (r) {
    opened++;
    if (HN.checkText(r.from, { max: 20 }) || HN.checkText(r.message, { max: 100 }) || !r.plans.length || (r.timeMode === "fixed" && (r.hour < 0 || r.hour > 23 || ![0, 30].includes(r.minute)))) bad("invalid invite accepted " + JSON.stringify(r));
  }
}
console.log("fuzz done, damaged links that still decode to a valid invite:", opened);
// 5. sizes
const B = "https://didatehong.com/#/n/";
const s = (inv) => (B + HN.encodeInvite(inv)).length;
const d = future();
console.log("template:", s({ code: "k3x9m2pq", from: "Minh", to: "Thảo", message: HN.renderTemplate(HN.I18N.vi["tpl.t7"], "Thảo"), timeMode: "fixed", date: d, hour: 19, minute: 0, plans: ["cafe", "rooftop", "xemphim"] }));
console.log("typed:", s({ code: "k3x9m2pq", from: "Minh", to: "Thảo", message: "Cuối tuần đi cà phê với tớ nhé?", timeMode: "fixed", date: d, hour: 19, minute: 0, plans: ["cafe", "rooftop", "xemphim"] }));
console.log("longest:", s({ code: "k3x9m2pq", from: "Nguyễn Hoàng Minh Đức", to: "Trần Thị Phương Thảo", message: "Tuần này tớ được nghỉ phép, muốn rủ cậu đi ăn lẩu, xem phim rồi dạo hồ Gươm. Cậu rảnh tối thứ bảy không ạ?", timeMode: "fixed", date: d, hour: 19, minute: 30, plans: ["cafe", "nhaviet", "xemphim", "daopho", "karaoke"] }));
console.log(fail ? fail + " FAILURES " + JSON.stringify(kinds) : "ALL OK");
process.exitCode = fail ? 1 : 0;
