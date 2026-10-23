// Phone + network throttling test: cold-load metrics, frame smoothness per scenario, a trace breakdown of where
// frame time goes, and A/B runs that switch single effects off to find what causes the jank.
// Writes <out>/perf.json. Usage:
//   PW_DIR=<folder with node_modules/playwright-core> node perf.mjs --base http://127.0.0.1:8765/ --out <dir>
//     [--base-gzip http://127.0.0.1:8766/] [--chrome <path>] [--headed] [--skip-ab]
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1] : def; };
const require = createRequire(resolve(process.env.PW_DIR || ".", "x.js"));
const { chromium } = require("playwright-core");
const BASE = arg("base", "http://127.0.0.1:8765/");
const BASE_GZIP = arg("base-gzip", "");
const OUT = resolve(arg("out", "ui-test-out"));
const CHROME = arg("chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe");
mkdirSync(OUT, { recursive: true });

const PHONE = {
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh",
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
};
// throughput in bytes/s; CPU rate 4 = mid-range Android per Lighthouse
const kbps = (k) => (k * 1000) / 8;
const CONDITIONS = {
  none: { label: "Điện thoại, mạng + CPU không giới hạn", net: null, cpu: 1 },
  "4g": { label: "4G (9 Mbps, RTT 150ms) + CPU chậm 4x", net: { latency: 150, downloadThroughput: kbps(9000), uploadThroughput: kbps(1500) }, cpu: 4 },
  "slow-4g": { label: "4G yếu (1.6 Mbps, RTT 150ms) + CPU chậm 4x", net: { latency: 150, downloadThroughput: kbps(1600), uploadThroughput: kbps(750) }, cpu: 4 },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// in-page probes: paint/LCP/CLS/long tasks from the start, and a rAF frame recorder that scenarios switch on and off
function probes() {
  const P = (window.__perf = { fcp: 0, lcp: 0, cls: 0, long: [] });
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.name === "first-contentful-paint") P.fcp = e.startTime; })).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { P.lcp = e.startTime; })).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) P.cls += e.value; })).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => P.long.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true });
  } catch (_) {}
  const F = (window.__frames = { on: false, t: [], t0: 0 });
  const tick = (ts) => { if (F.on) F.t.push(ts); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__frameStart = () => { F.t = []; F.on = true; F.t0 = performance.now(); };
  window.__frameStop = () => {
    F.on = false;
    const end = performance.now(), d = [];
    for (let i = 1; i < F.t.length; i++) d.push(F.t[i] - F.t[i - 1]);
    const s = [...d].sort((a, b) => a - b), q = (p) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0);
    const long = P.long.filter(([st]) => st >= F.t0 && st <= end);
    const dur = (end - F.t0) / 1000;
    return {
      seconds: +dur.toFixed(2), frames: d.length, fps: +(d.length / dur).toFixed(1), p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +(s.at(-1) || 0).toFixed(1),
      over33: d.filter((x) => x > 34).length, over50: d.filter((x) => x > 50).length, pctSmooth: d.length ? +((100 * d.filter((x) => x <= 20).length) / d.length).toFixed(1) : 0,
      longTasks: long.length, longMs: Math.round(long.reduce((a, [, x]) => a + x, 0)),
    };
  };
}

async function open(browser, cond, { css, bypassCSP } = {}) {
  const ctx = await browser.newContext({ ...PHONE, bypassCSP: !!bypassCSP });
  await ctx.addInitScript(probes);
  if (css) await ctx.addInitScript((c) => { addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = c; document.head.append(s); }); }, css);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (cond.net) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...cond.net });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cond.cpu });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  return { ctx, page, cdp, errs };
}
const frames = async (page, fn) => { await page.evaluate(() => window.__frameStart()); await fn(); return page.evaluate(() => window.__frameStop()); };
const scroll = (cdp, y) => cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 600, yDistance: -y, speed: 1200, gestureSourceType: "touch", repeatCount: 1 });

async function coldLoad(browser, cond, base) {
  const { ctx, page, cdp, errs } = await open(browser, cond);
  const res = [];
  cdp.on("Network.responseReceived", (e) => res.push({ id: e.requestId, url: e.response.url, type: e.type, enc: e.response.headers["content-encoding"] || e.response.headers["Content-Encoding"] || "" }));
  const done = {};
  cdp.on("Network.loadingFinished", (e) => { done[e.requestId] = e.encodedDataLength; });
  const t0 = Date.now();
  await page.goto(base, { waitUntil: "load", timeout: 90000 });
  const loadMs = Date.now() - t0;
  await page.locator("#demoCard .nheart").waitFor({ state: "visible", timeout: 60000 });
  const heroMs = Date.now() - t0;
  // Lottie and the rest load after the first screen; give them time to arrive
  await sleep(6000);
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
  const p = await page.evaluate(() => ({ fcp: Math.round(window.__perf.fcp), lcp: Math.round(window.__perf.lcp), cls: +window.__perf.cls.toFixed(3), longTasks: window.__perf.long.length, longMs: Math.round(window.__perf.long.reduce((a, [, d]) => a + d, 0)) }));
  const files = res.map((r) => ({ file: r.url.replace(base, "/").slice(0, 60), type: r.type, kb: +((done[r.id] || 0) / 1024).toFixed(1), gzip: /gzip|br/.test(r.enc) })).sort((a, b) => b.kb - a.kb);
  await ctx.close();
  return { loadMs, heroVisibleMs: heroMs, ...nav, ...p, requests: files.length, totalKB: +files.reduce((a, f) => a + f.kb, 0).toFixed(1), top: files.slice(0, 8), errors: errs };
}

