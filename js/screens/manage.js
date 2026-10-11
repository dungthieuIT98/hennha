"use strict";
/* MANAGE (Q1 list, Q2 calendar): invites saved in this browser and the answers they got. */
(() => {
  const HN = window.HN;
  const { $, el, pad2 } = HN;

  const dmy = (iso) => { const d = HN.parseISO(iso); return d ? pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear() : "?"; };
  const cleanResp = (r) => (HN.validDate(r.date) && Number.isInteger(r.hour) && Number.isInteger(r.minute) && Array.isArray(r.plans) ? r : null);
  const key = (a) => a.date + "T" + pad2(a.hour) + ":" + pad2(a.minute);
  const gcal = (a) => HN.gcalUrl("Hẹn với " + a.name, "Kèo: " + HN.planText(a.plans), HN.eventRange(a.date, a.hour, a.minute));
  const linkBtn = (text, href) => { const a = el("a", "btn btn-ghost btn-sm", text); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; return a; };
  // invites stored before expiry existed (and the samples) expire one year after creation
  const withExpiry = (list) => list.map((i) => (i.expires ? i : Object.assign(i, { expires: HN.iso(HN.addYears(HN.parseISO(i.created), 1)) })));

  const mine = () => {
    const base = HN.inviteUrl("");
    return HN.invites.list().map((i) => ({
      code: String(i.code || ""), name: String(i.name || "Thiệp"), url: typeof i.url === "string" && i.url.startsWith(base) ? i.url : "",
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
      { code: "k3x9m2pq", name: "Thiệp gửi Lan", url: "", created, responses: [{ name: "Lan", date: HN.iso(sat), hour: 19, minute: 30, plans: ["trasua", "xemphim"], dodges: HN.NO_LIMIT }] },
      { code: "p8wq4tzn", name: "Cuối tuần này đi chơi với tớ nha?", url: "", created, responses: [
        { name: "Hà", date: HN.iso(sat), hour: 19, minute: 30, plans: ["lau"], dodges: 3 },
        { name: "Vy", date: HN.iso(sun), hour: 9, minute: 0, plans: ["cafe", "daoho"], dodges: 0 },
        { name: "Ngọc", date: HN.iso(fri), hour: 20, minute: 0, plans: ["karaoke"], dodges: 5 },
      ] },
      { code: "z2rt7hkd", name: "Thiệp gửi Mai", url: "", created, responses: [] },
    ];
  };

  HN.SCREENS.q = () => {
    let useSample = false;
    let INVITES = withExpiry(mine());

    const appts = () => INVITES.flatMap((i) => i.responses.map((r) => Object.assign({ invite: i.name }, r)));
    const conflicts = () => { const c = {}; appts().forEach((a) => { c[key(a)] = (c[key(a)] || 0) + 1; }); return c; };

    function respCard(r, conf) {
      const c = el("div", "resp");
      const top = el("div", "resp-top");
      top.append(el("b", null, String(r.name || "?")));
      const tags = el("span", "resp-tags");
      if (conf[key(r)] > 1) tags.append(el("span", "tag-red", "Trùng giờ"));
      top.append(tags);
      const chips = el("div", "chips-row");
      HN.planList(r.plans).forEach((p) => chips.append(el("i", null, p.ico + " " + p.name)));
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
          const chev = el("span", "chev", "▾");
          chev.setAttribute("aria-hidden", "true");
          more.append(el("span", null, "Xem phản hồi"), chev);
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
        info.append(el("b", null, String(a.name || "?") + (clash ? " · Trùng giờ" : "")), el("small", null, HN.planText(a.plans) + " · " + a.invite));
        row.append(el("span", "time", pad2(a.hour) + ":" + pad2(a.minute)), info, linkBtn("Thêm lịch", gcal(a)));
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

    HN.segTabs($("#app"), (tab) => {
      const cal = tab === "cal";
      $("#paneList").hidden = cal;
      $("#paneCal").hidden = !cal;
      if (cal) renderCal();
    });
    $("#sampleBtn").addEventListener("click", () => {
      useSample = !useSample;
      INVITES = withExpiry(useSample ? sample() : mine());
      $("#sampleBtn").textContent = useSample ? "Xem thiệp của tôi" : "Xem dữ liệu mẫu";
      renderList();
      if (!$("#paneCal").hidden) renderCal();
    });
    gsap.fromTo(".q-head > *", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: "back.out(1.6)", clearProps: "transform,opacity" });
    renderList();
  };
})();
