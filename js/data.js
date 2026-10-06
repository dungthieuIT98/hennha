"use strict";
window.HN = {
  DOMAIN: "dungthieuit98.github.io/hennha",
  PAYMENT_ENABLED: false,
  NO_LIMIT: 4,

  TEMPLATES: [
    { id: "t1", text: "{to} ơi, cuối tuần này đi chơi với tớ nha?" },
    { id: "t2", text: "Tớ có một kèo hẹn, chỉ thiếu mỗi {to} thôi. Đi không?" },
    { id: "t5", text: "Tớ bao, {to} chỉ cần gật đầu thôi. Đi chơi nha?" },
  ],

  PLANS: [
    { id: "trasua", ico: "🧋", name: "Trà sữa", group: "an" },
    { id: "cafe", ico: "☕", name: "Cà phê", group: "an" },
    { id: "lau", ico: "🍲", name: "Lẩu", group: "an" },
    { id: "nuong", ico: "🍖", name: "Đồ nướng", group: "an" },
    { id: "oc", ico: "🐚", name: "Ốc", group: "an" },
    { id: "kem", ico: "🍦", name: "Kem", group: "an" },
    { id: "che", ico: "🍧", name: "Chè", group: "an" },
    { id: "pizza", ico: "🍕", name: "Pizza", group: "an" },
    { id: "sushi", ico: "🍣", name: "Sushi", group: "an" },
    { id: "micay", ico: "🌶️", name: "Mì cay", group: "an" },
    { id: "garan", ico: "🍗", name: "Gà rán", group: "an" },
    { id: "bun", ico: "🍜", name: "Phở / Bún", group: "an" },
    { id: "an-gi-cung-duoc", ico: "🍽️", name: "Ăn gì cũng được", group: "an" },
    { id: "xemphim", ico: "🎬", name: "Xem phim", group: "choi" },
    { id: "daopho", ico: "🚶", name: "Dạo phố", group: "choi" },
    { id: "daoho", ico: "🌊", name: "Dạo hồ / bờ sông", group: "choi" },
    { id: "karaoke", ico: "🎤", name: "Karaoke", group: "choi" },
    { id: "photobooth", ico: "📸", name: "Photobooth", group: "choi" },
    { id: "khuvuichoi", ico: "🎡", name: "Khu vui chơi", group: "choi" },
    { id: "workshop", ico: "🎨", name: "Workshop", group: "choi" },
    { id: "chodem", ico: "🏮", name: "Chợ đêm", group: "choi" },
    { id: "concert", ico: "🎵", name: "Concert / sự kiện", group: "choi" },
    { id: "di-dau-cung-duoc", ico: "✨", name: "Đi đâu cũng được", group: "choi" },
  ],

  NO_TEXTS: ["Không", "Chắc chưa?", "Bấm nhầm hả?", "Nghĩ lại đi mà", "Nút này hơi trơn", "Không có cửa đâu", "Năn nỉ đó...", "Thôi mà", "Bấm YES đi", "Hết đường rồi"],

  SENDER_STEPS: [
    { n: "01", ico: "🎬", title: "Nhân vật chính", text: "Nhập tên bạn và tên người ấy. Tên hiện ngay trên phong bì." },
    { n: "02", ico: "💬", title: "Lời thoại", text: "Chọn một câu rủ có sẵn rồi sửa cho đúng giọng bạn." },
    { n: "03", ico: "🗓️", title: "Thời gian", text: "Chọn sẵn ngày giờ hẹn, người ấy chỉ cần gật đầu." },
    { n: "04", ico: "🍿", title: "Kịch bản", text: "Chọn các kèo sẽ hiện trên vé: trà sữa, xem phim, dạo hồ..." },
  ],
  RECEIVER_STEPS: [
    { n: "N1", ico: "💌", title: "Mở thư", text: "Một chạm là mở, thấy lời mời trong vài giây." },
    { n: "N2", ico: "🙈", title: "YES hay Không", text: "Nút Không né liên tục, tới lần thứ 4 thì YES tự bấm luôn." },
    { n: "N3", ico: "🎫", title: "Nhận vé", text: "Giờ và kèo bạn đã chọn sẵn nằm trên vé hai người 9:16, lưu ảnh khoe hoặc thêm vào lịch." },
  ],

  PRICING: [
    { id: "free", title: "Thiệp đầu tiên", sub: "Mỗi người được 1 thiệp miễn phí", price: "Miễn phí", pill: "Dành cho bạn" },
    { id: "one", title: "1 thiệp", sub: "Trả một lần cho thiệp này", price: "29.000đ" },
    { id: "three", title: "Gói 3 thiệp", sub: "Mua một lần, dùng dần", price: "39.000đ", pill: "Tiết kiệm" },
  ],

  SOURCES: ["TikTok", "Facebook", "Instagram", "Bạn bè gửi", "Khác"],
};