async function scenarios(browser, cond) {
  const out = {};
  {
    const { ctx, page, cdp } = await open(browser, cond);
    await page.goto(BASE, { waitUntil: "load", timeout: 90000 });
    await page.locator("#demoCard .nheart").waitFor({ state: "visible", timeout: 60000 });
    out.homeIntro = await frames(page, () => sleep(4000));
    out.homeIdle = await frames(page, () => sleep(4000));
    out.homeScroll = await frames(page, async () => { await scroll(cdp, 2600); await sleep(500); await scroll(cdp, 2600); await sleep(800); });
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, cond);
    await page.goto(BASE + "#/n/demo", { waitUntil: "load", timeout: 90000 });
    await page.locator("#love .nheart").waitFor({ state: "visible", timeout: 60000 });
    out.recvIntro = await frames(page, () => sleep(3000));
    out.recvOpen = await frames(page, async () => { await page.tap("#love .nheart", { force: true }); await page.locator('.rstep[data-step="2"].active').waitFor({ timeout: 15000 }); await sleep(1800); });
    out.recvNo = await frames(page, async () => { for (let i = 0; i < 3; i++) { await page.tap("#noBtn", { force: true }).catch(() => {}); await sleep(600); } });
    out.recvYes = await frames(page, async () => { await page.tap("#yesBtn", { force: true }); await page.locator('.rstep[data-step="3"].active').waitFor({ timeout: 15000 }); await sleep(800); });
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, cond);
    await page.goto(BASE + "#/create", { waitUntil: "load", timeout: 90000 });
    await page.locator("#nameFrom").waitFor();
    await page.fill("#nameFrom", "Minh");
    await page.fill("#nameTo", "Thảo");
    out.createStep = await frames(page, async () => { await page.tap("#next1"); await page.locator('.cstep[data-step="2"].active').waitFor(); await sleep(900); });
    out.createTyping = await frames(page, async () => { await page.fill("#msg", ""); await page.type("#msg", "Cuối tuần đi cà phê nhé", { delay: 40 }); });
    await ctx.close();
  }
  return out;
}

// where main-thread and raster time goes while the home page idles and scrolls, and while the letter opens
async function trace(browser, cond) {
  const pick = async (fn) => {
    const { ctx, page, cdp } = await open(browser, cond);
    await fn.prep(page);
    await browser.startTracing(page, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink", "cc", "gpu", "v8"] });
    await fn.run(page, cdp);
    const buf = await browser.stopTracing();
    await ctx.close();
    return summarize(JSON.parse(buf.toString()).traceEvents || []);
  };
  return {
    home: await pick({
      prep: async (p) => { await p.goto(BASE, { waitUntil: "load", timeout: 90000 }); await p.locator("#demoCard .nheart").waitFor({ state: "visible", timeout: 60000 }); await sleep(3500); },
      run: async (p, cdp) => { await sleep(3000); await scroll(cdp, 2600); await sleep(1500); },
    }),
    recvOpen: await pick({
      prep: async (p) => { await p.goto(BASE + "#/n/demo", { waitUntil: "load", timeout: 90000 }); await p.locator("#love .nheart").waitFor({ state: "visible", timeout: 60000 }); await sleep(3000); },
      run: async (p) => { await p.tap("#love .nheart", { force: true }); await sleep(3000); },
    }),
  };
}
function summarize(ev) {
  const names = {};
  ev.filter((e) => e.ph === "M" && e.name === "thread_name").forEach((e) => { names[e.pid + ":" + e.tid] = e.args.name; });
  const count = {};
  ev.filter((e) => e.ph === "X" && names[e.pid + ":" + e.tid] === "CrRendererMain").forEach((e) => { count[e.pid] = (count[e.pid] || 0) + 1; });
  const main = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
  const by = {}, raster = {}, fn = {};
  for (const e of ev) {
    if (e.ph !== "X" || !e.dur) continue;
    const th = names[e.pid + ":" + e.tid] || "";
    if (String(e.pid) === main && th === "CrRendererMain") {
      by[e.name] = (by[e.name] || 0) + e.dur / 1000;
      if (e.name === "FunctionCall" && e.args?.data) { const k = (e.args.data.functionName || "(anon)") + " @" + String(e.args.data.url || "").split("/").pop() + ":" + e.args.data.lineNumber; fn[k] = (fn[k] || 0) + e.dur / 1000; }
    }
    if (String(e.pid) === main && /Compositor|TileWorker|Raster/.test(th) && /Raster|Paint|Decode/.test(e.name)) raster[e.name] = (raster[e.name] || 0) + e.dur / 1000;
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]);
  const KEYS = ["FireAnimationFrame", "FunctionCall", "UpdateLayoutTree", "Layout", "PrePaint", "Paint", "Layerize", "UpdateLayer", "CompositeLayers", "HitTest", "MinorGC", "MajorGC", "EvaluateScript", "ParseHTML", "TimerFire", "EventDispatch"];
  return { mainMs: Object.fromEntries(KEYS.filter((k) => by[k]).map((k) => [k, Math.round(by[k])])), topMain: top(by, 12), raster: top(raster, 6), topFunctions: top(fn, 8) };
}

