"use strict";
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
  Object.assign(HN, { $, $$, el, reduce, fine });
  if (reduce) gsap.globalTimeline.timeScale(20);

  /* ---------- route lifecycle ---------- */
  let disposers = [];
  HN.onLeave = (fn) => { disposers.push(fn); return fn; };
  HN.leave = () => {
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
  HN.planById = (id) => HN.PLANS.find((p) => p.id === id);

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

  /* ---------- month calendar ---------- */
  HN.calendar = (host, opts) => {
    const min = opts.min || HN.today();
    const max = opts.max || (() => { const d = HN.today(); d.setFullYear(d.getFullYear() + 1); return d; })();
    let selected = opts.selected || null;
    let view = new Date((selected || min).getFullYear(), (selected || min).getMonth(), 1);
    host.classList.add("cal");
    function render(dir) {
      host.replaceChildren();
      const head = el("div", "cal-head");
      const prev = el("button", "cal-nav", "‹"); prev.type = "button"; prev.setAttribute("aria-label", "Tháng trước");
      const next = el("button", "cal-nav", "›"); next.type = "button"; next.setAttribute("aria-label", "Tháng sau");
      const title = el("strong", null, "Tháng " + (view.getMonth() + 1) + ", " + view.getFullYear());
      prev.disabled = !opts.allowAll && view <= new Date(min.getFullYear(), min.getMonth(), 1);
      next.disabled = !opts.allowAll && view >= new Date(max.getFullYear(), max.getMonth(), 1);
      // render() rebuilds the grid, so put focus back on the matching control
      const nav = (dir) => {
        view = new Date(view.getFullYear(), view.getMonth() + dir, 1);
        render(dir);
        const [p, n] = $$(".cal-nav", host);
        const again = dir < 0 ? p : n;
        const target = again.disabled ? $(".cal-day:not(:disabled)", host) : again;
        if (target) target.focus({ preventScroll: true });
      };
      prev.onclick = () => nav(-1);
      next.onclick = () => nav(1);
      head.append(prev, title, next);
      const grid = el("div", "cal-grid");
      ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].forEach((t) => grid.append(el("div", "cal-dow", t)));
      const firstDow = (view.getDay() + 6) % 7;
      for (let i = 0; i < firstDow; i++) grid.append(el("div"));
      const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      const todayIso = HN.iso(HN.today());
      for (let d = 1; d <= days; d++) {
        const date = new Date(view.getFullYear(), view.getMonth(), d);
        const iso = HN.iso(date);
        const b = el("button", "cal-day", String(d)); b.type = "button";
        const isSel = !!selected && iso === HN.iso(selected);
        const ev = opts.events && opts.events[iso];
        b.setAttribute("aria-label", HN.fmtDate(date) + (ev ? (ev.conflict ? ", có hẹn trùng giờ" : ", có hẹn") : ""));
        b.setAttribute("aria-pressed", String(isSel));
        if (iso === todayIso) { b.classList.add("today"); b.setAttribute("aria-current", "date"); }
        if (isSel) b.classList.add("selected");
        if (ev) { b.classList.add("has-event"); if (ev.conflict) b.classList.add("conflict"); }
        if (!opts.allowAll && (date < min || date > max)) b.disabled = true;
        b.onclick = () => {
          selected = date; render();
          const again = $(".cal-day.selected", host);
          if (again) again.focus({ preventScroll: true });
          if (opts.onSelect) opts.onSelect(date);
        };
        grid.append(b);
      }
      host.append(head, grid);
      if (dir) gsap.from(grid, { x: 30 * dir, autoAlpha: 0, duration: 0.3, ease: "power2.out" });
      else if (selected) { const s = $(".cal-day.selected", grid); if (s) gsap.fromTo(s, { scale: 0.6 }, { scale: 1, duration: 0.35, ease: "back.out(3)" }); }
    }
    render();
    return { render, setSelected(d) { selected = d; if (d) view = new Date(d.getFullYear(), d.getMonth(), 1); render(); } };
  };

  /* ---------- hour + minute dropdowns (5 rows visible, scroll for the rest) ---------- */
  HN.timePicker = (hoursHost, minsHost, opts) => {
    let hour = opts.hour ?? null, minute = opts.minute ?? null;
    const ITEM_H = 44;
    // disclosure of plain buttons: Tab/Enter work natively, no listbox role to fake arrow-key behaviour for
    function dropdown(host, label, placeholder, onPick) {
      const wrap = el("div", "dd"), btn = el("button", "dd-btn"), list = el("div", "dd-list");
      list.id = "dd-" + HN.randomCode(6);
      btn.type = "button";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", list.id);
      list.setAttribute("role", "group");
      list.setAttribute("aria-label", label);
      list.hidden = true;
      wrap.append(btn, list);
      host.replaceChildren(wrap);
      const close = () => { list.hidden = true; wrap.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
      const open = () => {
        list.hidden = false;
        wrap.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        const sel = list.querySelector(".selected");
        list.scrollTop = sel ? Math.max(0, sel.offsetTop - ITEM_H * 2) : 0;
      };
      btn.addEventListener("click", () => (list.hidden ? open() : close()));
      wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); btn.focus(); } });
      wrap.addEventListener("focusout", (e) => { if (e.relatedTarget && !wrap.contains(e.relatedTarget)) close(); });
      const outside = (e) => {
        if (!wrap.isConnected) { document.removeEventListener("pointerdown", outside); return; }
        if (!wrap.contains(e.target)) close();
      };
      document.addEventListener("pointerdown", outside);
      return {
        set(items, value) {
          list.replaceChildren();
          let current = null;
          items.forEach((it) => {
            const on = it.value === value;
            const b = el("button", "dd-item" + (on ? " selected" : ""), it.text);
            b.type = "button";
            b.disabled = !!it.disabled;
            b.setAttribute("aria-pressed", String(on));
            b.addEventListener("click", () => { close(); onPick(it.value); btn.focus({ preventScroll: true }); });
            list.append(b);
            if (on) current = it;
          });
          btn.textContent = current ? current.text : placeholder;
          btn.setAttribute("aria-label", label + ": " + (current ? current.text : placeholder));
          btn.classList.toggle("placeholder", !current);
        },
      };
    }
    const H = dropdown(hoursHost, "Giờ", "Chọn giờ", (v) => { hour = v; render(); if (opts.onChange) opts.onChange(hour, minute); });
    const M = dropdown(minsHost, "Phút", "Chọn phút", (v) => { minute = v; render(); if (opts.onChange) opts.onChange(hour, minute); });
    function render() {
      H.set(Array.from({ length: 24 }, (_, h) => ({ value: h, text: pad2(h) + " giờ", disabled: !!(opts.isHourDisabled && opts.isHourDisabled(h)) })), hour);
      M.set([0, 30].map((m) => ({ value: m, text: pad2(m) + " phút", disabled: !!(opts.isMinuteDisabled && opts.isMinuteDisabled(hour, m)) })), minute);
    }
    render();
    return { render, set(h, m) { hour = h; minute = m; render(); } };
  };

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
  HN.inviteUrl = (inv) => HN.baseUrl() + "#/n/" + HN.encodeInvite(inv);
  HN.randomCode = (n = 8) => {
    const a = "abcdefghijkmnpqrstuvwxyz23456789";
    const r = new Uint32Array(n);
    crypto.getRandomValues(r);
    let s = "";
    r.forEach((x) => { s += a[x % a.length]; });
    return s;
  };

  /* ---------- lottie ---------- */
  const clone = (o) => (typeof structuredClone === "function" ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
  HN.lottie = (container, name, loop, fit = "meet") => lottie.loadAnimation({
    container, renderer: "svg", loop, autoplay: false, animationData: clone(window.LOTTIE[name]),
    rendererSettings: { preserveAspectRatio: "xMidYMid " + fit },
  });
  HN.mountLotties = (root) => {
    const loops = new Map();
    $$("[data-lottie]", root).forEach((n) => {
      if (n.dataset.mounted || !window.LOTTIE[n.dataset.lottie]) return;
      n.dataset.mounted = "1";
      n.setAttribute("aria-hidden", "true");
      const loop = n.dataset.loop === "1";
      const a = HN.lottie(n, n.dataset.lottie, loop, n.dataset.fit);
      if (reduce) a.goToAndStop(Math.floor(a.totalFrames / 3), true);
      else if (loop && "IntersectionObserver" in window) loops.set(n, a);
      else a.play();
      HN.onLeave(() => a.destroy());
    });
    if (!loops.size) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      const a = loops.get(e.target);
      if (e.isIntersecting) a.play(); else a.pause();
    }));
    loops.forEach((_, n) => io.observe(n));
    HN.onLeave(() => io.disconnect());
  };

  // CSS loops get .paused (see app.css); GSAP loops passed alongside a node pause with it
  HN.pauseOffscreen = (pairs) => {
    if (!("IntersectionObserver" in window)) return;
    const map = new Map(pairs.filter(([n]) => n));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      e.target.classList.toggle("paused", !e.isIntersecting);
      (map.get(e.target) || []).forEach((t) => t && t.paused(!e.isIntersecting));
    }));
    map.forEach((_, n) => io.observe(n));
    HN.onLeave(() => io.disconnect());
  };

  HN.focusHeading = (scope) => {
    const h = $("h1, h2", scope);
    if (!h) return;
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  };

  /* ---------- text effects ---------- */
  const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
  const graphemes = (s) => (seg ? [...seg.segment(s)].map((x) => x.segment) : [...s.normalize("NFC")]);
  HN.split = (node) => {
    const text = node.textContent.trim();
    node.textContent = "";
    node.append(el("span", "sr-only", text));
    const words = text.split(/\s+/);
    words.forEach((w, i) => {
      const ws = el("span", "w");
      ws.setAttribute("aria-hidden", "true");
      graphemes(w).forEach((ch) => ws.append(el("span", "ch", ch)));
      node.append(ws);
      if (i < words.length - 1) node.append(" ");
    });
    return $$(".ch", node);
  };
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/";
  HN.scramble = (node) => {
    const final = node.textContent;
    if (reduce) return;
    const chars = [...final];
    let frame = 0;
    const total = 26;
    const id = setInterval(() => {
      frame++;
      const shown = Math.floor((frame / total) * chars.length);
      node.textContent = chars.map((c, i) => (i < shown || c === " " ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join("");
      if (frame >= total) { clearInterval(id); node.textContent = final; }
    }, 38);
    HN.onLeave(() => clearInterval(id));
  };

  /* ---------- scroll reveal ---------- */
  HN.reveal = (root) => {
    const singles = $$("[data-reveal]", root), groups = $$("[data-reveal-stagger]", root);
    if (reduce || !("IntersectionObserver" in window)) return;
    gsap.set(singles, { autoAlpha: 0, y: 40 });
    groups.forEach((g) => gsap.set(g.children, { autoAlpha: 0, y: 34 }));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target.hasAttribute("data-reveal-stagger")) gsap.to(e.target.children, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.09, ease: "power3.out" });
        else gsap.to(e.target, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" });
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    singles.concat(groups).forEach((n) => io.observe(n));
    HN.onLeave(() => io.disconnect());
  };

  /* ---------- pointer effects ---------- */
  HN.tilt = (node, max = 10) => {
    if (!fine || reduce) return;
    gsap.set(node, { transformPerspective: 900 });
    const rx = gsap.quickTo(node, "rotationX", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(node, "rotationY", { duration: 0.5, ease: "power3.out" });
    node.addEventListener("pointermove", (e) => {
      const r = node.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * max * 2);
      rx((0.5 - py) * max * 2);
      node.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      node.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    });
    node.addEventListener("pointerleave", () => { rx(0); ry(0); });
  };
  HN.magnetic = (node, strength = 0.28) => {
    if (!fine || reduce) return;
    const x = gsap.quickTo(node, "x", { duration: 0.4, ease: "power3.out" });
    const y = gsap.quickTo(node, "y", { duration: 0.4, ease: "power3.out" });
    node.addEventListener("pointermove", (e) => {
      const r = node.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * strength);
      y((e.clientY - r.top - r.height / 2) * strength);
    });
    node.addEventListener("pointerleave", () => { x(0); y(0); });
  };

  /* ---------- celebration burst ---------- */
  const BURST_CHARS = ["✦", "♥", "✧", "★", "•", "♥"];
  const BURST_COLORS = ["#ff4f8b", "#a855f7", "#22d3ee", "#ffd166", "#ffffff", "#5eead4"];
  let burstAnim = null;
  HN.burst = (x = innerWidth / 2, y = innerHeight / 2, n = 36) => {
    if (reduce) return;
    const box = $("#burstLottie");
    if (box && window.LOTTIE && window.LOTTIE.confetti) {
      box.style.left = x + "px";
      box.style.top = y + "px";
      if (!burstAnim) burstAnim = HN.lottie(box, "confetti", false);
      burstAnim.goToAndPlay(0, true);
    }
    const layer = $("#fx");
    for (let i = 0; i < n; i++) {
      const s = el("span", "particle", BURST_CHARS[i % BURST_CHARS.length]);
      s.style.left = x + "px";
      s.style.top = y + "px";
      s.style.color = BURST_COLORS[i % BURST_COLORS.length];
      layer.append(s);
      const a = Math.random() * Math.PI * 2, d = gsap.utils.random(70, 240);
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 50;
      gsap.timeline({ onComplete: () => s.remove() })
        .fromTo(s, { x: 0, y: 0, scale: 0, rotation: 0 }, { x: dx, y: dy, scale: gsap.utils.random(0.6, 1.7), rotation: gsap.utils.random(-200, 200), duration: gsap.utils.random(0.6, 1), ease: "power3.out" })
        .to(s, { y: dy + 130, autoAlpha: 0, duration: 0.8, ease: "power1.in" }, "-=0.25");
    }
  };

  /* ---------- toast / copy / sheet ---------- */
  let toastTimer;
  HN.toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  };
  HN.copy = (text, msg = "Đã copy link") => {
    const done = () => HN.toast(msg);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => HN.toast("Không copy được, cậu giữ vào link để copy nhé"));
    else HN.toast("Trình duyệt không cho copy tự động");
  };
  // opacity, not autoAlpha: visibility:hidden would drop the focus showModal() just placed inside
  function modal(dlg, leave) {
    let closing = false;
    const close = (then) => {
      if (closing) return;
      closing = true;
      dlg.classList.add("closing");
      gsap.to(dlg, Object.assign({ opacity: 0, duration: 0.25, ease: "power2.in" }, leave, {
        onComplete: () => { dlg.close(); dlg.remove(); if (typeof then === "function") then(); },
      }));
    };
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    dlg.addEventListener("click", (e) => {
      if (e.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    });
    document.body.append(dlg);
    dlg.showModal();
    return close;
  }
  HN.sheet = (build) => {
    const sh = el("dialog", "sheet glass");
    let close = () => {};
    build(sh, (then) => close(then));
    const h = $("h3", sh);
    if (h) { h.id = "sheet-" + HN.randomCode(6); sh.setAttribute("aria-labelledby", h.id); }
    close = modal(sh, { y: 60 });
    gsap.fromTo(sh, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.5)" });
    return close;
  };

  /* ---------- love letter: white envelope + glass neon heart (home hero and N1) ---------- */
  const SVGNS = "http://www.w3.org/2000/svg";
  function sv(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  }
  function gradient(defs, tag, id, attrs, stops) {
    const g = sv(tag, Object.assign({ id }, attrs), defs);
    stops.forEach(([o, c, a]) => sv("stop", a == null ? { offset: o, "stop-color": c } : { offset: o, "stop-color": c, "stop-opacity": a }, g));
  }
  function neonHeart() {
    const svg = sv("svg", { viewBox: "0 0 64 60", "aria-hidden": "true" });
    const defs = sv("defs", {}, svg);
    gradient(defs, "linearGradient", "nhFill", { x1: 0, y1: 0, x2: 1, y2: 1 }, [[0, "#fff", 0.75], [0.45, "#ff7eb0", 0.55], [1, "#a855f7", 0.75]]);
    gradient(defs, "linearGradient", "nhLine", { x1: 0, y1: 0, x2: 1, y2: 1 }, [[0, "#ff4f8b"], [0.55, "#d946ef"], [1, "#22d3ee"]]);
    sv("path", { class: "nh-body", d: "M32 56C18 46 4 36 4 21 4 11 11 4 20 4c5 0 9.5 2.6 12 6.6C34.5 6.6 39 4 44 4c9 0 16 7 16 17 0 15-14 25-28 35z" }, svg);
    sv("path", { class: "nh-inner", d: "M32 49C21 41 11 33 11 22c0-6.5 4.5-11 10-11 4.2 0 7.6 2.6 9 6.4h4c1.4-3.8 4.8-6.4 9-6.4 5.5 0 10 4.5 10 11 0 11-10 19-21 27z" }, svg);
    sv("ellipse", { class: "nh-gloss", cx: 19, cy: 15, rx: 8, ry: 4.5, transform: "rotate(-32 19 15)" }, svg);
    return svg;
  }
  HN.loveEnvelope = ({ to, letter = "Hẹn nha?" }) => {
    const env = el("div", "wenv");
    const paper = el("div", "wenv-letter");
    paper.append(el("span", null, letter));
    const front = el("div", "wenv-front");
    front.append(el("span", "wenv-to", "Gửi " + to));
    const flap = el("div", "wenv-flap");
    flap.append(el("i"));
    const heart = el("button", "nheart beating");
    heart.type = "button";
    heart.setAttribute("aria-label", "Mở thư");
    heart.append(neonHeart());
    env.append(el("div", "wenv-back"), paper, front, flap, heart);
    return env;
  };
  HN.openLove = (env) => {
    const heart = $(".nheart", env), flap = $(".wenv-flap", env), paper = $(".wenv-letter", env);
    heart.classList.remove("beating");
    return gsap.timeline()
      .to(heart, { scale: 1.35, duration: 0.15 })
      .to(heart, { scale: 0, rotation: 25, opacity: 0, duration: 0.3, ease: "back.in(2)" })
      .to(flap, { rotationX: 180, transformPerspective: 800, duration: 0.6, ease: "power2.inOut" }, "<0.1")
      .set(flap, { zIndex: 1 }, "<0.3")
      .to(paper, { y: -env.offsetHeight * 0.62, duration: 0.6, ease: "back.out(1.4)" }, "-=0.1");
  };
  HN.closeLove = (env) => {
    const heart = $(".nheart", env), flap = $(".wenv-flap", env), paper = $(".wenv-letter", env);
    return gsap.timeline()
      .to(paper, { y: 0, duration: 0.4, ease: "power2.in" })
      .to(flap, { rotationX: 0, duration: 0.45, ease: "power2.inOut" })
      .set(flap, { zIndex: 5 }, "<0.2")
      .to(heart, { scale: 1, rotation: 0, opacity: 1, duration: 0.45, ease: "back.out(2.5)" })
      .add(() => heart.classList.add("beating"));
  };

  /* Botanicals behind the envelope. Coordinates live in the bloom viewBox, where the envelope covers
     x 70-330, y 140-312, so every stem starts hidden behind it and grows outwards. */
  const LEAF = "M0 0C6 -9 17 -11 26 -5C18 3 7 5 0 0Z";
  const BLOOM = {
    stems: [
      "M130 240C90 222 50 192 46 142C43 106 60 82 84 66",
      "M110 280C70 286 40 270 22 240",
      "M180 170C170 130 160 100 152 62C149 46 151 32 158 20",
      "M220 170C232 132 248 104 262 74",
      "M270 240C310 222 350 192 354 142C357 106 340 82 316 66",
      "M290 280C330 286 360 270 378 240",
    ],
    leaves: [
      [70, 206, 200, 1], [47, 150, 170, 0.9], [52, 104, 280, 0.85], [100, 228, 150, 0.7], [62, 282, 100, 0.8], [36, 262, 220, 0.75],
      [168, 122, 200, 0.8], [151, 80, 320, 0.75], [236, 124, 330, 0.8], [252, 96, 220, 0.7],
      [330, 206, -20, 1], [353, 150, 10, 0.9], [348, 104, 260, 0.85], [300, 228, 30, 0.7], [338, 282, 80, 0.8], [364, 262, 320, 0.75],
    ],
    flowers: [[84, 66, 1.15, 0], [22, 240, 0.75, 1], [158, 20, 1, 2], [262, 74, 0.9, 0], [316, 66, 1.15, 1], [378, 240, 0.75, 2]],
    buds: [[40, 196], [118, 44], [206, 6], [296, 36], [362, 192], [12, 286], [388, 286]],
  };
  HN.bloom = (svg) => {
    const defs = sv("defs", {}, svg);
    gradient(defs, "linearGradient", "bmStem", { x1: 0, y1: 1, x2: 0, y2: 0 }, [[0, "#5eead4"], [1, "#22d3ee"]]);
    gradient(defs, "linearGradient", "bmLeaf", { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, "#2dd4bf"], [1, "#a7f3d0"]]);
    gradient(defs, "radialGradient", "bmP0", { cy: 0.9, r: 1 }, [[0, "#fff"], [0.5, "#ff8fbf"], [1, "#ff4f8b"]]);
    gradient(defs, "radialGradient", "bmP1", { cy: 0.9, r: 1 }, [[0, "#fff"], [0.5, "#d8b4fe"], [1, "#a855f7"]]);
    gradient(defs, "radialGradient", "bmP2", { cy: 0.9, r: 1 }, [[0, "#fff"], [0.6, "#fce7f3"], [1, "#f9a8d4"]]);
    const stems = BLOOM.stems.map((d) => sv("path", { d, class: "stem" }, svg));
    const leaves = BLOOM.leaves.map(([x, y, r, s]) => sv("path", { d: LEAF, class: "leaf" }, sv("g", { transform: `translate(${x} ${y}) rotate(${r}) scale(${s})` }, svg)));
    const flowers = BLOOM.flowers.map(([x, y, s, c]) => {
      const g = sv("g", {}, sv("g", { transform: `translate(${x} ${y}) scale(${s})` }, svg));
      for (let k = 0; k < 6; k++) sv("ellipse", { cy: -9, rx: 5, ry: 9, class: "petal", fill: `url(#bmP${c})`, transform: `rotate(${k * 60})` }, g);
      sv("circle", { r: 3.6, class: "core" }, g);
      return g;
    });
    const buds = BLOOM.buds.map(([x, y]) => sv("circle", { cx: x, cy: y, r: 2.4, class: "bud" }, svg));
    return { stems, leaves, flowers, buds };
  };
  // stems draw out, then leaves, flowers and buds pop; the whole thing is squeezed into `seconds`
  HN.growBloom = (b, seconds) => {
    b.stems.forEach((s) => { const len = s.getTotalLength(); gsap.set(s, { strokeDasharray: len, strokeDashoffset: len }); });
    return gsap.timeline()
      .to(b.stems, { strokeDashoffset: 0, duration: 0.7, stagger: 0.05, ease: "power2.out" })
      .from(b.leaves, { scale: 0, transformOrigin: "0% 50%", duration: 0.35, stagger: 0.02, ease: "back.out(2.2)" }, "-=0.55")
      .from(b.flowers, { scale: 0, rotation: -120, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.04, ease: "back.out(1.7)" }, "-=0.4")
      .from(b.buds, { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.25, stagger: 0.03 }, "-=0.3")
      .duration(seconds);
  };
  HN.swayBloom = (b, delay) => HN.loop(gsap.to(b.flowers, { rotation: "+=14", transformOrigin: "50% 50%", duration: 2.6, ease: "sine.inOut", delay, stagger: { each: 0.3, repeat: -1, yoyo: true } }));

  /* ---------- ticket ---------- */
  function row(ico, label, value) {
    const r = el("div", "t-row");
    const b = el("span", "badge", ico);
    b.setAttribute("aria-hidden", "true");
    const t = el("div");
    t.append(el("small", null, label), el("strong", null, value));
    r.append(b, t);
    return r;
  }
  HN.dodgeText = (n) => (n >= HN.NO_LIMIT ? "Né " + n + " lần, YES tự bấm" : n ? "Né " + n + " lần rồi YES" : "YES ngay lần đầu");
  HN.ticket = (t) => {
    const tk = el("div", "ticket");
    tk.append(el("span", "holo"));
    const head = el("div", "t-head");
    head.append(el("span", null, "★ VÉ CHO HAI NGƯỜI"));
    const names = el("div", "t-names");
    names.append(document.createTextNode(t.from + " "), el("span", "amp", "&"), document.createTextNode(" " + t.to));
    tk.append(head, names, row("📅", "Khi nào", t.when || "Người ấy sẽ chọn"));
    const plans = (t.plans || []).map(HN.planById).filter(Boolean);
    if (!plans.length) tk.append(row("🍿", "Kèo", "Chưa chọn"));
    plans.forEach((p, i) => tk.append(row(p.ico, plans.length > 1 ? "Kèo " + (i + 1) : "Kèo", p.name)));
    tk.append(row("🙈", "Nút Không", HN.dodgeText(t.dodges)));
    tk.append(el("div", "t-perf"));
    const foot = el("div", "t-foot");
    foot.append(el("span", "t-bar"), el("span", "t-code", "#" + String(t.code || "").toUpperCase().slice(0, 8)));
    tk.append(foot);
    return tk;
  };

  /* ---------- ticket as a 9:16 image (in-app browsers block downloads; long-press works) ---------- */
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) { g.roundRect(x, y, w, h, r); return; }
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function fitText(g, text, maxW) {
    if (g.measureText(text).width <= maxW) return text;
    const chars = graphemes(text);
    while (chars.length && g.measureText(chars.join("") + "…").width > maxW) chars.pop();
    return chars.join("") + "…";
  }
  HN.ticketImage = async (t) => {
    const W = 1080, H = 1920;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    try { await Promise.all([document.fonts.load('800 80px "Baloo 2"'), document.fonts.load('700 30px "Nunito"')]); } catch (_) { /* system font fallback */ }
    const DISPLAY = '"Baloo 2", system-ui, sans-serif', BODY = '"Nunito", system-ui, sans-serif';

    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#07060f"); bg.addColorStop(0.45, "#1e1145"); bg.addColorStop(0.8, "#5b1d5e"); bg.addColorStop(1, "#ff4f8b");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const glow = (x, y, r, col) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); };
    glow(160, 340, 540, "rgba(168,85,247,.45)"); glow(940, 920, 560, "rgba(34,211,238,.22)"); glow(540, 1760, 680, "rgba(255,79,139,.45)");
    g.fillStyle = "#fff";
    for (let i = 0; i < 90; i++) { g.globalAlpha = Math.random() * 0.7 + 0.2; g.beginPath(); g.arc(Math.random() * W, Math.random() * H * 0.7, Math.random() * 2.4 + 0.6, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;

    g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillStyle = "#ffd166"; g.font = "800 44px " + DISPLAY;
    g.fillText("✦  CHỐT KÈO RỒI  ✦", W / 2, 300);

    const x = 90, y = 380, w = W - 180, h = 1200;
    rr(g, x, y, w, h, 56); g.fillStyle = "rgba(255,255,255,.09)"; g.fill();
    const st = g.createLinearGradient(x, y, x + w, y + h);
    st.addColorStop(0, "#ff4f8b"); st.addColorStop(0.5, "#a855f7"); st.addColorStop(1, "#22d3ee");
    g.lineWidth = 4; g.strokeStyle = st; g.stroke();

    g.font = "800 34px " + DISPLAY; g.fillStyle = "#22d3ee";
    g.textAlign = "left"; g.fillText("VÉ CHO HAI NGƯỜI", x + 64, y + 96);
    g.textAlign = "right"; g.fillText("★ ADMIT 2", x + w - 64, y + 96);
    const dash = (yy) => { g.save(); g.setLineDash([16, 14]); g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 50, yy); g.lineTo(x + w - 50, yy); g.stroke(); g.restore(); };
    dash(y + 140);

    let size = 104;
    const amp = " & ";
    do { g.font = "800 " + size + "px " + DISPLAY; size -= 4; } while (size > 48 && g.measureText(t.from + amp + t.to).width > w - 120);
    const wf = g.measureText(t.from).width, wa = g.measureText(amp).width, wt = g.measureText(t.to).width;
    let nx = W / 2 - (wf + wa + wt) / 2;
    g.textAlign = "left";
    g.fillStyle = "#fff"; g.fillText(t.from, nx, y + 290); nx += wf;
    g.fillStyle = "#ffd166"; g.fillText(amp, nx, y + 290); nx += wa;
    g.fillStyle = "#fff"; g.fillText(t.to, nx, y + 290);

    const plans = (t.plans || []).map(HN.planById).filter(Boolean);
    const rows = [["📅", "KHI NÀO", t.when || "Chưa chọn"]];
    const shown = plans.length > 3 ? plans.slice(0, 2) : plans;
    shown.forEach((p, i) => rows.push([p.ico, plans.length > 1 ? "KÈO " + (i + 1) : "KÈO", p.name]));
    if (plans.length > 3) rows.push(["✨", "VÀ THÊM", (plans.length - 2) + " kèo nữa"]);
    rows.push(["🙈", "NÚT KHÔNG", HN.dodgeText(t.dodges)]);
    let ry = y + 420;
    rows.forEach(([ico, label, value], i) => {
      if (i) dash(ry - 68);
      g.fillStyle = "rgba(255,255,255,.92)"; g.beginPath(); g.arc(x + 112, ry, 46, 0, Math.PI * 2); g.fill();
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = "50px system-ui, sans-serif"; g.fillText(ico, x + 112, ry + 3);
      g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.fillStyle = "#b9b0d6"; g.font = "700 28px " + BODY; g.fillText(label, x + 186, ry - 16);
      g.fillStyle = "#fff"; g.font = "800 46px " + DISPLAY; g.fillText(fitText(g, value, w - 250), x + 186, ry + 36);
      ry += 136;
    });

    dash(y + h - 150);
    g.fillStyle = "rgba(255,255,255,.75)";
    let bx = x + 64;
    for (let i = 0; i < 34; i++) { const bw = (i * 7) % 3 + 2; g.fillRect(bx, y + h - 110, bw, 60); bx += bw + 4 + ((i * 5) % 3); }
    g.textAlign = "right"; g.fillStyle = "#d9d2f0"; g.font = "700 30px " + BODY;
    g.fillText("#" + String(t.code || "").toUpperCase().slice(0, 8), x + w - 64, y + h - 66);

    g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,.9)"; g.font = "800 40px " + DISPLAY;
    g.fillText("Tạo thiệp tại " + HN.DOMAIN, W / 2, H - 150);
    return c.toDataURL("image/png");
  };
  HN.shot = (url) => {
    const dlg = el("dialog", "shot");
    const img = el("img", "shot-img");
    img.src = url;
    img.alt = "Ảnh thẻ kèo";
    const hint = el("p", "shot-hint", "Nhấn giữ ảnh để lưu về máy");
    hint.id = "shot-" + HN.randomCode(6);
    dlg.setAttribute("aria-labelledby", hint.id);
    const row = el("div", "shot-actions");
    const dl = el("a", "btn btn-ghost btn-sm", "Tải ảnh");
    dl.href = url;
    dl.download = "hen-nha.png";
    const closeBtn = el("button", "btn btn-sm", "Đóng");
    closeBtn.type = "button";
    closeBtn.autofocus = true;
    row.append(dl, closeBtn);
    dlg.append(img, hint, row);
    const close = modal(dlg, {});
    closeBtn.onclick = () => close();
    gsap.fromTo(dlg, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(img, { y: 60, scale: 0.85, rotation: -4 }, { y: 0, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(1.6)" });
  };

  /* ---------- background: stars, drift, shooting stars ---------- */
  function initSky() {
    const sky = $("#sky");
    if (!sky) return;
    const rand = (a, b) => a + Math.random() * (b - a);
    // each twinkling star is its own compositor layer, so keep the count modest
    for (let i = 0; i < 70; i++) {
      const s = el("span", "star");
      const size = rand(1, 2.6);
      s.style.width = s.style.height = size + "px";
      s.style.left = rand(0, 100) + "vw";
      s.style.top = Math.pow(Math.random(), 1.5) * 90 + "vh";
      s.style.animationDuration = rand(2, 6) + "s";
      s.style.animationDelay = -rand(0, 6) + "s";
      if (size > 2.1) s.classList.add("big");
      sky.append(s);
    }
    if (reduce) return;
    const COLORS = ["#ffffff", "#ffd6e7", "#ffd166", "#c4b5fd", "#a5f3fc"];
    const drift = () => {
      if (document.hidden) return;
      const s = el("span", "drift", Math.random() < 0.3 ? "✦" : Math.random() < 0.2 ? "♥" : "•");
      s.style.left = rand(0, 100) + "vw";
      s.style.fontSize = rand(6, 14) + "px";
      s.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      s.style.setProperty("--dx", rand(-60, 60) + "px");
      s.style.animationDuration = rand(10, 18) + "s";
      s.addEventListener("animationend", () => s.remove());
      sky.append(s);
    };
    for (let i = 0; i < 14; i++) setTimeout(drift, i * 150);
    setInterval(drift, 420);
    (function shoot() {
      if (!document.hidden) {
        const s = el("span", "shooting");
        s.style.left = rand(40, 100) + "vw";
        s.style.top = rand(0, 40) + "vh";
        s.addEventListener("animationend", () => s.remove());
        sky.append(s);
      }
      setTimeout(shoot, rand(2500, 6500));
    })();
  }
  function initCursor() {
    const g = $("#cursorGlow");
    if (!g) return;
    if (!fine || reduce) { g.remove(); return; }
    const x = gsap.quickTo(g, "x", { duration: 0.7, ease: "power3.out" });
    const y = gsap.quickTo(g, "y", { duration: 0.7, ease: "power3.out" });
    addEventListener("pointermove", (e) => { x(e.clientX); y(e.clientY); g.classList.add("on"); }, { passive: true });
    document.addEventListener("pointerleave", () => g.classList.remove("on"));
  }
  initSky();
  initCursor();
})();
