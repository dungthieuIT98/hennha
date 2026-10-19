"use strict";
/* RECEIVER (N1 to N5, N7 when invalid): open the letter, dodge NO, confirm or pick the time, pick the plan, get the ticket. */
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;
  const DEMO = () => ({ code: "demo00", from: "Minh", to: "Lan", message: HN.renderTemplate(HN.t("tpl.t1"), "Lan"), timeMode: "fixed", date: HN.iso(HN.nextSaturday()), hour: 19, minute: 30, plans: ["trasua", "cafe", "xemphim", "daoho"] });

  HN.SCREENS.n = (r) => {
    const app = $("#app");
    const key = r.parts[1] || "";
    const PREVIEW = r.parts[2] === "preview";
    const DEMO_MODE = key === "demo";
    const inv = DEMO_MODE ? DEMO() : HN.decodeInvite(key);
    if (!inv) {
      const view = $("#tpl-gone").content.cloneNode(true);
      HN.applyI18n(view);
      app.replaceChildren(view);
      gsap.fromTo(".gone > *", { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: "back.out(1.6)", clearProps: "transform,opacity" });
      HN.loop(gsap.to(".gone .big-emoji", { y: -10, rotation: 8, duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut" }));
      return;
    }
    const greet = inv.to || HN.t("you");
    // date and time start as the sender's; the receiver may confirm or replace them, and the sender may have left them open
    const ans = { date: inv.date, hour: inv.hour, minute: inv.minute, plans: [], name: inv.to, dodges: 0 };
    const steps = $$(".rstep", app);
    let step = 1, busy = false, recorded = false;
    const ENTER = {};

    $("#askFrom").textContent = HN.t("recv.letterFrom", { name: inv.from });
    $("#askTitle").textContent = inv.message;
    $("#endH").textContent = HN.t("recv.done");
    $("#endSub").textContent = PREVIEW ? HN.t("recv.previewEnd") : HN.t("recv.willGet", { name: inv.from });
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
          gsap.to("#rProg", { scaleX: (n - 1) / (steps.length - 1), duration: 0.5, ease: "power3.out" });
          HN.mountLotties(next);
          if (ENTER[n]) ENTER[n]();
          gsap.fromTo(next, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "power3.out", clearProps: "transform,opacity", onComplete: () => { busy = false; } });
          window.scrollTo(0, 0);
          HN.focusHeading(next);
        },
      });
    }

    /* N1 letter: the white envelope; once it is open the card moves on to the question */
    const wenv = HN.loveEnvelope({ to: greet });
    $("#love").insertBefore(wenv, $("#loveHint"));
    const heart = $(".nheart", wenv), flap = $(".wenv-flap", wenv);
    const bloom = HN.bloom($("#bloom"));
    gsap.set(wenv, { transformPerspective: 900 });
    const BLOOM_SECONDS = 1;
    const intro = gsap.timeline()
      .fromTo(".recv-card", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", clearProps: "transform,opacity" })
      .fromTo("#loveEyebrow", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, clearProps: "transform,opacity" }, "-=0.3")
      .fromTo(wenv, { y: 60, rotationX: 55, scale: 0.7, opacity: 0 }, { y: 0, rotationX: 0, scale: 1, opacity: 1, duration: 1.1, ease: "elastic.out(1, 0.75)" }, "<")
      .add(HN.growBloom(bloom, BLOOM_SECONDS), "-=0.8")
      .fromTo(heart, { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(3)", clearProps: "transform" }, "-=0.5")
      .fromTo("#loveHint", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, clearProps: "transform,opacity" }, "-=0.2");
    HN.onLeave(() => intro.kill());
    const idle = [
      HN.loop(gsap.to(wenv, { y: -7, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut", delay: intro.duration() })),
      HN.swayBloom(bloom, intro.duration()),
      HN.fine ? null : HN.loop(gsap.fromTo(wenv, { rotationY: -10 }, { rotationY: 10, duration: 3, yoyo: true, repeat: -1, ease: "sine.inOut", delay: intro.duration(), immediateRender: false })),
    ];
    HN.tilt(wenv, 14);

    let opened = false;
    function open() {
      if (opened) return;
      opened = true;
      heart.disabled = true;
      idle.forEach((t) => t && t.kill());
      HN.burstAt(heart, 30);
      const t = gsap.timeline()
        .to(wenv, { y: 0, rotationX: 0, rotationY: 0, duration: 0.4, ease: "power3.out" })
        .to("#loveHint", { opacity: 0, duration: 0.2 }, 0)
        .add(HN.openLove(wenv), 0)
        .to([$(".wenv-back", wenv), $(".wenv-front", wenv), flap, "#bloom"], { opacity: 0, y: 30, duration: 0.45, ease: "power2.in" }, "+=0.15")
        .add(() => goTo(2));
      HN.onLeave(() => t.kill());
    }
    heart.addEventListener("click", open);

    /* N2 the YES / NO joke: NO escapes to <body> so it can run anywhere on screen */
    let askSplit = null;
    ENTER[2] = () => {
      if (!askSplit) askSplit = HN.split($("#askTitle"));
      gsap.fromTo(askSplit, { y: 40, scale: 0.4, rotation: () => gsap.utils.random(-30, 30), opacity: 0 }, { y: 0, scale: 1, rotation: 0, opacity: 1, stagger: 0.02, duration: 0.5, ease: "back.out(2.4)" });
      gsap.from(".ask-emoji", { scale: 0, rotation: -60, duration: 0.7, ease: "back.out(3)" });
      gsap.fromTo("#askButtons > *", { scale: 0 }, { scale: 1, stagger: 0.12, duration: 0.5, ease: "back.out(2.6)", delay: 0.4, clearProps: "transform" });
      HN.loop(gsap.to(".ask-emoji", { rotation: 10, y: -6, duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 0.8 }));
    };
    const yesBtn = $("#yesBtn"), noBtn = $("#noBtn");
    let gone = false, last = 0, autoYes = null;
    function toBody() {
      if (noBtn.parentElement === document.body) return;
      const hadFocus = document.activeElement === noBtn;
      const rect = noBtn.getBoundingClientRect();
      document.body.append(noBtn);
      noBtn.classList.add("runaway-no");
      gsap.set(noBtn, { x: rect.left, y: rect.top });
      if (hadFocus) noBtn.focus({ preventScroll: true });
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
      const noTexts = HN.t("no.texts");
      noBtn.textContent = noTexts[ans.dodges % noTexts.length];
      toBody();
      const w = noBtn.offsetWidth, h = noBtn.offsetHeight, pad = 14, top = 76;
      const maxX = Math.max(pad, innerWidth - w - pad), maxY = Math.max(top, innerHeight - h - pad);
      let x = pad, y = top;
      for (let i = 0; i < 80; i++) {
        const tx = pad + Math.random() * (maxX - pad), ty = top + Math.random() * (maxY - top);
        if (tx + w < cx - hw || tx > cx + hw || ty + h < cy - hh || ty > cy + hh) { x = tx; y = ty; break; }
      }
      gsap.to(noBtn, { x, y, rotation: gsap.utils.random(-15, 15), scale: Math.max(1 - ans.dodges * 0.05, 0.7), duration: 0.3, ease: "back.out(2)" });
    }
    function flee() {
      gone = true;
      if (document.activeElement === noBtn) yesBtn.focus({ preventScroll: true });
      toBody();
      gsap.to(noBtn, { x: "+=" + innerWidth * 0.6, y: "-=" + innerHeight * 0.7, rotation: 60, scale: 0.3, autoAlpha: 0, duration: 0.7, ease: "power2.in", onComplete: () => { noBtn.hidden = true; } });
      const m = $("#runawayMsg");
      m.hidden = false;
      gsap.from(m, { y: 10, autoAlpha: 0, duration: 0.35 });
      autoYes = gsap.delayedCall(1.3, () => yesBtn.click());
      HN.onLeave(() => autoYes.kill());
    }
    function parkNo() { if (noBtn.parentElement === document.body) noBtn.hidden = true; }
    HN.onLeave(() => noBtn.remove());
    HN.dodgeable(noBtn, dodge);
    yesBtn.addEventListener("click", () => {
      if (autoYes) autoYes.kill();
      HN.burstAt(yesBtn);
      goTo(3);
    });

    /* N3 time: confirm the sender's time or pick another; when the sender left it open it goes straight to the picker */
    const fixedTime = inv.timeMode === "fixed";
    const pk = { date: null, hour: null, minute: null };
    function showTime(mode) {
      $("#timeFixed").hidden = mode !== "confirm";
      $("#timePick").hidden = mode !== "pick";
      $("#timeH").textContent = HN.t(mode === "confirm" ? "recv.timeH" : "recv.timePickH", { name: inv.from });
    }
    if (fixedTime) $("#timeWhen").textContent = HN.fmtWhen(inv.date, inv.hour, inv.minute);
    HN.calendar($("#rCal"), {
      selected: null,
      onSelect(date) {
        pk.date = HN.iso(date);
        if (HN.isPast(pk.date, pk.hour, pk.minute ?? 0)) { pk.hour = null; pk.minute = null; }
        rtp.set(pk.hour, pk.minute);
        timeUpdate();
      },
    });
    const rtp = HN.timePicker($("#rHours"), $("#rMins"), {
      hour: null, minute: null,
      isHourDisabled: (h) => HN.isPast(pk.date, h, 30),
      isMinuteDisabled: (h, m) => h != null && HN.isPast(pk.date, h, m),
      onChange(h, m) {
        pk.hour = h; pk.minute = m;
        if (h != null && m != null && HN.isPast(pk.date, h, m)) { pk.minute = null; rtp.set(h, null); }
        timeUpdate();
      },
    });
    function timeUpdate() {
      const ok = pk.date && pk.hour != null && pk.minute != null && !HN.isPast(pk.date, pk.hour, pk.minute);
      $("#rWhen").textContent = ok ? "✓ " + HN.fmtWhen(pk.date, pk.hour, pk.minute) : HN.t(pk.date ? "c3.pickTime" : "c3.pickDay");
      $("#rWhen").classList.toggle("ok", !!ok);
      $("#timeNext").disabled = !ok;
      rtp.render();
    }
    timeUpdate();
    ENTER[3] = () => showTime(fixedTime ? "confirm" : "pick");
    $("#timeOk").addEventListener("click", () => goTo(4));
    $("#timeOther").addEventListener("click", () => {
      showTime("pick");
      HN.focusHeading($("#timePick").parentElement);
    });
    $("#timeNext").addEventListener("click", () => {
      Object.assign(ans, { date: pk.date, hour: pk.hour, minute: pk.minute });
      goTo(4);
    });

    /* N4 plan: the one plan the sender offered, a pick among several, or any plan; plus the name to sign with */
    const offered = HN.planList(inv.plans);
    const offeredView = offered.length === 1 ? "one" : "many";
    let pview = offeredView, picked = offered.length === 1 ? offered[0].id : null, rtab = "an", signTouched = false;
    const sign = $("#signName");
    sign.value = inv.to || "";
    const signError = () => HN.checkText(sign.value, { max: 20, emptyMsg: HN.t("recv.errSign") });
    const PVIEW_KEY = { one: "recv.planOne", many: "recv.planMany", all: "recv.planAll" };

    function planOptions(host, list, focusId) {
      host.replaceChildren();
      list.forEach((p) => {
        const on = p.id === picked;
        const b = el("button", "option" + (on ? " selected" : ""));
        b.type = "button";
        b.dataset.id = p.id;
        b.setAttribute("aria-pressed", String(on));
        const badge = el("span", "badge", p.ico);
        badge.setAttribute("aria-hidden", "true");
        b.append(badge, document.createTextNode(HN.planName(p)));
        b.addEventListener("click", () => {
          picked = p.id;
          renderPlans(p.id);
          planState();
          gsap.fromTo($(".badge", $$(".option", host).find((x) => x.dataset.id === p.id)), { scale: 0.5, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" });
        });
        host.append(b);
        if (p.id === focusId) b.focus({ preventScroll: true });
      });
    }
    function renderPlans(focusId) {
      $("#planOne").hidden = pview !== "one";
      $("#planMany").hidden = pview !== "many";
      $("#planAll").hidden = pview !== "all";
      $("#planOneActions").hidden = pview !== "one";
      $("#planDone").hidden = pview === "one";
      $("#planH").textContent = HN.t(PVIEW_KEY[pview] + "H", { name: inv.from });
      $("#planSub").textContent = HN.t(PVIEW_KEY[pview] + "Sub", { name: inv.from });
      if (pview === "one") {
        const p = offered[0];
        const badge = el("span", "badge", p.ico);
        badge.setAttribute("aria-hidden", "true");
        $("#planOneCard").replaceChildren(badge, el("strong", null, HN.planName(p)), el("small", null, HN.t("group." + p.group)));
      }
      if (pview === "many") planOptions($("#rPlanList"), offered, focusId);
      if (pview === "all") {
        $$("[data-rtab]", app).forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.rtab === rtab)));
        planOptions($("#rPlanAll"), HN.PLANS.filter((p) => p.group === rtab), focusId);
      }
      $("#planBack").hidden = false;
      $("#planBack").textContent = HN.t("recv.planBack", { name: inv.from });
    }
    function planState() {
      const err = signError();
      const show = signTouched && !!err;
      $("#fSign").classList.toggle("invalid", show);
      sign.setAttribute("aria-invalid", String(show));
      $("#hSign").hidden = !show;
      $("#hSign").textContent = err || "";
      $("#cSign").textContent = HN.len(sign.value) + "/20";
      const ready = !err && !!picked;
      $("#planOk").disabled = !ready;
      $("#planDone").disabled = !ready;
    }
    function setPview(v) {
      pview = v;
      picked = v === "one" ? offered[0].id : null;
      renderPlans();
      planState();
      HN.focusHeading($("#planH").parentElement);
    }
    ENTER[4] = () => { renderPlans(); planState(); };
    sign.addEventListener("input", () => { signTouched = true; planState(); });
    sign.addEventListener("blur", () => { signTouched = true; planState(); });
    $("#planPropose").addEventListener("click", () => setPview("all"));
    $("#planOther").addEventListener("click", () => setPview("all"));
    $("#planBack").addEventListener("click", () => setPview(offeredView));
    $$("[data-rtab]", app).forEach((t) => t.addEventListener("click", () => {
      if (rtab === t.dataset.rtab) return;
      rtab = t.dataset.rtab;
      renderPlans();
      gsap.fromTo($$(".option", $("#rPlanAll")), { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.03, duration: 0.3, clearProps: "transform,opacity" });
    }));
    function finish() {
      if (signError() || !picked) { signTouched = true; planState(); return; }
      ans.plans = [picked];
      ans.name = HN.clean(sign.value);
      if (!PREVIEW && !DEMO_MODE && !HN.IN_FRAME && !recorded) {
        recorded = true;
        HN.responses.add(inv.code, { name: ans.name, date: ans.date, hour: ans.hour, minute: ans.minute, plans: ans.plans, dodges: ans.dodges, at: new Date().toISOString() });
      }
      goTo(5);
    }
    $("#planOk").addEventListener("click", finish);
    $("#planDone").addEventListener("click", finish);

    /* N5 ticket */
    const ticketData = () => ({ from: inv.from, to: ans.name || greet, when: HN.fmtWhen(ans.date, ans.hour, ans.minute), plans: ans.plans, dodges: ans.dodges, code: inv.code });
    ENTER[5] = () => {
      const tk = HN.ticket(ticketData());
      $("#rTicket").replaceChildren(tk);
      HN.tilt(tk, 12);
      gsap.timeline()
        .fromTo(tk, { rotationX: -70, y: 80, opacity: 0, transformPerspective: 900 }, { rotationX: 0, y: 0, opacity: 1, duration: 1, ease: "elastic.out(1, 0.6)" })
        .fromTo($$(".t-row", tk), { x: -30, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.08, duration: 0.4, ease: "power3.out" }, "-=0.6")
        .fromTo(".end-actions .btn, #saveBtn", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.4, clearProps: "transform,opacity" }, "-=0.3");
      gsap.delayedCall(0.2, () => HN.burst(innerWidth / 2, innerHeight * 0.35, 44));
    };
    // aria-busy rather than disabled so keyboard focus stays on the button while the image renders
    let saving = false;
    $("#saveBtn").addEventListener("click", async () => {
      if (saving) return;
      saving = true;
      const btn = $("#saveBtn"), label = btn.textContent;
      btn.setAttribute("aria-busy", "true");
      btn.textContent = HN.t("recv.saving");
      try { HN.shot(await HN.ticketImage(ticketData())); } catch (e) { console.error(e); HN.toast(HN.t("recv.saveFail")); }
      btn.textContent = label;
      btn.removeAttribute("aria-busy");
      saving = false;
    });
    $("#calBtn").addEventListener("click", () => {
      const range = HN.eventRange(ans.date, ans.hour, ans.minute);
      if (!range) return;
      const title = HN.t("cal.title", { name: inv.from }), details = HN.t("cal.details", { plans: HN.planText(ans.plans) });
      const icsUrl = URL.createObjectURL(new Blob([HN.icsText(title, details, range)], { type: "text/calendar" }));
      HN.sheet((sh) => {
        const g = el("a", "btn btn-block", "Google Calendar");
        g.href = HN.gcalUrl(title, details, range); g.target = "_blank"; g.rel = "noopener noreferrer";
        const i = el("a", "btn btn-ghost btn-block", HN.t("recv.ics"));
        i.href = icsUrl; i.download = "hen-nha.ics";
        sh.append(el("h3", null, HN.t("addCal")), el("p", "sub", HN.fmtWhen(ans.date, ans.hour, ans.minute)), g, i);
      });
      setTimeout(() => URL.revokeObjectURL(icsUrl), 120000);
    });
    $("#mineBtn").addEventListener("click", () => {
      if (PREVIEW || HN.IN_FRAME) { HN.toast(HN.t("recv.mineDemo")); return; }
      HN.session.set("hn-ref", inv.code);
      location.hash = "#/create";
    });
  };
})();
