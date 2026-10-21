"use strict";
/* PAGES (P privacy, T terms, C contact): static text from strings.js. */
(() => {
  const HN = window.HN;
  const { $, $$ } = HN;

  function enter() {
    const app = $("#app");
    gsap.fromTo($$(".doc-card > *", app), { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.03, duration: 0.4, ease: "power3.out", clearProps: "transform,opacity" });
    HN.focusHeading(app);
  }

  HN.SCREENS.privacy = enter;
  HN.SCREENS.terms = enter;
  HN.SCREENS.contact = enter;
})();
