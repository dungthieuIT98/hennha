"use strict";
/* Language: pick vi/en, look up strings (HN.t), fill [data-i18n] nodes, switch from the topbar. */
(() => {
  const HN = window.HN;
  const LANGS = ["vi", "en"];

  // 1. the user's own pick, 2. a Vietnamese device language, 3. a Vietnam time zone, 4. English
  function detect() {
    const saved = HN.local.get("hn-lang", null);
    if (LANGS.includes(saved)) return saved;
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    if (langs.some((l) => /^vi\b/i.test(l))) return "vi";
    let tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (_) { /* no Intl time zone */ }
    return tz === "Asia/Ho_Chi_Minh" || tz === "Asia/Saigon" ? "vi" : "en";
  }

  // { one, other } entries pick by vars.n; {name} placeholders are filled from vars in a single pass
  HN.t = (key, vars) => {
    let v = HN.I18N[HN.lang][key];
    if (v == null) v = HN.I18N.vi[key];
    if (v == null) { console.warn("i18n: missing " + key); return key; }
    if (typeof v === "object" && !Array.isArray(v)) v = vars && vars.n === 1 && v.one != null ? v.one : v.other;
    return typeof v === "string" && vars ? v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : v;
  };

  // data-i18n="key" sets the text, data-i18n-attr="attr:key,attr:key" sets attributes
  HN.applyI18n = (root) => {
    root.querySelectorAll("[data-i18n]").forEach((n) => {
      const lines = String(HN.t(n.dataset.i18n)).split("\n");
      n.replaceChildren(...lines.flatMap((l, i) => (i ? [document.createElement("br"), l] : [l])));
    });
    root.querySelectorAll("[data-i18n-attr]").forEach((n) => n.dataset.i18nAttr.split(",").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      n.setAttribute(attr, HN.t(key));
    }));
  };

  function use(lang) {
    HN.lang = lang;
    document.documentElement.lang = lang;
    document.title = HN.t("meta.title");
    HN.applyI18n(document.getElementById("topbar"));
    HN.$$("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }
  HN.setLang = (lang) => {
    if (!LANGS.includes(lang) || lang === HN.lang) return;
    HN.local.set("hn-lang", lang);
    const focused = document.activeElement && document.activeElement.closest("[data-lang]");
    use(lang);
    // on small screens the pressed button is hidden, so hand focus to the one still showing
    if (focused && !focused.getClientRects().length) { const other = HN.$$("[data-lang]").find((b) => b.getClientRects().length); if (other) other.focus(); }
    HN.render();
  };
  use(detect());
})();
