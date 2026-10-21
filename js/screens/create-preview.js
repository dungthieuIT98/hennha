"use strict";
/* Khung "Người ấy sẽ thấy" cạnh form tạo thiệp, cập nhật theo HN.draft khi đang nhập:
   bước 1 phong bì có tên, bước 2 câu rủ với nút YES/Không, bước 3-4 vé hai người. Từ bước 5 thì ẩn (bước 5 đã có xem trước đầy đủ). */
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;
  const base = HN.SCREENS.create;
  HN.SCREENS.create = (...args) => {
    const r = base(...args);
    livePreview();
    return r;
  };

  function livePreview() {
    const app = $("#app"), aside = $("#livePrev", app), stage = $("#lpStage", app);
    const grid = $(".create-grid", app), panel = $(".panel", app);
    if (!aside || !stage) return;
    let kind = "", envTw = null, timer = 0, pickTl = null;
    const nameOr = (v, fallbackKey) => v || HN.t(fallbackKey);
    const bump = (node, text) => {
      if (node.textContent === text) return;
      node.textContent = text;
      gsap.fromTo(node, { scale: 1.12 }, { scale: 1, duration: 0.3, ease: "back.out(3)" });
    };

    function build(k) {
      if (envTw) { envTw.kill(); envTw = null; }
      if (pickTl) { pickTl.kill(); pickTl = null; }
      stage.replaceChildren();
      if (k === "env") {
        const wrap = el("div", "lp-env");
        const env = HN.loveEnvelope({ to: HN.t("lp.toFallback"), letter: HN.t("home.envLetter") });
        $(".nheart", env).tabIndex = -1;
        wrap.append(env, el("p", "lp-from"));
        stage.append(wrap);
        envTw = HN.loop(gsap.to(env, { y: -6, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut" }));
      } else if (k === "msg") {
        const card = el("div", "lp-card"), btns = el("div", "lp-btns");
        const yes = el("span", "lp-yes", "YES"), no = el("button", "lp-no", HN.t("ask.no"));
        no.type = "button";
        no.tabIndex = -1;
        btns.append(yes, no);
        card.append(el("span", "lp-chip"), el("p", "lp-msg"), btns);
        stage.append(card);
        dodgeInCard(card, yes, no);
      } else if (k === "plans") {
        const card = el("div", "lp-card lp-plans");
        card.append(el("p", "lp-q", HN.t("lp.plansQ")), el("p", "lp-phint", HN.t("lp.plansHint")), el("div", "lp-opts"));
        stage.append(card);
      } else stage.append(el("div", "lp-ticket"));
    }
    // nút Không né giống thiệp mẫu ở trang chủ nhưng chỉ chạy trong khung thiệp nhỏ: đổi chữ, YES to dần (tối đa 1.4 lần)
    function dodgeInCard(card, yes, no) {
      let n = 0, last = 0, floating = false;
      const hit = (a, b, g) => !(a.x + a.w + g < b.x || b.x + b.w + g < a.x || a.y + a.h + g < b.y || b.y + b.h + g < a.y);
      HN.dodgeable(no, (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const now = Date.now();
        if (now - last < 150) return;
        last = now;
        const c = card.getBoundingClientRect();
        if (!floating) {
          const r = no.getBoundingClientRect();
          card.append(no);
          no.classList.add("floating");
          gsap.set(no, { x: r.left - c.left, y: r.top - c.top });
          floating = true;
        }
        n++;
        const texts = HN.t("no.texts");
        no.textContent = texts[n % texts.length];
        gsap.to(yes, { scale: Math.min(1 + 0.08 * n, 1.4), duration: 0.35, ease: "back.out(2.5)" });
        const rel = (node) => { const r = node.getBoundingClientRect(); return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }; };
        const yb = rel(yes), mb = rel($(".lp-msg", card));
        const nw = no.offsetWidth, nh = no.offsetHeight, pad = 10;
        const cx = gsap.getProperty(no, "x"), cy = gsap.getProperty(no, "y");
        for (const strict of [true, false]) {
          for (let i = 0; i < 60; i++) {
            const b = { x: pad + Math.random() * Math.max(0, c.width - nw - 2 * pad), y: pad + Math.random() * Math.max(0, c.height - nh - 2 * pad), w: nw, h: nh };
            if (hit(b, yb, 12) || (strict && hit(b, mb, 4)) || Math.hypot(b.x - cx, b.y - cy) < 40) continue;
            gsap.to(no, { x: b.x, y: b.y, rotation: gsap.utils.random(-12, 12), duration: 0.32, ease: "back.out(2)" });
            return;
          }
        }
      });
    }
    function fill(k, d) {
      const to = nameOr(d.to, "lp.toFallback"), from = nameOr(d.from, "lp.fromFallback");
      if (k === "env") {
        bump($(".wenv-to", stage), HN.t("env.to", { name: to }));
        bump($(".lp-from", stage), HN.t("lp.from", { name: from }));
      } else if (k === "msg") {
        bump($(".lp-chip", stage), HN.t("lp.from", { name: from }));
        bump($(".lp-msg", stage), d.message || HN.t("lp.msgFallback"));
      } else if (k === "plans") {
        // danh sách người ấy sẽ chọn lại; vài kèo được "bấm thử" lần lượt để thấy là chọn một hoặc vài kèo
        if (pickTl) { pickTl.kill(); pickTl = null; }
        const host = $(".lp-opts", stage), list = HN.planList(d.plans || []), MAX = 8;
        host.replaceChildren();
        if (!list.length) { host.append(el("p", "lp-empty", HN.t("lp.plansEmpty"))); return; }
        list.slice(0, MAX).forEach((p) => {
          const o = el("span", "lp-opt");
          o.append(el("span", null, p.ico), document.createTextNode(HN.planName(p)), el("i", null, "✓"));
          host.append(o);
        });
        if (list.length > MAX) host.append(el("span", "lp-more", HN.t("lp.more", { n: list.length - MAX })));
        const opts = $$(".lp-opt", host), order = opts.length > 2 ? [0, 2] : [0];
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
        order.forEach((i) => {
          tl.add(() => opts[i].classList.add("picked"), "+=0.9")
            .fromTo(opts[i], { scale: 1 }, { scale: 1.12, duration: 0.15, yoyo: true, repeat: 1 }, "<");
        });
        tl.add(() => opts.forEach((o) => o.classList.remove("picked")), "+=1.6");
        pickTl = HN.loop(tl);
      } else {
        const when = d.timeMode === "pick" ? HN.t("tk.theyPick") : d.date && d.hour != null && d.minute != null ? HN.fmtWhen(d.date, d.hour, d.minute) : HN.t("tk.notPicked");
        const tk = HN.ticket({ from, to, when, plans: d.plans || [], dodges: 0, code: "didate00" });
        // thiệp mời chứ không phải vé: bỏ đường xé, mã vạch và mã thiệp
        $$(".t-perf, .t-foot", tk).forEach((n) => n.remove());
        $(".lp-ticket", stage).replaceChildren(tk);
      }
    }
    function render() {
      const active = $(".cstep.active", app);
      const step = active ? Number(active.dataset.step) : 1;
      const k = step === 1 ? "env" : step === 2 ? "msg" : step === 3 ? "ticket" : step === 4 ? "plans" : "";
      grid.classList.toggle("has-prev", !!k);
      aside.hidden = !k;
      aside.dataset.kind = k;
      if (!k) { kind = ""; return; }
      const d = HN.draft.get();
      if (k !== kind) {
        kind = k;
        build(k);
        fill(k, d);
        gsap.fromTo(stage, { autoAlpha: 0, y: 16, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.8)" });
      } else fill(k, d);
    }
    const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 30); };
    ["input", "change", "click"].forEach((t) => panel.addEventListener(t, schedule));
    // goStep đổi bước bằng class .active (kể cả khi bấm thanh bước ở trên) nên theo dõi class của các bước
    const mo = new MutationObserver(schedule);
    $$(".cstep", app).forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ["class"] }));
    HN.onLeave(() => { mo.disconnect(); clearTimeout(timer); if (envTw) envTw.kill(); if (pickTl) pickTl.kill(); });
    render();
  }
})();
