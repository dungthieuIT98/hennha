"use strict";
/* Nút Không chạy trốn, dùng chung cho thiệp mẫu trang chủ và màn người nhận (22/10):
   né đủ HN.NO_LIMIT lần (5): lần 1–4 nhảy chỗ, đổi chữ và nhỏ dần; lần 5 đứng rung rồi chạy khỏi khung, hiện lời nhắc năn nỉ,
   nút Đồng ý giữ nguyên cỡ, chờ người dùng tự bấm (không tự bấm nữa).
   Chỉ chạy trong khung thư và sát hoặc hơi ngoài rìa (MARGIN px), không bao giờ đè lên chữ hay nút Đồng ý. */
(() => {
  const HN = window.HN;
  const MARGIN = 18, GAP = 10, PAD = 6;
  const page = (r) => ({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
  const hit = (a, b, g) => !(a.x + a.w + g <= b.x || b.x + b.w + g <= a.x || a.y + a.h + g <= b.y || b.y + b.h + g <= a.y);
  const shown = (n) => !!n && !n.hidden && n.getClientRects().length > 0;

  // no, yes: 2 nút; frame: khung thư; reminder: lời nhắc; avoid(): các phần tử chữ không được đè; isActive(): màn câu hỏi đang hiện
  HN.runawayNo = ({ no, yes, frame, reminder, avoid, isActive }) => {
    const home = no.parentElement, homeNext = no.nextSibling;
    let dodges = 0, last = 0, gone = false, lifted = false;

    // lần né đầu: chuyển nút ra <body>, định vị theo trang để cuộn trang vẫn đi cùng khung thư
    function lift() {
      if (lifted) return;
      const r = no.getBoundingClientRect(), hadFocus = document.activeElement === no;
      document.body.append(no);
      no.classList.add("no-run");
      gsap.set(no, { x: r.left + scrollX, y: r.top + scrollY, transformOrigin: "0 0" });
      lifted = true;
      if (hadFocus) no.focus({ preventScroll: true });
    }
    // chỗ mới: trong khung thư cộng rìa MARGIN, nằm trong màn hình, không chạm chữ hay nút Đồng ý, cách chỗ cũ đủ xa.
    // Nút xoay quanh góc trên trái nên tính khung bao sau khi xoay; trả về toạ độ góc trên trái của nút.
    function spot(scale, yesScale, deg) {
      const f = page(frame.getBoundingClientRect());
      const vw = document.documentElement.clientWidth;
      const bw = no.offsetWidth * scale, bh = no.offsetHeight * scale;
      const rad = (deg * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
      const xs = [0, bw * cos, -bh * sin, bw * cos - bh * sin], ys = [0, bw * sin, bh * cos, bw * sin + bh * cos];
      const ox = Math.min(...xs), oy = Math.min(...ys), w = Math.max(...xs) - ox, h = Math.max(...ys) - oy;
      const minX = Math.max(scrollX + PAD, f.x - MARGIN), maxX = Math.min(scrollX + vw - PAD, f.x + f.w + MARGIN) - w;
      const minY = f.y - MARGIN, maxY = f.y + f.h + MARGIN - h;
      const yr = page(yes.getBoundingClientRect());
      const k = yesScale / (gsap.getProperty(yes, "scale") || 1);
      const yesBox = { x: yr.x + yr.w / 2 - (yr.w * k) / 2, y: yr.y + yr.h / 2 - (yr.h * k) / 2, w: yr.w * k, h: yr.h * k };
      const blocks = [yesBox, ...avoid().filter(shown).map((n) => page(n.getBoundingClientRect()))];
      const cx = gsap.getProperty(no, "x"), cy = gsap.getProperty(no, "y");
      for (const dist of [90, 50, 0]) {
        for (let i = 0; i < 150; i++) {
          const b = { x: minX + Math.random() * Math.max(0, maxX - minX), y: minY + Math.random() * Math.max(0, maxY - minY), w, h };
          if (!blocks.some((o) => hit(b, o, GAP)) && Math.hypot(b.x - ox - cx, b.y - oy - cy) >= dist) return { x: b.x - ox, y: b.y - oy };
        }
      }
      return null;
    }
    function dodge(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (gone || (isActive && !isActive())) return;
      const now = Date.now();
      if (now - last < 150) return;
      last = now;
      lift();
      dodges++;
      const texts = HN.t("no.texts");
      no.textContent = texts[Math.min(dodges, texts.length - 1)];
      // nút Đồng ý giữ nguyên cỡ; nút Không nhỏ dần mỗi lần né (1 -> 0,9 -> 0,8 -> 0,7 -> 0,6)
      const s = noScale();
      if (dodges >= HN.NO_LIMIT) { flee(s); return; }
      const deg = gsap.utils.random(-10, 10);
      const b = spot(s, 1, deg);
      // không tìm được chỗ trống thì chỉ thu nhỏ tại chỗ (thà không nhảy còn hơn đè lên chữ)
      gsap.to(no, Object.assign({ scale: s, duration: 0.5, ease: "back.out(1.7)" }, b ? { x: b.x, y: b.y, rotation: deg } : {}));
    }
    const noScale = () => Math.max(1 - 0.1 * Math.min(dodges, HN.NO_LIMIT - 1), 0.6);
    // lần cuối: nhảy tới chỗ mới với chữ "Đang bảo trì…", đứng rung một nhịp cho người dùng đọc,
    // rồi chạy ra khỏi khung về phía gần nhất và mờ dần; lời nhắc chỉ hiện sau khi nút đã chạy mất
    let fleeTl = null;
    function flee(s) {
      gone = true;
      if (document.activeElement === no) yes.focus({ preventScroll: true });
      const b = spot(s, 1, 0);
      const f = frame.getBoundingClientRect(), x = b ? b.x : gsap.getProperty(no, "x");
      const dir = x - scrollX + no.offsetWidth / 2 > f.left + f.width / 2 ? 1 : -1;
      fleeTl = gsap.timeline({ onComplete: () => { no.hidden = true; showReminder(); } });
      if (b) fleeTl.to(no, { x: b.x, y: b.y, rotation: 0, scale: s, duration: 0.5, ease: "back.out(1.7)" });
      fleeTl
        .to(no, { rotation: 6, duration: 0.09, yoyo: true, repeat: 5, ease: "sine.inOut" }, "+=0.35")
        .to(no, { x: "+=" + dir * 170, y: "-=20", rotation: dir * 12, autoAlpha: 0, duration: 0.9, ease: "power2.in" });
    }
    function showReminder() {
      reminder.hidden = false;
      gsap.fromTo(reminder, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4 });
    }
    // nút đã ra <body> thì ẩn đi khi màn câu hỏi không còn hiện (đã bấm Đồng ý, chuyển bước)
    function park() { if (lifted) no.hidden = true; }
    function stop() {
      if (fleeTl) { fleeTl.kill(); fleeTl = null; }
      park();
    }
    function reset() {
      stop();
      dodges = 0; gone = false; lifted = false;
      no.classList.remove("no-run");
      home.insertBefore(no, homeNext && homeNext.parentNode === home ? homeNext : null);
      gsap.set([yes, no, reminder], { clearProps: "all" });
      no.hidden = false;
      reminder.hidden = true;
      no.textContent = HN.t("no.texts")[0];
    }
    HN.dodgeable(no, dodge);
    HN.onLeave(() => { if (fleeTl) fleeTl.kill(); if (no.parentElement === document.body) no.remove(); });
    return { stop, park, reset, count: () => dodges };
  };
})();

