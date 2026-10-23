# Báo cáo test UI DiDateHong, 23/10/2026

## 1. Môi trường

| Mục | Giá trị |
| --- | --- |
| Commit | `a945235` (bản build `dist/`, `app.4026e9baba.js` 240.8KB, 81KB khi gzip) |
| Trình duyệt | Chrome 155.0.8059.85, headless, điều khiển bằng `playwright-core` |
| Server test | `.claude/skills/hennha-ui-test/scripts/serve.mjs`: cùng header với `server/index.mjs` (không nén, `no-cache`), `/api/*` trả stub nên không cần Google key |
| Desktop | 1280×800 |
| Mobile | 390×844, DPR 3, touch, UA Android Chrome, `vi-VN`, `Asia/Ho_Chi_Minh` |
| 4G | RTT 150ms, tải xuống 9 Mbps / tải lên 1.5 Mbps, CPU chậm 4x |
| 4G yếu | RTT 150ms, 1.6 Mbps / 750 Kbps, CPU chậm 4x (giống profile mobile của Lighthouse) |
| Chạy lại | skill `hennha-ui-test` (`.claude/skills/hennha-ui-test/SKILL.md`) |

Kết quả cuối: **100/100 case pass** (50 desktop, 50 mobile). Các lần chạy trước có vài case fail, tất cả đều do test chờ chưa đủ lâu và đã được xác minh lại (xem mục 5).

## 2. Test case chức năng và layout

✅ pass · ⚠️ pass nhưng có ghi chú cải tiến · ❌ fail · – không áp dụng

