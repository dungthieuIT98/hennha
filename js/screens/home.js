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
      .from("#demoCard", { scale: 0.7, rotation: -6, autoAlpha: 0, duration: 1.1, ease: "elastic.out(1, 0.6)" }, 0.25);
    HN.onLeave(() => intro.kill());

    $$("[data-scramble]", app).forEach(HN.scramble);
    $$(".magnetic", app).forEach((n) => HN.magnetic(n));

    const demoLoops = initDemo(intro);
    const journeyLoop = initJourney();
    const ticketSway = initTicket();
    initStickyCta();
    HN.feedbackBox($("#homeFb"), { where: "home" });

    HN.pauseOffscreen([
      [$(".hero-stage", app), demoLoops],
      [$(".journey", app), [journeyLoop]],
      [$(".ticket-sec", app), [ticketSway]],
      [$(".cta-band", app), []],
      ...$$(".grad-text", app).map((n) => [n, []]),
    ]);
    HN.reveal(app);
  };

  // thiệp mẫu: phong bì tim đập -> bấm tim (hoặc tự mở sau 3 giây) -> câu hỏi, nút Không né -> YES thì confetti
  function initDemo(intro) {
    const envStage = $("#dEnv"), stage = $("#dQ"), done = $("#dDone");
    const yes = $("#dYes"), no = $("#dNo"), run = $("#dRun");
    const env = HN.loveEnvelope({ to: "Lan", letter: HN.t("home.envLetter") });
    $("#demoLove").append(env);
    const bloom = HN.bloom($("#demoBloom"));
    intro.add(HN.growBloom(bloom, 1), 0.7);
    const envFloat = HN.loop(gsap.to(env, { y: -10, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    const sway = HN.swayBloom(bloom, intro.duration());
    const heart = $(".nheart", env);

    let dodges = 0, gone = false, floating = false, last = 0, autoYes = null, envBusy = false;
    HN.onLeave(() => autoYes && autoYes.kill());

    // the envelope floats; the heart opens it, then the card moves on to the question
    heart.addEventListener("click", () => {
      if (envBusy) return;
      envBusy = true;
      HN.burstAt(heart, 24);
      const t = HN.openLove(env).to({}, { duration: 0.9 }).add(() => swap(envStage, stage, yes));
      HN.onLeave(() => t.kill());
    });

    // nút Không né trong khung thiệp, không bao giờ đè lên YES hay câu hỏi
    const overlaps = (a, b, g) => !(a.x + a.w + g < b.x || b.x + b.w + g < a.x || a.y + a.h + g < b.y || b.y + b.h + g < a.y);
    function place(ys) {
      const c = stage.getBoundingClientRect(), yr = yes.getBoundingClientRect(), qr = $(".q-wrap", stage).getBoundingClientRect();
      const k = ys / (gsap.getProperty(yes, "scale") || 1);
      const yw = yr.width * k, yh = yr.height * k;
      const yesBox = { x: yr.left + yr.width / 2 - c.left - yw / 2, y: yr.top + yr.height / 2 - c.top - yh / 2, w: yw, h: yh };
      const textBox = { x: qr.left - c.left, y: qr.top - c.top, w: qr.width, h: qr.height };
      const nw = no.offsetWidth, nh = no.offsetHeight, pad = 14;
      const cx = gsap.getProperty(no, "x"), cy = gsap.getProperty(no, "y");
      for (const t of [{ text: true, dist: 80 }, { text: false, dist: 50 }, { text: false, dist: 0 }]) {
        for (let i = 0; i < 80; i++) {
          const box = { x: pad + Math.random() * Math.max(0, c.width - nw - 2 * pad), y: pad + Math.random() * Math.max(0, c.height - nh - 2 * pad), w: nw, h: nh };
          if (overlaps(box, yesBox, 16) || (t.text && overlaps(box, textBox, 6)) || Math.hypot(box.x - cx, box.y - cy) < t.dist) continue;
          gsap.to(no, { x: box.x, y: box.y, rotation: gsap.utils.random(-14, 14), duration: 0.35, ease: "back.out(2)" });
          return;
        }
      }
    }
    function dodge(e) {
      if (gone) return;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const now = Date.now();
      if (now - last < 150) return;
      last = now;
      const hadFocus = document.activeElement === no;
      if (!floating) {
        const c = stage.getBoundingClientRect(), r = no.getBoundingClientRect();
        stage.append(no);
        no.classList.add("floating");
        gsap.set(no, { x: r.left - c.left, y: r.top - c.top });
        floating = true;
        if (hadFocus) no.focus({ preventScroll: true });
      }
      dodges++;
      const ys = Math.min(1 + 0.14 * dodges, 2);
      if (dodges >= HN.NO_LIMIT) {
        gone = true;
        if (hadFocus) yes.focus({ preventScroll: true });
        gsap.to(yes, { scale: ys, duration: 0.4, ease: "back.out(2.5)" });
        gsap.to(no, { x: "+=260", y: "-=320", rotation: 60, scale: 0.3, autoAlpha: 0, duration: 0.7, ease: "power2.in" });
        run.hidden = false;
        gsap.from(run, { y: -10, autoAlpha: 0, duration: 0.3 });
        autoYes = gsap.delayedCall(1.3, () => yes.click());
        return;
      }
      const noTexts = HN.t("no.texts");
      no.textContent = noTexts[dodges % noTexts.length];
      place(ys);
      gsap.to(yes, { scale: ys, duration: 0.4, ease: "back.out(2.5)" });
    }
    HN.dodgeable(no, dodge);

    // a short rain of confetti inside the card, on top of the page-wide burst
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
      if (autoYes) autoYes.kill();
      HN.burstAt(yes);
      const hadFocus = stage.contains(document.activeElement);
      gsap.to(stage, {
        autoAlpha: 0, scale: 0.9, duration: 0.3,
        onComplete: () => {
          stage.hidden = true;
          done.hidden = false;
          if (hadFocus) $("#dReplay").focus({ preventScroll: true });
          gsap.fromTo(done, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" });
          gsap.fromTo(".stamp", { scale: 2.4, rotation: -30, autoAlpha: 0 }, { scale: 1, rotation: -8, autoAlpha: 1, duration: 0.5, ease: "back.out(3)", delay: 0.15 });
          rain();
        },
      });
    });
    $("#dReplay").addEventListener("click", () => {
      dodges = 0; gone = false; floating = false;
      run.hidden = true;
      gsap.set([yes, no, stage, done], { clearProps: "all" });
      no.classList.remove("floating");
      no.textContent = HN.t("no.texts")[0];
      $(".btns", stage).append(no);
      done.hidden = true;
      stage.hidden = false;
      yes.focus({ preventScroll: true });
    });
    return [envFloat, sway];
  }

  // card stage change; hands focus to `focusTo` only when focus was inside the stage that goes away
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

  // thiệp mẫu trượt ra khỏi phong bì khi cuộn tới, đóng dấu, rồi nhấp nhô nhẹ
  function initTicket() {
    const host = $("#homeTicket"), feed = $(".tk-feed", host);
    const tk = HN.ticket({ from: "Minh", to: "Lan", when: HN.fmtWhen(HN.iso(HN.nextSaturday()), 19, 30), plans: ["trasua", "xemphim"], dodges: HN.NO_LIMIT, code: "k3x9m2pq" });
    const stamp = el("span", "tk-stamp", HN.t("home.stamp"));
    stamp.setAttribute("aria-hidden", "true");
    feed.append(tk, stamp);
    HN.tilt(tk, 12);

    // pauseOffscreen gọi .paused(); tween đung đưa chỉ có sau khi in xong nên đi qua một lớp bọc
    let swayTw = null, offscreen = false;
    const ctl = { paused: (p) => { offscreen = p; if (swayTw) swayTw.paused(p); } };
    const finish = () => {
      host.classList.add("printed");
      swayTw = HN.loop(gsap.to(feed, { y: -6, duration: 2.2, yoyo: true, repeat: -1, ease: "sine.inOut" }));
      if (swayTw && offscreen) swayTw.paused(true);
    };
    if (reduce || !("IntersectionObserver" in window)) { host.classList.add("printed"); return ctl; }
    gsap.set(tk, { yPercent: 75 });
    gsap.set(stamp, { autoAlpha: 0 });
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t = gsap.timeline({ onComplete: finish })
        .to(tk, { yPercent: 0, duration: 1.1, ease: "back.out(1.3)" })
        .fromTo(stamp, { scale: 2.4, rotation: -30, autoAlpha: 0 }, { scale: 1, rotation: -12, autoAlpha: 1, duration: 0.45, ease: "back.out(3)" });
      HN.onLeave(() => t.kill());
    }, { threshold: 0.35 });
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
