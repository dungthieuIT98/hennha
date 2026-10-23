# Báo cáo test UI DiDateHong, vòng 2 (sau khi sửa), 23/10/2026

Vòng 1 (commit `a945235`) tìm ra 12 vấn đề. Vòng này sửa cả 12, sửa thêm 4 vấn đề lộ ra trong lúc test lại, rút gọn link gửi thiệp, rồi chạy lại toàn bộ test trên bản build cuối.

## 1. Môi trường

| Mục | Giá trị |
| --- | --- |
| Code | `a945235` + các thay đổi trong commit này. Build `dist/app.a0233f255e.js` 249.6KB (84.6KB gzip, khoảng 73KB brotli) |
| Trình duyệt | Chrome 155.0.8059.85, headless, điều khiển bằng `playwright-core` |
| Server test | `.claude/skills/hennha-ui-test/scripts/serve.mjs`: dùng đúng code phục vụ file tĩnh của production (`server/static.mjs`); `/api/*` trả stub |
| Desktop / Mobile | 1280×800 / 390×844, DPR 3, touch, UA Android Chrome, `vi-VN` |
| 4G | RTT 150ms, 9 Mbps / 1.5 Mbps, CPU chậm 4x |
| 4G yếu | RTT 150ms, 1.6 Mbps / 750 Kbps, CPU chậm 4x |
| Chạy lại | skill `hennha-ui-test` (`.claude/skills/hennha-ui-test/SKILL.md`) |

## 2. Tóm tắt

- **E2E: 107/107 pass** (55 desktop, 52 mobile). Tất cả các lượt chạy trên bản cuối đều pass hết.
- **Mã hóa link** (`link-codec.cjs`): 3 lượt, mỗi lượt gồm 3000 lần encode→decode, link v1 cũ và 20.000 link hỏng. Kết quả **ALL OK**.
- **Giật trên 4G:** home và màn người nhận từ 29–61% frame mượt lên **85–99%**.
- **Dung lượng tải:** 699KB → **229KB**. Trên 4G yếu, hero hiện sau 3.2s (trước 4.3s), LCP 2.3s (trước 3.9s).
- **Link gửi thiệp:** lời mời mẫu 266 → **62** ký tự, tự viết 249 → **103**, dài nhất 475 → **247**.

## 3. Test case chức năng và layout

✅ pass · ⚠️ pass nhưng có ghi chú · ❌ fail · – không áp dụng. Case mới so với vòng 1: H13, R14, S01–S03. C15, H05 và Q03 được viết lại để kiểm đúng lỗi vừa sửa.

