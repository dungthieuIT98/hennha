"use strict";
window.HN = {
  DOMAIN: "hennha.vn",
  PAYMENT_ENABLED: false,
  NO_LIMIT: 7,

  TEMPLATES: [
    { id: "t1", text: "{to} ơi, cuối tuần này đi chơi với tớ nha?" },
    { id: "t2", text: "Tớ có một kèo hẹn, chỉ thiếu mỗi {to} thôi. Đi không?" },
    { id: "t3", text: "Nói thật nha, tớ muốn rủ {to} đi chơi lâu rồi đó." },
    { id: "t4", text: "Hôm nào rảnh, {to} cho tớ một buổi hẹn được không?" },
    { id: "t5", text: "Tớ bao, {to} chỉ cần gật đầu thôi. Đi chơi nha?" },
    { id: "t6", text: "Nghe nói đi chơi với tớ vui lắm. {to} thử một lần không?" },
    { id: "t7", text: "Lịch tuần này của {to} còn trống chỗ cho tớ không?" },
    { id: "t8", text: "Không có gì đâu, chỉ là muốn rủ {to} đi chơi thôi." },
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
    { n: "03", ico: "🎟️", title: "Suất chiếu", text: "Chọn sẵn ngày giờ, hoặc để người ấy tự chọn." },
    { n: "04", ico: "🍿", title: "Kịch bản", text: "Đưa ra menu kèo: trà sữa, xem phim, dạo hồ..." },
  ],
  RECEIVER_STEPS: [
    { n: "N1", ico: "💌", title: "Mở thư", text: "Một chạm là mở, thấy lời mời trong vài giây." },
    { n: "N2", ico: "🙈", title: "YES hay Không", text: "Nút Không né liên tục, 7 lần thì bỏ chạy." },
    { n: "N3", ico: "📅", title: "Chọn giờ", text: "Giữ giờ bạn đề xuất hoặc đổi giờ khác." },
    { n: "N4", ico: "🧋", title: "Chọn kèo", text: "Chọn một hoặc nhiều kèo trong menu của bạn." },
    { n: "N5", ico: "✍️", title: "Để lại tên", text: "Để bạn biết ai đã nhận lời." },
    { n: "N6", ico: "🎫", title: "Nhận vé", text: "Vé hai người 9:16 để lưu ảnh khoe, thêm vào lịch." },
  ],

  PRICING: [
    { id: "free", title: "Thiệp đầu tiên", sub: "Mỗi người được 1 thiệp miễn phí", price: "Miễn phí", pill: "Dành cho bạn" },
    { id: "one", title: "1 thiệp", sub: "Trả một lần cho thiệp này", price: "29.000đ" },
    { id: "three", title: "Gói 3 thiệp", sub: "Mua một lần, dùng dần", price: "39.000đ", pill: "Tiết kiệm" },
  ],

  SOURCES: ["TikTok", "Facebook", "Instagram", "Bạn bè gửi", "Khác"],
};
