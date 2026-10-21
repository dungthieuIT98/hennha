"use strict";
/* Khối góp ý 1 chạm, dùng ở cuối trang chủ và cuối luồng tạo thiệp.
   Chạm 1 gương mặt -> ghi ngay mức cảm nhận, mở ô viết thêm (không bắt buộc) -> Gửi.
   withSource: sau đó hỏi tiếp "Bạn biết tới tụi mình từ đâu?" trong cùng khung.
   Mỗi lượt góp ý có một mã fid để bên lưu gộp các lần gửi (cảm nhận, lời viết, nguồn) thành một dòng, lần sau ghi đè lần trước. */
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOODS = [{ id: "khoc", ico: "😭" }, { id: "cuoi", ico: "😊" }, { id: "thich", ico: "🥰" }, { id: "me", ico: "😍" }];
  const MAX = 500;

  // Chưa chốt nơi lưu (Google Sheet hoặc API do dev làm), nên tạm giữ trên máy người dùng.
  // Khi nối nơi lưu: chỉ gửi đúng các trường { fid, where, mood | text | source }, phía nhận tự kiểm tra lại
  // kiểu, độ dài (text <= 500) và danh sách giá trị hợp lệ, có giới hạn tần suất gửi.
  HN.sendFeedback = (data) => {
    const list = HN.local.get("hn-feedback", []);
    list.push(Object.assign({ at: new Date().toISOString() }, data));
    HN.local.set("hn-feedback", list.slice(-30));
  };

  HN.feedbackBox = (host, { where, withSource = false }) => {
    if (!host) return;
    const fid = HN.randomCode(10);
    let wiggle = null;
    const box = el("div", "fbx");
    box.setAttribute("aria-live", "polite");
    const moods = el("div", "fbx-moods");
    moods.setAttribute("role", "group");
    moods.setAttribute("aria-label", HN.t("fb.label"));
    const buttons = MOODS.map((m) => {
      const b = el("button", "fbx-mood");
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      const ico = el("span", "ico", m.ico);
      ico.setAttribute("aria-hidden", "true");
      b.append(ico, el("span", "lbl", HN.t("fb.m." + m.id)));
      b.addEventListener("click", () => pick(m.id, b));
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
    const send = el("button", "btn btn-sm fbx-send", HN.t("fb.send"));
    send.type = "button";
    more.append(text, send);
    box.append(el("p", "fbx-h", HN.t("fb.h")), el("p", "fbx-sub", HN.t("fb.sub")), moods, more);
    host.replaceChildren(box);

    // các gương mặt lắc lư lần lượt cho tới khi người dùng chạm; dừng khi khối ra khỏi màn hình
    if (!reduce) {
      wiggle = HN.loop(gsap.timeline({ repeat: -1, repeatDelay: 1.4 })
        .to($$(".fbx-mood .ico", box), { rotation: 12, y: -5, duration: 0.18, ease: "sine.out", stagger: { each: 0.22, yoyo: true, repeat: 1 } }));
      if (wiggle && "IntersectionObserver" in window) {
        const io = new IntersectionObserver(([e]) => { if (wiggle) wiggle.paused(!e.isIntersecting); });
        io.observe(box);
        HN.onLeave(() => io.disconnect());
      }
    }

    function pick(id, b) {
      if (wiggle) { wiggle.kill(); wiggle = null; gsap.set($$(".fbx-mood .ico", box), { rotation: 0, y: 0 }); }
      buttons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      gsap.fromTo($(".ico", b), { scale: 1.4 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
      HN.sendFeedback({ fid, where, mood: id });
      if (more.hidden) {
        more.hidden = false;
        gsap.from(more, { height: 0, autoAlpha: 0, duration: 0.35, ease: "power2.out", clearProps: "height" });
      }
    }
    send.addEventListener("click", () => {
      const t = HN.clean(text.value).slice(0, MAX);
      if (t) HN.sendFeedback({ fid, where, text: t });
      if (withSource) askSource(); else thanks();
    });
    function swap(nodes) {
      gsap.to(box, {
        autoAlpha: 0, y: -8, duration: 0.2,
        onComplete: () => {
          box.replaceChildren(...nodes);
          gsap.fromTo(box, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(2)" });
          const f = $("button", box) || $(".fbx-thanks", box);
          if (f) { if (!f.matches("button")) f.tabIndex = -1; f.focus({ preventScroll: true }); }
        },
      });
    }
    function askSource() {
      const row = el("div", "chip-row fbx-src");
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", HN.t("c7.fb"));
      HN.SOURCES.forEach((s) => {
        const c = el("button", "chip", HN.t("src." + s));
        c.type = "button";
        c.addEventListener("click", () => { c.classList.add("selected"); HN.sendFeedback({ fid, where, source: s }); thanks(); });
        row.append(c);
      });
      swap([el("p", "fbx-h", HN.t("c7.fb")), row]);
    }
    function thanks() { swap([el("p", "fbx-thanks", HN.t("fb.thanks"))]); }
  };
})();