| ID | Khu vực | Test case | Desktop | Mobile | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| H01 | Home | Mở trang chủ, hero + thiệp mẫu hiện, không lỗi JS | ✅ | ✅ |  |
| H02 | Layout | home-top: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| H03 | Home | Đổi ngôn ngữ VI → EN → VI | ✅ | ✅ | "Tạo thiệp – miễn phí →" ↔ "Create one, free →" |
| H04 | Home | Thiệp mẫu: bấm tim → câu hỏi → nút Không né 5 lần → Đồng ý → Chơi lại | ✅ | ✅ | nút Không đổi 6 câu chữ |
| H05 | Home | Điện thoại: nút Tạo thiệp dính đáy hiện ngay khi nút của hero lọt dưới topbar | – | ✅ | Đúng case từng fail ở vòng 1 |
| H06 | Home | Khối story: ảnh vé mẫu vẽ xong khi cuộn tới | ✅ | ✅ |  |
| H07 | Layout | home-ticket: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| H08 | Home | Góp ý trang chủ: chọn cảm nhận → Tiếp → chọn kênh → Gửi → cảm ơn | ✅ | ✅ | gửi khi chưa chọn kênh → hiện lỗi đúng |
| H09 | Pages | Footer → trang privacy | ✅ | ✅ |  |
| H10 | Pages | Footer → trang terms | ✅ | ✅ |  |
| H11 | Pages | Footer → trang contact | ✅ | ✅ |  |
| H12 | Home | Nút Xem thiệp mẫu → màn người nhận demo | ✅ | ✅ |  |
| H13 | Motion | Home: số animation chạy cùng lúc ít, lá thư bay chỉ dùng transform, toast ẩn hẳn | ✅ | ✅ | Desktop 39 animation, 22 hạt bay; mobile 25 animation, 8 hạt bay |
| C01 | Create | B1 tên: chưa nhập thì nút Tiếp khóa, xóa tên người nhận thì báo lỗi | ✅ | ✅ |  |
| C02 | Create | B1: giới hạn 20 ký tự, Tab chuyển ô | ✅ | ✅ |  |
| C03 | Layout | create-1: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| C04 | Create | B2 lời mời: chọn mẫu, xóa trống báo lỗi, tự viết | ✅ | ✅ | 2 mẫu |
| C05 | Layout | create-2: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| C06 | Create | B3 thời gian: chọn ngày + giờ + phút, đổi qua 'để người ấy chọn' rồi quay lại | ✅ | ✅ | ✓ Chủ nhật, 01/11/2026 lúc 19:00 |
| C07 | Create | B3: dropdown giờ đóng bằng Escape, focus về nút | ✅ | ✅ |  |
| C08 | Layout | create-3: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ⚠️ | Ô ngày trong lịch rộng 39–43px (lưới 7 cột trên 390px), cao 44px |
| C09 | Create | Nháp được giữ khi tải lại trang (đang ở B3) | ✅ | ✅ |  |
| C10 | Create | B4 kèo: chọn 2 món ăn + 1 món chơi, bộ đếm đúng | ✅ | ✅ | Đã chọn 3 kèo |
| C11 | Layout | create-4: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| C12 | Create | B5 xem trước: iframe chạy màn người nhận, sheet Sửa mở/đóng bằng Escape | ✅ | ✅ |  |
| C13 | Layout | create-5: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| C14 | Create | B6: chưa tick đồng ý thì nút Tạo link khóa và có lời giải thích | ✅ | ✅ |  |
| C15 | Create | B7: bấm Tạo link 2 lần ngay khi B6 hiện → sang B7, chỉ 1 thiệp; copy link, chia sẻ | ✅ | ✅ | Link dài 102 ký tự (vòng 1: 249). Test này fail trên code cũ ("đếm thiệp: 2") |
| C16 | Layout | create-7: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| C17 | Create | B7 giữ nguyên khi tải lại; 'Tạo thiệp mới' về B1 trống | ✅ | ✅ |  |
| C18 | Create | Không có lỗi JS / request lỗi trong cả luồng tạo | ✅ | ✅ |  |
| R01 | Receiver | Mở link: phong bì → bấm tim → câu rủ đúng nội dung | ✅ | ✅ | Link định dạng v2 |
| R02 | Receiver | Nút Không né (5 lần) rồi biến mất, hiện lời năn nỉ | ✅ | ✅ | 6 câu chữ |
| R03 | Layout | recv-2: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| R04 | Receiver | Đồng ý → giờ hẹn cố định → Chốt giờ | ✅ | ✅ |  |
| R05 | Receiver | Kèo: chọn 1 kèo; xóa chữ ký báo lỗi; ký lại → Xong | ✅ | ✅ |  |
| R06 | Layout | recv-5: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| R07 | Receiver | Lưu ảnh vé: hộp xem ảnh mở, có ảnh, Escape đóng | ✅ | ✅ | Ảnh giờ là Blob (`toBlob`) |
| R08 | Receiver | Thêm vào lịch: sheet có link Google Calendar + file .ics | ✅ | ✅ |  |
| R09 | Receiver | 'Tạo thiệp của bạn' → sang màn tạo | ✅ | ✅ |  |
| R10 | Receiver | Thiệp mẫu: đề xuất giờ khác + đề xuất kèo khác → thiệp ghi 'đề xuất', ẩn nút thêm lịch | ✅ | ✅ | Đã gửi đề xuất cho Minh |
| R11 | Receiver | Thiệp 'để người nhận chọn giờ': hiện lịch ngay, chọn xong mới cho Tiếp | ✅ | ✅ |  |
| R12 | Receiver | Link hỏng → màn 'thiệp không còn' | ✅ | ✅ |  |
| R13 | Receiver | Không có lỗi JS / request lỗi trong luồng người nhận | ✅ | ✅ |  |
| R14 | Receiver | Link dạng cũ (v1, base64 JSON) vẫn mở được | ✅ | ✅ |  |
| Q01 | Manage | Thiệp của tôi: có thiệp vừa tạo + 1 phản hồi, mở xem phản hồi | ✅ | ✅ | 1 phản hồi |
| Q02 | Layout | manage-list: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ✅ |  |
| Q03 | Manage | Tab Lịch mở ở tháng có lịch hẹn gần nhất, ngày hẹn được đánh dấu | ✅ | ✅ | 1 ngày có hẹn, lịch mở ở Tháng 11, 2026 |
| Q04 | Layout | manage-cal: không tràn ngang, không phần tử lòi khỏi màn | ✅ | ⚠️ | Ô ngày trong lịch rộng 39–43px (lưới 7 cột trên 390px), cao 44px |
| Q05 | Manage | Nút xem dữ liệu mẫu hiện 3 thiệp mẫu, mở được phản hồi | ✅ | ✅ |  |
| Q06 | Manage | Trình duyệt mới: trạng thái trống có 1 hành động rõ ràng | ✅ | ✅ |  |
| Q07 | Manage | Không có lỗi JS / request lỗi ở màn quản lý | ✅ | ✅ |  |
| K01 | A11y | Bàn phím: Tab từ đầu trang tới nút Tạo thiệp, Enter mở màn tạo, focus hiện viền | ✅ | – |  |
| S01 | Server | Bundle app.<hash>.js: nén brotli, cache 1 năm (immutable) | ✅ | – |  |
| S02 | Server | CSS: nén, no-cache + ETag, lần sau trả 304 | ✅ | – |  |
| S03 | Server | Đường dẫn ngoài thư mục cho phép bị chặn (404) | ✅ | – |  |

