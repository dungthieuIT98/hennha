"use strict";
/* Widgets: month calendar, time dropdowns, segmented tabs, runaway buttons, toast, copy, dialogs. */
(() => {
  const HN = window.HN;
  const { $, $$, el, pad2 } = HN;

  /* ---------- month calendar ---------- */
  HN.calendar = (host, opts) => {
    const min = opts.min || HN.today();
    const max = opts.max || HN.addYears(HN.today(), 1);
    let selected = opts.selected || null;
    let view = new Date((selected || min).getFullYear(), (selected || min).getMonth(), 1);
    host.classList.add("cal");
    function render(dir) {
      host.replaceChildren();
      const head = el("div", "cal-head");
      const prev = el("button", "cal-nav", "‹"); prev.type = "button"; prev.setAttribute("aria-label", HN.t("ui.prevMonth"));
      const next = el("button", "cal-nav", "›"); next.type = "button"; next.setAttribute("aria-label", HN.t("ui.nextMonth"));
      const title = el("strong", null, HN.fmtDate(view, "month"));
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
      HN.t("calDow").forEach((t) => grid.append(el("div", "cal-dow", t)));
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
        b.setAttribute("aria-label", HN.fmtDate(date) + (ev ? HN.t(ev.conflict ? "ui.hasClash" : "ui.hasDate") : ""));
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
      const outside = (e) => { if (!wrap.contains(e.target)) close(); };
      document.addEventListener("pointerdown", outside);
      HN.onLeave(() => document.removeEventListener("pointerdown", outside));
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
    const changed = () => { render(); if (opts.onChange) opts.onChange(hour, minute); };
    const H = dropdown(hoursHost, HN.t("c3.hour"), HN.t("ui.pickHour"), (v) => { hour = v; changed(); });
    const M = dropdown(minsHost, HN.t("c3.min"), HN.t("ui.pickMin"), (v) => { minute = v; changed(); });
    function render() {
      H.set(Array.from({ length: 24 }, (_, h) => ({ value: h, text: HN.t("ui.hourItem", { v: pad2(h) }), disabled: !!(opts.isHourDisabled && opts.isHourDisabled(h)) })), hour);
      M.set([0, 30].map((m) => ({ value: m, text: HN.t("ui.minItem", { v: pad2(m) }), disabled: !!(opts.isMinuteDisabled && opts.isMinuteDisabled(hour, m)) })), minute);
    }
    render();
    return { render, set(h, m) { hour = h; minute = m; render(); } };
  };

  /* ---------- segmented tabs with a sliding indicator (.seg > .seg-ind + .seg-tab[data-tab]) ---------- */
  HN.segTabs = (root, onPick) => {
    const tabs = $$(".seg-tab", root), ind = $(".seg-ind", root);
    const move = (b, instant) => gsap.to(ind, { x: b.offsetLeft, width: b.offsetWidth, duration: instant ? 0 : 0.45, ease: "back.out(1.4)" });
    requestAnimationFrame(() => move(tabs[0], true));
    tabs.forEach((b) => b.addEventListener("click", () => {
      tabs.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      move(b);
      onPick(b.dataset.tab);
    }));
  };

  /* ---------- the runaway NO button: dodge on hover, touch, press and keyboard, never click ---------- */
  HN.dodgeable = (btn, dodge) => {
    btn.addEventListener("pointerdown", dodge);
    btn.addEventListener("touchstart", dodge, { passive: false });
    btn.addEventListener("mouseenter", dodge);
    btn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") dodge(e); });
    btn.addEventListener("click", (e) => e.preventDefault());
  };

  HN.focusHeading = (scope) => {
    const h = $("h1, h2", scope);
    if (!h) return;
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  };

  /* ---------- "how did you hear about us" chips, used on the home page and on the share step ---------- */
  HN.feedback = (host) => {
    const row = el("div", "chip-row");
    HN.SOURCES.forEach((s) => {
      const b = el("button", "chip", HN.t("src." + s));
      b.type = "button";
      b.addEventListener("click", () => {
        HN.local.set("hn-source", { v: s, code: (HN.draft.get().published || {}).code, at: new Date().toISOString() });
        b.classList.add("selected");
        gsap.to(row.children, { autoAlpha: 0, y: -8, stagger: 0.03, duration: 0.2, onComplete: () => { host.replaceChildren(el("p", "thanks", HN.t("c7.thanks"))); gsap.from(host.firstChild, { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: "back.out(2.5)" }); } });
      });
      row.append(b);
    });
    host.replaceChildren(el("p", null, HN.t("c7.fb")), row);
  };

  /* ---------- toast / copy ---------- */
  let toastTimer;
  HN.toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  };
  HN.copy = (text, msg = HN.t("ui.copied")) => {
    const done = () => HN.toast(msg);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => HN.toast(HN.t("ui.copyFail")));
    else HN.toast(HN.t("ui.copyBlocked"));
  };

  /* ---------- dialogs: bottom sheet and ticket image viewer ---------- */
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
  // in-app browsers block downloads, so the image is shown for long-press saving
  HN.shot = (url) => {
    const dlg = el("dialog", "shot");
    const img = el("img", "shot-img");
    img.src = url;
    img.alt = HN.t("ui.shotAlt");
    const hint = el("p", "shot-hint", HN.t("ui.shotHint"));
    hint.id = "shot-" + HN.randomCode(6);
    dlg.setAttribute("aria-labelledby", hint.id);
    const row = el("div", "shot-actions");
    const dl = el("a", "btn btn-ghost btn-sm", HN.t("ui.download"));
    dl.href = url;
    dl.download = "hen-nha.png";
    const closeBtn = el("button", "btn btn-sm", HN.t("ui.close"));
    closeBtn.type = "button";
    closeBtn.autofocus = true;
    row.append(dl, closeBtn);
    dlg.append(img, hint, row);
    const close = modal(dlg, {});
    closeBtn.onclick = () => close();
    gsap.fromTo(dlg, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(img, { y: 60, scale: 0.85, rotation: -4 }, { y: 0, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(1.6)" });
  };
})();
