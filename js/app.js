"use strict";
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;
  const IN_FRAME = window.self !== window.top;
  if (IN_FRAME) document.body.classList.add("in-frame");

  const SCREENS = {};
  let navToken = 0, first = true, pendingScroll = null;

  /* ---------- router ---------- */
  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    return { name: ({ create: "create", n: "n", q: "q" })[parts[0]] || "home", parts };
  }
  function mount(r) {
    document.body.dataset.route = r.name;
    $("#app").replaceChildren($("#tpl-" + r.name).content.cloneNode(true));
    window.scrollTo(0, 0);
    try { SCREENS[r.name](r); } catch (e) { console.error(e); }
    updateCount();
  }
  function render() {
    const r = route();
    const token = ++navToken;
    HN.leave();
    $$("body > .runaway-no, body > .sheet-backdrop, body > .shot-backdrop").forEach((n) => n.remove());
    const app = $("#app");
    gsap.killTweensOf(app);
    if (first) { first = false; mount(r); return; }
    gsap.to(app, {
      opacity: 0, y: -12, duration: 0.18, ease: "power2.in",
      onComplete: () => {
        if (token !== navToken) return;
        mount(r);
        gsap.fromTo(app, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity" });
      },
    });
  }
  function updateCount() { const c = $("#myCount"); if (c) c.textContent = String(HN.invites.list().length); }
  function scrollToId(id) { const t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: HN.reduce ? "auto" : "smooth", block: "start" }); }

  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-scroll]");
    if (s) {
      e.preventDefault();
      if (route().name === "home") scrollToId(s.dataset.scroll);
      else { pendingScroll = s.dataset.scroll; location.hash = "#/"; }
      return;
    }
    if (e.target.closest("[data-new]") && HN.draft.get().published) HN.draft.clear();
    const soon = e.target.closest("[data-soon]");
    if (soon) { e.preventDefault(); HN.toast(soon.dataset.soon + " sẽ có sớm"); }
  });
  const topbar = $("#topbar");
  addEventListener("scroll", () => topbar.classList.toggle("scrolled", scrollY > 10), { passive: true });

  /* =====================================================================
     HOME (G0)
     ===================================================================== */
  SCREENS.home = () => {
    const app = $("#app");
    const chars = HN.split($(".hero-title .split", app));
    const env = HN.envelope({ to: "Lan", from: "Minh" });
    $("#heroEnv").append(env);
    HN.mountLotties(app);

    const intro = gsap.timeline({ delay: 0.05 })
      .from(".chip-live", { y: -16, autoAlpha: 0, duration: 0.5, ease: "back.out(2)" })
      .from(chars, { y: 60, scale: 0.4, rotation: () => gsap.utils.random(-30, 30), autoAlpha: 0, duration: 0.6, stagger: 0.02, ease: "back.out(2.2)" }, "-=0.2")
      .fromTo(".grad-line", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power3.inOut" }, "-=0.4")
      .from(".stage-card", { scale: 0.6, rotation: -10, autoAlpha: 0, duration: 1.1, ease: "elastic.out(1, 0.6)" }, 0.25)
      .from(".orbit", { scale: 0.4, autoAlpha: 0, stagger: 0.12, duration: 0.8, ease: "back.out(1.6)" }, 0.5)
      .from(".float-badge", { scale: 0, autoAlpha: 0, stagger: 0.15, duration: 0.5, ease: "back.out(3)" }, 0.9);
    HN.onLeave(() => intro.kill());

    $$("[data-scramble]", app).forEach(HN.scramble);
    $$(".tilt", app).forEach((n) => HN.tilt(n, 9));
    $$(".magnetic", app).forEach((n) => HN.magnetic(n));

    // hero envelope: floats, opens on tap, closes again
    HN.loop(gsap.to(env, { y: -10, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    const seal = $(".env-seal", env);
    const pulse = () => HN.loop(gsap.to(seal, { scale: 1.12, duration: 0.7, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    let sealPulse = pulse(), envBusy = false;
    seal.addEventListener("click", () => {
      if (envBusy) return;
      envBusy = true;
      if (sealPulse) sealPulse.kill();
      const r = seal.getBoundingClientRect();
      HN.burst(r.left + r.width / 2, r.top + r.height / 2, 24);
      const t = HN.openEnvelope(env).to({}, { duration: 1.6 }).add(() => {
        HN.closeEnvelope(env).add(() => { envBusy = false; sealPulse = pulse(); });
      });
      HN.onLeave(() => t.kill());
    });

    // marquee of plans
    const fill = (host, list) => {
      const track = el("div", "mq-track");
      for (let k = 0; k < 2; k++) list.forEach((p) => { const c = el("span", "mq-chip"); c.append(el("i", null, p.ico), document.createTextNode(p.name)); track.append(c); });
      host.append(track);
    };
    const half = Math.ceil(HN.PLANS.length / 2);
    fill($("#mq1"), HN.PLANS.slice(0, half));
    fill($("#mq2"), HN.PLANS.slice(half));

    initDemo();

    // how it works: sender vs receiver tabs
    const renderSteps = (host, list) => list.forEach((s) => {
      const c = el("article", "step-card glass");
      const top = el("div", "step-top");
      top.append(el("span", "step-n", s.n), el("span", "badge", s.ico));
      c.append(top, el("h3", null, s.title), el("p", null, s.text));
      host.append(c);
      HN.tilt(c, 6);
    });
    renderSteps($("#stepsSender"), HN.SENDER_STEPS);
    renderSteps($("#stepsReceiver"), HN.RECEIVER_STEPS);
    const ind = $(".seg-ind", app);
    const moveInd = (b, instant) => gsap.to(ind, { x: b.offsetLeft, width: b.offsetWidth, duration: instant ? 0 : 0.45, ease: "back.out(1.4)" });
    const tabs = $$(".seg-tab", app);
    requestAnimationFrame(() => moveInd(tabs[0], true));
    tabs.forEach((b) => b.addEventListener("click", () => {
      const show = b.dataset.tab === "sender" ? $("#stepsSender") : $("#stepsReceiver");
      const hide = show.id === "stepsSender" ? $("#stepsReceiver") : $("#stepsSender");
      tabs.forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      moveInd(b);
      if (!show.hidden) return;
      hide.hidden = true;
      show.hidden = false;
      gsap.fromTo(show.children, { y: 30, autoAlpha: 0, rotationX: -25 }, { y: 0, autoAlpha: 1, rotationX: 0, stagger: 0.07, duration: 0.55, ease: "back.out(1.6)" });
    }));

    // ticket showcase
    const tk = HN.ticket({ from: "Minh", to: "Lan", when: HN.fmtWhen(HN.iso(HN.nextSaturday()), 19, 30), plans: ["trasua", "xemphim"], dodges: HN.NO_LIMIT, code: "k3x9m2pq" });
    $("#homeTicket").append(tk);
    HN.tilt(tk, 12);
    HN.loop(gsap.to("#homeTicket", { y: -12, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" }));

    HN.reveal(app);
    if (pendingScroll) { const id = pendingScroll; pendingScroll = null; setTimeout(() => scrollToId(id), 120); }
  };

  function initDemo() {
    const stage = $("#dQ"), done = $("#dDone"), yes = $("#dYes"), no = $("#dNo"), run = $("#dRun");
    let dodges = 0, gone = false, floating = false, last = 0, autoYes = null;
    HN.onLeave(() => autoYes && autoYes.kill());
    const overlaps = (a, b, g) => !(a.x + a.w + g < b.x || b.x + b.w + g < a.x || a.y + a.h + g < b.y || b.y + b.h + g < a.y);

    function place(ys) {
      const c = stage.getBoundingClientRect(), yr = yes.getBoundingClientRect(), qr = $(".q", stage).getBoundingClientRect();
      const k = ys / (gsap.getProperty(yes, "scale") || 1);
      const yw = yr.width * k, yh = yr.height * k;
      const yesBox = { x: yr.left + yr.width / 2 - c.left - yw / 2, y: yr.top + yr.height / 2 - c.top - yh / 2, w: yw, h: yh };
      const textBox = { x: qr.left - c.left, y: qr.top - c.top, w: qr.width, h: qr.height };
      const nw = no.offsetWidth, nh = no.offsetHeight, pad = 14;
      const cx = parseFloat(no.style.left) || 0, cy = parseFloat(no.style.top) || 0;
      for (const t of [{ text: true, dist: 80 }, { text: false, dist: 50 }, { text: false, dist: 0 }]) {
        for (let i = 0; i < 80; i++) {
          const box = { x: pad + Math.random() * Math.max(0, c.width - nw - 2 * pad), y: pad + Math.random() * Math.max(0, c.height - nh - 2 * pad), w: nw, h: nh };
          if (overlaps(box, yesBox, 16) || (t.text && overlaps(box, textBox, 6)) || Math.hypot(box.x - cx, box.y - cy) < t.dist) continue;
          gsap.to(no, { left: box.x, top: box.y, rotation: gsap.utils.random(-14, 14), duration: 0.35, ease: "back.out(2)" });
          return;
        }
      }
    }
    function dodge(e) {
      if (gone) return;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const now = Date.now();
      if (now - last < 150) return;
      last = now;
      if (!floating) {
        const c = stage.getBoundingClientRect(), r = no.getBoundingClientRect();
        stage.append(no);
        no.classList.add("floating");
        gsap.set(no, { left: r.left - c.left, top: r.top - c.top });
        floating = true;
      }
      dodges++;
      const ys = Math.min(1 + 0.14 * dodges, 2);
      if (dodges >= HN.NO_LIMIT) {
        gone = true;
        gsap.to(yes, { scale: ys, duration: 0.4, ease: "back.out(2.5)" });
        gsap.to(no, { x: 260, y: -320, rotation: 60, scale: 0.3, autoAlpha: 0, duration: 0.7, ease: "power2.in" });
        run.hidden = false;
        gsap.from(run, { y: -10, autoAlpha: 0, duration: 0.3 });
        autoYes = gsap.delayedCall(1.3, () => yes.click());
        return;
      }
      no.textContent = HN.NO_TEXTS[dodges % HN.NO_TEXTS.length];
      place(ys);
      gsap.to(yes, { scale: ys, duration: 0.4, ease: "back.out(2.5)" });
    }
    no.addEventListener("pointerdown", dodge);
    no.addEventListener("touchstart", dodge, { passive: false });
    no.addEventListener("mouseenter", dodge);
    no.addEventListener("click", (e) => e.preventDefault());
    yes.addEventListener("click", () => {
      if (autoYes) autoYes.kill();
      const r = yes.getBoundingClientRect();
      HN.burst(r.left + r.width / 2, r.top + r.height / 2);
      gsap.to(stage, {
        autoAlpha: 0, scale: 0.9, duration: 0.3,
        onComplete: () => {
          stage.hidden = true;
          done.hidden = false;
          gsap.fromTo(done, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" });
          gsap.fromTo(".stamp", { scale: 2.4, rotation: -30, autoAlpha: 0 }, { scale: 1, rotation: -8, autoAlpha: 1, duration: 0.5, ease: "back.out(3)", delay: 0.15 });
        },
      });
    });
    $("#dReplay").addEventListener("click", () => {
      dodges = 0; gone = false; floating = false;
      run.hidden = true;
      gsap.set([yes, no, stage, done], { clearProps: "all" });
      no.classList.remove("floating");
      no.textContent = HN.NO_TEXTS[0];
      $(".btns", stage).append(no);
      done.hidden = true;
      stage.hidden = false;
    });
  }

  /* =====================================================================
     CREATE (G1 to G7)
     ===================================================================== */
  SCREENS.create = () => {
    const app = $("#app");
    const steps = $$(".cstep", app);
        const LABELS = ["Nhân vật", "Lời thoại", "Thời gian", "Kịch bản", "Chiếu thử", "Phát hành"];
    const ENTER = {};
    let d = HN.draft.get();
    let step = Math.min(Math.max(1, Number(d.step) || 1), 7);
    if (step === 7 && !d.published) step = 6;
    let busy = false;

    const stepperHost = $("#stepper");
    const bar = el("div", "st-bar");
    bar.append(el("i", "st-fill"));
    stepperHost.append(bar);
    LABELS.forEach((l, i) => {
      const b = el("button", "st-node");
      b.type = "button";
      b.append(el("span", "st-dot", String(i + 1)), el("span", "st-label", l));
      b.addEventListener("click", () => { if (i + 1 < step && step < 7) goStep(i + 1); });
      stepperHost.append(b);
    });
    function updateStepper() {
      $$(".st-node", app).forEach((n, i) => {
        n.classList.toggle("done", i + 1 < step);
        n.classList.toggle("current", i + 1 === step);
        n.disabled = !(i + 1 < step && step < 7);
      });
      gsap.to(".st-fill", { scaleX: Math.min(step - 1, 5) / 5, duration: 0.6, ease: "power3.inOut" });
    }

    function goStep(n, animate = true) {
      if (busy) return;
      const prev = steps.find((s) => s.classList.contains("active"));
      const next = steps.find((s) => Number(s.dataset.step) === n);
      step = n;
      HN.draft.set({ step: n });
      updateStepper();
      const enter = () => {
        steps.forEach((s) => s.classList.toggle("active", s === next));
        if (ENTER[n]) ENTER[n]();
        if (animate) {
          gsap.fromTo(next.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.45, ease: "power3.out", clearProps: "transform,opacity", onComplete: () => { busy = false; } });
          window.scrollTo({ top: 0, behavior: HN.reduce ? "auto" : "smooth" });
        } else busy = false;
      };
      busy = true;
      if (prev && prev !== next && animate) {
        gsap.to(prev.children, {
          y: -16, opacity: 0, stagger: 0.02, duration: 0.2, ease: "power2.in",
          onComplete: () => { gsap.set(prev.children, { clearProps: "transform,opacity" }); enter(); },
        });
      } else enter();
    }
    $$("[data-back]", app).forEach((b) => b.addEventListener("click", () => goStep(step - 1)));

    /* --- G1 names --- */
    (() => {
      const from = $("#nameFrom"), to = $("#nameTo");
      let touched = false, toTouched = false;
      from.value = d.from || "";
      to.value = d.to || "";
      function refresh() {
        const pf = HN.checkText(from.value, { max: 20, emptyMsg: "Bạn chưa nhập tên" });
        const pt = HN.checkText(to.value, { max: 20, emptyMsg: "Bạn chưa nhập tên người ấy" });
        $("#cFrom").textContent = HN.len(from.value) + "/20";
        $("#cTo").textContent = HN.len(to.value) + "/20";
        const show = touched && pf;
        $("#fFrom").classList.toggle("invalid", !!show);
        $("#hFrom").hidden = !show;
        $("#hFrom").textContent = pf;
        const showTo = toTouched && pt;
        $("#fTo").classList.toggle("invalid", !!showTo);
        $("#hTo").hidden = !showTo;
        $("#hTo").textContent = pt;
        $("#next1").disabled = !!pf || !!pt;
        HN.draft.set({ from: pf ? "" : HN.clean(from.value), to: pt ? "" : HN.clean(to.value) });
      }
      from.addEventListener("input", () => { touched = true; refresh(); });
      from.addEventListener("blur", () => { touched = true; refresh(); });
      to.addEventListener("input", () => { toTouched = true; refresh(); });
      to.addEventListener("blur", () => { toTouched = true; refresh(); });
      $("#next1").addEventListener("click", () => goStep(2));
      refresh();
    })();

    /* --- G2 message --- */
    const msg = $("#msg");
    msg.value = d.message || "";
    function refreshMsg() {
      const p = HN.checkText(msg.value, { max: 100, emptyMsg: "Bạn chưa viết câu rủ" });
      $("#cMsg").textContent = HN.len(msg.value) + "/100";
      $("#fMsg").classList.toggle("invalid", !!p);
      $("#hMsg").hidden = !p;
      $("#hMsg").textContent = p;
      $("#next2").disabled = !!p;
      HN.draft.set({ message: p ? "" : HN.clean(msg.value) });
    }
    const tplButtons = [];
    const tplText = (t) => HN.renderTemplate(t.text, HN.draft.get().to);
    function markTemplates() {
      const now = HN.clean(msg.value);
      tplButtons.forEach(({ b, t }) => b.classList.toggle("selected", now === HN.clean(tplText(t))));
    }
    function renderTemplates() {
      const cur = HN.draft.get();
      const host = $("#templates");
      host.replaceChildren();
      tplButtons.length = 0;
      HN.TEMPLATES.forEach((t) => {
        const b = el("button", "choice");
        b.type = "button";
        b.append(el("span", "dot"), el("span", null, tplText(t)));
        b.addEventListener("click", () => {
          HN.draft.set({ templateId: t.id });
          msg.value = tplText(t);
          refreshMsg();
          markTemplates();
          gsap.fromTo(msg, { scale: 0.97 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
        });
        tplButtons.push({ b, t });
        host.append(b);
      });
      if (!msg.value) msg.value = tplText(HN.TEMPLATES.find((t) => t.id === cur.templateId) || HN.TEMPLATES[0]);
      refreshMsg();
      markTemplates();
    }
    msg.addEventListener("input", () => { refreshMsg(); markTemplates(); });
    $("#next2").addEventListener("click", () => goStep(3));
    ENTER[2] = renderTemplates;

    /* --- G3 time --- */
    (() => {
      const st = { date: d.date || null, hour: d.hour ?? null, minute: d.minute ?? null };
      if (st.date && (!HN.validDate(st.date) || HN.isPast(st.date, 23, 59))) Object.assign(st, { date: null, hour: null, minute: null });
      HN.calendar($("#cal"), {
        selected: HN.parseISO(st.date),
        onSelect(date) {
          st.date = HN.iso(date);
          if (HN.isPast(st.date, st.hour, st.minute ?? 0)) { st.hour = null; st.minute = null; }
          tp.set(st.hour, st.minute);
          update();
        },
      });
      const tp = HN.timePicker($("#hours"), $("#mins"), {
        hour: st.hour, minute: st.minute,
        isHourDisabled: (h) => HN.isPast(st.date, h, 30),
        isMinuteDisabled: (h, m) => h != null && HN.isPast(st.date, h, m),
        onChange(h, m) {
          st.hour = h; st.minute = m;
          if (h != null && m != null && HN.isPast(st.date, h, m)) { st.minute = null; tp.set(h, null); }
          update();
        },
      });
      function update() {
        const ok = st.date && st.hour != null && st.minute != null && !HN.isPast(st.date, st.hour, st.minute);
        $("#when").textContent = ok ? "✓ " + HN.fmtWhen(st.date, st.hour, st.minute) : st.date ? "Chọn giờ và phút" : "Chọn một ngày trên lịch";
        $("#when").classList.toggle("ok", !!ok);
        $("#next3").disabled = !ok;
        HN.draft.set({ timeMode: "fixed", date: st.date, hour: st.hour, minute: st.minute });
        tp.render();
      }
      update();
      $("#next3").addEventListener("click", () => goStep(4));
    })();

    /* --- G4 plans --- */
    (() => {
      const chosen = new Set((d.plans || []).filter((id) => HN.planById(id)));
      let tab = "an";
      function group(g, host) {
        host.replaceChildren();
        HN.PLANS.filter((p) => p.group === g).forEach((p) => {
          const b = el("button", "option" + (chosen.has(p.id) ? " selected" : ""));
          b.type = "button";
          b.setAttribute("aria-pressed", String(chosen.has(p.id)));
          b.append(el("span", "badge", p.ico), document.createTextNode(p.name));
          b.addEventListener("click", () => {
            if (chosen.has(p.id)) chosen.delete(p.id); else chosen.add(p.id);
            render();
            const nb = $$(".option", host).find((x) => x.textContent.endsWith(p.name));
            if (nb) gsap.fromTo($(".badge", nb), { scale: 0.5, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" });
          });
          host.append(b);
        });
      }
      function render() {
        group(tab, $("#planList"));
        $$("[data-ptab]", app).forEach((t) => t.setAttribute("aria-selected", String(t.dataset.ptab === tab)));
        const plans = HN.PLANS.filter((p) => chosen.has(p.id)).map((p) => p.id);
        const nAn = HN.PLANS.filter((p) => p.group === "an" && chosen.has(p.id)).length;
        $("#cntAn").textContent = nAn ? "(" + nAn + ")" : "";
        $("#cntChoi").textContent = plans.length - nAn ? "(" + (plans.length - nAn) + ")" : "";
        $("#counter").textContent = plans.length ? "Đã chọn " + plans.length + " kèo" : "Chọn ít nhất 1 kèo";
        $("#next4").disabled = plans.length === 0;
        HN.draft.set({ plans });
      }
      $$("[data-ptab]", app).forEach((t) => t.addEventListener("click", () => {
        if (tab === t.dataset.ptab) return;
        tab = t.dataset.ptab;
        render();
        gsap.fromTo($$(".option", $("#planList")), { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.03, duration: 0.3, clearProps: "transform,opacity" });
      }));
      render();
      $("#next4").addEventListener("click", () => goStep(5));
    })();

    /* --- G5 preview: the real receiver flow inside a phone frame --- */
    function loadPreview() {
      const cur = HN.draft.get();
      const inv = { code: "preview", from: cur.from, to: cur.to, message: cur.message, timeMode: "fixed", date: cur.date, hour: cur.hour, minute: cur.minute, plans: cur.plans || [] };
      const enc = HN.encodeInvite(inv);
      const ok = !!HN.decodeInvite(enc);
      if (!ok) HN.toast("Chưa đủ dữ liệu, đang chiếu bằng thiệp mẫu");
      const f = document.createElement("iframe");
      f.title = "Chiếu thử luồng người nhận";
      f.src = HN.baseUrl() + "#/n/" + (ok ? enc : "demo") + "/preview";
      $("#previewHost").replaceChildren(f);
    }
    ENTER[5] = loadPreview;
    $("#replay").addEventListener("click", loadPreview);
    $("#editBtn").addEventListener("click", () => {
      HN.sheet((sh, close) => {
        const list = el("div", "edit-list");
        ["Cảnh 1 · Nhân vật chính", "Cảnh 2 · Lời thoại", "Cảnh 3 · Thời gian", "Cảnh 4 · Kịch bản"].forEach((label, i) => {
          const b = el("button", "btn btn-ghost btn-block", label);
          b.type = "button";
          b.addEventListener("click", () => { close(); goStep(i + 1); });
          list.append(b);
        });
        sh.append(el("h3", null, "Sửa cảnh nào?"), el("p", "sub", "Dữ liệu đã nhập vẫn được giữ nguyên"), list);
      });
    });
    $("#next5").addEventListener("click", () => goStep(6));

    /* --- G6 pricing + consent --- */
    (() => {
      let chosen = d.plan || "free";
      function renderPricing() {
        const host = $("#pricing");
        host.replaceChildren();
        HN.PRICING.forEach((p) => {
          const b = el("button", "choice price-choice" + (p.id === chosen ? " selected" : ""));
          b.type = "button";
          const body = el("span", "c-body");
          const t = el("span", "c-title", p.title);
          if (p.pill) t.append(el("span", "pill", p.pill));
          body.append(t, el("span", "c-sub", p.sub));
          b.append(el("span", "dot"), body, el("b", "c-price", p.price));
          b.addEventListener("click", () => { chosen = p.id; HN.draft.set({ plan: chosen }); renderPricing(); });
          host.append(b);
        });
      }
      renderPricing();
      const update = () => { $("#createBtn").disabled = !($("#age").checked && $("#terms").checked); };
      $("#age").addEventListener("change", update);
      $("#terms").addEventListener("change", update);
      update();
      $("#createBtn").addEventListener("click", () => {
        if (chosen === "free" || HN.PAYMENT_ENABLED) { publish(chosen); return; }
        const log = HN.local.get("hn-fakedoor", []);
        (Array.isArray(log) ? log : []).push({ plan: chosen, at: new Date().toISOString() });
        HN.local.set("hn-fakedoor", log);
        HN.sheet((sh, close) => {
          const ok = el("button", "btn btn-block", "Nhận thiệp miễn phí");
          ok.type = "button";
          ok.addEventListener("click", () => { close(); publish(chosen); });
          sh.append(el("div", "big-emoji", "🎁"), el("h3", null, "Sắp mở bán!"), el("p", "sub", "Gói trả phí sẽ mở trong thời gian tới. Hôm nay tụi mình tặng bạn thiệp này miễn phí."), ok);
        });
      });
    })();

    function publish(plan) {
      const cur = HN.draft.get();
      const inv = { code: HN.randomCode(8), from: cur.from, to: cur.to, message: cur.message, timeMode: "fixed", date: cur.date, hour: cur.hour, minute: cur.minute, plans: cur.plans || [] };
      const enc = HN.encodeInvite(inv);
      if (!HN.decodeInvite(enc)) { HN.toast("Thiệp còn thiếu thông tin, kiểm tra lại các cảnh nhé"); return; }
      const url = HN.baseUrl() + "#/n/" + enc;
      const created = HN.today();
      const expires = new Date(created);
      expires.setFullYear(expires.getFullYear() + 1);
      HN.invites.add({
        code: inv.code, name: inv.to ? "Thiệp gửi " + inv.to : HN.cut(inv.message, 40), url,
        created: HN.iso(created), expires: HN.iso(expires), plan, consentAt: new Date().toISOString(), ref: HN.session.get("hn-ref", null),
      });
      HN.draft.set({ published: { code: inv.code, url } });
      updateCount();
      goStep(7);
    }

    /* --- G7 share --- */
    ENTER[7] = () => {
      const pub = HN.draft.get().published;
      if (!pub) return;
      $("#link").textContent = pub.url;
      gsap.delayedCall(0.35, () => HN.burst());
      gsap.fromTo(".launch-emoji", { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)", delay: 0.2 });
    };
    const share = $("#shareMsg");
    const refreshShare = () => {
      const p = HN.checkText(share.value, { required: false, max: 100 });
      $("#cShare").textContent = HN.len(share.value) + "/100";
      $("#fShare").classList.toggle("invalid", !!p);
      $("#hShare").textContent = p || "Gửi kèm một câu để người ấy biết là bạn gửi, đừng gửi link trơn";
      $("#hShare").classList.toggle("error", !!p);
      $("#shareBtn").disabled = !!p;
    };
    share.addEventListener("input", refreshShare);
    refreshShare();
    $("#copyLink").addEventListener("click", () => { const pub = HN.draft.get().published; if (pub) HN.copy(pub.url); });
    $("#shareBtn").addEventListener("click", async () => {
      const pub = HN.draft.get().published;
      if (!pub) return;
      const text = HN.clean(share.value);
      if (navigator.share) { try { await navigator.share({ text, url: pub.url }); } catch (_) { /* cancelled */ } return; }
      HN.copy((text ? text + " " : "") + pub.url, "Đã copy lời nhắn và link");
    });
    const fb = $("#fbOpts");
    HN.SOURCES.forEach((s) => {
      const b = el("button", "chip", s);
      b.type = "button";
      b.addEventListener("click", () => {
        HN.local.set("hn-source", { v: s, code: (HN.draft.get().published || {}).code, at: new Date().toISOString() });
        b.classList.add("selected");
        gsap.to(fb.children, { autoAlpha: 0, y: -8, stagger: 0.03, duration: 0.2, onComplete: () => { $("#fb").replaceChildren(el("p", "thanks", "Cảm ơn bạn đã góp ý! 💜")); gsap.from(".thanks", { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: "back.out(2.5)" }); } });
      });
      fb.append(b);
    });
    $("#newBtn").addEventListener("click", () => { HN.draft.clear(); render(); });

    if (step >= 2) renderTemplates();
    goStep(step, false);
    if (step <= 4) gsap.fromTo($$(".cstep.active > *", app), { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity" });
  };

  /* =====================================================================
     RECEIVER (N1 to N3, N7 when invalid)
     ===================================================================== */
  const DOW_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  /* N1 botanicals. Coordinates live in the bloom viewBox, where the envelope covers x 70-330, y 140-312,
     so every stem starts hidden behind it and grows outwards. */
  const SVGNS = "http://www.w3.org/2000/svg";
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
  function sv(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  }
  function gradient(defs, tag, id, attrs, stops) {
    const g = sv(tag, Object.assign({ id }, attrs), defs);
    stops.forEach(([o, c]) => sv("stop", { offset: o, "stop-color": c }, g));
  }
  function buildBloom(svg) {
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
  }

  const DEMO = () => ({ code: "demo00", from: "Minh", to: "Lan", message: "Lan ơi, cuối tuần này đi chơi với tớ nha?", timeMode: "fixed", date: HN.iso(HN.nextSaturday()), hour: 19, minute: 30, plans: ["trasua", "cafe", "xemphim", "daoho"] });

  SCREENS.n = (r) => {
    const app = $("#app");
    const key = r.parts[1] || "";
    const PREVIEW = r.parts[2] === "preview";
    const DEMO_MODE = key === "demo";
    const inv = DEMO_MODE ? DEMO() : HN.decodeInvite(key);
    if (!inv) {
      app.replaceChildren($("#tpl-gone").content.cloneNode(true));
      gsap.fromTo(".gone > *", { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: "back.out(1.6)", clearProps: "transform,opacity" });
      HN.loop(gsap.to(".gone .big-emoji", { y: -10, rotation: 8, duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut" }));
      return;
    }
    const greet = inv.to || "cậu";
    const ans = { date: inv.date, hour: inv.hour, minute: inv.minute, plans: inv.plans, name: inv.to, dodges: 0 };
    const steps = $$(".rstep", app);
    let step = 1, busy = false;
    const ENTER = {};

    $("#askTitle").textContent = inv.message;
    $("#endSub").textContent = PREVIEW ? "Đây là màn người ấy thấy sau khi gửi" : inv.from + " sẽ nhận được câu trả lời của cậu";
    HN.mountLotties(steps[0]);

    function goTo(n) {
      if (busy || n === step) return;
      busy = true;
      const prev = steps[step - 1], next = steps[n - 1];
      const dir = n > step ? 1 : -1;
      if (n !== 2) parkNo();
      gsap.to(prev, {
        x: -40 * dir, opacity: 0, duration: 0.25, ease: "power2.in",
        onComplete: () => {
          prev.classList.remove("active");
          gsap.set(prev, { clearProps: "all" });
          next.classList.add("active");
          step = n;
          gsap.to("#rProg", { scaleX: (n - 1) / 2, duration: 0.5, ease: "power3.out" });
          HN.mountLotties(next);
          if (ENTER[n]) ENTER[n]();
          gsap.fromTo(next, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "power3.out", clearProps: "transform,opacity", onComplete: () => { busy = false; } });
          window.scrollTo(0, 0);
        },
      });
    }
    $$("[data-rback]", app).forEach((b) => b.addEventListener("click", () => goTo(step - 1)));

    /* N1 letter: the white envelope, then the letter turns into the event dashboard */
    const wenv = $("#wenv"), heart = $("#heartBtn"), letter = $("#wLetter"), flap = $("#wFlap");
    const pad2 = HN.pad2;
    $("#wTo").textContent = "Gửi " + greet;
    $("#dCode").textContent = "#" + inv.code.toUpperCase();
    $("#dTo").textContent = greet;
    $("#dFrom").textContent = inv.from;
    $("#dMsg").textContent = inv.message;
    const day = HN.parseISO(inv.date);
    const hasTime = inv.hour != null && inv.minute != null;
    $("#dWhen").textContent = day ? DOW_SHORT[day.getDay()] + " · " + pad2(day.getDate()) + "/" + pad2(day.getMonth() + 1) + (hasTime ? " · " + pad2(inv.hour) + ":" + pad2(inv.minute) : "") : "Chưa chốt";
    const target = day && hasTime ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), inv.hour, inv.minute) : null;
    function tick() {
      const left = $("#dLeft");
      if (!target) { left.textContent = "—"; return; }
      const ms = target - Date.now();
      if (ms <= 0) { left.textContent = "Tới giờ rồi!"; return; }
      const s = Math.floor(ms / 1000);
      left.textContent = Math.floor(s / 86400) + "d " + pad2(Math.floor(s / 3600) % 24) + ":" + pad2(Math.floor(s / 60) % 60) + ":" + pad2(s % 60);
    }
    const plans = (inv.plans || []).map(HN.planById).filter(Boolean);
    $("#dCount").textContent = plans.length + " kèo";
    plans.forEach((p, i) => {
      const li = el("li");
      const txt = el("div");
      txt.append(el("b", null, p.name), el("small", null, p.group === "an" ? "Ăn uống" : "Đi chơi"));
      li.append(el("span", "ico", p.ico), txt, el("span", "n", "#" + pad2(i + 1)));
      $("#dPlans").append(li);
    });
    if (!plans.length) { $(".dash-label", app).hidden = true; $("#dPlans").hidden = true; }

    const bloom = buildBloom($("#bloom"));
    bloom.stems.forEach((s) => { const len = s.getTotalLength(); gsap.set(s, { strokeDasharray: len, strokeDashoffset: len }); });
    gsap.set(wenv, { transformPerspective: 900 });
    const BLOOM_SECONDS = 1;
    const grow = gsap.timeline()
      .to(bloom.stems, { strokeDashoffset: 0, duration: 0.7, stagger: 0.05, ease: "power2.out" })
      .from(bloom.leaves, { scale: 0, transformOrigin: "0% 50%", duration: 0.35, stagger: 0.02, ease: "back.out(2.2)" }, "-=0.55")
      .from(bloom.flowers, { scale: 0, rotation: -120, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.04, ease: "back.out(1.7)" }, "-=0.4")
      .from(bloom.buds, { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.25, stagger: 0.03 }, "-=0.3");
    grow.duration(BLOOM_SECONDS);
    const intro = gsap.timeline()
      .fromTo(".recv-card", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", clearProps: "transform,opacity" })
      .fromTo("#loveEyebrow", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, clearProps: "transform,opacity" }, "-=0.3")
      .fromTo(wenv, { y: 60, rotationX: 55, scale: 0.7, opacity: 0 }, { y: 0, rotationX: 0, scale: 1, opacity: 1, duration: 1.1, ease: "elastic.out(1, 0.75)" }, "<")
      .add(grow, "-=0.8")
      .fromTo(heart, { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(3)", clearProps: "transform" }, "-=0.5")
      .fromTo("#loveHint", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, clearProps: "transform,opacity" }, "-=0.2");
    HN.onLeave(() => intro.kill());
    const idle = [
      HN.loop(gsap.to(wenv, { y: -7, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut", delay: intro.duration() })),
      HN.loop(gsap.to(bloom.flowers, { rotation: "+=14", transformOrigin: "50% 50%", duration: 2.6, ease: "sine.inOut", delay: intro.duration(), stagger: { each: 0.3, repeat: -1, yoyo: true } })),
      HN.fine ? null : HN.loop(gsap.fromTo(wenv, { rotationY: -10 }, { rotationY: 10, duration: 3, yoyo: true, repeat: -1, ease: "sine.inOut", delay: intro.duration(), immediateRender: false })),
    ];
    HN.tilt(wenv, 14);

    let opened = false, ticker = 0;
    HN.onLeave(() => clearInterval(ticker));
    function open() {
      if (opened) return;
      opened = true;
      heart.classList.remove("beating");
      heart.disabled = true;
      idle.forEach((t) => t && t.kill());
      const h = heart.getBoundingClientRect();
      HN.burst(h.left + h.width / 2, h.top + h.height / 2, 30);
      const t = gsap.timeline()
        .to(wenv, { y: 0, rotationX: 0, rotationY: 0, duration: 0.4, ease: "power3.out" })
        .to(heart, { scale: 1.35, duration: 0.15 }, 0)
        .to(heart, { scale: 0, rotation: 25, opacity: 0, duration: 0.3, ease: "back.in(2)" })
        .to("#loveHint", { opacity: 0, duration: 0.2 }, "<")
        .to(flap, { rotationX: 180, transformPerspective: 800, duration: 0.6, ease: "power2.inOut" }, "<0.1")
        .set(flap, { zIndex: 1 }, "<0.3")
        .to(letter, { y: -wenv.offsetHeight * 0.62, duration: 0.6, ease: "back.out(1.4)" }, "-=0.1")
        .to([$(".wenv-back", wenv), $(".wenv-front", wenv), flap, "#bloom"], { opacity: 0, y: 30, duration: 0.45, ease: "power2.in" }, "+=0.15")
        .add(morph);
      HN.onLeave(() => t.kill());
    }
    function morph() {
      const from = letter.getBoundingClientRect();
      $("#love").hidden = true;
      $("#loveEyebrow").textContent = "Thư từ " + inv.from;
      const dash = $("#dash");
      dash.hidden = false;
      const to = dash.getBoundingClientRect();
      tick();
      ticker = setInterval(tick, 1000);
      const t = gsap.timeline({ onComplete: () => $("#dashGo").focus({ preventScroll: true }) })
        .fromTo(dash, { x: from.left - to.left, y: from.top - to.top, scaleX: from.width / to.width, scaleY: from.height / to.height, transformOrigin: "0 0" },
          { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.75, ease: "power3.inOut", clearProps: "transform" })
        .to(".dash-skin", { opacity: 0, duration: 0.45 }, "-=0.35")
        .from($$(".dash > :not(.dash-skin)", app), { y: 14, opacity: 0, stagger: 0.06, duration: 0.4, ease: "power3.out", clearProps: "transform,opacity" }, "-=0.2")
        .from($$(".dash-tl li", app), { x: -16, opacity: 0, stagger: 0.06, duration: 0.35, ease: "power3.out", clearProps: "transform,opacity" }, "-=0.3");
      HN.onLeave(() => t.kill());
    }
    heart.addEventListener("click", open);
    $("#dashGo").addEventListener("click", () => goTo(2));

    /* N2 the YES / NO joke */
    let askSplit = null;
    ENTER[2] = () => {
      if (!askSplit) askSplit = HN.split($("#askTitle"));
      gsap.fromTo(askSplit, { y: 40, scale: 0.4, rotation: () => gsap.utils.random(-30, 30), opacity: 0 }, { y: 0, scale: 1, rotation: 0, opacity: 1, stagger: 0.02, duration: 0.5, ease: "back.out(2.4)" });
      gsap.from(".ask-emoji", { scale: 0, rotation: -60, duration: 0.7, ease: "back.out(3)" });
      gsap.fromTo("#askButtons > *", { scale: 0 }, { scale: 1, stagger: 0.12, duration: 0.5, ease: "back.out(2.6)", delay: 0.4, clearProps: "transform" });
      HN.loop(gsap.to(".ask-emoji", { rotation: 10, y: -6, duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 0.8 }));
    };
    const yesBtn = $("#yesBtn"), noBtn = $("#noBtn");
    let gone = false, last = 0, autoYes = null, recorded = false;
    function toBody() {
      if (noBtn.parentElement === document.body) return;
      const rect = noBtn.getBoundingClientRect();
      document.body.append(noBtn);
      noBtn.classList.add("runaway-no");
      gsap.set(noBtn, { left: rect.left, top: rect.top });
    }
    function dodge(e) {
      if (e) e.preventDefault();
      if (gone || step !== 2) return;
      const now = Date.now();
      if (now - last < 150) return;
      last = now;
      ans.dodges = Math.min(ans.dodges + 1, HN.NO_LIMIT);
      const ys = Math.min(1 + ans.dodges * 0.16, 2);
      const k = ys / (gsap.getProperty(yesBtn, "scale") || 1);
      const yr = yesBtn.getBoundingClientRect();
      const cx = yr.left + yr.width / 2, cy = yr.top + yr.height / 2, hw = (yr.width * k) / 2 + 24, hh = (yr.height * k) / 2 + 24;
      gsap.to(yesBtn, { scale: ys, duration: 0.4, ease: "back.out(2.5)" });
      if (ans.dodges >= HN.NO_LIMIT) { flee(); return; }
      noBtn.textContent = HN.NO_TEXTS[ans.dodges % HN.NO_TEXTS.length];
      toBody();
      const w = noBtn.offsetWidth, h = noBtn.offsetHeight, pad = 14, top = 76;
      const maxX = Math.max(pad, innerWidth - w - pad), maxY = Math.max(top, innerHeight - h - pad);
      let x = pad, y = top;
      for (let i = 0; i < 80; i++) {
        const tx = pad + Math.random() * (maxX - pad), ty = top + Math.random() * (maxY - top);
        if (tx + w < cx - hw || tx > cx + hw || ty + h < cy - hh || ty > cy + hh) { x = tx; y = ty; break; }
      }
      gsap.to(noBtn, { left: x, top: y, rotation: gsap.utils.random(-15, 15), scale: Math.max(1 - ans.dodges * 0.05, 0.7), duration: 0.3, ease: "back.out(2)" });
    }
    function flee() {
      gone = true;
      toBody();
      gsap.to(noBtn, { x: innerWidth * 0.6, y: -innerHeight * 0.7, rotation: 60, scale: 0.3, autoAlpha: 0, duration: 0.7, ease: "power2.in", onComplete: () => { noBtn.hidden = true; } });
      const m = $("#runawayMsg");
      m.hidden = false;
      gsap.from(m, { y: 10, autoAlpha: 0, duration: 0.35 });
      autoYes = gsap.delayedCall(1.3, () => yesBtn.click());
      HN.onLeave(() => autoYes.kill());
    }
    function parkNo() { if (noBtn.parentElement === document.body) noBtn.hidden = true; }
    HN.onLeave(() => noBtn.remove());
    noBtn.addEventListener("mouseenter", dodge);
    noBtn.addEventListener("touchstart", dodge, { passive: false });
    noBtn.addEventListener("pointerdown", dodge);
    noBtn.addEventListener("click", (e) => e.preventDefault());
    yesBtn.addEventListener("click", () => {
      if (autoYes) autoYes.kill();
      const b = yesBtn.getBoundingClientRect();
      HN.burst(b.left + b.width / 2, b.top + b.height / 2);
      if (!PREVIEW && !DEMO_MODE && !IN_FRAME && !recorded) {
        recorded = true;
        HN.responses.add(inv.code, { name: ans.name, date: ans.date, hour: ans.hour, minute: ans.minute, plans: ans.plans, dodges: ans.dodges, at: new Date().toISOString() });
      }
      goTo(3);
    });

    /* N3 ticket */
    const ticketData = () => ({ from: inv.from, to: ans.name || greet, when: HN.fmtWhen(ans.date, ans.hour, ans.minute), plans: ans.plans, dodges: ans.dodges, code: inv.code });
    ENTER[3] = () => {
      const tk = HN.ticket(ticketData());
      $("#rTicket").replaceChildren(tk);
      HN.tilt(tk, 12);
      gsap.timeline()
        .fromTo(tk, { rotationX: -70, y: 80, opacity: 0, transformPerspective: 900 }, { rotationX: 0, y: 0, opacity: 1, duration: 1, ease: "elastic.out(1, 0.6)" })
        .fromTo($$(".t-row", tk), { x: -30, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.08, duration: 0.4, ease: "power3.out" }, "-=0.6")
        .fromTo(".end-actions .btn, #saveBtn", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.4, clearProps: "transform,opacity" }, "-=0.3");
      gsap.delayedCall(0.2, () => HN.burst(innerWidth / 2, innerHeight * 0.35, 44));
    };
    $("#saveBtn").addEventListener("click", async () => {
      const btn = $("#saveBtn");
      btn.disabled = true;
      try { HN.shot(await HN.ticketImage(ticketData())); } catch (e) { console.error(e); HN.toast("Không tạo được ảnh, cậu chụp màn hình giúp tớ nhé"); }
      btn.disabled = false;
    });
    $("#calBtn").addEventListener("click", () => {
      const start = HN.parseISO(ans.date);
      if (!start) return;
      start.setHours(ans.hour, ans.minute, 0, 0);
      const end = new Date(start.getTime() + 2 * 3600 * 1000);
      const planText = ans.plans.map((id) => HN.planById(id).name).join(", ");
      const local = (x) => x.getFullYear() + HN.pad2(x.getMonth() + 1) + HN.pad2(x.getDate()) + "T" + HN.pad2(x.getHours()) + HN.pad2(x.getMinutes()) + "00";
      const gcal = "https://calendar.google.com/calendar/render?" + new URLSearchParams({ action: "TEMPLATE", text: "Hẹn với " + inv.from, dates: local(start) + "/" + local(end), details: "Kèo: " + planText, ctz: "Asia/Ho_Chi_Minh" });
      const utc = (x) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const esc = (s) => s.replace(/[\\;,]/g, (c) => "\\" + c);
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//hennha//vi", "BEGIN:VEVENT", "UID:" + HN.randomCode(12) + "@" + HN.DOMAIN, "DTSTAMP:" + utc(new Date()), "DTSTART:" + utc(start), "DTEND:" + utc(end), "SUMMARY:" + esc("Hẹn với " + inv.from), "DESCRIPTION:" + esc("Kèo: " + planText), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      const icsUrl = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      HN.sheet((sh) => {
        const g = el("a", "btn btn-block", "Google Calendar");
        g.href = gcal; g.target = "_blank"; g.rel = "noopener noreferrer";
        const i = el("a", "btn btn-ghost btn-block", "Lịch iPhone (.ics)");
        i.href = icsUrl; i.download = "hen-nha.ics";
        sh.append(el("h3", null, "Thêm vào lịch"), el("p", "sub", HN.fmtWhen(ans.date, ans.hour, ans.minute)), g, i);
      });
      setTimeout(() => URL.revokeObjectURL(icsUrl), 120000);
    });
    $("#mineBtn").addEventListener("click", () => {
      if (PREVIEW || IN_FRAME) { HN.toast("Bản thật: mở trang tạo thiệp có gắn mã giới thiệu"); return; }
      HN.session.set("hn-ref", inv.code);
      location.hash = "#/create";
    });
  };

  /* =====================================================================
     MANAGE (Q1 list, Q2 calendar)
     ===================================================================== */
  SCREENS.q = () => {
    const app = $("#app");
    const base = HN.baseUrl() + "#/n/";
    const dmy = (iso) => { const d = HN.parseISO(iso); return d ? HN.pad2(d.getDate()) + "/" + HN.pad2(d.getMonth() + 1) + "/" + d.getFullYear() : "?"; };
    const cleanResp = (r) => (HN.validDate(r.date) && Number.isInteger(r.hour) && Number.isInteger(r.minute) && Array.isArray(r.plans) ? r : null);
    const mine = () => HN.invites.list().map((i) => ({
      code: String(i.code || ""), name: String(i.name || "Thiệp"), url: typeof i.url === "string" && i.url.startsWith(base) ? i.url : "",
      created: HN.validDate(i.created) ? i.created : HN.iso(HN.today()), expires: HN.validDate(i.expires) ? i.expires : "",
      responses: HN.responses.for(String(i.code || "")).map(cleanResp).filter(Boolean),
    }));
    const sample = () => {
      const sat = HN.nextSaturday(), sun = new Date(sat), fri = new Date(sat);
      sun.setDate(sun.getDate() + 1);
      fri.setDate(fri.getDate() + 6);
      const created = HN.iso(HN.today());
      return [
        { code: "k3x9m2pq", name: "Thiệp gửi Lan", url: "", created, responses: [{ name: "Lan", date: HN.iso(sat), hour: 19, minute: 30, plans: ["trasua", "xemphim"], dodges: HN.NO_LIMIT }] },
        { code: "p8wq4tzn", name: "Cuối tuần này đi chơi với tớ nha?", url: "", created, responses: [
          { name: "Hà", date: HN.iso(sat), hour: 19, minute: 30, plans: ["lau"], dodges: 3 },
          { name: "Vy", date: HN.iso(sun), hour: 9, minute: 0, plans: ["cafe", "daoho"], dodges: 0 },
          { name: "Ngọc", date: HN.iso(fri), hour: 20, minute: 0, plans: ["karaoke"], dodges: 5 },
        ] },
        { code: "z2rt7hkd", name: "Thiệp gửi Mai", url: "", created, responses: [] },
      ];
    };
    let INVITES = mine();
    let useSample = false;
    INVITES.forEach((i) => { if (!i.expires) { const e = HN.parseISO(i.created); e.setFullYear(e.getFullYear() + 1); i.expires = HN.iso(e); } });

    const appts = () => INVITES.flatMap((i) => i.responses.map((r) => Object.assign({ invite: i.name }, r)));
    const key = (a) => a.date + "T" + HN.pad2(a.hour) + ":" + HN.pad2(a.minute);
    const conflicts = () => { const c = {}; appts().forEach((a) => { c[key(a)] = (c[key(a)] || 0) + 1; }); return c; };
    const planNames = (ids) => ids.map(HN.planById).filter(Boolean);
    const gcal = (a) => {
      const s = HN.parseISO(a.date); s.setHours(a.hour, a.minute, 0, 0);
      const e = new Date(s.getTime() + 2 * 3600 * 1000);
      const f = (x) => x.getFullYear() + HN.pad2(x.getMonth() + 1) + HN.pad2(x.getDate()) + "T" + HN.pad2(x.getHours()) + HN.pad2(x.getMinutes()) + "00";
      return "https://calendar.google.com/calendar/render?" + new URLSearchParams({ action: "TEMPLATE", text: "Hẹn với " + a.name, dates: f(s) + "/" + f(e), details: "Kèo: " + planNames(a.plans).map((p) => p.name).join(", "), ctz: "Asia/Ho_Chi_Minh" });
    };
    const linkBtn = (text, href) => { const a = el("a", "btn btn-ghost btn-sm", text); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; return a; };

    function respCard(r, conf) {
      const c = el("div", "resp");
      const top = el("div", "resp-top");
      top.append(el("b", null, String(r.name || "?")));
      const tags = el("span", "resp-tags");
      if (conf[key(r)] > 1) tags.append(el("span", "tag-red", "Trùng giờ"));
      top.append(tags);
      const chips = el("div", "chips-row");
      planNames(r.plans).forEach((p) => chips.append(el("i", null, p.ico + " " + p.name)));
      const acts = el("div", "acts");
      const save = el("button", "btn btn-ghost btn-sm", "Lưu ảnh thẻ");
      save.type = "button";
      save.addEventListener("click", async () => {
        try { HN.shot(await HN.ticketImage({ from: "Bạn", to: String(r.name || "?"), when: HN.fmtWhen(r.date, r.hour, r.minute), plans: r.plans, dodges: Number(r.dodges) || 0, code: "" })); } catch (_) { HN.toast("Không tạo được ảnh"); }
      });
      acts.append(save, linkBtn("Thêm vào lịch", gcal(r)));
      c.append(top, el("div", "when", HN.fmtWhen(r.date, r.hour, r.minute)), chips, el("div", "dodge", r.dodges ? "Né nút Không " + r.dodges + " lần" : "Bấm YES ngay lần đầu"), acts);
      return c;
    }
    function renderList() {
      const host = $("#qList");
      host.replaceChildren();
      $("#qEmpty").hidden = INVITES.length > 0;
      const conf = conflicts();
      INVITES.forEach((i) => {
        const card = el("article", "inv glass");
        const head = el("div", "inv-head");
        head.append(el("h3", null, i.name), el("span", "pill" + (i.responses.length ? "" : " zero"), i.responses.length ? i.responses.length + " phản hồi" : "Chưa có phản hồi"));
        const lr = el("div", "linkrow");
        lr.append(el("span", null, i.url ? i.url : HN.DOMAIN + "/" + i.code));
        if (i.url) {
          const cp = el("button", "btn btn-ghost btn-sm", "Copy");
          cp.type = "button";
          cp.addEventListener("click", () => HN.copy(i.url));
          const op = el("a", "btn btn-ghost btn-sm", "Mở");
          op.href = i.url;
          lr.append(cp, op);
        }
        card.append(head, lr, el("div", "meta", "Tạo " + dmy(i.created) + " · Hết hạn " + dmy(i.expires)));
        if (i.responses.length) {
          const more = el("button", "more");
          more.type = "button";
          more.append(el("span", null, "Xem phản hồi"), el("span", "chev", "▾"));
          const box = el("div", "resp-box");
          box.hidden = true;
          i.responses.forEach((r) => box.append(respCard(r, conf)));
          more.addEventListener("click", () => {
            box.hidden = !box.hidden;
            $(".chev", more).textContent = box.hidden ? "▾" : "▴";
            if (!box.hidden) gsap.fromTo(box.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.35, ease: "power3.out", clearProps: "transform,opacity" });
          });
          card.append(more, box);
        }
        host.append(card);
      });
      if (host.children.length) gsap.fromTo(host.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity" });
    }

    let picked = null;
    function renderCal() {
      const conf = conflicts();
      const events = {};
      appts().forEach((a) => { events[a.date] = events[a.date] || { conflict: false }; if (conf[key(a)] > 1) events[a.date].conflict = true; });
      $("#qCal").replaceChildren();
      HN.calendar($("#qCal"), { events, allowAll: true, selected: picked, onSelect(d) { picked = d; renderAppts(); } });
      renderAppts();
    }
    function renderAppts() {
      const host = $("#qAppts");
      host.replaceChildren();
      const conf = conflicts();
      let list = appts().filter((a) => HN.parseISO(a.date) >= HN.today());
      if (picked) list = list.filter((a) => a.date === HN.iso(picked));
      list.sort((a, b) => (key(a) < key(b) ? -1 : 1));
      if (!list.length) host.append(el("p", "hint", picked ? "Không có hẹn trong ngày này." : "Chưa có buổi hẹn nào."));
      let lastDate = null;
      list.forEach((a) => {
        if (a.date !== lastDate) { host.append(el("div", "day-title", HN.fmtDate(HN.parseISO(a.date)))); lastDate = a.date; }
        const clash = conf[key(a)] > 1;
        const row = el("div", "appt" + (clash ? " conflict" : ""));
        const info = el("div", "info");
        info.append(el("b", null, String(a.name || "?") + (clash ? " · Trùng giờ" : "")), el("small", null, planNames(a.plans).map((p) => p.name).join(", ") + " · " + a.invite));
        row.append(el("span", "time", HN.pad2(a.hour) + ":" + HN.pad2(a.minute)), info, linkBtn("Thêm lịch", gcal(a)));
        host.append(row);
      });
      if (picked) {
        const all = el("button", "link", "Xem tất cả buổi sắp tới");
        all.type = "button";
        all.addEventListener("click", () => { picked = null; renderCal(); });
        host.append(all);
      }
      gsap.fromTo(host.children, { x: -16, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.05, duration: 0.3, clearProps: "transform,opacity" });
    }

    const tabs = $$(".seg-tab", app), ind = $(".seg-ind", app);
    const moveInd = (b, instant) => gsap.to(ind, { x: b.offsetLeft, width: b.offsetWidth, duration: instant ? 0 : 0.45, ease: "back.out(1.4)" });
    requestAnimationFrame(() => moveInd(tabs[0], true));
    tabs.forEach((b) => b.addEventListener("click", () => {
      tabs.forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      moveInd(b);
      const cal = b.dataset.tab === "cal";
      $("#paneList").hidden = cal;
      $("#paneCal").hidden = !cal;
      if (cal) renderCal();
    }));
    $("#sampleBtn").addEventListener("click", () => {
      useSample = !useSample;
      INVITES = useSample ? sample() : mine();
      INVITES.forEach((i) => { if (!i.expires) { const e = HN.parseISO(i.created); e.setFullYear(e.getFullYear() + 1); i.expires = HN.iso(e); } });
      $("#sampleBtn").textContent = useSample ? "Xem thiệp của tôi" : "Xem dữ liệu mẫu";
      renderList();
      if (!$("#paneCal").hidden) renderCal();
    });
    gsap.fromTo(".q-head > *", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: "back.out(1.6)", clearProps: "transform,opacity" });
    renderList();
  };

  addEventListener("hashchange", render);
  render();
})();
