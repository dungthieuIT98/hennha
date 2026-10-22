"use strict";
/* Artwork: love envelope with neon heart, botanical bloom, ticket card and its 9:16 image. */
(() => {
  const HN = window.HN;
  const { $, el } = HN;

  /* ---------- svg helpers ---------- */
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

  /* ---------- love letter: white envelope + glass neon heart (home hero and N1) ---------- */
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
  HN.loveEnvelope = ({ to, letter = HN.t("env.letter") }) => {
    const env = el("div", "wenv");
    const paper = el("div", "wenv-letter");
    paper.append(el("span", null, letter));
    const front = el("div", "wenv-front");
    front.append(el("span", "wenv-to", HN.t("env.to", { name: to })));
    const flap = el("div", "wenv-flap");
    flap.append(el("i"));
    const heart = el("button", "nheart beating");
    heart.type = "button";
    heart.setAttribute("aria-label", HN.t("env.open"));
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

  /* ---------- thiệp hẹn (16/10: là thiệp mời, không còn là vé: bỏ dòng nút Không, đường xé, mã vạch, mã thiệp) ---------- */
  function row(ico, label, value, tag) {
    const r = el("div", "t-row");
    const b = el("span", "badge", ico);
    b.setAttribute("aria-hidden", "true");
    const t = el("div");
    t.append(el("small", null, label), el("strong", null, value));
    if (tag) t.append(el("span", "t-tag", tag));
    r.append(b, t);
    return r;
  }
  HN.dodgeText = (n) => HN.t(n >= HN.NO_LIMIT ? "dodge.auto" : n ? "dodge.then" : "dodge.none", { n });
  // t: { from, to, when, plans, timeProposed?, plansProposed? }; mục người nhận đề xuất có nhãn, kèm dòng chờ người gửi chốt
  HN.ticket = (t) => {
    const tk = el("div", "ticket invite-card");
    tk.append(el("span", "holo"));
    const head = el("div", "t-head");
    head.append(el("span", null, HN.t("tk.head")));
    const names = el("div", "t-names");
    names.append(document.createTextNode(t.from + " "), el("span", "amp", "&"), document.createTextNode(" " + t.to));
    const by = HN.t("tk.by", { name: t.to });
    tk.append(head, names, row("📅", HN.t("tk.when"), t.when || HN.t("tk.theyPick"), t.timeProposed && by));
    const plans = HN.planList(t.plans);
    if (!plans.length) tk.append(row("🍿", HN.t("tk.plan"), HN.t("tk.notPicked")));
    plans.forEach((p, i) => tk.append(row(p.ico, plans.length > 1 ? HN.t("tk.planN", { n: i + 1 }) : HN.t("tk.plan"), HN.planName(p), t.plansProposed && by)));
    if (t.timeProposed || t.plansProposed) tk.append(el("p", "t-wait", HN.t("tk.wait", { name: t.from })));
    return tk;
  };

  /* ---------- ticket as a 9:16 image ---------- */
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) { g.roundRect(x, y, w, h, r); return; }
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function fitText(g, text, maxW) {
    if (g.measureText(text).width <= maxW) return text;
    const chars = HN.graphemes(text);
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
    const proposal = !!(t.timeProposed || t.plansProposed);

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
    g.fillText(HN.t(proposal ? "tk.doneProposed" : "tk.done"), W / 2, 300);

    const x = 90, y = 380, w = W - 180, h = 1200;
    rr(g, x, y, w, h, 56); g.fillStyle = "rgba(255,255,255,.09)"; g.fill();
    const st = g.createLinearGradient(x, y, x + w, y + h);
    st.addColorStop(0, "#ff4f8b"); st.addColorStop(0.5, "#a855f7"); st.addColorStop(1, "#22d3ee");
    g.lineWidth = 4; g.strokeStyle = st; g.stroke();

    g.font = "800 34px " + DISPLAY; g.fillStyle = "#22d3ee";
    g.textAlign = "left"; g.fillText(HN.t("tk.forTwo"), x + 64, y + 96);
    g.textAlign = "right"; g.font = "56px system-ui, sans-serif"; g.fillText("💌", x + w - 64, y + 104);
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

    const plans = HN.planList(t.plans);
    const up = (s) => s.toLocaleUpperCase(HN.t("locale"));
    const by = HN.t("tk.by", { name: t.to });
    const rows = [["📅", up(HN.t("tk.when")), t.when || HN.t("tk.notPicked"), t.timeProposed ? by : ""]];
    const shown = plans.length > 3 ? plans.slice(0, 2) : plans;
    shown.forEach((p, i) => rows.push([p.ico, up(plans.length > 1 ? HN.t("tk.planN", { n: i + 1 }) : HN.t("tk.plan")), HN.planName(p), t.plansProposed ? by : ""]));
    if (plans.length > 3) rows.push(["✨", up(HN.t("tk.more")), HN.t("tk.moreN", { n: plans.length - 2 }), ""]);
    let ry = y + 420;
    rows.forEach(([ico, label, value, tag], i) => {
      if (i) dash(ry - 68);
      g.fillStyle = "rgba(255,255,255,.92)"; g.beginPath(); g.arc(x + 112, ry, 46, 0, Math.PI * 2); g.fill();
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = "50px system-ui, sans-serif"; g.fillText(ico, x + 112, ry + 3);
      g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.fillStyle = "#b9b0d6"; g.font = "700 28px " + BODY; g.fillText(label, x + 186, ry - 16);
      if (tag) { g.textAlign = "right"; g.fillStyle = "#ff9cc2"; g.font = "800 28px " + BODY; g.fillText(tag, x + w - 64, ry - 16); g.textAlign = "left"; }
      g.fillStyle = "#fff"; g.font = "800 46px " + DISPLAY; g.fillText(fitText(g, value, w - 250), x + 186, ry + 36);
      ry += 136;
    });

    if (proposal) {
      dash(y + h - 170);
      g.textAlign = "center"; g.fillStyle = "#ffd166"; g.font = "800 42px " + DISPLAY;
      g.fillText(fitText(g, HN.t("tk.wait", { name: t.from }), w - 120), W / 2, y + h - 90);
    }

    g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,.9)"; g.font = "800 40px " + DISPLAY;
    // đặt cao hơn đáy ảnh: khi đăng story, thanh trả lời của Instagram/Facebook che khoảng 10% phía dưới
    g.fillText(HN.t("tk.madeAt", { domain: HN.DOMAIN }), W / 2, H - 250);
    return c.toDataURL("image/png");
  };
})();
