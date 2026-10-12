"use strict";
/* LOGIN: "Continue with Google" button and the signed-in state. The session lives in an HttpOnly cookie set by server/index.mjs. */
(() => {
  const HN = window.HN;
  const { $ } = HN;

  HN.SCREENS.login = (r) => {
    const card = $("#loginCard");
    const title = $("#loginTitle");
    const panes = { out: $("#loginOut"), in: $("#loginIn"), down: $("#loginDown") };
    const ctrl = new AbortController();
    HN.onLeave(() => ctrl.abort());

    function show(name, titleKey) {
      Object.entries(panes).forEach(([k, n]) => { n.hidden = k !== name; });
      title.textContent = HN.t(titleKey);
      card.removeAttribute("aria-busy");
      HN.focusHeading(card);
    }

    // result of the Google round trip comes back as #/login/denied or #/login/error
    function showReturnError() {
      const kind = r.parts[1];
      const err = $("#loginErr");
      err.hidden = kind !== "denied" && kind !== "error";
      if (!err.hidden) err.textContent = HN.t(kind === "denied" ? "login.err.denied" : "login.err.fail");
      $("#loginNeed").hidden = kind !== "need";
    }

    async function load() {
      card.setAttribute("aria-busy", "true");
      try {
        const user = await HN.fetchMe(ctrl.signal);
        if (user && HN.session.get("hn-after-login", "") === "create") {
          // the visitor was sent here from "create invite": go back to it now that they're signed in
          HN.session.del("hn-after-login");
          location.replace("#/create");
        } else if (user) {
          $("#loginAs").textContent = HN.t("login.in.as", { email: user.email });
          show("in", "login.in.h1");
        } else {
          showReturnError();
          show("out", "login.h1");
        }
      } catch (e) {
        if (e.name === "AbortError") return;
        show("down", "login.h1");
      }
    }

    $("#retryBtn").addEventListener("click", load);
    $("#logoutBtn").addEventListener("click", async () => {
      try {
        const res = await fetch("/api/logout", { method: "POST", credentials: "same-origin", signal: ctrl.signal });
        if (!res.ok) throw new Error("status " + res.status);
        HN.toast(HN.t("login.loggedOut"));
        load();
      } catch (e) {
        if (e.name !== "AbortError") HN.toast(HN.t("login.err.fail"));
      }
    });
    load();
  };
})();