// A/B: same scenario with one effect switched off (CSS injected, CSP bypassed for these runs only)
const AB = {
  base: "",
  noGlowSpin: ".glow-border::before { animation: none !important; }",
  // the glow keeps turning but repaints 12 times a second instead of every frame
  glowSteps: ".glow-border::before { animation-timing-function: steps(60) !important; }",
  noBackdrop: "* { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }",
  noBgAnim: ".bg *, .bg *::before { animation: none !important; } .sky { display: none !important; }",
  noShimmer: ".grad-text, .grad-line, .chip-live i { animation: none !important; }",
  noBlendGrain: ".aurora, .grain, .cursor-glow { mix-blend-mode: normal !important; } .grain { display: none !important; }",
  // the background split into its parts, to see which one costs the most
  noStars: ".star { animation: none !important; }",
  noDrift: ".drift, .shooting { display: none !important; }",
  noFloor: ".floor::before { animation: none !important; }",
  noAurora: ".aurora { animation: none !important; }",
};
async function ab(browser, cond, keys) {
  const out = {};
  for (const [k, css] of Object.entries(AB).filter(([k]) => !keys || keys.includes(k))) {
    const runs = [];
    // 3 runs, and idle is measured once loading has settled (Lottie and fonts arrive in the first seconds)
    for (let i = 0; i < 3; i++) {
      const { ctx, page, cdp } = await open(browser, cond, { css, bypassCSP: true });
      await page.goto(BASE, { waitUntil: "load", timeout: 90000 });
      await page.locator("#demoCard .nheart").waitFor({ state: "visible", timeout: 60000 });
      await sleep(8000);
      const idle = await frames(page, () => sleep(3000));
      const sc = await frames(page, async () => { await scroll(cdp, 2600); await sleep(800); });
      await page.goto(BASE + "#/n/demo", { waitUntil: "load" });
      await page.locator("#love .nheart").waitFor({ state: "visible", timeout: 60000 });
      await sleep(3000);
      const recv = await frames(page, () => sleep(3000));
      runs.push({ idle, sc, recv });
      await ctx.close();
    }
    const avg = (f, m) => +(runs.reduce((a, r) => a + r[f][m], 0) / runs.length).toFixed(1);
    out[k] = Object.fromEntries(["idle", "sc", "recv"].map((f) => [f, { fps: avg(f, "fps"), p95: avg(f, "p95"), over33: avg(f, "over33"), pctSmooth: avg(f, "pctSmooth") }]));
    console.log("A/B", k, JSON.stringify(out[k]));
  }
  return out;
}

// --only load|frames|trace|ab runs one part; --ab base,noStars picks A/B variants
const ONLY = arg("only", "");
const part = (p) => !ONLY || ONLY === p;
const browser = await chromium.launch({ executablePath: CHROME, headless: !process.argv.includes("--headed") });
const report = { when: new Date().toISOString(), base: BASE, conditions: {} };
for (const [k, cond] of Object.entries(CONDITIONS)) {
  if (!part("load") && !part("frames")) break;
  console.log("==", cond.label);
  const r = { label: cond.label };
  if (part("load")) {
    r.load = await coldLoad(browser, cond, BASE);
    if (BASE_GZIP && k !== "none") r.loadGzip = await coldLoad(browser, cond, BASE_GZIP);
    console.log(JSON.stringify({ load: { ...r.load, top: undefined }, loadGzip: r.loadGzip && { ...r.loadGzip, top: undefined } }));
  }
  if (part("frames")) {
    r.frames = await scenarios(browser, cond);
    for (const [s, f] of Object.entries(r.frames)) console.log("  ", s.padEnd(13), JSON.stringify(f));
  }
  report.conditions[k] = r;
}
if (part("trace")) {
  console.log("== trace (4g)");
  report.trace4g = await trace(browser, CONDITIONS["4g"]);
  console.log(JSON.stringify(report.trace4g, null, 1));
}
if (part("ab") && !process.argv.includes("--skip-ab")) { console.log("== A/B (4g)"); report.ab4g = await ab(browser, CONDITIONS["4g"], arg("ab", "") ? arg("ab", "").split(",") : null); }
await browser.close();
writeFileSync(join(OUT, ONLY ? `perf-${ONLY}.json` : "perf.json"), JSON.stringify(report, null, 2));
console.log("report: " + join(OUT, ONLY ? `perf-${ONLY}.json` : "perf.json"));
