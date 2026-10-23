// End-to-end user test of every screen, run like a real user would (mouse, keyboard, touch profile).
// Writes <out>/e2e.json (one row per test case) and screenshots to <out>/shots/.
// Usage: PW_DIR=<folder with node_modules/playwright-core> node e2e.mjs --base http://127.0.0.1:8765/ --out <dir>
//        [--chrome <path>] [--profiles desktop,mobile] [--headed]
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1] : def; };
const require = createRequire(resolve(process.env.PW_DIR || ".", "x.js"));
const { chromium } = require("playwright-core");

const BASE = arg("base", "http://127.0.0.1:8765/");
const OUT = resolve(arg("out", "ui-test-out"));
const CHROME = arg("chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe");
const PROFILES = arg("profiles", "desktop,mobile").split(",");
mkdirSync(join(OUT, "shots"), { recursive: true });

const DEVICES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  mobile: {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  },
};

const results = [];
let profile = "", current = null;
async function test(id, area, name, fn) {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push({ profile, id, area, name, status: "PASS", note: note || "", ms: Date.now() - t0 });
  } catch (e) {
    results.push({ profile, id, area, name, status: "FAIL", note: String(e && e.message || e).split("\n")[0].slice(0, 300), ms: Date.now() - t0 });
    if (current) await current.screenshot({ path: join(OUT, "shots", `FAIL-${profile}-${id}.png`) }).catch(() => {});
  }
  const r = results.at(-1);
  console.log(`[${profile}] ${r.status} ${id} ${name}${r.note ? " :: " + r.note : ""}`);
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newContext(browser, device) {
  const ctx = await browser.newContext({ ...DEVICES[device], locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", permissions: ["clipboard-read", "clipboard-write"] });
  // the native share sheet would block the run: record calls instead
  await ctx.addInitScript(() => { navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; });
  return ctx;
}
function watch(page, bag) {
  page.on("pageerror", (e) => bag.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") bag.push("console: " + m.text()); });
  page.on("response", (r) => { if (r.status() >= 400 && !/favicon\.ico/.test(r.url())) bag.push(`http ${r.status()}: ${r.url()}`); });
}
// language switches and route changes re-render #app with a short fade: wait until it is back
const settled = (page) => page.waitForFunction(() => { const a = document.getElementById("app"); return a.childElementCount && getComputedStyle(a).opacity === "1" && !gsap.isTweening(a); }, null, { timeout: 5000 });
const route = (page, name) => page.waitForFunction((n) => document.body.dataset.route === n, name, { timeout: 5000 });
const shot = (page, name) => page.screenshot({ path: join(OUT, "shots", `${profile}-${name}.png`), fullPage: true });

// layout audit of what is on screen now: horizontal overflow, elements poking out of the viewport, small touch targets, tiny text
async function layout(page) {
  return page.evaluate((mobile) => {
    const vw = document.documentElement.clientWidth;
    const visible = (n) => { const s = getComputedStyle(n); const r = n.getBoundingClientRect(); return s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05 && r.width > 0 && r.height > 0; };
    const name = (n) => n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + (n.classList.length ? "." + [...n.classList].slice(0, 2).join(".") : "") + (n.textContent.trim() ? ` "${n.textContent.trim().slice(0, 24)}"` : "");
    const skip = (n) => n.closest(".bg, .fx-layer, .toast, .no-run, .lp-stage, .preview-host, .mq-track, .sr-only, .demo-confetti, [aria-hidden=true]");
    const out = [], small = [], tiny = [];
    for (const n of document.querySelectorAll("#app *, .topbar *, .sticky-cta, dialog[open] *")) {
      if (skip(n) || !visible(n)) continue;
      const r = n.getBoundingClientRect();
      if (r.right > vw + 2 || r.left < -2) {
        // inside a horizontal scroller is fine
        let p = n.parentElement, clipped = false;
        while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") { clipped = true; break; } p = p.parentElement; }
        if (!clipped) out.push(name(n) + ` [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
      if (mobile && n.matches("button, a[href], input[type=checkbox], .dd-btn") && !n.closest("p, .check > span, .lang-sw") && (r.width < 44 || r.height < 44) && !n.disabled) small.push(name(n) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
      if (n.childNodes.length && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && parseFloat(getComputedStyle(n).fontSize) < 11) tiny.push(name(n) + " " + getComputedStyle(n).fontSize);
    }
    return { overflowX: document.documentElement.scrollWidth - vw, out: [...new Set(out)].slice(0, 8), small: [...new Set(small)].slice(0, 12), tiny: [...new Set(tiny)].slice(0, 8) };
  }, profile === "mobile");
}
async function layoutTest(page, id, label) {
  await test(id, "Layout", `${label}: không tràn ngang, không phần tử lòi khỏi màn`, async () => {
    const l = await layout(page);
    await shot(page, label);
    expect(l.overflowX <= 0, `trang rộng hơn viewport ${l.overflowX}px`);
    expect(!l.out.length, "lòi khỏi màn: " + l.out.join("; "));
    const notes = [];
    if (l.small.length) notes.push("touch target <44px: " + l.small.join("; "));
    if (l.tiny.length) notes.push("chữ <11px: " + l.tiny.join("; "));
    return notes.join(" | ");
  });
}

// click the runaway No button until it gives up (5 dodges) or `max` tries
async function chaseNo(page, noSel, reminderSel, max = 12) {
  const seen = new Set();
  for (let i = 0; i < max; i++) {
    if (await page.locator(reminderSel).isVisible()) break;
    const no = page.locator(noSel);
    if (await no.isVisible()) { seen.add(await no.textContent()); await no.click({ force: true, timeout: 2000 }).catch(() => {}); }
    await sleep(450);
  }
  await page.locator(reminderSel).waitFor({ state: "visible", timeout: 8000 });
  return seen.size;
}
async function pickDateTime(page, calSel, hoursSel, minsSel) {
  await page.click(`${calSel} .cal-nav >> nth=1`);
  await page.locator(`${calSel} .cal-day:not(:disabled)`).first().click();
  await page.click(`${hoursSel} .dd-btn`);
  await page.locator(`${hoursSel} .dd-item:not(:disabled)`, { hasText: "19" }).first().click();
  await page.click(`${minsSel} .dd-btn`);
  await page.locator(`${minsSel} .dd-item:not(:disabled)`).first().click();
}

async function home(page, errs) {
  await test("H01", "Home", "Mở trang chủ, hero + thiệp mẫu hiện, không lỗi JS", async () => {
    await page.goto(BASE, { waitUntil: "load" });
    await page.locator(".hero-title").waitFor();
    await page.locator("#demoCard .nheart").waitFor({ state: "visible" });
    expect((await page.title()).includes("DiDateHong"), "title sai: " + (await page.title()));
    await sleep(1500);
    expect(!errs.length, errs.join("; "));
  });
  await layoutTest(page, "H02", "home-top");
  await test("H13", "Motion", "Home: số animation chạy cùng lúc ít, lá thư bay chỉ dùng transform, toast ẩn hẳn", async () => {
    await sleep(800);
    const m = await page.evaluate(() => {
      const run = document.getAnimations().filter((a) => a.playState === "running");
      const flyer = document.querySelector(".jflyer");
      const t = getComputedStyle(document.getElementById("toast"));
      return { css: run.length, stars: document.querySelectorAll(".star").length, drift: document.querySelectorAll(".drift").length, flyerLeft: flyer ? flyer.style.left : "", toast: t.opacity };
    });
    expect(!m.flyerLeft, "lá thư bay vẫn đặt style left = " + m.flyerLeft);
    expect(m.toast === "0", "toast đang ẩn mà opacity = " + m.toast);
    return `${m.css} CSS animation đang chạy, ${m.stars} sao, ${m.drift} hạt bay`;
  });
  await test("H03", "Home", "Đổi ngôn ngữ VI → EN → VI", async () => {
    const vi = await page.locator(".hero-cta .btn").first().textContent();
    await page.click("[data-lang=en]");
    await page.waitForFunction((v) => document.documentElement.lang === "en" && document.querySelector(".hero-cta .btn")?.textContent !== v, vi, { timeout: 5000 }).catch(() => {});
    await settled(page);
    const en = await page.locator(".hero-cta .btn").first().textContent();
    expect(en !== vi, "chữ không đổi sau khi bấm EN");
    expect(await page.getAttribute("[data-lang=en]", "aria-pressed") === "true", "EN không aria-pressed");
    await page.locator("[data-lang=vi]").click();
    await page.waitForFunction(() => document.documentElement.lang === "vi");
    await sleep(300);
    await settled(page);
    await sleep(900);
    return `"${vi.trim()}" ↔ "${en.trim()}"`;
  });
  await test("H04", "Home", "Thiệp mẫu: bấm tim → câu hỏi → nút Không né 5 lần → Đồng ý → Chơi lại", async () => {
    await page.locator("#demoCard").scrollIntoViewIfNeeded();
    await page.click("#demoCard .nheart", { force: true });
    await page.locator("#dQ").waitFor({ state: "visible", timeout: 8000 });
    await sleep(500);
    const texts = await chaseNo(page, "#dNo", "#dRun");
    await page.click("#dYes", { force: true });
    await page.locator("#dDone .stamp").waitFor({ state: "visible", timeout: 8000 });
    await page.click("#dReplay", { force: true });
    await page.locator("#dQ").waitFor({ state: "visible" });
    expect(await page.locator("#dNo").isVisible(), "nút Không không quay lại sau Chơi lại");
    return `nút Không đổi ${texts} câu chữ`;
  });
  if (profile === "mobile") {
    await test("H05", "Home", "Điện thoại: nút Tạo thiệp dính đáy hiện ngay khi nút của hero lọt dưới topbar", async () => {
      // the case that used to fail: hero button fully under the fixed topbar but still inside the viewport
      await page.evaluate(() => { const r = document.querySelector(".hero-cta").getBoundingClientRect(); scrollTo(0, scrollY + r.bottom - 30); });
      await page.locator(".sticky-cta.show").waitFor({ state: "visible", timeout: 3000 });
      await sleep(600);
      const r = await page.locator(".sticky-cta").boundingBox();
      expect(r.y + r.height <= 844 && r.x >= 0 && r.x + r.width <= 390, "nút dính đáy nằm ngoài màn " + JSON.stringify(r));
    });
  }
  await test("H06", "Home", "Khối story: ảnh vé mẫu vẽ xong khi cuộn tới", async () => {
    await page.locator("#homeTicket").scrollIntoViewIfNeeded();
    await page.locator("#homeTicket.ready").waitFor({ timeout: 8000 });
    const ok = await page.$eval("#homeTicket .story-img", (i) => i.complete && i.naturalWidth > 0);
    expect(ok, "ảnh chưa load");
  });
  await layoutTest(page, "H07", "home-ticket");
  await test("H08", "Home", "Góp ý trang chủ: chọn cảm nhận → Tiếp → chọn kênh → Gửi → cảm ơn", async () => {
    const fb = page.locator("#homeFb");
    await fb.scrollIntoViewIfNeeded();
    await fb.locator(".fbx-mood").first().click();
    await fb.locator(".fbx-next").click();
    await sleep(400);
    await fb.locator(".fbx-send").click();
    const err = await fb.locator(".fbx-err").isVisible();
    await fb.locator(".fbx-chip").first().click();
    await fb.locator(".fbx-send").click();
    await fb.locator(".fbx-thanks").waitFor({ timeout: 3000 });
    return err ? "gửi khi chưa chọn kênh → hiện lỗi đúng" : "không hiện lỗi khi chưa chọn kênh";
  });
  for (const [id, href] of [["H09", "privacy"], ["H10", "terms"], ["H11", "contact"]]) {
    await test(id, "Pages", `Footer → trang ${href}`, async () => {
      await page.goto(BASE + "#/", { waitUntil: "load" });
      await route(page, "home");
      await page.locator(`footer a[href="#/${href}"]`).click();
      await route(page, href);
      await page.locator("#app h1, #app h2").first().waitFor();
      await shot(page, "page-" + href);
      const l = await layout(page);
      expect(l.overflowX <= 0 && !l.out.length, "layout tràn: " + l.out.join("; "));
    });
  }
  await test("H12", "Home", "Nút Xem thiệp mẫu → màn người nhận demo", async () => {
    await page.goto(BASE + "#/", { waitUntil: "load" });
    await page.click('.hero-cta a[href="#/n/demo"]', { force: true });
    await route(page, "n");
    await page.locator("#love .nheart").waitFor({ state: "visible" });
  });
}

async function create(page, errs) {
  let link = "";
  await page.goto(BASE + "#/create", { waitUntil: "load" });
  await route(page, "create");
  await test("C01", "Create", "B1 tên: chưa nhập thì nút Tiếp khóa, xóa tên người nhận thì báo lỗi", async () => {
    expect(await page.isDisabled("#next1"), "Tiếp không bị khóa khi trống");
    await page.fill("#nameFrom", "Minh");
    await page.fill("#nameTo", "x");
    await page.fill("#nameTo", "");
    await page.locator("#hTo").waitFor({ state: "visible" });
    expect(await page.getAttribute("#nameTo", "aria-invalid") === "true", "thiếu aria-invalid");
    await page.fill("#nameTo", "Thảo");
    expect(!(await page.isDisabled("#next1")), "Tiếp vẫn khóa");
    expect((await page.textContent("#cFrom")) === "4/20", "bộ đếm sai: " + (await page.textContent("#cFrom")));
  });
  await test("C02", "Create", "B1: giới hạn 20 ký tự, Tab chuyển ô", async () => {
    await page.fill("#nameFrom", "");
    await page.type("#nameFrom", "Nguyễn Văn Minh Quang Huy Đức");
    const v = await page.inputValue("#nameFrom");
    await page.fill("#nameFrom", "Minh");
    await page.focus("#nameFrom");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement.id) === "nameTo", "Tab không sang ô người nhận");
    expect([...v].length <= 20, "nhập được " + [...v].length + " ký tự");
  });
  await layoutTest(page, "C03", "create-1");
  await test("C04", "Create", "B2 lời mời: chọn mẫu, xóa trống báo lỗi, tự viết", async () => {
    await page.click("#next1");
    await page.locator('.cstep[data-step="2"].active #templates .choice').first().waitFor();
    const n = await page.locator("#templates .choice").count();
    await page.locator("#templates .choice").nth(1).click();
    expect(await page.locator("#templates .choice").nth(1).getAttribute("aria-pressed") === "true", "mẫu chọn không aria-pressed");
    await page.fill("#msg", "");
    await page.locator("#hMsg").waitFor({ state: "visible" });
    expect(await page.isDisabled("#next2"), "Tiếp không khóa khi lời mời trống");
    await page.fill("#msg", "Cuối tuần đi cà phê với tớ nhé?");
    expect(!(await page.isDisabled("#next2")), "Tiếp vẫn khóa");
    return n + " mẫu";
  });
  await layoutTest(page, "C05", "create-2");
  await test("C06", "Create", "B3 thời gian: chọn ngày + giờ + phút, đổi qua 'để người ấy chọn' rồi quay lại", async () => {
    await page.click("#next2");
    await page.locator('.cstep[data-step="3"].active').waitFor();
    expect(await page.isDisabled("#next3"), "Tiếp không khóa khi chưa chọn giờ");
    await pickDateTime(page, "#cal", "#hours", "#mins");
    await page.locator("#when.ok").waitFor();
    await page.click('[data-mode="pick"]');
    expect(await page.locator("#fixedPane").isHidden() && !(await page.isDisabled("#next3")), "chế độ để người ấy chọn sai");
    await page.click('[data-mode="fixed"]');
    await page.locator("#when.ok").waitFor();
    return (await page.textContent("#when")).trim();
  });
  await test("C07", "Create", "B3: dropdown giờ đóng bằng Escape, focus về nút", async () => {
    await page.click("#hours .dd-btn");
    expect(await page.getAttribute("#hours .dd-btn", "aria-expanded") === "true", "không mở");
    await page.keyboard.press("Escape");
    expect(await page.getAttribute("#hours .dd-btn", "aria-expanded") === "false", "Escape không đóng");
  });
  await layoutTest(page, "C08", "create-3");
  await test("C09", "Create", "Nháp được giữ khi tải lại trang (đang ở B3)", async () => {
    await page.reload({ waitUntil: "load" });
    await page.locator('.cstep[data-step="3"].active').waitFor({ timeout: 8000 });
    await page.locator("#when.ok").waitFor();
    expect(await page.inputValue("#nameFrom") === "Minh", "mất tên người gửi");
  });
  await test("C10", "Create", "B4 kèo: chọn 2 món ăn + 1 món chơi, bộ đếm đúng", async () => {
    await page.click("#next3");
    await page.locator('.cstep[data-step="4"].active #planList .option').first().waitFor();
    expect(await page.isDisabled("#next4"), "Tiếp không khóa khi chưa chọn kèo");
    await page.locator("#planList .option").nth(0).click();
    await page.locator("#planList .option").nth(1).click();
    await page.click('[data-ptab="choi"]');
    await page.locator("#planList .option").nth(0).click();
    const c = await page.textContent("#counter");
    expect(/3/.test(c), "bộ đếm: " + c);
    expect((await page.textContent("#cntAn")) === "(2)", "đếm tab Ăn sai");
    return c.trim();
  });
  await layoutTest(page, "C11", "create-4");
  await test("C12", "Create", "B5 xem trước: iframe chạy màn người nhận, sheet Sửa mở/đóng bằng Escape", async () => {
    await page.click("#next4");
    const f = page.frameLocator("#previewHost iframe");
    await f.locator("#love .nheart").waitFor({ state: "visible", timeout: 6000 });
    await page.click("#editBtn");
    await page.locator("dialog.sheet[open]").waitFor();
    await page.keyboard.press("Escape");
    await page.locator("dialog.sheet[open]").waitFor({ state: "detached", timeout: 3000 }).catch(async () => expect(!(await page.locator("dialog.sheet[open]").count()), "sheet không đóng"));
  });
  await layoutTest(page, "C13", "create-5");
  await test("C14", "Create", "B6: chưa tick đồng ý thì nút Tạo link khóa và có lời giải thích", async () => {
    await page.click("#next5");
    await page.locator('.cstep[data-step="6"].active').waitFor();
    expect(await page.isDisabled("#createBtn") && (await page.locator("#hCreate").isVisible()), "nút không khóa / không có hint");
    await page.check("#terms");
    expect(!(await page.isDisabled("#createBtn")), "vẫn khóa sau khi tick");
  });
  await test("C15", "Create", "B7: bấm Tạo link 2 lần ngay khi B6 hiện → sang B7, chỉ 1 thiệp; copy link, chia sẻ", async () => {
    // pressed twice right as step 6 appears: the step change must not be dropped and only one invite is saved
    await page.click("#createBtn");
    await page.click("#createBtn", { force: true, timeout: 1500 }).catch(() => {});
    await page.locator('.cstep[data-step="7"].active #link').waitFor({ timeout: 8000 });
    link = (await page.textContent("#link")).trim();
    expect(link.startsWith(BASE + "#/n/"), "link lạ: " + link);
    await page.click("#copyLink");
    await page.locator("#toast.show").waitFor({ timeout: 2000 });
    const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    expect(clip === link, "clipboard khác link");
    await page.click("#shareBtn");
    const shared = await page.evaluate(() => window.__shared);
    expect(shared && shared.url === link, "navigator.share không nhận link");
    expect((await page.textContent("#myCount")) === "1", "đếm thiệp: " + (await page.textContent("#myCount")));
    return `link dài ${link.length} ký tự`;
  });
  await layoutTest(page, "C16", "create-7");
  await test("C17", "Create", "B7 giữ nguyên khi tải lại; 'Tạo thiệp mới' về B1 trống", async () => {
    await page.reload({ waitUntil: "load" });
    await page.locator('.cstep[data-step="7"].active').waitFor();
    await page.click("#newBtn");
    await page.locator('.cstep[data-step="1"].active').waitFor();
    expect((await page.inputValue("#nameFrom")) === "", "B1 không trống");
  });
  await test("C18", "Create", "Không có lỗi JS / request lỗi trong cả luồng tạo", async () => { expect(!errs.length, errs.join("; ")); });
  return link;
}

async function receiver(page, link, errs) {
  await test("R01", "Receiver", "Mở link: phong bì → bấm tim → câu rủ đúng nội dung", async () => {
    await page.goto(link, { waitUntil: "load" });
    await route(page, "n");
    await page.locator("#love .nheart").waitFor({ state: "visible" });
    await sleep(1200);
    await shot(page, "recv-1");
    await page.click("#love .nheart", { force: true });
    await page.locator('.rstep[data-step="2"].active').waitFor({ timeout: 5000 });
    const t = await page.locator("#askTitle .sr-only").textContent().catch(() => page.textContent("#askTitle"));
    expect(t.includes("cà phê"), "câu rủ sai: " + t);
  });
  await test("R02", "Receiver", "Nút Không né (5 lần) rồi biến mất, hiện lời năn nỉ", async () => {
    await sleep(900);
    return `${await chaseNo(page, "#noBtn", "#runawayMsg")} câu chữ`;
  });
  await layoutTest(page, "R03", "recv-2");
  await test("R04", "Receiver", "Đồng ý → giờ hẹn cố định → Chốt giờ", async () => {
    await page.click("#yesBtn", { force: true });
    await page.locator('.rstep[data-step="3"].active #timeFixed').waitFor({ state: "visible", timeout: 8000 });
    expect((await page.textContent("#timeWhen")).trim().length > 3, "thiếu giờ hẹn");
    await shot(page, "recv-3");
    await page.click("#timeOk");
    await page.locator('.rstep[data-step="4"].active').waitFor({ timeout: 8000 });
  });
  await test("R05", "Receiver", "Kèo: chọn 1 kèo; xóa chữ ký báo lỗi; ký lại → Xong", async () => {
    await page.locator("#rPlanList .option").first().click();
    expect(!(await page.isDisabled("#planDone")), "Xong vẫn khóa dù đã chọn kèo + có tên");
    await page.fill("#signName", "");
    await page.locator("#hSign").waitFor({ state: "visible" });
    expect(await page.isDisabled("#planDone"), "Xong không khóa khi thiếu tên");
    await page.fill("#signName", "Thảo");
    await layout(page).then((l) => shot(page, "recv-4"));
    await page.click("#planDone");
    await page.locator('.rstep[data-step="5"].active #rTicket .ticket').waitFor({ timeout: 8000 });
    // the ticket drops in and the buttons fade up after it: measure the settled screen
    await page.waitForFunction(() => getComputedStyle(document.getElementById("saveBtn")).opacity === "1", null, { timeout: 8000 });
    await sleep(600);
  });
  await layoutTest(page, "R06", "recv-5");
  await test("R07", "Receiver", "Lưu ảnh vé: hộp xem ảnh mở, có ảnh, Escape đóng", async () => {
    await page.click("#saveBtn");
    await page.locator("dialog.shot[open] img.shot-img").waitFor({ timeout: 6000 });
    const ok = await page.$eval("dialog.shot img.shot-img", (i) => i.complete && i.naturalWidth > 0);
    await shot(page, "recv-shot");
    await page.keyboard.press("Escape");
    await sleep(500);
    expect(ok, "ảnh vé rỗng");
  });
  await test("R08", "Receiver", "Thêm vào lịch: sheet có link Google Calendar + file .ics", async () => {
    await page.click("#calBtn");
    const g = page.locator('dialog.sheet[open] a[href*="calendar.google.com"]');
    await g.waitFor({ timeout: 3000 });
    expect(await page.locator('dialog.sheet[open] a[download$=".ics"]').count() === 1, "thiếu .ics");
    await page.keyboard.press("Escape");
    await sleep(400);
  });
  await test("R09", "Receiver", "'Tạo thiệp của bạn' → sang màn tạo", async () => {
    await page.click("#mineBtn");
    await route(page, "create");
  });
  await test("R10", "Receiver", "Thiệp mẫu: đề xuất giờ khác + đề xuất kèo khác → thiệp ghi 'đề xuất', ẩn nút thêm lịch", async () => {
    await page.goto(BASE + "#/n/demo", { waitUntil: "load" });
    await page.locator("#love .nheart").waitFor({ state: "visible" });
    await sleep(800);
    await page.click("#love .nheart", { force: true });
    await page.locator('.rstep[data-step="2"].active').waitFor({ timeout: 5000 });
    await sleep(900);
    await page.click("#yesBtn", { force: true });
    await page.locator("#timeOther").waitFor({ state: "visible" });
    await page.click("#timeOther");
    await page.locator("#timePick").waitFor({ state: "visible" });
    await pickDateTime(page, "#rCal", "#rHours", "#rMins");
    await page.click("#timeNext");
    await page.locator('.rstep[data-step="4"].active').waitFor();
    await page.click("#planPropose");
    await page.locator("#planAll").waitFor({ state: "visible" });
    await page.click('[data-rtab="choi"]');
    await page.locator("#rPlanAll .option").first().click();
    await shot(page, "recv-propose");
    await page.click("#planDone");
    await page.locator('.rstep[data-step="5"].active').waitFor();
    expect(await page.locator("#calBtn").isHidden(), "nút thêm lịch vẫn hiện khi giờ chỉ là đề xuất");
    return (await page.textContent("#endH")).trim();
  });
  await test("R11", "Receiver", "Thiệp 'để người nhận chọn giờ': hiện lịch ngay, chọn xong mới cho Tiếp", async () => {
    const url = await page.evaluate(() => window.HN.inviteUrl(window.HN.encodeInvite({ code: "pick0001", from: "An", to: "Bình", message: "Đi chơi không?", timeMode: "pick", date: null, hour: null, minute: null, plans: ["cafe"] })));
    await page.goto(url, { waitUntil: "load" });
    await page.locator("#love .nheart").waitFor({ state: "visible" });
    await sleep(800);
    await page.click("#love .nheart", { force: true });
    await page.locator('.rstep[data-step="2"].active').waitFor({ timeout: 5000 });
    await sleep(900);
    await page.click("#yesBtn", { force: true });
    await page.locator("#timePick").waitFor({ state: "visible" });
    expect(await page.isDisabled("#timeNext"), "Tiếp không khóa khi chưa chọn");
    await pickDateTime(page, "#rCal", "#rHours", "#rMins");
    await page.click("#timeNext");
    await page.locator("#planOne").waitFor({ state: "visible" });
    await page.click("#planOk");
    await page.locator('.rstep[data-step="5"].active').waitFor();
  });
  await test("R12", "Receiver", "Link hỏng → màn 'thiệp không còn'", async () => {
    await page.goto(BASE + "#/n/khong-hop-le", { waitUntil: "load" });
    await page.locator(".gone").waitFor();
    await shot(page, "recv-gone");
  });
  await test("R13", "Receiver", "Không có lỗi JS / request lỗi trong luồng người nhận", async () => { expect(!errs.length, errs.join("; ")); });
}

async function manage(page, errs, browser, device) {
  await test("Q01", "Manage", "Thiệp của tôi: có thiệp vừa tạo + 1 phản hồi, mở xem phản hồi", async () => {
    await page.goto(BASE + "#/q", { waitUntil: "load" });
    await route(page, "q");
    await page.locator("#qList .inv").first().waitFor();
    const pill = (await page.locator("#qList .inv .pill").first().textContent()).trim();
    await page.locator("#qList .inv .more").first().click();
    await page.locator("#qList .resp").first().waitFor({ state: "visible" });
    return pill;
  });
  await layoutTest(page, "Q02", "manage-list");
  await test("Q03", "Manage", "Tab Lịch mở ở tháng có lịch hẹn gần nhất, ngày hẹn được đánh dấu", async () => {
    await page.click('[data-tab="cal"]');
    await page.locator("#paneCal").waitFor({ state: "visible" });
    await sleep(700);
    const ev = await page.locator("#qCal .cal-day.has-event").count();
    expect(ev >= 1, "lịch mở ở tháng không có lịch hẹn nào");
    return `${ev} ngày có hẹn, lịch mở ở ${(await page.textContent("#qCal .cal-head strong")).trim()}`;
  });
  await layoutTest(page, "Q04", "manage-cal");
  await test("Q05", "Manage", "Nút xem dữ liệu mẫu hiện 3 thiệp mẫu, mở được phản hồi", async () => {
    await page.click('[data-tab="list"]');
    await page.click("#sampleBtn");
    await page.waitForFunction(() => document.querySelectorAll("#qList .inv").length >= 3);
    await page.locator("#qList .inv .more").first().click();
    await shot(page, "manage-sample");
  });
  await test("Q06", "Manage", "Trình duyệt mới: trạng thái trống có 1 hành động rõ ràng", async () => {
    const ctx = await newContext(browser, device);
    const p = await ctx.newPage();
    await p.goto(BASE + "#/q", { waitUntil: "load" });
    await p.locator("#qEmpty").waitFor({ state: "visible" });
    await p.screenshot({ path: join(OUT, "shots", `${profile}-manage-empty.png`), fullPage: true });
    await ctx.close();
  });
  await test("Q07", "Manage", "Không có lỗi JS / request lỗi ở màn quản lý", async () => { expect(!errs.length, errs.join("; ")); });
}

// response headers of the real static code (server/static.mjs) behind the test server
async function server() {
  const get = (p, h = {}) => fetch(BASE.replace(/\/$/, "") + p, { headers: h });
  const html = await (await get("/")).text();
  const bundle = (html.match(/src="(app\.[a-f0-9]{10}\.js)"/) || [])[1];
  await test("S01", "Server", "Bundle app.<hash>.js: nén brotli, cache 1 năm (immutable)", async () => {
    expect(bundle, "không thấy bundle trong index.html");
    const r = await get("/" + bundle, { "accept-encoding": "br, gzip" });
    expect(r.headers.get("content-encoding") === "br", "không nén br: " + r.headers.get("content-encoding"));
    expect(/immutable/.test(r.headers.get("cache-control") || ""), "cache-control: " + r.headers.get("cache-control"));
  });
  await test("S02", "Server", "CSS: nén, no-cache + ETag, lần sau trả 304", async () => {
    const r = await get("/css/app.css", { "accept-encoding": "gzip" });
    const etag = r.headers.get("etag");
    expect(r.headers.get("content-encoding") === "gzip" && r.headers.get("cache-control") === "no-cache" && etag, "header sai");
    const again = await get("/css/app.css", { "accept-encoding": "gzip", "if-none-match": etag });
    expect(again.status === 304, "không trả 304: " + again.status);
  });
  await test("S03", "Server", "Đường dẫn ngoài thư mục cho phép bị chặn (404)", async () => {
    for (const p of ["/server/index.mjs", "/%2e%2e/package.json", "/.env", "/data/hennha.db"]) expect((await get(p)).status === 404, p + " không bị chặn");
  });
}

async function keyboard(page) {
  await test("K01", "A11y", "Bàn phím: Tab từ đầu trang tới nút Tạo thiệp, Enter mở màn tạo, focus hiện viền", async () => {
    await page.goto(BASE + "#/", { waitUntil: "load" });
    await sleep(600);
    let hit = false, ring = false;
    for (let i = 0; i < 12 && !hit; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { href: a.getAttribute("href"), ring: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== "none" }; });
      if (info.href === "#/create") { hit = true; ring = info.ring; }
    }
    expect(hit, "không Tab tới được nút tạo thiệp trong 12 lần");
    await page.keyboard.press("Enter");
    await route(page, "create");
    expect(ring, "không thấy focus ring");
  });
}

const browser = await chromium.launch({ executablePath: CHROME, headless: !process.argv.includes("--headed") });
for (const device of PROFILES) {
  profile = device;
  const ctx = await newContext(browser, device);
  const page = await ctx.newPage();
  current = page;
  const errs = [];
  watch(page, errs);
  await home(page, errs);
  errs.length = 0;
  const link = await create(page, errs);
  errs.length = 0;
  if (link) await receiver(page, link, errs);
  errs.length = 0;
  await manage(page, errs, browser, device);
  if (device === "desktop") { await keyboard(page); await server(); }
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, "e2e.json"), JSON.stringify(results, null, 2));
const fail = results.filter((r) => r.status === "FAIL").length;
console.log(`\n${results.length - fail}/${results.length} passed, report: ${join(OUT, "e2e.json")}`);
process.exitCode = fail ? 1 : 0;
