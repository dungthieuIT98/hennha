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
    const counter = gsap.delayedCall(0.9, () => $$("[data-count]", app).forEach(HN.countUp));
    HN.onLeave(() => counter.kill());
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
    const tk = HN.ticket({ from: "Minh", to: "Lan", when: HN.fmtWhen(HN.iso(HN.nextSaturday()), 19, 30), plans: ["trasua", "xemphim"], dodges: 7, code: "k3x9m2pq" });
    $("#homeTicket").append(tk);
    HN.tilt(tk, 12);
    HN.loop(gsap.to("#homeTicket", { y: -12, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" }));

    HN.reveal(app);
    if (pendingScroll) { const id = pendingScroll; pendingScroll = null; setTimeout(() => scrollToId(id), 120); }
  };

  function initDemo() {
    const stage = $("#dQ"), done = $("#dDone"), yes = $("#dYes"), no = $("#dNo"), count = $("#dCount"), run = $("#dRun");
    let dodges = 0, gone = false, floating = false, last = 0;
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
      count.textContent = String(dodges);
      gsap.fromTo(count, { scale: 1.8 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
      const ys = Math.min(1 + 0.14 * dodges, 2);
      if (dodges >= HN.NO_LIMIT) {
        gone = true;
        gsap.to(yes, { scale: ys, duration: 0.4, ease: "back.out(2.5)" });
        gsap.to(no, { x: 260, y: -320, rotation: 60, scale: 0.3, autoAlpha: 0, duration: 0.7, ease: "power2.in" });
        run.hidden = false;
        gsap.from(run, { y: -10, autoAlpha: 0, duration: 0.3 });
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
      count.textContent = "0";
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
    const grid = $(".create-grid", app), phone = $("#phoneScreen");
    const LABELS = ["Nhân vật", "Lời thoại", "Suất chiếu", "Kịch bản", "Chiếu thử", "Phát hành"];
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
        grid.classList.toggle("solo", n >= 5);
        steps.forEach((s) => s.classList.toggle("active", s === next));
        if (ENTER[n]) ENTER[n]();
        renderPhone();
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

    /* --- live phone preview (steps 1-4) --- */
    function renderPhone(bump) {
      if (step > 4) return;
      const cur = HN.draft.get();
      const to = cur.to || "cậu", from = cur.from || "bạn";
      if (phone.dataset.step === "1" && step === 1) {
        $(".env-to-name", phone).textContent = to;
        $(".env-from-name", phone).textContent = from;
        if (bump) gsap.fromTo($(".env", phone), { scale: 1.05 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
        return;
      }
      const changed = phone.dataset.step !== String(step);
      phone.dataset.step = String(step);
      const wrap = el("div", "ph-inner");
      if (step === 1) {
        wrap.append(el("span", "eyebrow", "Có thư cho cậu"), HN.envelope({ to, from }), el("p", "ph-hint", "Người ấy sẽ thấy phong bì này đầu tiên"));
      } else if (step === 2) {
        const pills = el("div", "ph-pills");
        pills.append(el("span", "ph-yes", "YES"), el("span", "ph-no", "Không"));
        wrap.append(el("span", "eyebrow", "Đang chiếu"), el("div", "ph-emoji", "🥺"), el("p", "ph-q", HN.clean($("#msg").value) || "…"), pills);
      } else if (step === 3) {
        const fixed = cur.timeMode === "fixed" && cur.date && cur.hour != null && cur.minute != null;
        const box = el("div", "ph-when");
        box.append(el("span", "badge", fixed ? "📅" : "🤝"), el("strong", null, fixed ? HN.fmtWhen(cur.date, cur.hour, cur.minute) : cur.timeMode === "recipient" ? "Người ấy tự chọn ngày giờ" : "Chưa chọn giờ"));
        wrap.append(el("span", "eyebrow", "Cảnh một"), el("p", "ph-title", "Khi nào mình gặp nhau?"), box);
      } else {
        const fixed = cur.timeMode === "fixed" && cur.date && cur.hour != null && cur.minute != null;
        wrap.append(el("span", "eyebrow", "Cảnh kết"), HN.ticket({ from, to: cur.to || "Người ấy", when: fixed ? HN.fmtWhen(cur.date, cur.hour, cur.minute) : "", plans: cur.plans || [], dodges: 7, code: "preview" }));
      }
      phone.replaceChildren(wrap);
      if (changed) gsap.from(wrap.children, { y: 20, autoAlpha: 0, stagger: 0.06, duration: 0.45, ease: "back.out(1.6)" });
    }

    /* --- G1 names --- */
    (() => {
      const from = $("#nameFrom"), to = $("#nameTo");
      const DEFAULT_HINT = $("#hTo").textContent;
      let touched = false;
      from.value = d.from || "";
      to.value = d.to || "";
      function refresh() {
        const pf = HN.checkText(from.value, { max: 20, emptyMsg: "Bạn chưa nhập tên" });
        const pt = HN.checkText(to.value, { required: false, max: 20 });
        $("#cFrom").textContent = HN.len(from.value) + "/20";
        $("#cTo").textContent = HN.len(to.value) + "/20";
        const show = touched && pf;
        $("#fFrom").classList.toggle("invalid", !!show);
        $("#hFrom").hidden = !show;
        $("#hFrom").textContent = pf;
        $("#fTo").classList.toggle("invalid", !!pt);
        $("#hTo").textContent = pt || DEFAULT_HINT;
        $("#hTo").classList.toggle("error", !!pt);
        $("#next1").disabled = !!pf || !!pt;
        HN.draft.set({ from: pf ? "" : HN.clean(from.value), to: pt ? "" : HN.clean(to.value) });
      }
      from.addEventListener("input", () => { touched = true; refresh(); renderPhone(true); });
      from.addEventListener("blur", () => { touched = true; refresh(); });
      to.addEventListener("input", () => { refresh(); renderPhone(true); });
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
    function renderTemplates() {
      const cur = HN.draft.get();
      const sel = cur.templateId || "t1";
      const host = $("#templates");
      host.replaceChildren();
      HN.TEMPLATES.forEach((t) => {
        const b = el("button", "choice" + (t.id === sel ? " selected" : ""));
        b.type = "button";
        b.append(el("span", "dot"), el("span", null, HN.renderTemplate(t.text, cur.to)));
        b.addEventListener("click", () => {
          HN.draft.set({ templateId: t.id });
          msg.value = HN.renderTemplate(t.text, HN.draft.get().to);
          renderTemplates();
          renderPhone();
          gsap.fromTo(msg, { scale: 0.97 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
        });
        host.append(b);
      });
      if (!msg.value) msg.value = HN.renderTemplate(HN.TEMPLATES.find((t) => t.id === sel).text, cur.to);
      refreshMsg();
    }
    msg.addEventListener("input", () => { refreshMsg(); renderPhone(); });
    $("#next2").addEventListener("click", () => goStep(3));
    ENTER[2] = renderTemplates;

    /* --- G3 time --- */
    (() => {
      const st = { mode: d.timeMode || null, date: d.date || null, hour: d.hour ?? null, minute: d.minute ?? null };
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
      function setMode(m) {
        const was = st.mode;
        st.mode = m;
        update();
        const pane = m === "fixed" ? $("#fixedPane") : $("#recipientPane");
        if (was !== m) gsap.from(pane, { y: 20, autoAlpha: 0, duration: 0.45, ease: "power3.out" });
      }
      $("#mFixed").addEventListener("click", () => setMode("fixed"));
      $("#mRecipient").addEventListener("click", () => setMode("recipient"));
      function update() {
        $("#mFixed").classList.toggle("selected", st.mode === "fixed");
        $("#mRecipient").classList.toggle("selected", st.mode === "recipient");
        $("#fixedPane").hidden = st.mode !== "fixed";
        $("#recipientPane").hidden = st.mode !== "recipient";
        const ok = st.date && st.hour != null && st.minute != null && !HN.isPast(st.date, st.hour, st.minute);
        $("#when").textContent = ok ? "✓ " + HN.fmtWhen(st.date, st.hour, st.minute) : st.date ? "Chọn giờ và phút" : "Chọn một ngày trên lịch";
        $("#when").classList.toggle("ok", !!ok);
        $("#next3").disabled = !(st.mode === "recipient" || (st.mode === "fixed" && ok));
        HN.draft.set({ timeMode: st.mode, date: st.date, hour: st.hour, minute: st.minute });
        tp.render();
        renderPhone();
      }
      update();
      $("#next3").addEventListener("click", () => goStep(4));
    })();

    /* --- G4 plans --- */
    (() => {
      const chosen = new Set((d.plans || []).filter((id) => HN.planById(id)));
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
        group("an", $("#gAn"));
        group("choi", $("#gChoi"));
        const plans = HN.PLANS.filter((p) => chosen.has(p.id)).map((p) => p.id);
        const nAn = HN.PLANS.filter((p) => p.group === "an" && chosen.has(p.id)).length;
        $("#cntAn").textContent = nAn ? "đã chọn " + nAn : "";
        $("#cntChoi").textContent = plans.length - nAn ? "đã chọn " + (plans.length - nAn) : "";
        $("#counter").textContent = plans.length ? "Đã chọn " + plans.length + " kèo" : "Chọn ít nhất 1 kèo";
        $("#next4").disabled = plans.length === 0;
        HN.draft.set({ plans });
        renderPhone();
      }
      render();
      $("#next4").addEventListener("click", () => goStep(5));
    })();

    /* --- G5 preview: the real receiver flow inside a phone frame --- */
    function loadPreview() {
      const cur = HN.draft.get();
      const inv = { code: "preview", from: cur.from, to: cur.to, message: cur.message, timeMode: cur.timeMode, date: cur.date, hour: cur.hour, minute: cur.minute, plans: cur.plans || [] };
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
        ["Cảnh 1 · Nhân vật chính", "Cảnh 2 · Lời thoại", "Cảnh 3 · Suất chiếu", "Cảnh 4 · Kịch bản"].forEach((label, i) => {
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
      const inv = { code: HN.randomCode(8), from: cur.from, to: cur.to, message: cur.message, timeMode: cur.timeMode, date: cur.date, hour: cur.hour, minute: cur.minute, plans: cur.plans || [] };
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
    gsap.fromTo(".phone", { x: 60, rotation: 6, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.9, ease: "back.out(1.4)", delay: 0.15, clearProps: "transform,opacity" });
  };

  /* =====================================================================
     RECEIVER (N1 to N6, N7 when invalid)
     ===================================================================== */
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
    if (PREVIEW) $("#ribbon").hidden = false;
    const greet = inv.to || "cậu";
    const ans = { date: null, hour: null, minute: null, plans: [], name: inv.to || "", dodges: 0 };
    const steps = $$(".rstep", app);
    let step = 1, busy = false;
    const ENTER = {};

    const env = HN.envelope({ to: greet, from: inv.from });
    $("#rEnv").append(env);
    $("#askTitle").textContent = inv.message;
    $("#nameSub").textContent = "Để " + inv.from + " biết ai đã nhận lời";
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
          gsap.to("#rProg", { scaleX: (n - 1) / 5, duration: 0.5, ease: "power3.out" });
          HN.mountLotties(next);
          if (ENTER[n]) ENTER[n]();
          gsap.fromTo(next, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "power3.out", clearProps: "transform,opacity", onComplete: () => { busy = false; } });
          window.scrollTo(0, 0);
        },
      });
    }
    $$("[data-rback]", app).forEach((b) => b.addEventListener("click", () => goTo(step - 1)));

    /* N1 open the letter */
    const intro = gsap.timeline()
      .fromTo(".recv-card", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", clearProps: "transform,opacity" })
      .fromTo(env, { scale: 0.4, rotation: -12, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 1, ease: "elastic.out(1, 0.55)" }, "-=0.3")
      .fromTo($$('.rstep[data-step="1"] .eyebrow, #openBtn, .trust', app), { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.4, clearProps: "transform,opacity" }, "-=0.6");
    HN.onLeave(() => intro.kill());
    const envFloat = HN.loop(gsap.to(env, { y: -8, duration: 1.6, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    const sealPulse = HN.loop(gsap.to($(".env-seal", env), { scale: 1.12, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    let opened = false;
    function open() {
      if (opened) return;
      opened = true;
      if (sealPulse) sealPulse.kill();
      if (envFloat) envFloat.kill();
      const s = $(".env-seal", env).getBoundingClientRect();
      HN.burst(s.left + s.width / 2, s.top + s.height / 2, 26);
      const t = HN.openEnvelope(env).add(() => goTo(2), "+=0.3");
      HN.onLeave(() => t.kill());
    }
    $("#openBtn").addEventListener("click", open);
    $(".env-seal", env).addEventListener("click", open);
    $("#whatBtn").addEventListener("click", () => HN.toast("Một tấm thiệp mời đi chơi, " + inv.from + " làm riêng cho cậu"));
    $("#reportBtn").addEventListener("click", () => HN.toast("Tính năng báo cáo sẽ có sớm"));

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
    let gone = false, last = 0;
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
    }
    function parkNo() { if (noBtn.parentElement === document.body) noBtn.hidden = true; }
    HN.onLeave(() => noBtn.remove());
    noBtn.addEventListener("mouseenter", dodge);
    noBtn.addEventListener("touchstart", dodge, { passive: false });
    noBtn.addEventListener("pointerdown", dodge);
    noBtn.addEventListener("click", (e) => e.preventDefault());
    yesBtn.addEventListener("click", () => {
      const b = yesBtn.getBoundingClientRect();
      HN.burst(b.left + b.width / 2, b.top + b.height / 2);
      goTo(3);
    });

    /* N3 pick a time */
    if (inv.timeMode === "fixed") {
      Object.assign(ans, { date: inv.date, hour: inv.hour, minute: inv.minute });
      $("#proposal").hidden = false;
      $("#proposal").textContent = inv.from + " đề xuất " + HN.fmtWhen(inv.date, inv.hour, inv.minute) + ". Cậu đổi được nha.";
      $("#timeSub").textContent = "Giữ nguyên hoặc chọn giờ khác";
    }
    HN.calendar($("#rCal"), {
      selected: HN.parseISO(ans.date),
      onSelect(date) {
        ans.date = HN.iso(date);
        if (HN.isPast(ans.date, ans.hour, ans.minute ?? 0)) { ans.hour = null; ans.minute = null; tp.set(null, null); }
        updateTime();
      },
    });
    const tp = HN.timePicker($("#rHours"), $("#rMins"), {
      hour: ans.hour, minute: ans.minute,
      isHourDisabled: (h) => HN.isPast(ans.date, h, 30),
      isMinuteDisabled: (h, m) => h != null && HN.isPast(ans.date, h, m),
      onChange(h, m) { ans.hour = h; ans.minute = m; updateTime(); },
    });
    function updateTime() {
      const ok = ans.date && ans.hour != null && ans.minute != null && !HN.isPast(ans.date, ans.hour, ans.minute);
      $("#rWhen").textContent = ok ? "✓ " + HN.fmtWhen(ans.date, ans.hour, ans.minute) : "Chọn đủ ngày, giờ và phút";
      $("#rWhen").classList.toggle("ok", !!ok);
      $("#next3").disabled = !ok;
      tp.render();
    }
    updateTime();
    $("#next3").addEventListener("click", () => goTo(4));

    /* N4 pick plans */
    const offered = inv.plans.map(HN.planById).filter(Boolean);
    if (offered.length === 1) ans.plans = [offered[0].id];
    function renderPlans() {
      const host = $("#planGrid");
      host.replaceChildren();
      offered.forEach((p) => {
        const on = ans.plans.includes(p.id);
        const b = el("button", "option" + (on ? " selected" : ""));
        b.type = "button";
        b.setAttribute("aria-pressed", String(on));
        b.append(el("span", "badge", p.ico), document.createTextNode(p.name));
        b.addEventListener("click", () => {
          const set = new Set(ans.plans);
          if (set.has(p.id)) set.delete(p.id); else set.add(p.id);
          ans.plans = offered.filter((o) => set.has(o.id)).map((o) => o.id);
          renderPlans();
        });
        host.append(b);
      });
      $("#next4").disabled = ans.plans.length === 0;
    }
    renderPlans();
    ENTER[4] = () => gsap.fromTo("#planGrid > *", { y: 30, scale: 0.8, opacity: 0 }, { y: 0, scale: 1, opacity: 1, stagger: 0.06, duration: 0.45, ease: "back.out(2)", clearProps: "transform,opacity" });
    $("#next4").addEventListener("click", () => goTo(5));

    /* N5 name */
    const rName = $("#rName");
    rName.value = ans.name;
    let touched = !!ans.name;
    function updateName() {
      $("#cName").textContent = HN.len(rName.value) + "/20";
      const p = HN.checkText(rName.value, { max: 20, emptyMsg: "Cậu chưa nhập tên" });
      const show = touched && p;
      $("#fName").classList.toggle("invalid", !!show);
      $("#hName").hidden = !show;
      $("#hName").textContent = p;
      $("#sendBtn").disabled = !!p;
      ans.name = p ? "" : HN.clean(rName.value);
    }
    rName.addEventListener("input", () => { touched = true; updateName(); });
    rName.addEventListener("blur", () => { touched = true; updateName(); });
    updateName();
    $("#sendBtn").addEventListener("click", () => {
      if (!ans.name) return;
      if (!PREVIEW && !DEMO_MODE && !IN_FRAME) {
        HN.responses.add(inv.code, {
          name: ans.name, date: ans.date, hour: ans.hour, minute: ans.minute, plans: ans.plans, dodges: ans.dodges,
          changed: inv.timeMode === "fixed" && (ans.date !== inv.date || ans.hour !== inv.hour || ans.minute !== inv.minute),
          at: new Date().toISOString(),
        });
      }
      goTo(6);
    });

    /* N6 ticket */
    const ticketData = () => ({ from: inv.from, to: ans.name || greet, when: HN.fmtWhen(ans.date, ans.hour, ans.minute), plans: ans.plans, dodges: ans.dodges, code: inv.code });
    ENTER[6] = () => {
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
        { code: "k3x9m2pq", name: "Thiệp gửi Lan", url: "", created, responses: [{ name: "Lan", date: HN.iso(sat), hour: 19, minute: 30, plans: ["trasua", "xemphim"], dodges: 7, changed: false }] },
        { code: "p8wq4tzn", name: "Cuối tuần này đi chơi với tớ nha?", url: "", created, responses: [
          { name: "Hà", date: HN.iso(sat), hour: 19, minute: 30, plans: ["lau"], dodges: 3, changed: true },
          { name: "Vy", date: HN.iso(sun), hour: 9, minute: 0, plans: ["cafe", "daoho"], dodges: 0, changed: false },
          { name: "Ngọc", date: HN.iso(fri), hour: 20, minute: 0, plans: ["karaoke"], dodges: 5, changed: false },
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
      if (r.changed) tags.append(el("span", "tag-warn", "Đã đổi giờ"));
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
