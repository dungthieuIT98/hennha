"use strict";
/* CREATE (G1 to G7): names, message, time, plans, preview, pricing + consent, share. */
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;

  // fields follow the id convention f<Key> wrapper, h<Key> error hint, c<Key> counter
  const field = (key, input, max) => (error, show = true) => {
    $("#c" + key).textContent = HN.len(input.value) + "/" + max;
    const bad = !!(show && error);
    $("#f" + key).classList.toggle("invalid", bad);
    input.setAttribute("aria-invalid", String(bad));
    $("#h" + key).hidden = !bad;
    $("#h" + key).textContent = error;
  };
  const draftInvite = (code) => {
    const cur = HN.draft.get();
    return { code, from: cur.from, to: cur.to, message: cur.message, timeMode: "fixed", date: cur.date, hour: cur.hour, minute: cur.minute, plans: cur.plans || [] };
  };

  HN.SCREENS.create = () => {
    HN.syncOutbox();
    const app = $("#app");
    const steps = $$(".cstep", app);
    const ENTER = {};
    let d = HN.draft.get();
    let step = Math.min(Math.max(1, Number(d.step) || 1), 7);
    if (step === 7 && !d.published) step = 6;
    let busy = false;

    const stepperHost = $("#stepper");
    const bar = el("div", "st-bar");
    bar.append(el("i", "st-fill"));
    stepperHost.append(bar);
    HN.t("create.steps").forEach((l, i) => {
      const b = el("button", "st-node");
      b.type = "button";
      b.setAttribute("aria-label", HN.t("create.stepAria", { n: i + 1, label: l }));
      b.append(el("span", "st-dot", String(i + 1)), el("span", "st-label", l));
      b.addEventListener("click", () => { if (i + 1 < step && step < 7) goStep(i + 1); });
      stepperHost.append(b);
    });
    function updateStepper() {
      $$(".st-node", app).forEach((n, i) => {
        n.classList.toggle("done", i + 1 < step);
        n.classList.toggle("current", i + 1 === step);
        if (i + 1 === step) n.setAttribute("aria-current", "step"); else n.removeAttribute("aria-current");
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
          HN.focusHeading(next);
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
      const showFrom = field("From", from, 20), showTo = field("To", to, 20);
      let touched = false, toTouched = false;
      from.value = d.from || "";
      to.value = d.to || "";
      function refresh() {
        const pf = HN.checkText(from.value, { max: 20, emptyMsg: HN.t("c1.errFrom") });
        const pt = HN.checkText(to.value, { max: 20, emptyMsg: HN.t("c1.errTo") });
        showFrom(pf, touched);
        showTo(pt, toTouched);
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
    const showMsg = field("Msg", msg, 100);
    msg.value = d.message || "";
    function refreshMsg() {
      const p = HN.checkText(msg.value, { max: 100, emptyMsg: HN.t("c2.errMsg") });
      showMsg(p);
      $("#next2").disabled = !!p;
      HN.draft.set({ message: p ? "" : HN.clean(msg.value) });
    }
    const tplButtons = [];
    const tplText = (t) => HN.renderTemplate(HN.t("tpl." + t.id), HN.draft.get().to);
    function markTemplates() {
      const now = HN.clean(msg.value);
      tplButtons.forEach(({ b, t }) => {
        const on = now === HN.clean(tplText(t));
        b.classList.toggle("selected", on);
        b.setAttribute("aria-pressed", String(on));
      });
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
        $("#when").textContent = ok ? "✓ " + HN.fmtWhen(st.date, st.hour, st.minute) : HN.t(st.date ? "c3.pickTime" : "c3.pickDay");
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
          const badge = el("span", "badge", p.ico);
          badge.setAttribute("aria-hidden", "true");
          b.append(badge, document.createTextNode(HN.planName(p)));
          b.addEventListener("click", () => {
            if (chosen.has(p.id)) chosen.delete(p.id); else chosen.add(p.id);
            render();
            const nb = $$(".option", host).find((x) => x.textContent.endsWith(HN.planName(p)));
            if (nb) {
              nb.focus({ preventScroll: true });
              gsap.fromTo($(".badge", nb), { scale: 0.5, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" });
            }
          });
          host.append(b);
        });
      }
      function render() {
        group(tab, $("#planList"));
        $$("[data-ptab]", app).forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.ptab === tab)));
        const plans = HN.PLANS.filter((p) => chosen.has(p.id)).map((p) => p.id);
        const nAn = HN.PLANS.filter((p) => p.group === "an" && chosen.has(p.id)).length;
        $("#cntAn").textContent = nAn ? "(" + nAn + ")" : "";
        $("#cntChoi").textContent = plans.length - nAn ? "(" + (plans.length - nAn) + ")" : "";
        $("#counter").textContent = plans.length ? HN.t("c4.count", { n: plans.length }) : HN.t("c4.none");
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
      const enc = HN.encodeInvite(draftInvite("preview"));
      const ok = !!HN.decodeInvite(enc);
      if (!ok) HN.toast(HN.t("c5.fallback"));
      const f = document.createElement("iframe");
      f.title = HN.t("c5.frame");
      f.src = HN.inviteUrl((ok ? enc : "demo") + "/preview");
      $("#previewHost").replaceChildren(f);
    }
    ENTER[5] = loadPreview;
    $("#replay").addEventListener("click", loadPreview);
    $("#editBtn").addEventListener("click", () => {
      HN.sheet((sh, close) => {
        const list = el("div", "edit-list");
        ["c1", "c2", "c3", "c4"].forEach((c, i) => {
          const b = el("button", "btn btn-ghost btn-block", HN.t(c + ".eyebrow"));
          b.type = "button";
          b.addEventListener("click", () => close(() => goStep(i + 1)));
          list.append(b);
        });
        sh.append(el("h3", null, HN.t("c5.editH")), el("p", "sub", HN.t("c5.editSub")), list);
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
          b.setAttribute("aria-pressed", String(p.id === chosen));
          const body = el("span", "c-body");
          const t = el("span", "c-title", HN.t("price." + p.id + ".t"));
          if (p.pill) t.append(el("span", "pill", HN.t("price." + p.id + ".pill")));
          body.append(t, el("span", "c-sub", HN.t("price." + p.id + ".s")));
          b.append(el("span", "dot"), body, el("b", "c-price", HN.fmtVnd(p.price)));
          b.addEventListener("click", () => {
            chosen = p.id;
            HN.draft.set({ plan: chosen });
            renderPricing();
            $("#pricing .selected").focus({ preventScroll: true });
          });
          host.append(b);
        });
      }
      renderPricing();
      const update = () => {
        const ok = $("#age").checked && $("#terms").checked;
        $("#createBtn").disabled = !ok;
        $("#hCreate").hidden = ok;
      };
      $("#age").addEventListener("change", update);
      $("#terms").addEventListener("change", update);
      update();
      $("#createBtn").addEventListener("click", () => {
        if (chosen === "free" || HN.PAYMENT_ENABLED) { publish(chosen); return; }
        // fake door: paid plans are not on sale yet, so log the interest and give the card away
        const log = HN.local.get("hn-fakedoor", []);
        (Array.isArray(log) ? log : []).push({ plan: chosen, at: new Date().toISOString() });
        HN.local.set("hn-fakedoor", log);
        HN.sheet((sh, close) => {
          const ok = el("button", "btn btn-block", HN.t("c6.freeBtn"));
          ok.type = "button";
          ok.addEventListener("click", () => close(() => publish(chosen)));
          const gift = el("div", "big-emoji", "🎁");
          gift.setAttribute("aria-hidden", "true");
          sh.append(gift, el("h3", null, HN.t("c6.soonH")), el("p", "sub", HN.t("c6.soonP")), ok);
        });
      });
    })();

    function publish(plan) {
      const inv = draftInvite(HN.randomCode(8));
      const enc = HN.encodeInvite(inv);
      if (!HN.decodeInvite(enc)) { HN.toast(HN.t("c6.missing")); return; }
      const url = HN.inviteUrl(enc);
      const created = HN.today();
      HN.invites.add({
        code: inv.code, name: inv.to ? HN.t("inv.for", { name: inv.to }) : HN.cut(inv.message, 40), url,
        created: HN.iso(created), expires: HN.iso(HN.addDays(created, HN.KEEP_DAYS)), plan, consentAt: new Date().toISOString(), ref: HN.session.get("hn-ref", null),
      });
      HN.draft.set({ published: { code: inv.code, url } });
      // second copy goes to the server in the background; if it can't be sent now it is retried on a later visit
      HN.outbox.add(inv);
      HN.syncOutbox();
      HN.updateCount();
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
    // optional field: the hint always shows, as advice or as the error
    const share = $("#shareMsg");
    const refreshShare = () => {
      const p = HN.checkText(share.value, { required: false, max: 100 });
      $("#cShare").textContent = HN.len(share.value) + "/100";
      $("#fShare").classList.toggle("invalid", !!p);
      share.setAttribute("aria-invalid", String(!!p));
      $("#hShare").textContent = p || HN.t("c7.shareHint");
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
      HN.copy((text ? text + " " : "") + pub.url, HN.t("c7.copied"));
    });
    const fb = $("#fbOpts");
    HN.SOURCES.forEach((s) => {
      const b = el("button", "chip", HN.t("src." + s));
      b.type = "button";
      b.addEventListener("click", () => {
        HN.local.set("hn-source", { v: s, code: (HN.draft.get().published || {}).code, at: new Date().toISOString() });
        b.classList.add("selected");
        gsap.to(fb.children, { autoAlpha: 0, y: -8, stagger: 0.03, duration: 0.2, onComplete: () => { $("#fb").replaceChildren(el("p", "thanks", HN.t("c7.thanks"))); gsap.from(".thanks", { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: "back.out(2.5)" }); } });
      });
      fb.append(b);
    });
    $("#newBtn").addEventListener("click", () => { HN.draft.clear(); HN.render(); });

    if (step >= 2) renderTemplates();
    goStep(step, false);
    if (step <= 4) gsap.fromTo($$(".cstep.active > *", app), { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity" });
  };
})();
