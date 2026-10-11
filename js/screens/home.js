"use strict";
/* HOME (G0): hero envelope, plan marquee, YES/NO demo, how-it-works tabs, ticket showcase. */
(() => {
  const HN = window.HN;
  const { $, $$, el } = HN;

  HN.SCREENS.home = () => {
    const app = $("#app");
    const chars = HN.split($(".hero-title .split", app));
    const env = HN.loveEnvelope({ to: "Lan" });
    $("#heroLove").append(env);
    const bloom = HN.bloom($("#heroBloom"));
    HN.mountLotties(app);

    const intro = gsap.timeline({ delay: 0.05 })
      .from(".chip-live", { y: -16, autoAlpha: 0, duration: 0.5, ease: "back.out(2)" })
      .from(chars, { y: 60, scale: 0.4, rotation: () => gsap.utils.random(-30, 30), autoAlpha: 0, duration: 0.6, stagger: 0.02, ease: "back.out(2.2)" }, "-=0.2")
      .fromTo(".grad-line", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power3.inOut" }, "-=0.4")
      .from(".stage-card", { scale: 0.6, rotation: -10, autoAlpha: 0, duration: 1.1, ease: "elastic.out(1, 0.6)" }, 0.25)
      .from(".orbit", { scale: 0.4, autoAlpha: 0, stagger: 0.12, duration: 0.8, ease: "back.out(1.6)" }, 0.5)
      .from(".float-badge", { scale: 0, autoAlpha: 0, stagger: 0.15, duration: 0.5, ease: "back.out(3)" }, 0.9)
      .add(HN.growBloom(bloom, 1), 0.7);
    HN.onLeave(() => intro.kill());

    $$("[data-scramble]", app).forEach(HN.scramble);
    $$(".tilt", app).forEach((n) => HN.tilt(n, 9));
    $$(".magnetic", app).forEach((n) => HN.magnetic(n));

    // hero envelope: floats, opens on heart tap, closes again
    const envFloat = HN.loop(gsap.to(env, { y: -10, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    const sway = HN.swayBloom(bloom, intro.duration());
    const heart = $(".nheart", env);
    let envBusy = false;
    heart.addEventListener("click", () => {
      if (envBusy) return;
      envBusy = true;
      HN.burstAt(heart, 24);
      const t = HN.openLove(env).to({}, { duration: 1.6 }).add(() => {
        HN.closeLove(env).add(() => { envBusy = false; });
      });
      HN.onLeave(() => t.kill());
    });

    // marquee of plans
    // the second copy only exists for the seamless loop, so screen readers skip it
    const fill = (host, list) => {
      const track = el("div", "mq-track");
      for (let k = 0; k < 2; k++) list.forEach((p) => {
        const c = el("span", "mq-chip"), ico = el("i", null, p.ico);
        ico.setAttribute("aria-hidden", "true");
        if (k) c.setAttribute("aria-hidden", "true");
        c.append(ico, document.createTextNode(p.name));
        track.append(c);
      });
      host.append(track);
    };
    const half = Math.ceil(HN.PLANS.length / 2);
    fill($("#mq1"), HN.PLANS.slice(0, half));
    fill($("#mq2"), HN.PLANS.slice(half));

    initDemo();

    // how it works: sender vs receiver tabs
    const renderSteps = (host, list) => list.forEach((s) => {
      const c = el("article", "step-card glass");
      const top = el("div", "step-top"), badge = el("span", "badge", s.ico);
      badge.setAttribute("aria-hidden", "true");
      top.append(el("span", "step-n", s.n), badge);
      c.append(top, el("h3", null, s.title), el("p", null, s.text));
      host.append(c);
      HN.tilt(c, 6);
    });
    const sender = $("#stepsSender"), receiver = $("#stepsReceiver");
    renderSteps(sender, HN.SENDER_STEPS);
    renderSteps(receiver, HN.RECEIVER_STEPS);
    HN.segTabs(app, (tab) => {
      const show = tab === "sender" ? sender : receiver;
      const hide = show === sender ? receiver : sender;
      if (!show.hidden) return;
      hide.hidden = true;
      show.hidden = false;
      gsap.fromTo(show.children, { y: 30, autoAlpha: 0, rotationX: -25 }, { y: 0, autoAlpha: 1, rotationX: 0, stagger: 0.07, duration: 0.55, ease: "back.out(1.6)" });
    });

    // ticket showcase
    const tk = HN.ticket({ from: "Minh", to: "Lan", when: HN.fmtWhen(HN.iso(HN.nextSaturday()), 19, 30), plans: ["trasua", "xemphim"], dodges: HN.NO_LIMIT, code: "k3x9m2pq" });
    $("#homeTicket").append(tk);
    HN.tilt(tk, 12);
    const tkFloat = HN.loop(gsap.to("#homeTicket", { y: -12, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" }));

    HN.pauseOffscreen([
      [$(".hero-stage", app), [envFloat, sway]],
      [$(".marquee", app), []],
      [$(".demo", app), []],
      [$(".ticket-sec", app), [tkFloat]],
      [$(".cta-band", app), []],
      ...$$(".grad-text", app).map((n) => [n, []]),
    ]);
    HN.reveal(app);
  };

  // the NO button hops around inside the demo card, never over YES or (if it can help it) the question
  function initDemo() {
    const stage = $("#dQ"), done = $("#dDone"), yes = $("#dYes"), no = $("#dNo"), run = $("#dRun");
    let dodges = 0, gone = false, floating = false, last = 0, autoYes = null;
    HN.onLeave(() => autoYes && autoYes.kill());
    const overlaps = (a, b, g) => !(a.x + a.w + g < b.x || b.x + b.w + g < a.x || a.y + a.h + g < b.y || b.y + b.h + g < a.y);

    function place(ys) {
      const c = stage.getBoundingClientRect(), yr = yes.getBoundingClientRect(), qr = $(".q", stage).getBoundingClientRect();
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
      no.textContent = HN.NO_TEXTS[dodges % HN.NO_TEXTS.length];
      place(ys);
      gsap.to(yes, { scale: ys, duration: 0.4, ease: "back.out(2.5)" });
    }
    HN.dodgeable(no, dodge);
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
        },
      });
    });
    $("#dReplay").addEventListener("click", () => {
      dodges = 0; gone = false; floating = false;
      run.hidden = true;
      gsap.set([yes, no, stage, done], { clearProps: "all" });
      no.classList.remove("floating");
      no.textContent = HN.NO_TEXTS[0];
      $(".btns", stage).append(no);
      done.hidden = true;
      stage.hidden = false;
      yes.focus({ preventScroll: true });
    });
  }
})();
