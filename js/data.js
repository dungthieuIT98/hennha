"use strict";
// Text for every entry lives in js/strings.js under "<kind>.<id>" keys.
window.HN = {
  DOMAIN: "dungthieuit98.github.io/hennha",
  PAYMENT_ENABLED: false,
  NO_LIMIT: 4,

  TEMPLATES: [{ id: "t6" }, { id: "t1" }, { id: "t2" }, { id: "t5" }],

  PLANS: [
    { id: "trasua", ico: "🧋", group: "an" },
    { id: "cafe", ico: "☕", group: "an" },
    { id: "lau", ico: "🍲", group: "an" },
    { id: "nuong", ico: "🍖", group: "an" },
    { id: "oc", ico: "🐚", group: "an" },
    { id: "kem", ico: "🍦", group: "an" },
    { id: "pizza", ico: "🍕", group: "an" },
    { id: "sushi", ico: "🍣", group: "an" },
    { id: "garan", ico: "🍗", group: "an" },
    { id: "an-gi-cung-duoc", ico: "🍽️", group: "an" },
    { id: "xemphim", ico: "🎬", group: "choi" },
    { id: "daopho", ico: "🚶", group: "choi" },
    { id: "karaoke", ico: "🎤", group: "choi" },
    { id: "photobooth", ico: "📸", group: "choi" },
    { id: "workshop", ico: "🎨", group: "choi" },
    { id: "chodem", ico: "🏮", group: "choi" },
    { id: "concert", ico: "🎵", group: "choi" },
    { id: "dapxe", ico: "🚲", group: "choi" },
    { id: "sup", ico: "🏄", group: "choi" },
    { id: "leonui", ico: "🧗", group: "choi" },
    { id: "baotang", ico: "🏛️", group: "choi" },
    { id: "di-dau-cung-duoc", ico: "✨", group: "choi" },
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
    { id: "one", price: 29000 },
    { id: "three", price: 39000, pill: true },
  ],

  SOURCES: ["social", "google", "invite", "friend", "other"],
};