| ID | Khu vực | Test case | Desktop | Mobile | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| H01 | Home | Mở trang chủ, hero + thiệp mẫu hiện, không lỗi JS | ✅ | ✅ | |
| H02 | Layout | Home (đầu trang): không tràn ngang, không phần tử nào lòi khỏi màn | ✅ | ⚠️ | Touch target < 44px: logo 129×24, "Thiệp của tôi" 138×40, nút EN 44×34, link footer cao 22px |
| H03 | Home | Đổi ngôn ngữ VI → EN → VI | ✅ | ✅ | Trên mobile chỉ hiện nút của ngôn ngữ chưa chọn (đúng thiết kế) |
| H04 | Home | Thiệp mẫu: bấm tim → câu hỏi → nút Không né 5 lần → Đồng ý → Chơi lại | ✅ | ✅ | Từ lúc bấm tim tới khi câu hỏi hiện mất khoảng 2.7s (xem mục 5, #11) |
| H05 | Home | Mobile: nút "Tạo thiệp" dính đáy hiện khi cuộn qua hero | – | ⚠️ | Nút hiện trễ: khi CTA của hero đã nằm dưới topbar thì vẫn bị tính là đang hiện (#8) |
| H06 | Home | Khối story: ảnh vé mẫu vẽ xong khi cuộn tới | ✅ | ✅ | |
| H07 | Layout | Home (khối vé): không tràn | ✅ | ⚠️ | Touch target như H02 |
| H08 | Home | Góp ý: chọn cảm nhận → Tiếp → chọn kênh → Gửi → cảm ơn | ✅ | ✅ | Bấm Gửi khi chưa chọn kênh thì báo lỗi đúng |
| H09 | Pages | Footer → Quyền riêng tư | ✅ | ✅ | |
| H10 | Pages | Footer → Điều khoản | ✅ | ✅ | |
| H11 | Pages | Footer → Liên hệ | ✅ | ✅ | |
| H12 | Home | Nút "Xem thiệp mẫu" → màn người nhận demo | ✅ | ✅ | |
| C01 | Create | B1: chưa nhập thì nút Tiếp bị khóa, xóa tên người nhận thì báo lỗi + `aria-invalid` | ✅ | ✅ | |
| C02 | Create | B1: tối đa 20 ký tự, Tab chuyển sang ô kế tiếp | ✅ | ✅ | Tên tiếng Việt bị gạch đỏ chính tả (#12) |
| C03 | Layout | Create B1: không tràn | ✅ | ⚠️ | Touch target của topbar |
| C04 | Create | B2: chọn mẫu (`aria-pressed`), xóa trống thì báo lỗi, tự viết lời mời | ✅ | ✅ | 2 mẫu |
| C05 | Layout | Create B2: không tràn | ✅ | ⚠️ | Nút stepper 60×36 |
| C06 | Create | B3: chọn ngày + giờ + phút, đổi sang "để người ấy chọn" rồi quay lại vẫn giữ giờ | ✅ | ✅ | |
| C07 | Create | B3: dropdown giờ đóng bằng Escape | ✅ | ✅ | |
| C08 | Layout | Create B3: không tràn | ✅ | ⚠️ | Ô ngày trong lịch 39×38, nút đổi tháng 40×40 |
| C09 | Create | Tải lại trang ở B3 vẫn giữ nháp | ✅ | ✅ | |
| C10 | Create | B4: chọn 2 kèo ăn + 1 kèo chơi, bộ đếm đúng | ✅ | ✅ | |
| C11 | Layout | Create B4: không tràn | ✅ | ⚠️ | Tab Ăn uống / Đi chơi cao 40px |
| C12 | Create | B5: iframe xem trước chạy màn người nhận, sheet Sửa mở và đóng được bằng Escape | ✅ | ✅ | |
| C13 | Layout | Create B5: không tràn | ✅ | ⚠️ | Link "Xem lại từ đầu" cao 39px |
| C14 | Create | B6: chưa tick đồng ý thì nút Tạo link bị khóa và có dòng giải thích | ✅ | ✅ | |
| C15 | Create | B7: tạo link, Copy (đúng clipboard), Chia sẻ (`navigator.share` nhận đúng link), "Thiệp của tôi" = 1 | ✅ | ✅ | Link dài 249 ký tự |
| C16 | Layout | Create B7: không tràn | ✅ | ⚠️ | Nút Copy cao 38px |
| C17 | Create | Tải lại ở B7 vẫn giữ; "Tạo thiệp mới" về B1 trống | ✅ | ✅ | |
| C18 | Create | Cả luồng tạo không có lỗi JS hay request lỗi | ✅ | ✅ | |
| R01 | Receiver | Mở link: phong bì → bấm tim → câu rủ đúng nội dung | ✅ | ✅ | |
| R02 | Receiver | Nút Không né 5 lần rồi biến mất, hiện lời năn nỉ | ✅ | ✅ | |
| R03 | Layout | Màn câu rủ: không tràn | ✅ | ⚠️ | Touch target của topbar |
| R04 | Receiver | Đồng ý → giờ hẹn cố định → Chốt giờ | ✅ | ✅ | |
| R05 | Receiver | Kèo: chọn 1 kèo; xóa chữ ký thì báo lỗi và khóa nút; ký lại → Xong | ✅ | ✅ | |
| R06 | Layout | Màn vé hẹn: không tràn | ✅ | ⚠️ | Touch target của topbar |
| R07 | Receiver | Lưu ảnh vé: hộp xem ảnh mở, có ảnh, Escape đóng | ✅ | ✅ | |
| R08 | Receiver | Thêm vào lịch: sheet có link Google Calendar + file `.ics` | ✅ | ✅ | |
| R09 | Receiver | "Tạo thiệp của bạn" → sang màn tạo | ✅ | ✅ | |
| R10 | Receiver | Đề xuất giờ khác + kèo khác → vé ghi "đề xuất", ẩn nút thêm lịch | ✅ | ✅ | |
| R11 | Receiver | Thiệp "để người nhận chọn giờ": lịch hiện ngay, chọn xong mới cho Tiếp | ✅ | ✅ | |
| R12 | Receiver | Link hỏng → màn "thiệp không còn" | ✅ | ✅ | |
| R13 | Receiver | Cả luồng người nhận không có lỗi JS hay request lỗi | ✅ | ✅ | |
| Q01 | Manage | Thiệp của tôi: có thiệp vừa tạo + 1 phản hồi, mở xem được phản hồi | ✅ | ✅ | |
| Q02 | Layout | Danh sách thiệp: không tràn | ✅ | ⚠️ | "Xem phản hồi" chỉ cao 28px; Copy/Mở/Lưu ảnh/Thêm vào lịch cao 38px |
| Q03 | Manage | Tab Lịch hiện được | ✅ | ⚠️ | Lịch mở ở tháng hiện tại, còn hẹn rơi vào tháng sau nên nhìn vào thấy trống (#9) |
| Q04 | Layout | Tab Lịch: không tràn | ✅ | ⚠️ | Ô ngày 43×38 |
| Q05 | Manage | "Xem dữ liệu mẫu" hiện 3 thiệp mẫu, mở được phản hồi | ✅ | ✅ | |
| Q06 | Manage | Trình duyệt mới: trạng thái trống có 1 hành động rõ ràng | ✅ | ✅ | |
| Q07 | Manage | Màn quản lý không có lỗi JS hay request lỗi | ✅ | ✅ | |
| K01 | A11y | Bàn phím: Tab tới nút Tạo thiệp, Enter mở màn tạo, có viền focus | ✅ | – | |

Đánh giá UI mobile (390px, xem từng ảnh chụp): không màn nào bị tràn ngang, nút chính full-width, chữ không nhỏ hơn 11px, thiệp và vé nằm cân giữa màn. Chỗ cần sửa là các touch target dưới 44px kể trên.

## 3. Test 4G: có bị giật không?

**Có.** Trên 4G + CPU chậm 4x, home và màn người nhận chạy khoảng 35–45 fps, và chỉ 47–60% số frame là mượt (≤ 20ms).

### Tải trang lần đầu (không cache)

| Điều kiện | Server | Dung lượng tải | Hero hiện | FCP | LCP | CLS | Long task |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Không giới hạn | hiện tại (không nén) | 699KB | 1.5s | 0.97s | 1.17s | 0 | 1 (266ms) |
| 4G | hiện tại (không nén) | 699KB | 2.7s | 0.82s | 2.13s | 0 | 5 (1347ms) |
| 4G | có gzip | **249KB** | 2.6s | 0.74s | 1.85s | 0 | 5 (1247ms) |
| 4G yếu | hiện tại (không nén) | 699KB | 4.3s | 1.51s | 3.88s | 0 | 8 (1584ms) |
| 4G yếu | có gzip | **249KB** | **3.1s** | 0.89s | **2.54s** | 0 | 11 (1887ms) |

Các file nặng nhất: `app.<hash>.js` 246KB, `lottie_light.min.js` 165KB, `lottie/animations.js` 89KB, `app.css` 81KB.

### Độ mượt theo từng thao tác (fps / p95 frame time ms / % frame mượt)

| Thao tác | Không giới hạn | 4G + CPU 4x | 4G yếu + CPU 4x |
| --- | --- | --- | --- |
| Home: intro 4s đầu | 45 / 34 / 71% | 45 / 34 / 68% | 38 / 50 / 62% |
| Home: đứng yên | 44 / 34 / 71% | 41 / 34 / 59% | 38 / 50 / 52% |
| Home: vuốt cuộn | 56 / 33 / 93% | **36 / 50 / 54%** (15 long task) | 40 / 47 / 59% |
| Người nhận: phong bì intro | 52 / 34 / 85% | 41 / 34 / 61% | 44 / 33 / 69% |
| Người nhận: bấm tim mở thư | 55 / 33 / 92% | 35 / 50 / 49% | 31 / 67 / 43% |
| Người nhận: chạm nút Không né | 59 / 17 / 99% | **27 / 117 / 34%** | 24 / 100 / 32% |
| Người nhận: Đồng ý → bước giờ | 33 / 63 / 43% | 29 / 54 / 29% | 24 / 100 / 16% |
| Create: chuyển bước | 43 / 50 / 66% | 37 / 50 / 69% | 47 / 34 / 83% |
| Create: gõ lời mời | 59 / 17 / 99% | 40 / 50 / 64% | 42 / 34 / 63% |

Chú ý: Chrome headless vẽ bằng CPU (không có GPU thật), nên số tuyệt đối sẽ tệ hơn điện thoại thật. Dùng các con số này để so các phương án với nhau, không phải để so với chuẩn 60fps.

## 4. Nguyên nhân giật

### Trace (4G, home đứng yên 3s + cuộn)

Trên main thread: style recalc (`UpdateLayoutTree`) **~2960ms**, Layerize ~1170ms, Paint ~1130ms, Layout ~535ms. Toàn bộ JavaScript thì ít: GSAP tick ~290ms, `drift()` 17ms. Nghĩa là main thread bị ngốn bởi CSS animation và việc tạo/xóa DOM, không phải bởi logic JS.

### A/B: tắt từng hiệu ứng (4G + CPU 4x, trung bình 2 lần chạy, % frame mượt)

| Phương án | Home đứng yên | Home cuộn | Người nhận đứng yên |
| --- | --- | --- | --- |
| Bản gốc | 47–58% | 47–50% | 55–61% |
| Tắt viền xoay `.glow-border` (`--a` conic-gradient) | 68% | 58% | 68% |
| Tắt `backdrop-filter` | 59% | 56% | 50% |
| Tắt shimmer chữ gradient | 57% | 57% | 67% |
| Tắt `mix-blend-mode` + grain | 78% | 69% | 70% |
| Tắt aurora | 68% | 65% | 51% |
| Tắt lưới sàn `.floor` | 68% | 48% | 63% |
| Tắt hạt bay + sao băng (`.drift`, `.shooting`) | 66% | 76% | 83% |
| Tắt 70 ngôi sao twinkle (`.star`) | **78%** | **79%** | **90%** |
| **Tắt toàn bộ animation nền `.bg`** | **96%** (57fps) | **96%** (57fps) | **99%** (59fps) |

Kết luận: **thủ phạm chính là lớp nền `.bg`**. Trong đó nặng nhất là 70 thẻ `.star`, mỗi thẻ có một CSS animation vô hạn riêng và là một compositor layer riêng. Đứng thứ hai là `drift()`, cứ 420ms lại chèn một hạt mới có `text-shadow` vào DOM (cùng lúc có khoảng 25–40 hạt). Lưới sàn, aurora và blend mode mỗi thứ góp thêm một phần nhỏ. Viền xoay `.glow-border` và `backdrop-filter` chỉ là nguyên nhân phụ.

## 5. Lỗi và cải tiến

Không tìm thấy lỗi chức năng nào. Các mục dưới đây đều có test hoặc số đo làm bằng chứng.

| # | Mức | Vấn đề | Bằng chứng | Đề xuất |
| --- | --- | --- | --- | --- |
| 1 | Cao | Giật trên điện thoại tầm trung / 4G | Mục 3–4: 47–60% frame mượt, tắt nền thì lên 96–99% | Gộp 70 ngôi sao thành 2–3 lớp tĩnh (nền `radial-gradient`) rồi chỉ nhấp nháy opacity cả lớp; giảm `drift` trên mobile (ví dụ 1.2s một hạt, tối đa khoảng 10 hạt, bỏ `text-shadow`); hoặc giảm hiệu ứng khi `!HN.fine` hay `navigator.hardwareConcurrency <= 4` |
| 2 | Trung bình | Server không nén, còn bundle có hash cũng bị `Cache-Control: no-cache` | 699KB → 249KB khi gzip; 4G yếu: hero 4.3s → 3.1s, LCP 3.9s → 2.5s | Nén gzip/brotli trong `server/index.mjs` (hoặc nén sẵn lúc build); `app.<hash>.js` dùng `max-age=31536000, immutable`; font/lottie cũng cache dài |
| 3 | Trung bình | Long task lúc load trên CPU chậm | 4G: 5 long task, tổng ~1.3s; 4G yếu: 8–11 long task, ~1.6–1.9s | Trace riêng để biết task nào (parse bundle 246KB, lottie 165KB + 89KB JSON, intro). Lottie đã được nạp lúc idle, có thể hoãn thêm tới khi có tương tác đầu tiên |
| 4 | Trung bình | Né nút Không và Đồng ý → bước giờ bị khựng trên 4G | `recvNo` 27fps, p95 117ms, 7 long task (660ms); `recvYes` 29% frame mượt | Sửa #1 trước rồi đo lại; nếu vẫn chậm thì trace riêng `runaway.js` (`spot()`) |
| 5 | Thấp | Viền xoay `.glow-border` animate `--a` (custom property) nên bị repaint mỗi frame; trên các panel create/recv/doc-card lại không có `pauseOffscreen` | A/B: home đứng yên 58% → 68% | Xoay bằng `transform: rotate` trên một pseudo-element vuông (chạy được trên compositor), hoặc chỉ xoay khi card đang hiện |
| 6 | Thấp | Lá thư bay trên bản đồ hành trình animate `left` (layout mỗi frame), trái với rule motion của skill hennha-ui | `js/screens/home.js` `initJourney`; trace có Layout ~535ms | Đổi sang `x` (transform) theo phần trăm độ rộng track |
| 7 | Thấp | Touch target < 44px trên mobile | H02, C05, C08, Q02: logo 24px, nút EN 34px, link footer 22px, stepper 36px, ô ngày 38px, "Xem phản hồi" 28px, Copy/Mở 38px | Tăng `min-height: 44px` / padding cho các nút này; link footer thêm padding dọc |
| 8 | Thấp | Nút "Tạo thiệp" dính đáy hiện trễ khoảng 1 chiều cao topbar | H05: CTA của hero đã nằm dưới topbar mà vẫn được tính là đang hiện | Thêm `rootMargin: "-70px 0px 0px 0px"` (topbar cao 69px trên mobile) cho observer trong `initStickyCta` |
| 9 | Thấp | Tab Lịch mở ở tháng hiện tại dù mọi lịch hẹn nằm ở tháng sau, nên nhìn vào thấy trống | Q03 | Mở lịch ở tháng của lịch hẹn gần nhất sắp tới |
| 10 | Thấp | Toast chỉ được ẩn bằng `translateY(140px)` nên lộ ra trong ảnh full-page, hoặc khi viewport cao thêm | Ảnh chụp full-page có viên pill rỗng ở giữa màn | Thêm `visibility: hidden` lúc ẩn, `visible` khi có `.show` |
| 11 | Ý tưởng | Từ lúc bấm tim tới khi câu hỏi hiện mất 2.7s (2.3s đầu là animation mở thư + giữ 0.9s); trên máy chậm còn lâu hơn | Đo ổn định qua 6 lần bấm | Cân nhắc rút thời gian giữ 0.9s, hoặc cho chạm lần nữa để bỏ qua |
| 12 | Ý tưởng | Ô tên bị gạch đỏ chính tả với tên tiếng Việt | Ảnh mobile-create-1 | `spellcheck="false"` cho `#nameFrom`, `#nameTo`, `#signName` |

## 6. Phạm vi chưa test

- Điện thoại thật (Safari iOS, GPU thật). Số liệu ở trên lấy từ Chrome giả lập.
- Đăng nhập Google (đang tắt) và lưu thiệp lên Drive (`/api/invites` chỉ là stub).
- Hộp chia sẻ thật của hệ điều hành (`navigator.share` được giả lập để ghi lại dữ liệu), cũng như nội dung file `.ics` tải về.
- `prefers-reduced-motion`.
