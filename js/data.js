"use strict";
// Text for every entry lives in js/strings.js under "<kind>.<id>" keys.
window.HN = {
  DOMAIN: "didatehong.com",
  PAYMENT_ENABLED: false,
  NO_LIMIT: 5,

  TEMPLATES: [{ id: "t6" }, { id: "t7" }],

  PLANS: [
    { id: "cafe", ico: "☕", group: "an" },
    { id: "foodtour", ico: "🍢", group: "an" },
    { id: "rooftop", ico: "🍸", group: "an" },
    { id: "pizza", ico: "🍕", group: "an" },
    { id: "nuong", ico: "🍖", group: "an" },
    { id: "nachos", ico: "🌮", group: "an" },
    { id: "nhaviet", ico: "🍜", group: "an" },
    { id: "nhanhat", ico: "🍣", group: "an" },
    { id: "nhahan", ico: "🍲", group: "an" },
    { id: "nhatrung", ico: "🥟", group: "an" },
    { id: "nhanga", ico: "🪆", group: "an" },
    { id: "ankhac", ico: "🍽️", group: "an" },
    { id: "xemphim", ico: "🍿", group: "choi" },
    { id: "boardgame", ico: "🎲", group: "choi" },
    { id: "dapvit", ico: "🦢", group: "choi" },
    { id: "jump", ico: "🤸", group: "choi" },
    { id: "baotang", ico: "🏛️", group: "choi" },
    { id: "workshop", ico: "🎨", group: "choi" },
    { id: "dapxe", ico: "🚲", group: "choi" },
    { id: "xemxu", ico: "⚖️", group: "choi" },
    { id: "daopho", ico: "👣", group: "choi" },
    { id: "karaoke", ico: "🎤", group: "choi" },
    { id: "photobooth", ico: "📸", group: "choi" },
    { id: "concert", ico: "🎶", group: "choi" },
    { id: "sup", ico: "🏄", group: "choi" },
    { id: "choikhac", ico: "✨", group: "choi" },
  ],

  SENDER_STEPS: [
    { id: "s1", n: "01", ico: "🎬" },
    { id: "s2", n: "02", ico: "💬" },
    { id: "s3", n: "03", ico: "🗓️" },
    { id: "s4", n: "04", ico: "🍿" },
  ],
  RECEIVER_STEPS: [
    { id: "r1", n: "N1", ico: "💌" },
    { id: "r2", n: "N2", ico: "🙈" },
    { id: "r3", n: "N3", ico: "🎫" },
  ],

  // price in whole VND; pill is a strings key suffix when the plan has a badge
  PRICING: [
    { id: "free", price: 0, pill: true },
  ],

  SOURCES: ["social", "google", "ai", "friend", "other"],
};