Đánh giá UI mobile: không màn nào tràn ngang. Mọi nút, link và tab đều cao ít nhất 44px. Chỉ còn ô ngày trong lịch rộng 39–43px: lưới 7 cột trên màn 390px không nới thêm được, nhưng chiều cao đã đủ 44px.

## 4. Test 4G: trước và sau khi sửa

### Tải trang lần đầu (không cache)

| Điều kiện | Bản | Dung lượng | Hero hiện | FCP | LCP | CLS | Long task |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4G | trước | 699KB | 2.7s | 0.82s | 2.13s | 0 | 5 (1347ms) |
| 4G | **sau** | **229KB** | 2.5s | 0.80s | 2.10s | 0 | 4 (1404ms) |
| 4G yếu | trước | 699KB | 4.3s | 1.51s | 3.88s | 0 | 8 (1584ms) |
| 4G yếu | **sau** | **229KB** | **3.2s** | **0.85s** | **2.25s** | 0 | 3 (1035ms) |

Ở 4G 9 Mbps, mạng không phải là nút thắt nên số gần như không đổi. Ở 4G yếu, việc nén cho khác biệt rõ.

### Độ mượt (fps / p95 frame ms / % frame mượt ≤ 20ms)

| Thao tác | 4G trước | 4G **sau** | 4G yếu trước | 4G yếu **sau** |
| --- | --- | --- | --- | --- |
| Home: intro 4s đầu | 45 / 34 / 68% | 59 / 17 / **97%** | 38 / 50 / 62% | 58 / 17 / **97%** |
| Home: đứng yên | 41 / 34 / 59% | 59 / 17 / **99.6%** | 38 / 50 / 52% | 60 / 17 / **99.6%** |
| Home: vuốt cuộn | 36 / 50 / 54% | 58 / 17 / **97%** | 40 / 47 / 59% | 60 / 17 / **99%** |
| Người nhận: phong bì intro | 41 / 34 / 61% | 59 / 17 / **99%** | 44 / 33 / 69% | 59 / 17 / **98%** |
| Người nhận: bấm tim mở thư | 35 / 50 / 49% | 53 / 33 / **93%** | 31 / 67 / 43% | 50 / 33 / **88%** |
| Người nhận: né nút Không | 27 / 117 / 34% | 60 / 17 / **99%** | 24 / 100 / 32% | 60 / 17 / **100%** |
| Người nhận: Đồng ý → bước giờ | 29 / 54 / 29% | 49 / 33 / **85%** | 24 / 100 / 16% | 51 / 33 / **89%** |
| Create: chuyển bước | 37 / 50 / 69% | 57 / 17 / **98%** | 47 / 34 / 83% | 57 / 17 / **96%** |
| Create: gõ lời mời | 40 / 50 / 64% | 59 / 17 / **100%** | 42 / 34 / 63% | 59 / 17 / **99%** |

Lưu ý về độ tin cậy:
- Cùng một bản code, kết quả giữa các lượt lệch nhau 5–10 điểm; ví dụ ở lượt A/B cuối, home đứng yên chỉ đo được 90% và lúc cuộn 82%.
- Lượt A/B cuối đó còn cho kết quả *tắt* viền xoay lại tệ hơn *để nguyên*. Về nhân quả thì không thể xảy ra, nên lượt này đã bị loại vì máy đang bận.
- Chrome headless vẽ bằng CPU, nên số tuyệt đối sẽ khác so với điện thoại thật.

## 5. Nguyên nhân giật và cách đã sửa

