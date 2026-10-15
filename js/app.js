"use strict";
/* Router: hash routes to screens in js/screens/, page transitions, global click handlers. */
(() => {
  const HN = window.HN;
  const { $, $$, SCREENS } = HN;
  let navToken = 0, first = true, pendingScroll = null;

  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    // login: "login" is off with Google sign-in
    return { name: ({ create: "create", n: "n", q: "q" })[parts[0]] || "home", parts };
  }
  function mount(r) {
    document.body.dataset.route = r.name;
    const view = $("#tpl-" + r.name).content.cloneNode(true);
    HN.applyI18n(view);
    $("#app").replaceChildren(view);
    window.scrollTo(0, 0);
    try { SCREENS[r.name](r); } catch (e) { console.error(e); }
    HN.updateCount();
    if (r.name === "home" && pendingScroll) { const id = pendingScroll; pendingScroll = null; setTimeout(() => scrollToId(id), 120); }
  }
  // Google sign-in is off for now, so creating an invite is open to everyone.
  // To bring the gate back (creating needs a signed-in user; no answer from the server counts as not signed in):
  //   function enter(r, token, then) {
  //     const go = () => { mount(r); if (then) then(); };
  //     if (r.name !== "create") { go(); return; }
  //     HN.fetchMe().catch(() => null).then((user) => {
  //       if (token !== navToken) return;
  //       if (user) { go(); return; }
  //       HN.session.set("hn-after-login", "create");
  //       location.replace("#/login/need");
  //     });
  //   }
  function enter(r, token, then) {
    mount(r);
    if (then) then();
  }
  function render() {
    const r = route();
    const token = ++navToken;
    HN.leave();
    $$("body > .runaway-no, body > dialog").forEach((n) => n.remove());
    const app = $("#app");
    gsap.killTweensOf(app);
    if (first) { first = false; enter(r, token); return; }
    gsap.to(app, {
      opacity: 0, y: -12, duration: 0.18, ease: "power2.in",
      onComplete: () => {
        if (token !== navToken) return;
        enter(r, token, () => gsap.fromTo(app, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity" }));
      },
    });
  }
  HN.render = render;
  HN.updateCount = () => { const c = $("#myCount"); if (c) c.textContent = String(HN.invites.list().length); };
  function scrollToId(id) { const t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: HN.reduce ? "auto" : "smooth", block: "start" }); }

  document.addEventListener("click", (e) => {
    const lang = e.target.closest("[data-lang]");
    if (lang) { HN.setLang(lang.dataset.lang); return; }
    const s = e.target.closest("[data-scroll]");
    if (s) {
      e.preventDefault();
      if (route().name === "home") scrollToId(s.dataset.scroll);
      else { pendingScroll = s.dataset.scroll; location.hash = "#/"; }
      return;
    }
    if (e.target.closest("[data-new]") && HN.draft.get().published) HN.draft.clear();
    const soon = e.target.closest("[data-soon]");
    if (soon) { e.preventDefault(); HN.toast(HN.t("soon", { x: HN.t(soon.dataset.soon) })); }
  });
  const topbar = $("#topbar");
  addEventListener("scroll", () => topbar.classList.toggle("scrolled", scrollY > 10), { passive: true });

  addEventListener("hashchange", render);
  render();
})();
