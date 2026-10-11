"use strict";
/* Motion: Lottie, off-screen pausing, text effects, scroll reveal, pointer effects, bursts, background sky. */
(() => {
  const HN = window.HN;
  const { $, $$, el, reduce, fine } = HN;

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

  /* ---------- text effects ---------- */
  HN.split = (node) => {
    const text = node.textContent.trim();
    node.textContent = "";
    node.append(el("span", "sr-only", text));
    const words = text.split(/\s+/);
    words.forEach((w, i) => {
      const ws = el("span", "w");
      ws.setAttribute("aria-hidden", "true");
      HN.graphemes(w).forEach((ch) => ws.append(el("span", "ch", ch)));
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
  HN.burstAt = (node, n) => {
    const r = node.getBoundingClientRect();
    HN.burst(r.left + r.width / 2, r.top + r.height / 2, n);
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
