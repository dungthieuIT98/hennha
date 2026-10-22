"use strict";
/* Khối góp ý hai bước, dùng chung ở cuối trang chủ và màn tạo thiệp xong (23/10):
   1/2 "Bạn thấy trang này thế nào?": chọn cảm nhận (bắt buộc) -> hiện ô góp ý (không bắt buộc) + nút Tiếp.
   Trang chủ (fan: true) báo có 2 bước bằng hình hai tấm thiệp xoè: bước 1 có một tấm nghiêng phía sau ghi "Câu 2",
   bấm Tiếp thì tấm trước bay đi, tấm sau tiến lên thành bước 2.
   2/2 "Bạn biết tới tụi mình từ đâu?": chọn kênh (bắt buộc) -> Gửi góp ý: gửi một lần cả ba thông tin -> lời cảm ơn. */
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOODS = [{ id: "khoc", ico: "😭" }, { id: "cuoi", ico: "😊" }, { id: "thich", ico: "🥰" }, { id: "me", ico: "😍" }];
  const MAX = 500;
  // mã utm của link người dùng bấm vào (nếu có), chỉ nhận chữ, số, gạch ngang, gạch dưới
  const utm = () => {
    const v = new URLSearchParams(location.search).get("utm_source") || "";
    return /^[a-z0-9_-]{1,40}$/i.test(v) ? v.toLowerCase() : "";
  };

  // Chưa chốt nơi lưu (Google Sheet hoặc API do dev làm), nên tạm giữ trên máy người dùng.
  // Khi nối nơi lưu: gửi đúng các trường { where, mood, text, source, utm, at }; phía nhận kiểm tra lại
  // kiểu, độ dài (text <= 500), danh sách giá trị hợp lệ và giới hạn tần suất gửi. Ẩn danh, không xin email.
  HN.sendFeedback = (data) => {
    const list = HN.local.get("hn-feedback", []);
    list.push(Object.assign({ at: new Date().toISOString() }, data));
    HN.local.set("hn-feedback", list.slice(-30));
  };

  HN.feedbackBox = (host, { where, fan = false }) => {
    if (!host) return;
    let mood = null, source = null, wiggle = null;
    const box = el("div", "fbx");
    box.setAttribute("aria-live", "polite");
    const eyebrow = () => el("span", "eyebrow fbx-eyebrow", HN.t("fb.eyebrow"));
    // hai tấm thiệp xoè: tấm trước chứa nội dung, tấm sau chỉ để nhìn (ghi "Câu 2"), ẩn khi sang bước 2
    const card = fan ? el("div", "fbx-card glass glow-border") : null;
    const backCard = fan ? el("div", "fbx-behind") : null;
    if (fan) {
      backCard.setAttribute("aria-hidden", "true");
      backCard.append(el("span", "fbx-behind-mark", HN.t("fb.q2")));
      host.classList.add("fbx-fan");
    }

    /* bước 1: cảm nhận + ô góp ý */
    const step1 = el("div", "fbx-step");
    const moods = el("div", "fbx-moods");
    moods.setAttribute("role", "group");
    moods.setAttribute("aria-label", HN.t("fb.h"));
    const moodButtons = MOODS.map((m) => {
      const b = el("button", "fbx-mood");
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      const ico = el("span", "ico", m.ico);
      ico.setAttribute("aria-hidden", "true");
      b.append(ico, el("span", "lbl", HN.t("fb.m." + m.id)));
      b.addEventListener("click", () => pickMood(m.id, b));
      moods.append(b);
      return b;
    });
    const more = el("div", "fbx-more");
    more.hidden = true;
    const text = el("textarea", "input fbx-text");
    text.rows = 3;
    text.maxLength = MAX;
    text.placeholder = HN.t("fb.ph");
    text.setAttribute("aria-label", HN.t("fb.ph"));
    const next = el("button", "btn btn-sm fbx-next");
    next.type = "button";
    const arrow = el("span", null, "→");
    arrow.setAttribute("aria-hidden", "true");
    next.append(el("span", null, HN.t("fb.next")), document.createTextNode(" "), arrow);
    more.append(text, next);
    step1.append(eyebrow(1), el("p", "fbx-h", HN.t("fb.h")), moods, more);

    /* bước 2: kênh biết đến */
    const step2 = el("div", "fbx-step");
    const srcRow = el("div", "chip-row fbx-src");
    srcRow.setAttribute("role", "group");
    srcRow.setAttribute("aria-label", HN.t("c7.fb"));
    const srcButtons = HN.SOURCES.map((s) => {
      const c = el("button", "chip fbx-chip");
      c.type = "button";
      c.append(el("span", null, HN.t("src." + s)));
      // mục mạng xã hội có thêm dòng nhỏ liệt kê các nền tảng để người dùng hiểu mục này gồm những gì
      if (s === "social") c.append(el("small", "fbx-chip-hint", HN.t("src.socialHint")));
      c.setAttribute("aria-pressed", "false");
      c.addEventListener("click", () => {
        source = s;
        srcButtons.forEach((x) => { const on = x === c; x.classList.toggle("selected", on); x.setAttribute("aria-pressed", String(on)); });
        err.hidden = true;
      });
      srcRow.append(c);
      return c;
    });
    const err = el("p", "hint error fbx-err", HN.t("fb.srcErr"));
    err.hidden = true;
    const actions = el("div", "fbx-actions");
    const back = el("button", "link fbx-back", HN.t("fb.back"));
    back.type = "button";
    const send = el("button", "btn btn-sm fbx-send", HN.t("fb.send"));
    send.type = "button";
    actions.append(back, send);
    step2.append(eyebrow(), el("p", "fbx-h", HN.t("c7.fb")), srcRow, err, actions);

    box.append(step1);
    if (fan) { card.append(box); host.replaceChildren(backCard, card); } else host.replaceChildren(box);

    // các gương mặt lắc lư lần lượt cho tới khi người dùng chọn; dừng khi khối ra khỏi màn hình
    if (!reduce) {
      wiggle = HN.loop(gsap.timeline({ repeat: -1, repeatDelay: 1.4 })
        .to($$(".fbx-mood .ico", box), { rotation: 12, y: -5, duration: 0.18, ease: "sine.out", stagger: { each: 0.22, yoyo: true, repeat: 1 } }));
      if (wiggle && "IntersectionObserver" in window) {
        const io = new IntersectionObserver(([e]) => { if (wiggle) wiggle.paused(!e.isIntersecting); });
        io.observe(box);
        HN.onLeave(() => io.disconnect());
      }
    }

    // chuyển bước rồi đưa focus vào phần mới (cho người dùng bàn phím / trình đọc màn hình):
    // "next" = tấm trên nghiêng rồi bay đi; kiểu xoè thì tấm bước 2 hiện ở chỗ tấm sau rồi xoay thẳng lại;
    // "back" = tấm bước 1 bay về (kiểu xoè: tấm sau hiện lại); "fade" = mờ sang lời cảm ơn.
    // Góc nghiêng lúc đứng yên do CSS giữ (.fbx-fan / .solo), GSAP chỉ lo đoạn chuyển rồi trả lại cho CSS.
    // immediateRender: false ở các đoạn fromTo phía sau: không thì GSAP áp sẵn giá trị "from" làm đoạn bay đi bị giật.
    function swap(node, focusEl, mode) {
      const done = () => {
        box.replaceChildren(node);
        if (focusEl) { if (!focusEl.matches("button, textarea")) focusEl.tabIndex = -1; focusEl.focus({ preventScroll: true }); }
      };
      if (reduce) { if (fan) host.classList.toggle("solo", mode !== "back"); done(); return; }
      if (fan && mode === "next") {
        gsap.timeline()
          .to(card, { x: -110, rotation: -16, autoAlpha: 0, duration: 0.38, ease: "power2.in" })
          .add(() => { host.classList.add("solo"); done(); })
          .fromTo(card, { x: 12, y: 12, rotation: 4, autoAlpha: 1 }, { x: 0, y: 0, rotation: 0, duration: 0.45, ease: "back.out(1.6)", clearProps: "transform,opacity,visibility", immediateRender: false })
          .fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, immediateRender: false }, "<0.1");
      } else if (fan && mode === "back") {
        gsap.timeline()
          .to(card, { x: 12, y: 12, rotation: 4, autoAlpha: 0, duration: 0.25, ease: "power1.in" })
          .add(() => { host.classList.remove("solo"); done(); })
          .fromTo(card, { x: -110, y: 0, rotation: -16, autoAlpha: 0 }, { x: 0, rotation: -2, autoAlpha: 1, duration: 0.45, ease: "back.out(1.4)", clearProps: "transform,opacity,visibility", immediateRender: false });
      } else if (mode === "next") {
        gsap.timeline()
          .to(box, { x: -50, rotation: -6, autoAlpha: 0, duration: 0.35, ease: "power2.in" })
          .add(done)
          .fromTo(box, { x: 0, rotation: 0, y: 16, scale: 0.96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(1.8)", immediateRender: false });
      } else if (mode === "back") {
        gsap.timeline()
          .to(box, { y: 10, autoAlpha: 0, duration: 0.2 })
          .add(done)
          .fromTo(box, { x: -50, rotation: -6, y: 0, autoAlpha: 0 }, { x: 0, rotation: 0, autoAlpha: 1, duration: 0.4, ease: "back.out(1.6)", immediateRender: false });
      } else {
        gsap.to(box, {
          autoAlpha: 0, y: -8, duration: 0.2,
          onComplete: () => { done(); gsap.fromTo(box, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(2)" }); },
        });
      }
    }
    function pickMood(id, b) {
      if (wiggle) { wiggle.kill(); wiggle = null; gsap.set($$(".fbx-mood .ico", box), { rotation: 0, y: 0 }); }
      mood = id;
      moodButtons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      gsap.fromTo($(".ico", b), { scale: 1.4 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
      if (more.hidden) {
        more.hidden = false;
        gsap.from(more, { height: 0, autoAlpha: 0, duration: 0.35, ease: "power2.out", clearProps: "height" });
      }
    }
    next.addEventListener("click", () => { if (mood) swap(step2, $(".fbx-h", step2), "next"); });
    back.addEventListener("click", () => { err.hidden = true; swap(step1, moodButtons.find((x) => x.getAttribute("aria-pressed") === "true") || moodButtons[0], "back"); });
    send.addEventListener("click", () => {
      // câu hỏi kênh bắt buộc: chưa chọn thì báo ngay dưới các lựa chọn và dừng lại
      if (!source) {
        err.hidden = false;
        srcButtons[0].focus({ preventScroll: true });
        return;
      }
      HN.sendFeedback({ where, mood, text: HN.clean(text.value).slice(0, MAX), source, utm: utm() });
      swap(el("p", "fbx-thanks", HN.t("fb.thanks")), null, "fade");
      gsap.delayedCall(0.25, () => { const t = $(".fbx-thanks", box); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } });
    });
  };
})();

