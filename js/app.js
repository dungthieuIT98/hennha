"use strict";
/* Router: hash routes to screens in js/screens/, page transitions, global click handlers. */
(() => {
  const HN = window.HN;
  const { $, $$, SCREENS } = HN;
  let navToken = 0, first = true, pendingScroll = null;

  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    return { name: ({ create: "create", n: "n", q: "q" })[parts[0]] || "home", parts };
  }
  function mount(r) {
    document.body.dataset.route = r.name;
    $("#app").replaceChildren($("#tpl-" + r.name).content.cloneNode(true));
    window.scrollTo(0, 0);
    try { SCREENS[r.name](r); } catch (e) { console.error(e); }
    HN.updateCount();
    if (r.name === "home" && pendingScroll) { const id = pendingScroll; pendingScroll = null; setTimeout(() => scrollToId(id), 120); }
  }
  function render() {
    const r = route();
    const token = ++navToken;
    HN.leave();
    $$("body > .runaway-no, body > dialog").forEach((n) => n.remove());
    const app = $("#app");
    gsap.killTweensOf(app);
    if (first) { first = false; mount(r); return; }
    gsap.to(app, {
      opacity: 0, y: -12, duration: 0.18, ease: "power2.in",
      onComplete: () => {
        if (token !== navToken) return;
        mount(r);
        gsap.fromTo(app, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity" });
      },
    });
  }
  HN.render = render;
  HN.updateCount = () => { const c = $("#myCount"); if (c) c.textContent = String(HN.invites.list().length); };
  function scrollToId(id) { const t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: HN.reduce ? "auto" : "smooth", block: "start" }); }

  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-scroll]");
    if (s) {
      e.preventDefault();
      if (route().name === "home") scrollToId(s.dataset.scroll);
      else { pendingScroll = s.dataset.scroll; location.hash = "#/"; }
      return;
    }
    if (e.target.closest("[data-new]") && HN.draft.get().published) HN.draft.clear();
    const soon = e.target.closest("[data-soon]");
    if (soon) { e.preventDefault(); HN.toast(soon.dataset.soon + " sẽ có sớm"); }
  });
  const topbar = $("#topbar");
  addEventListener("scroll", () => topbar.classList.toggle("scrolled", scrollY > 10), { passive: true });

  addEventListener("hashchange", render);
  render();
})();
