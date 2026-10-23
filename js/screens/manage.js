"use strict";
/* MANAGE (Q1 list, Q2 calendar): invites saved in this browser and the answers they got. */
(() => {
  const HN = window.HN;
  const { $, el, pad2 } = HN;

  const dmy = (iso) => { const d = HN.parseISO(iso); return d ? HN.fmtDate(d, "day") : "?"; };
  const cleanResp = (r) => (HN.validDate(r.date) && Number.isInteger(r.hour) && Number.isInteger(r.minute) && Array.isArray(r.plans) ? r : null);
  const key = (a) => a.date + "T" + pad2(a.hour) + ":" + pad2(a.minute);
  const gcal = (a) => HN.gcalUrl(HN.t("cal.title", { name: a.name }), HN.t("cal.details", { plans: HN.planText(a.plans) }), HN.eventRange(a.date, a.hour, a.minute));
  const linkBtn = (text, href) => { const a = el("a", "btn btn-ghost btn-sm", text); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; return a; };
  // invites stored before expiry existed (and the samples) expire with the browser's retention after creation
  const withExpiry = (list) => list.map((i) => (i.expires ? i : Object.assign(i, { expires: HN.iso(HN.addDays(HN.parseISO(i.created), HN.KEEP_DAYS)) })));

  const mine = () => {
    const base = HN.inviteUrl("");
    return HN.invites.list().map((i) => ({
      code: String(i.code || ""), name: String(i.name || HN.t("inv.fallback")), url: typeof i.url === "string" && i.url.startsWith(base) ? i.url : "",
      created: HN.validDate(i.created) ? i.created : HN.iso(HN.today()), expires: HN.validDate(i.expires) ? i.expires : "",
      responses: HN.responses.for(String(i.code || "")).map(cleanResp).filter(Boolean),
    }));
  };
  const sample = () => {
    const sat = HN.nextSaturday(), sun = new Date(sat), fri = new Date(sat);
    sun.setDate(sun.getDate() + 1);
    fri.setDate(fri.getDate() + 6);
    const created = HN.iso(HN.today());
    return [
      { code: "k3x9m2pq", name: HN.t("inv.for", { name: "Lan" }), url: "", created, responses: [{ name: "Lan", date: HN.iso(sat), hour: 19, minute: 30, plans: ["trasua", "xemphim"], dodges: HN.NO_LIMIT }] },
      { code: "p8wq4tzn", name: HN.t("q.sampleMsg"), url: "", created, responses: [
        { name: "Hà", date: HN.iso(sat), hour: 19, minute: 30, plans: ["lau"], dodges: 3 },
        { name: "Vy", date: HN.iso(sun), hour: 9, minute: 0, plans: ["cafe", "daoho"], dodges: 0 },
        { name: "Ngọc", date: HN.iso(fri), hour: 20, minute: 0, plans: ["karaoke"], dodges: 5 },
      ] },
      { code: "z2rt7hkd", name: HN.t("inv.for", { name: "Mai" }), url: "", created, responses: [] },
    ];
  };

  HN.SCREENS.q = () => {
    HN.syncOutbox();
    let useSample = false;
    let INVITES = withExpiry(mine());

    const appts = () => INVITES.flatMap((i) => i.responses.map((r) => Object.assign({ invite: i.name }, r)));
    const conflicts = () => { const c = {}; appts().forEach((a) => { c[key(a)] = (c[key(a)] || 0) + 1; }); return c; };

    function respCard(r, conf) {
      const c = el("div", "resp");
      const top = el("div", "resp-top");
      top.append(el("b", null, String(r.name || "?")));
      const tags = el("span", "resp-tags");
      if (conf[key(r)] > 1) tags.append(el("span", "tag-red", HN.t("q.clash")));
      top.append(tags);
      const chips = el("div", "chips-row");
      HN.planList(r.plans).forEach((p) => chips.append(el("i", null, p.ico + " " + HN.planName(p))));
      const acts = el("div", "acts");
      const save = el("button", "btn btn-ghost btn-sm", HN.t("q.saveImg"));
      save.type = "button";
      save.addEventListener("click", async () => {
        try { HN.shot(await HN.ticketImage({ from: HN.t("you.self"), to: String(r.name || "?"), when: HN.fmtWhen(r.date, r.hour, r.minute), plans: r.plans, dodges: Number(r.dodges) || 0, code: "" })); } catch (_) { HN.toast(HN.t("img.fail")); }
      });
      acts.append(save, linkBtn(HN.t("addCal"), gcal(r)));
      c.append(top, el("div", "when", HN.fmtWhen(r.date, r.hour, r.minute)), chips, el("div", "dodge", r.dodges ? HN.t("q.dodged", { n: r.dodges }) : HN.t("q.yesFirst")), acts);
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
        head.append(el("h3", null, i.name), el("span", "pill" + (i.responses.length ? "" : " zero"), i.responses.length ? HN.t("q.replies", { n: i.responses.length }) : HN.t("q.noReplies")));
        const lr = el("div", "linkrow");
        lr.append(el("span", null, i.url ? i.url : HN.DOMAIN + "/" + i.code));
        if (i.url) {
          const cp = el("button", "btn btn-ghost btn-sm", HN.t("copy"));
          cp.type = "button";
          cp.addEventListener("click", () => HN.copy(i.url));
          const op = el("a", "btn btn-ghost btn-sm", HN.t("q.open"));
          op.href = i.url;
          lr.append(cp, op);
        }
        card.append(head, lr, el("div", "meta", HN.t("q.meta", { a: dmy(i.created), b: dmy(i.expires) })));
        if (i.responses.length) {
          const more = el("button", "more");
          more.type = "button";
          const chev = el("span", "chev", "▾");
          chev.setAttribute("aria-hidden", "true");
          more.append(el("span", null, HN.t("q.seeReplies")), chev);
          const box = el("div", "resp-box");
          box.id = "resp-" + HN.randomCode(6);
          box.hidden = true;
          more.setAttribute("aria-expanded", "false");
          more.setAttribute("aria-controls", box.id);
          i.responses.forEach((r) => box.append(respCard(r, conf)));
          more.addEventListener("click", () => {
            box.hidden = !box.hidden;
            more.setAttribute("aria-expanded", String(!box.hidden));
            chev.textContent = box.hidden ? "▾" : "▴";
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
      // open on the month of the next appointment, so a list that starts next month does not look empty
      const next = appts().map((a) => a.date).filter((d) => HN.parseISO(d) >= HN.today()).sort()[0];
      HN.calendar($("#qCal"), { events, allowAll: true, selected: picked, month: next ? HN.parseISO(next) : null, onSelect(d) { picked = d; renderAppts(); } });
      renderAppts();
    }
    function renderAppts() {
      const host = $("#qAppts");
      host.replaceChildren();
      const conf = conflicts();
      let list = appts().filter((a) => HN.parseISO(a.date) >= HN.today());
      if (picked) list = list.filter((a) => a.date === HN.iso(picked));
      list.sort((a, b) => (key(a) < key(b) ? -1 : 1));
      if (!list.length) host.append(el("p", "hint", HN.t(picked ? "q.noneDay" : "q.none")));
      let lastDate = null;
      list.forEach((a) => {
        if (a.date !== lastDate) { host.append(el("div", "day-title", HN.fmtDate(HN.parseISO(a.date)))); lastDate = a.date; }
        const clash = conf[key(a)] > 1;
        const row = el("div", "appt" + (clash ? " conflict" : ""));
        const info = el("div", "info");
        info.append(el("b", null, String(a.name || "?") + (clash ? " · " + HN.t("q.clash") : "")), el("small", null, HN.planText(a.plans) + " · " + a.invite));
        row.append(el("span", "time", pad2(a.hour) + ":" + pad2(a.minute)), info, linkBtn(HN.t("q.addCal"), gcal(a)));
        host.append(row);
      });
      if (picked) {
        const all = el("button", "link", HN.t("q.all"));
        all.type = "button";
        all.addEventListener("click", () => { picked = null; renderCal(); });
        host.append(all);
      }
      gsap.fromTo(host.children, { x: -16, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.05, duration: 0.3, clearProps: "transform,opacity" });
    }

    HN.segTabs($("#app"), (tab) => {
      const cal = tab === "cal";
      $("#paneList").hidden = cal;
      $("#paneCal").hidden = !cal;
      if (cal) renderCal();
    });
    $("#sampleBtn").addEventListener("click", () => {
      useSample = !useSample;
      INVITES = withExpiry(useSample ? sample() : mine());
      $("#sampleBtn").textContent = HN.t(useSample ? "q.mine" : "q.sample");
      renderList();
      if (!$("#paneCal").hidden) renderCal();
    });
    gsap.fromTo(".q-head > *", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: "back.out(1.6)", clearProps: "transform,opacity" });
    renderList();
  };
})();
