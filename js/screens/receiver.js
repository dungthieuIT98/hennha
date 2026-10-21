"use strict";
/* RECEIVER (N1 tới N5, N7 khi link hỏng), 16/10:
   N1 mở thư -> N2 câu rủ, YES / né nút Không -> N3 giờ hẹn (giờ chọn sẵn: xác nhận hoặc đề xuất giờ khác; để người nhận chọn: tự chọn)
   -> N4 kèo (chọn trong danh sách người gửi, hoặc đề xuất từ danh sách chung) + ký tên -> N5 thiệp hẹn để lưu ảnh. */
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;
  const STEPS = 5;
  const DEMO = () => ({ code: "demo00", from: "Minh", to: "Lan", message: HN.renderTemplate(HN.t("tpl.t1"), "Lan"), timeMode: "fixed", date: HN.iso(HN.nextSaturday()), hour: 19, minute: 30, plans: ["trasua", "cafe", "xemphim"] });

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
    const PICK = inv.timeMode === "pick";
    const offered = HN.planList(inv.plans).map((p) => p.id);
    const ans = { date: inv.date, hour: inv.hour, minute: inv.minute, plans: offered.slice(), name: inv.to || "", dodges: 0, timeProposed: false, plansProposed: false };
    const steps = $$(".rstep", app);
    let step = 1, busy = false, recorded = false;
    const ENTER = {};

    $("#askTitle").textContent = inv.message;
    $("#askFrom").textContent = HN.t("recv.letterFrom", { name: inv.from });
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
          gsap.to("#rProg", { scaleX: (n - 1) / (STEPS - 1), duration: 0.5, ease: "power3.out" });
          HN.mountLotties(next);
          if (ENTER[n]) ENTER[n]();
          gsap.fromTo(next, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "power3.out", clearProps: "transform,opacity", onComplete: () => { busy = false; } });
          window.scrollTo(0, 0);
          HN.focusHeading(next);
        },
      });
    }

    /* N1 thư: phong bì trắng, hoa nở; chạm tim thì mở thư rồi vào thẳng câu rủ */
    const wenv = HN.loveEnvelope({ to: greet });
    $("#love").insertBefore(wenv, $("#loveHint"));
    const heart = $(".nheart", wenv);
    const bloom = HN.bloom($("#bloom"));
    gsap.set(wenv, { transformPerspective: 900 });
    const intro = gsap.timeline()
      .fromTo(".recv-card", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", clearProps: "transform,opacity" })
      .fromTo("#loveEyebrow", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, clearProps: "transform,opacity" }, "-=0.3")
      .fromTo(wenv, { y: 60, rotationX: 55, scale: 0.7, opacity: 0 }, { y: 0, rotationX: 0, scale: 1, opacity: 1, duration: 1.1, ease: "elastic.out(1, 0.75)" }, "<")
      .add(HN.growBloom(bloom, 1), "-=0.8")
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
        .add(() => goTo(2), "+=0.35");
      HN.onLeave(() => t.kill());
    }
    heart.addEventListener("click", open);

    /* N2 câu rủ YES / Không: nút Không thoát ra <body> để chạy khắp màn hình */
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

    /* N3 giờ hẹn */
    const st = { date: null, hour: null, minute: null };
    const day = () => st.date || HN.iso(HN.today());
    let cal = null, tp = null;
    const timeOk = () => !!st.date && st.hour != null && st.minute != null && !HN.isPast(st.date, st.hour, st.minute);
    function refreshTime() {
      const ok = timeOk();
      $("#rWhen").textContent = ok ? "✓ " + HN.fmtWhen(st.date, st.hour, st.minute) : HN.t(st.date ? "c3.pickTime" : "c3.pickDay");
      $("#rWhen").classList.toggle("ok", ok);
      $("#timeNext").disabled = !ok;
      if (tp) tp.render();
    }
    function showPicker(title, seed) {
      Object.assign(st, seed);
      if (st.date && HN.isPast(st.date, 23, 59)) Object.assign(st, { date: null, hour: null, minute: null });
      $("#timeH").textContent = title;
      $("#timeFixed").hidden = true;
      $("#timePick").hidden = false;
      if (!cal) {
        cal = HN.calendar($("#rCal"), {
          selected: HN.parseISO(st.date),
          onSelect(date) {
            st.date = HN.iso(date);
            if (st.hour != null && HN.isPast(st.date, st.hour, st.minute ?? 0)) { st.hour = null; st.minute = null; }
            tp.set(st.hour, st.minute);
            refreshTime();
          },
        });
        // giờ hoặc phút trước thời điểm hiện tại thì làm mờ; chưa chọn ngày thì tính theo hôm nay
        tp = HN.timePicker($("#rHours"), $("#rMins"), {
          hour: st.hour, minute: st.minute,
          isHourDisabled: (h) => HN.isPast(day(), h, 30),
          isMinuteDisabled: (h, m) => h != null && HN.isPast(day(), h, m),
          onChange(h, m) {
            st.hour = h; st.minute = m;
            if (h != null && m != null && HN.isPast(day(), h, m)) { st.minute = null; tp.set(h, null); }
            refreshTime();
          },
        });
      } else {
        cal.setSelected(HN.parseISO(st.date));
        tp.set(st.hour, st.minute);
      }
      refreshTime();
      gsap.fromTo("#timePick", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, clearProps: "transform,opacity" });
    }
    ENTER[3] = () => {
      if (!$("#timePick").hidden) return;
      if (PICK) { showPicker(HN.t("recv.timePickH"), { date: null, hour: null, minute: null }); return; }
      $("#timeH").textContent = HN.t("recv.timeH", { name: inv.from });
      $("#timeWhen").textContent = HN.fmtWhen(inv.date, inv.hour, inv.minute);
      $("#timeFixed").hidden = false;
      gsap.fromTo("#timeWhen", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)", clearProps: "transform,opacity" });
    };
    $("#timeOk").addEventListener("click", () => {
      Object.assign(ans, { date: inv.date, hour: inv.hour, minute: inv.minute, timeProposed: false });
      goTo(4);
    });
    $("#timeOther").addEventListener("click", () => {
      showPicker(HN.t("recv.timeProposeH"), { date: inv.date, hour: inv.hour, minute: inv.minute });
      $("#timeH").focus({ preventScroll: true });
    });
    $("#timeNext").addEventListener("click", () => {
      // để trang mở lâu, giờ đã chọn có thể trôi về quá khứ: kiểm tra lại lúc bấm
      if (!timeOk()) { st.hour = null; st.minute = null; tp.set(null, null); refreshTime(); return; }
      const same = !PICK && st.date === inv.date && st.hour === inv.hour && st.minute === inv.minute;
      Object.assign(ans, { date: st.date, hour: st.hour, minute: st.minute, timeProposed: !PICK && !same });
      goTo(4);
    });

    /* N4 kèo: "one" (người gửi đưa 1 kèo), "many" (chọn một hoặc vài kèo), "all" (đề xuất từ danh sách chung) + ký tên */
    const chosen = new Set(), proposed = new Set();
    let planMode = offered.length === 1 ? "one" : offered.length ? "many" : "all";
    let allTab = "an", signTouched = false;
    const sign = $("#signName");
    sign.value = ans.name;
    function optionButton(p, set) {
      const b = el("button", "option" + (set.has(p.id) ? " selected" : ""));
      b.type = "button";
      b.setAttribute("aria-pressed", String(set.has(p.id)));
      const badge = el("span", "badge", p.ico);
      badge.setAttribute("aria-hidden", "true");
      b.append(badge, document.createTextNode(HN.planName(p)));
      b.addEventListener("click", () => {
        if (set.has(p.id)) set.delete(p.id); else set.add(p.id);
        b.classList.toggle("selected", set.has(p.id));
        b.setAttribute("aria-pressed", String(set.has(p.id)));
        gsap.fromTo(badge, { scale: 0.5, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" });
        refreshPlans();
      });
      return b;
    }
    const signError = () => HN.checkText(sign.value, { max: 20, emptyMsg: HN.t("recv.errSign") });
    function refreshPlans() {
      const err = signError();
      $("#cSign").textContent = HN.len(sign.value) + "/20";
      const bad = !!(signTouched && err);
      $("#fSign").classList.toggle("invalid", bad);
      sign.setAttribute("aria-invalid", String(bad));
      $("#hSign").hidden = !bad;
      $("#hSign").textContent = bad ? err : "";
      $("#planDone").disabled = !!err || !(planMode === "all" ? proposed : chosen).size;
      $("#planOk").disabled = !!err;
    }
    function renderPlans() {
      const one = planMode === "one", many = planMode === "many", all = planMode === "all";
      $("#planOne").hidden = !one;
      $("#planMany").hidden = !many;
      $("#planAll").hidden = !all;
      $("#planOneActions").hidden = !one;
      $("#planDone").hidden = one;
      let sub = "";
      if (one) {
        const p = HN.planById(offered[0]);
        $("#planH").textContent = HN.t("recv.planOneH", { name: inv.from });
        const ico = el("span", "ico", p.ico);
        ico.setAttribute("aria-hidden", "true");
        $("#planOneCard").replaceChildren(ico, el("b", null, HN.planName(p)));
      } else if (many) {
        $("#planH").textContent = HN.t("recv.planManyH");
        sub = HN.t("recv.planManySub");
        $("#rPlanList").replaceChildren(...HN.planList(offered).map((p) => optionButton(p, chosen)));
      } else {
        $("#planH").textContent = HN.t("recv.planManyH");
        sub = HN.t("recv.planAllSub", { name: inv.from });
        $$("[data-rtab]", app).forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.rtab === allTab)));
        $("#rPlanAll").replaceChildren(...HN.PLANS.filter((p) => p.group === allTab).map((p) => optionButton(p, proposed)));
        $("#planBack").hidden = !offered.length;
        $("#planBack").textContent = HN.t("recv.planBack", { name: inv.from });
      }
      $("#planSub").textContent = sub;
      $("#planSub").hidden = !sub;
      refreshPlans();
    }
    function switchPlans(mode) {
      planMode = mode;
      renderPlans();
      gsap.fromTo([$("#planOne"), $("#planMany"), $("#planAll")].filter((n) => !n.hidden), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, clearProps: "transform,opacity" });
      $("#planH").tabIndex = -1;
      $("#planH").focus({ preventScroll: true });
    }
    sign.addEventListener("input", () => { signTouched = true; refreshPlans(); });
    sign.addEventListener("blur", () => { signTouched = true; refreshPlans(); });
    $$("[data-rtab]", app).forEach((t) => t.addEventListener("click", () => {
      if (allTab === t.dataset.rtab) return;
      allTab = t.dataset.rtab;
      renderPlans();
    }));
    $("#planPropose").addEventListener("click", () => switchPlans("all"));
    $("#planOther").addEventListener("click", () => switchPlans("all"));
    $("#planBack").addEventListener("click", () => switchPlans(offered.length === 1 ? "one" : "many"));
    $("#planOk").addEventListener("click", () => finishPlans([offered[0]], false));
    $("#planDone").addEventListener("click", () => {
      if (planMode === "all") finishPlans([...proposed], true);
      else finishPlans(offered.filter((id) => chosen.has(id)), false);
    });
    function finishPlans(ids, isProposal) {
      signTouched = true;
      if (signError() || !ids.length) { refreshPlans(); return; }
      ans.plans = HN.PLANS.filter((p) => ids.includes(p.id)).map((p) => p.id);
      ans.plansProposed = isProposal;
      ans.name = HN.clean(sign.value);
      if (!PREVIEW && !DEMO_MODE && !HN.IN_FRAME && !recorded) {
        recorded = true;
        HN.responses.add(inv.code, { name: ans.name, date: ans.date, hour: ans.hour, minute: ans.minute, plans: ans.plans, dodges: ans.dodges, timeProposed: ans.timeProposed, plansProposed: ans.plansProposed, at: new Date().toISOString() });
      }
      goTo(5);
    }
    ENTER[4] = renderPlans;

    /* N5 thiệp hẹn: mục nào người nhận đề xuất thì có nhãn, kèm dòng chờ người gửi chốt */
    const cardData = () => ({ from: inv.from, to: ans.name || greet, when: HN.fmtWhen(ans.date, ans.hour, ans.minute), plans: ans.plans, timeProposed: ans.timeProposed, plansProposed: ans.plansProposed });
    ENTER[5] = () => {
      const proposal = ans.timeProposed || ans.plansProposed;
      $("#endH").textContent = proposal ? HN.t("recv.doneProposed", { name: inv.from }) : HN.t("recv.done");
      $("#endSub").textContent = PREVIEW ? HN.t("recv.previewEnd") : HN.t(proposal ? "recv.willGetProposal" : "recv.willGet", { name: inv.from });
      // giờ còn đang đề xuất (chưa chốt) thì chưa cho thêm vào lịch
      $("#calBtn").hidden = ans.timeProposed || !HN.eventRange(ans.date, ans.hour, ans.minute);
      const tk = HN.ticket(cardData());
      $("#rTicket").replaceChildren(tk);
      HN.tilt(tk, 12);
      gsap.timeline()
        .fromTo(tk, { rotationX: -70, y: 80, opacity: 0, transformPerspective: 900 }, { rotationX: 0, y: 0, opacity: 1, duration: 1, ease: "elastic.out(1, 0.6)" })
        .fromTo($$(".t-row, .t-wait", tk), { x: -30, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.08, duration: 0.4, ease: "power3.out" }, "-=0.6")
        .fromTo(".end-actions .btn, #saveBtn", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.4, clearProps: "transform,opacity" }, "-=0.3");
      gsap.delayedCall(0.2, () => HN.burst(innerWidth / 2, innerHeight * 0.35, 44));
    };
    // aria-busy thay vì disabled để focus bàn phím vẫn ở trên nút trong lúc vẽ ảnh
    let saving = false;
    $("#saveBtn").addEventListener("click", async () => {
      if (saving) return;
      saving = true;
      const btn = $("#saveBtn"), label = btn.textContent;
      btn.setAttribute("aria-busy", "true");
      btn.textContent = HN.t("recv.saving");
      try { HN.shot(await HN.ticketImage(cardData())); } catch (e) { console.error(e); HN.toast(HN.t("recv.saveFail")); }
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
