"use strict";
/* HOME (G0), tinh chỉnh 13/10: hero + thiệp mẫu (mở thư -> hỏi -> YES), hành trình 4 chặng có thư bay,
   vé mẫu in ra khi cuộn tới, nút tạo thiệp dính đáy trên điện thoại, lời kêu gọi cuối. */
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  HN.SCREENS.home = () => {
    const app = $("#app");
    const chars = HN.split($(".hero-title .split", app));
    HN.mountLotties(app);

    const intro = gsap.timeline({ delay: 0.05 })
      .from(".chip-live", { y: -16, autoAlpha: 0, duration: 0.5, ease: "back.out(2)" })
      .from(chars, { y: 60, scale: 0.4, rotation: () => gsap.utils.random(-30, 30), autoAlpha: 0, duration: 0.6, stagger: 0.02, ease: "back.out(2.2)" }, "-=0.2")
      .fromTo(".grad-line", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power3.inOut" }, "-=0.4")
      .from("#demoCard", { y: 50, scale: 0.92, autoAlpha: 0, duration: 0.9, ease: "back.out(1.6)" }, 0.6);
    HN.onLeave(() => intro.kill());

    $$("[data-scramble]", app).forEach(HN.scramble);
    $$(".magnetic", app).forEach((n) => HN.magnetic(n));

    const demoLoops = initDemo(intro);
    const journeyLoop = initJourney();
    const ticketSway = initTicket();
    initStickyCta();
    HN.feedbackBox($("#homeFb"), { where: "home", fan: true });

    HN.pauseOffscreen([
      [$(".hero-stage", app), demoLoops],
      [$(".journey", app), [journeyLoop]],
      [$(".ticket-sec", app), [ticketSway]],
      [$(".cta-band", app), []],
      ...$$(".grad-text", app).map((n) => [n, []]),
    ]);
    HN.reveal(app);
  };

  // thiệp mẫu: phong bì tim đập -> bấm tim -> câu hỏi, nút Không né -> Đồng ý thì confetti rơi trong khung
  function initDemo(intro) {
    const card = $("#demoCard"), envStage = $("#dEnv"), stage = $("#dQ"), done = $("#dDone");
    const yes = $("#dYes"), no = $("#dNo"), run = $("#dRun");
    const env = HN.loveEnvelope({ to: "Thảo", letter: "" });
    $("#demoLove").append(env);
    const bloom = HN.bloom($("#demoBloom"));
    intro.add(HN.growBloom(bloom, 1), 0.9);
    const envFloat = HN.loop(gsap.to(env, { y: -8, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    const sway = HN.swayBloom(bloom, intro.duration());
    const heart = $(".nheart", env);

    // chỉ mở khi bấm tim, rồi chuyển sang câu hỏi
    let envBusy = false;
    heart.addEventListener("click", () => {
      if (envBusy) return;
      envBusy = true;
      HN.burstAt(heart, 24);
      const t = HN.openLove(env).to({}, { duration: 0.9 }).add(() => swap(envStage, stage, yes));
      HN.onLeave(() => t.kill());
    });

    // nút Không né 5 lần quanh khung thiệp (luật chung ở runaway.js), lần 5 tan biến; chờ người xem tự bấm Đồng ý
    const runner = HN.runawayNo({
      no, yes, frame: card, reminder: run,
      // trái tim Lottie phủ cả thiệp làm nền nên không tính là chỗ cần tránh
      avoid: () => [$(".demo-tag", card), $(".q-wrap", stage), run],
      isActive: () => !stage.hidden,
    });

    // một trận confetti ngắn rơi trong khung thiệp, cộng với pháo hoa toàn trang
    const confetti = $("#dConfetti");
    function rain() {
      if (reduce) return;
      const h = confetti.offsetHeight;
      const bits = Array.from({ length: 28 }, () => confetti.appendChild(el("i")));
      const t = gsap.fromTo(bits,
        { x: () => gsap.utils.random(0, confetti.offsetWidth), y: -20, rotation: () => gsap.utils.random(0, 360), autoAlpha: 1 },
        { y: h + 20, x: "+=" + gsap.utils.random(-40, 40), rotation: "+=420", duration: () => gsap.utils.random(1.4, 2.4), ease: "power1.in", stagger: 0.04, onComplete: () => bits.forEach((b) => b.remove()) });
      HN.onLeave(() => { t.kill(); bits.forEach((b) => b.remove()); });
    }
    yes.addEventListener("click", () => {
      runner.stop();
      HN.burstAt(yes);
      const hadFocus = stage.contains(document.activeElement);
      gsap.to(stage, {
        autoAlpha: 0, scale: 0.9, duration: 0.3,
        onComplete: () => {
          stage.hidden = true;
          done.hidden = false;
          if (hadFocus) $("#dReplay").focus({ preventScroll: true });
          gsap.fromTo(done, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" });
          gsap.fromTo($(".stamp", done), { scale: 2.4, rotation: -30, autoAlpha: 0 }, { scale: 1, rotation: -8, autoAlpha: 1, duration: 0.5, delay: 0.25, ease: "back.out(3)" });
          rain();
        },
      });
    });
    // chơi lại: về màn câu hỏi, nút Không quay về chỗ cũ
    $("#dReplay").addEventListener("click", () => {
      runner.reset();
      gsap.set([stage, done], { clearProps: "all" });
      done.hidden = true;
      stage.hidden = false;
      yes.focus({ preventScroll: true });
    });
    return [envFloat, sway];
  }

  // đổi màn trong thiệp; chỉ chuyển focus sang `focusTo` khi focus đang nằm trong màn bị ẩn
  function swap(from, to, focusTo) {
    const had = from.contains(document.activeElement);
    gsap.to(from, {
      autoAlpha: 0, scale: 0.92, duration: 0.3,
      onComplete: () => {
        from.hidden = true;
        to.hidden = false;
        if (had && focusTo) focusTo.focus({ preventScroll: true });
        gsap.fromTo(to, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)" });
      },
    });
  }

  // hành trình: nét đứt tự vẽ, lá thư bay từ chặng này sang chặng kia, chặng nảy lên khi tới, ghim rơi ở chặng cuối
  function initJourney() {
    const dots = $$(".jmap .jdot"), labels = $$(".jmap b"), fill = $(".jline-fill"), flyer = $(".jflyer"), pin = $(".jpin");
    if (reduce) { gsap.set(flyer, { autoAlpha: 0 }); return null; }
    const STOPS = [12.5, 37.5, 62.5, 87.5];
    const pop = (k) => gsap.timeline()
      .to(dots[k], { scale: 1.2, opacity: 1, duration: 0.18, ease: "power2.out" })
      .to(dots[k], { scale: 1, duration: 0.45, ease: "back.out(3)" })
      .to(labels[k], { opacity: 1, duration: 0.3 }, 0);
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 })
      .set(fill, { clipPath: "inset(0 100% 0 0)", opacity: 1 })
      .set(dots, { scale: 0.86, opacity: 0.45 })
      .set(labels, { opacity: 0.7 })
      .set(pin, { y: -28, autoAlpha: 0 })
      .set(flyer, { left: STOPS[0] + "%", y: 0, rotation: 0, scale: 0.5, autoAlpha: 0 })
      .to(flyer, { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(2)" })
      .add(pop(0), "-=0.1");
    STOPS.slice(1).forEach((x, i) => {
      tl.to(flyer, { left: x + "%", duration: 0.8, ease: "power1.inOut" }, "+=0.3")
        .to(flyer, { y: -14, rotation: 12, duration: 0.4, ease: "sine.out", yoyo: true, repeat: 1 }, "<")
        .to(fill, { clipPath: `inset(0 ${(100 * (2 - i)) / 3}% 0 0)`, duration: 0.8, ease: "power1.inOut" }, "<")
        .add(pop(i + 1));
    });
    tl.to(pin, { y: 0, autoAlpha: 1, duration: 0.6, ease: "bounce.out" }, "-=0.3")
      .add(() => HN.burstAt(dots[3], 10), "<0.15")
      .to(flyer, { scale: 0.4, autoAlpha: 0, duration: 0.3 }, "<")
      .to({}, { duration: 1.8 })
      .to(dots, { scale: 0.86, opacity: 0.45, duration: 0.4 })
      .to(labels, { opacity: 0.7, duration: 0.4 }, "<")
      .to([fill, pin], { opacity: 0, duration: 0.4 }, "<");
    return HN.loop(tl);
  }

  // thiệp mẫu trong khung story (23/10): dùng chính ảnh 9:16 người nhận lưu về, đặt trong khung giống story mạng xã hội.
  // Ảnh chỉ vẽ khi khối sắp hiện trên màn hình; thanh story chạy rồi lặp lại, tim bật lên giữa chừng.
  function initTicket() {
    const host = $("#homeTicket");
    const fill = $(".story-bar i", host), img = $(".story-img", host), heart = $(".story-heart", host);
    let loopTw = null, offscreen = false, made = false;
    const ctl = { paused: (p) => { offscreen = p; if (loopTw) loopTw.paused(p); } };
    const like = (on) => { heart.textContent = on ? "♥" : "♡"; heart.classList.toggle("on", on); };
    async function make() {
      if (made) return;
      made = true;
      try {
        img.src = await HN.ticketImage({ from: "Minh", to: "Thảo", when: HN.fmtWhen(HN.iso(HN.nextSaturday()), 19, 30), plans: ["cafe", "xemphim"] });
      } catch (e) { console.error(e); return; }
      host.classList.add("ready");
      if (reduce) return;
      gsap.fromTo(img, { scale: 1.08, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.9, ease: "power2.out" });
      loopTw = HN.loop(gsap.timeline({ repeat: -1, repeatDelay: 0.6 })
        .add(() => like(false), 0)
        .fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: 5, ease: "none" }, 0)
        .add(() => like(true), 2.2)
        .fromTo(heart, { scale: 1 }, { scale: 1.4, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, 2.2));
      if (loopTw && offscreen) loopTw.paused(true);
    }
    if (!("IntersectionObserver" in window)) { make(); return ctl; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      make();
    }, { rootMargin: "200px 0px" });
    io.observe(host);
    HN.onLeave(() => io.disconnect());
    return ctl;
  }

  // điện thoại: nút Tạo thiệp dính đáy khi đã cuộn qua hero và chưa tới phần kêu gọi cuối (CSS ẩn trên màn rộng)
  function initStickyCta() {
    const heroCta = $(".hero-cta"), band = $(".cta-band");
    if (!heroCta || !band || !("IntersectionObserver" in window)) return;
    const a = el("a", "btn btn-lg sticky-cta");
    a.href = "#/create";
    a.setAttribute("data-new", "");
    const arrow = el("span", null, "→");
    arrow.setAttribute("aria-hidden", "true");
    a.append(el("span", null, HN.t("home.cta")), document.createTextNode(" "), arrow);
    document.body.append(a);
    HN.onLeave(() => a.remove());
    let pastHero = false, bandBelow = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === heroCta) pastHero = !e.isIntersecting && e.boundingClientRect.top < 0;
        else bandBelow = !e.isIntersecting && e.boundingClientRect.top > 0;
      });
      a.classList.toggle("show", pastHero && bandBelow);
    });
    io.observe(heroCta);
    io.observe(band);
    HN.onLeave(() => io.disconnect());
  }
})();