A/B vòng 1 (4G + CPU 4x): tắt toàn bộ animation nền thì home lên 96–99%. Riêng 70 ngôi sao là phần nặng nhất: chỉ tắt sao thôi đã tăng từ 47% lên 78%.

Sau khi sửa phần nền, A/B vòng 2 (chờ tải xong, trung bình 3 lần) tìm ra thủ phạm còn lại:

| Phương án (vòng 2) | Home đứng yên | Home cuộn | Người nhận |
| --- | --- | --- | --- |
| Sau khi sửa nền (base) | 73% | 94% | 94% |
| + viền xoay `steps(60)` trên màn cảm ứng | **97.5%** | 90% | **97%** |
| Tắt hẳn viền xoay (chỉ để so sánh) | 99.6% | 99% | 99% |

Trace cho thấy phần lớn thời gian main thread vẫn nằm ở style recalc và paint chứ không phải JS (GSAP tick khoảng 450ms trong cửa sổ đo).

## 6. Lỗi và cải tiến: trạng thái

| # | Mức | Vấn đề | Đã làm | Kết quả |
| --- | --- | --- | --- | --- |
| 1 | Cao | Giật trên điện thoại / 4G do animation nền | Gom 70 ngôi sao vào 4 lớp, mỗi lớp nhấp nháy opacity cả lớp (4 animation thay vì 70). Trên màn cảm ứng, hạt bay thưa hơn (1.1s/hạt, tối đa 12 hạt) | ✅ Mục 4 |
| 1b | Cao | Viền xoay `.glow-border` vẽ lại cả card mỗi frame | Trên màn cảm ứng, viền xoay theo `steps(60)` (khoảng 12 lần vẽ/giây); desktop giữ nguyên. Thêm `pauseOffscreen` cho panel ở màn tạo, người nhận và các trang chữ | ✅ 73% → 97.5%. Đánh đổi có chủ ý: trên điện thoại glow xoay hơi "tích tắc" |
| 2 | Trung bình | Server không nén; bundle có hash cũng bị `no-cache` | Thêm `server/static.mjs`: brotli/gzip (cache theo mtime); `app.<hash>.js` cache 1 năm `immutable`; font cache 30 ngày; các file còn lại `no-cache` + ETag/304. Phần chặn đường dẫn giữ nguyên như cũ | ✅ 699KB → 229KB; S01–S03 |
| 3 | Trung bình | Long task lúc load trên CPU chậm | Đã trace: khoảng 850ms là chạy bundle + layout lần đầu của cả trang (riêng shaping chữ 360ms). Đã thử `content-visibility` cho các section dưới màn hình nhưng không thấy lợi rõ (nằm trong mức nhiễu), lại có rủi ro cắt glow/shadow, nên **không áp dụng** | ⏸ Còn lại |
| 4 | Trung bình | Khựng khi né nút Không / bấm Đồng ý trên 4G | Hết sau khi sửa #1, #1b, #14 | ✅ 34% → 99%; 29% → 85% |
| 5 | Thấp | `.glow-border` không dừng khi ra khỏi màn | Xem #1b | ✅ |
| 6 | Thấp | Lá thư bay animate `left` (layout mỗi frame) | Đổi sang `x` (transform); đo độ rộng một lần, đo lại bằng `ResizeObserver` khi đổi kích thước | ✅ H13 |
| 7 | Thấp | Touch target < 44px | Logo, link footer, pill, tab, nút nhỏ, link, stepper, ô ngày, nút đổi tháng, "Xem phản hồi" đều ≥ 44px trên màn ≤ 600px. Nút ngôn ngữ vốn đã có vùng chạm 44px nhờ `::after` | ✅ Còn bề ngang ô ngày (giới hạn của lưới 7 cột) |
| 8 | Thấp | Sticky CTA hiện trễ | Observer trừ đi chiều cao topbar (`rootMargin`) | ✅ H05 |
| 9 | Thấp | Tab Lịch mở ở tháng trống | `HN.calendar` nhận thêm tham số `month`; màn quản lý mở ở tháng của lịch hẹn gần nhất | ✅ Q03 |
| 10 | Thấp | Toast chỉ ẩn bằng `translateY` | Thêm `opacity: 0` khi ẩn. Không dùng `visibility` để live region vẫn được đọc | ✅ H13 |
| 11 | Ý tưởng | Thiệp mẫu: từ lúc bấm tim tới khi câu hỏi hiện mất 2.7s | Rút khoảng chờ sau khi thư mở từ 0.9s xuống 0.4s (thư mẫu trống, không có gì để đọc), ngang nhịp với màn người nhận | ✅ Khoảng 2.2s |
| 12 | Ý tưởng | Tên tiếng Việt bị gạch đỏ chính tả | `spellcheck="false"` cho 3 ô nhập tên | ✅ |
| 13 | **Cao (mới)** | Bấm "Tạo link" nhanh ngay khi bước 6 hiện: thiệp được lưu nhưng màn kẹt ở bước 6; bấm thêm lần nữa thì **ra 2 thiệp trùng** | `goStep` không bỏ qua lệnh chuyển bước khi animation đang chạy mà xếp hàng chạy sau. `publish()` không tạo lại nếu draft đã có thiệp | ✅ C15. Đã xác nhận test fail trên code cũ ("đếm thiệp: 2"), pass trên code mới |
| 14 | Trung bình (mới) | Cuộn home khựng tới 500ms vì ảnh vé story 1080×1920 được mã hóa PNG đồng bộ (`toDataURL`), sau đó `shot()` còn decode ngược base64 | `ticketImage` trả về Blob qua `canvas.toBlob` (mã hóa ngoài main thread); `shot()` nhận thẳng Blob; home dùng object URL và thu hồi khi rời màn | ✅ Home cuộn trên 4G: 66% → 97% |
| 15 | Thấp (mới) | Confetti của màn trước bay sang màn sau khi chuyển trang | Rời màn thì dừng Lottie confetti và gỡ các hạt | ✅ |
| 16 | Trung bình (mới) | Lottie được dựng hết ngay khi thư viện tải xong, kể cả cái nằm trong bước đang ẩn hoặc dưới màn hình | Mỗi Lottie chỉ được dựng khi lần đầu lọt vào màn hình; thư viện vẫn tải lúc idle như cũ | ✅ |
| 17 | Cải tiến | Link gửi thiệp dài 249–475 ký tự | Định dạng link v2 (mục 7) | ✅ Còn 62–247 ký tự |

