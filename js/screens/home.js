"use strict";
/* HOME (G0): hero with a playable invite (envelope -> YES/NO -> stamp), journey map, ticket pocket, feedback. */
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;

  HN.SCREENS.home = () => {
    const app = $("#app");
    const chars = HN.split($(".hero-title .split", app));
    const env = HN.loveEnvelope({ to: "Lan" });
    $("#demoLove").append(env);
    const bloom = HN.bloom($("#demoBloom"));
    HN.mountLotties(app);

    const intro = gsap.timeline({ delay: 0.05 })
      .from(chars, { y: 60, scale: 0.4, rotation: () => gsap.utils.random(-30, 30), autoAlpha: 0, duration: 0.6, stagger: 0.02, ease: "back.out(2.2)" })
      .fromTo(".grad-line", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power3.inOut" }, "-=0.4")
      .from("#demoCard", { scale: 0.7, rotation: -6, autoAlpha: 0, duration: 1.1, ease: "elastic.out(1, 0.6)" }, 0.25)
      .add(HN.growBloom(bloom, 1), 0.7);
    HN.onLeave(() => intro.kill());

    $$(".magnetic", app).forEach((n) => HN.magnetic(n));

    // the envelope floats; the heart opens it, then the card moves on to the question
    const envFloat = HN.loop(gsap.to(env, { y: -10, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    const sway = HN.swayBloom(bloom, intro.duration());
    const heart = $(".nheart", env);
    let envBusy = false;
    heart.addEventListener("click", () => {
      if (envBusy) return;
      envBusy = true;
      HN.burstAt(heart, 24);
      const t = HN.openLove(env).to({}, { duration: 0.9 }).add(() => swap($("#dEnv"), $("#dQ"), $("#dYes")));
      HN.onLeave(() => t.kill());
    });

    initDemo();
    initJourney(app);

    $$("[data-scramble]", app).forEach(HN.scramble);
    HN.feedback($("#homeFb"));

    // ticket pocket: the ticket rises out of the pocket once it scrolls into view
    const tk = HN.ticket({ from: "Minh", to: "Lan", when: HN.fmtWhen(HN.iso(HN.nextSaturday()), 19, 30), plans: ["trasua", "xemphim"], dodges: HN.NO_LIMIT, code: "k3x9m2pq" });
    $("#homeTicket .tk-feed").append(tk);
    HN.tilt(tk, 12);
    if (!HN.reduce) {
      gsap.set(tk, { yPercent: 70 });
      onceVisible($(".ticket-sec", app), 0.4, () => {
        const t = gsap.to(tk, { yPercent: 0, duration: 1.6, ease: "power3.out" });
        HN.onLeave(() => t.kill());
      });
    }

    HN.pauseOffscreen([
      [$(".hero-stage", app), [envFloat, sway]],
      [$(".cta-band", app), []],
      ...$$(".grad-text", app).map((n) => [n, []]),
    ]);
    HN.reveal(app);
  };

  // runs fn once when node is first at least `ratio` visible, then lets go of the observer
  function onceVisible(node, ratio, fn) {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fn();
    }, { threshold: ratio });
    io.observe(node);
    HN.onLeave(() => io.disconnect());
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

  // 4 stops: the letter flies along the line, each stop pops as it passes
  function initJourney(app) {
    const wrap = $(".jmap-wrap", app), fill = $(".jline-fill", app), flyer = $(".jflyer", app);
    const dots = $$(".jdot", app), labels = $$(".jmap b", app), pin = $(".jpin", app);
    if (HN.reduce) return;
    gsap.set(fill, { scaleX: 0 });
    gsap.set(dots, { scale: 0, autoAlpha: 0 });
    gsap.set(labels, { autoAlpha: 0, y: 8 });
    gsap.set(pin, { autoAlpha: 0, y: -16 });
    onceVisible(wrap, 0.5, () => {
      const run = 2.4, dx = wrap.getBoundingClientRect().width * 0.75;
      const tl = gsap.timeline()
        .fromTo(flyer, { x: 0, autoAlpha: 1 }, { x: dx, duration: run, ease: "none" }, 0)
        .to(fill, { scaleX: 1, duration: run, ease: "none" }, 0);
      dots.forEach((d, i) => {
        const at = (i / (dots.length - 1)) * run * 0.92;
        tl.to(d, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2.5)" }, at)
          .to(labels[i], { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, at + 0.1);
      });
      tl.to(flyer, { autoAlpha: 0, scale: 0.4, duration: 0.3, ease: "power2.in" }, run)
        .to(pin, { autoAlpha: 1, y: 0, duration: 0.5, ease: "bounce.out" }, run);
      HN.onLeave(() => tl.kill());
    });
  }

  // the NO button hops around inside the demo card, never over YES or (if it can help it) the question
  function initDemo() {
    const stage = $("#dQ"), done = $("#dDone"), yes = $("#dYes"), no = $("#dNo"), run = $("#dRun");
    let dodges = 0, gone = false, floating = false, last = 0, autoYes = null;
    HN.onLeave(() => autoYes && autoYes.kill());
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
      if (HN.reduce) return;
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
  }
})();