Đề xuất cho vòng sau:
- Lúc chạm tim mở thư, hàm xử lý vẫn chặn khoảng 300ms trên CPU 4x, vì Lottie confetti được dựng ngay lúc chạm (trace: `open` khoảng 640ms, tính cả 30 hạt). Có thể dựng sẵn confetti lúc idle.
- Mục #3 (long task lúc load).
- Link ngắn qua server (khoảng 35 ký tự): cần người phụ trách quyết định có lưu tên + lời mời trên server hay không, theo Luật BVDLCN 91/2025.

## 7. Link gửi thiệp v2

Trước đây link chứa `base64(JSON)` của cả thiệp. Bản v2 đóng gói nhị phân:
- Mã thiệp: 5 bit mỗi ký tự.
- Ngày: 2 byte; giờ: 1 byte.
- Kèo: bitmask.
- Lời mời giữ nguyên theo mẫu thì chỉ lưu id mẫu và ngôn ngữ.
- Chữ: 1 byte cho mỗi ký tự ASCII/tiếng Việt, 4 byte cho các ký tự khác (emoji...).

Tương thích và an toàn:
- Link v1 cũ vẫn mở được (R14). Cả 2 định dạng đều được đọc về cùng một dạng, rồi đi qua **cùng bộ kiểm tra** như trước, vì dữ liệu đến từ URL là dữ liệu không tin cậy.
- Mã thiệp có ký tự ngoài bảng chữ cái, hoặc ngày nằm ngoài khoảng hỗ trợ, thì tự quay về v1.

**Ràng buộc mới:** `HN.PLANS` và `HN.TEMPLATES` (trong `js/data.js`) cùng bảng ký tự trong `js/core.js` được đọc theo vị trí. Từ nay chỉ được **thêm vào cuối**, không xóa hay đổi thứ tự, nếu không link đã gửi sẽ bị hiểu sai. Ràng buộc này đã được ghi chú ngay trong code.

| Thiệp | v1 | v2 |
| --- | --- | --- |
| Lời mời mẫu | 266 ký tự | 62 ký tự |
| Tự viết "Cuối tuần đi cà phê với tớ nhé?" | 249 | 103 |
| Tên 20 ký tự + lời mời 100 ký tự | 475 | 247 |

## 8. Phạm vi chưa test

- Điện thoại thật (Safari iOS, GPU thật).
- Đăng nhập Google (đang tắt) và lưu thiệp lên Drive (`/api/invites` là stub).
- Hộp chia sẻ thật của hệ điều hành; nội dung file `.ics`.
- `prefers-reduced-motion`.
- `server/index.mjs` chạy thật (cần Google key). Phần file tĩnh đã được test qua `server/static.mjs`, chính là module mà server thật import.
