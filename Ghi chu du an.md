# Ghi chú dự án — Money Base

## Thông tin chung
- Tên app: **Money Base**
- Tài khoản Google Sheets/Apps Script dùng để triển khai: **pqhieu3820@gmail.com**
- GitHub repo: https://github.com/pqhieu3820-dotcom/PQH-Money-Base.git (nhánh mặc định: `main`)
- Google Sheet (database): https://docs.google.com/spreadsheets/d/1LsvUbnRB9Cd1UcwigR6g7pTc0TQgfn92xqsRxGhsfJ0/edit?usp=sharing
- Apps Script project (backend): https://script.google.com/d/1CsZuc5_jiQWGsSTVI0ejRwINY6WEx2T_JN4gCzfg9E5bzIEUjlMCiqHu/edit?usp=sharing

## Cấu trúc thư mục
```
backend/
  Code.gs        # Google Apps Script (doGet/doPost đọc/ghi trực tiếp sheet thật
                 # "DATA MONEY BASE (KHÔNG XÓA)" > tab "Sổ giao dịch")
frontend/
  index.html     # Giao diện PWA (mobile-first, layout kiểu Money Lover: màn hình chính + form nhập)
  style.css      # Theme trắng/xám nhạt, nhấn xanh lá (giống Money Lover)
  app.js         # Logic offline-first, hàng đợi đồng bộ, cache lịch sử
  manifest.json  # Cấu hình PWA
  sw.js          # Service Worker cache-first cho file tĩnh
.claude/
  launch.json    # Cấu hình chạy dev server local (npx serve frontend -l 5173)
```

## Chạy thử local (để kiểm tra trên máy/điện thoại)
```bash
npx serve frontend -l 5173
```
Sau đó mở `http://localhost:5173` (hoặc `http://<IP-máy>:5173` từ điện thoại cùng mạng Wi-Fi).
Lưu ý: mỗi lần đổi code, phải xoá Service Worker cache cũ (DevTools → Application →
Unregister service worker + Clear storage) hoặc hard-reload, vì `sw.js` cache-first file tĩnh.

## Giao diện
Layout giống Money Lover, tách thành 4 màn hình riêng theo 4 tab điều hướng dưới:
1. **Trang chủ** — dựng lại giống hệt ảnh chụp màn hình "Tổng quan" của Money Lover
   thật: số dư to + icon ẩn/hiện (mắt), tìm kiếm, chuông thông báo; card "Ví của tôi"
   (Tiền mặt = số dư thật, Tiết Kiệm = placeholder tĩnh 0đ, chưa có tính năng đa ví
   thật); card "Báo cáo tháng này" với toggle Tuần/Tháng, số tổng đã chi, badge %
   tăng/giảm so với kỳ trước, biểu đồ cột so sánh kỳ trước/kỳ này; card "Chi tiêu
   nhiều nhất" (icon màu theo danh mục + % trên tổng chi kỳ đó, không thanh tiến độ);
   "Giao dịch gần đây" (tiêu đề = ghi chú hoặc tên danh mục, ngày đầy đủ bên dưới);
   card "Money Insider" (chi tiêu theo danh mục cao nhất, trung bình/ngày, % so với
   tháng trước, 2 nút placeholder "Xu hướng chi tiêu"/"Đăng ký ngay" — chưa có logic
   thật, chỉ hiện toast "sắp ra mắt").
2. **Giao dịch** — danh sách đầy đủ, có tab Tháng trước/Tháng này/Tương lai, thẻ
   tổng tiền vào/ra/chênh lệch, danh sách gom theo ngày.
3. **Ngân sách** — đặt hạn mức chi tiêu theo từng danh mục (lưu trong `localStorage`
   key `moneybase_budgets`), thanh tiến độ đổi màu đỏ khi vượt hạn mức, tổng hạn mức
   + tổng đã chi ở đầu trang.
4. **Tài khoản** — thông tin ví/email, trạng thái mạng + số giao dịch chờ đồng bộ +
   nút "Đồng bộ ngay", link nhanh tới Google Sheet và GitHub repo, thông tin phiên bản app.

Nút **+** tròn xanh lá ở giữa thanh điều hướng mở màn nhập giao dịch (bàn phím số,
chọn danh mục, ghi chú, ngày) dạng slide-up, ẩn thanh nav khi đang nhập.

## Backend thật — dữ liệu Money Lover 8 năm (2018-2026)
- Sheet "DATA MONEY BASE (KHÔNG XÓA)" có 3 tab: **Sổ giao dịch** (nguồn dữ liệu
  chính, 5173 dòng, đã đồng bộ từ Money Lover), **Khoản thu**/**Khoản chi** (chỉ là
  pivot tổng hợp tự động theo Nhóm, KHÔNG phải nguồn dữ liệu — không cần đụng tới).
- Cột "Sổ giao dịch" (A→K): `Id | Ngày | Nhóm | Số tiền | Đơn vị tiền tệ | Ví |
  Ghi chú | Với | Sự kiện | Không tính vào báo cáo | Thành viên`.
- **Quy ước Id có sẵn trong dữ liệu cũ:** Id = 1 luôn là giao dịch MỚI NHẤT, số tăng
  dần về quá khứ (Id=5173 là giao dịch cũ nhất, 02/11/2018). Đây là quy ước riêng
  của lần export/sync ban đầu từ Money Lover, không phải logic tự tạo — `Code.gs`
  phải tôn trọng đúng quy ước này khi ghi thêm giao dịch mới (xem bên dưới).
- **API Apps Script đã deploy thật**, đọc/ghi trực tiếp sheet trên (không dùng sheet
  "Chi Tieu" placeholder cũ nữa):
  - GET `.../exec` → 50 giao dịch mới nhất; `?limit=N` → N giao dịch; `?full=1` →
    toàn bộ 5173+ giao dịch (dùng để đồng bộ về local 1 lần).
  - POST `.../exec` (body: mảng JSON giao dịch mới) → **chèn ở đầu bảng** (ngay
    dưới header, không nối cuối) rồi **dịch Id của toàn bộ giao dịch cũ lên +k**
    (k = số giao dịch mới trong lô) để giữ đúng quy ước "Id nhỏ nhất = mới nhất".
    Đã test 2 chiều thành công: GET trả đúng `total:5173`, POST chèn đúng vị trí +
    dịch Id chính xác, không làm hỏng dữ liệu cũ.
- `API_URL` trong `frontend/app.js` đã được điền URL deploy thật (không còn là
  placeholder `AKfycb.../exec`).

## Việc cần làm tiếp theo
1. Deploy phần `frontend/` lên GitHub Pages (hoặc static host có HTTPS) để cài PWA
   trên iOS (Add to Home Screen).
2. Cân nhắc đồng bộ toàn bộ 5173 giao dịch cũ về `localStorage` (`?full=1`) để xem
   lịch sử đầy đủ trong app thay vì chỉ 50 giao dịch gần nhất.
3. `guessCategoryStyle_()` trong `app.js` chỉ đoán icon/màu theo từ khoá tiếng Việt
   phổ biến — có thể bổ sung thêm từ khoá khi gặp danh mục lạ hiển thị icon 📦 mặc định.
4. **Tạo bộ icon iOS/Android còn thiếu** — `manifest.json`/`index.html` trỏ tới
   `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` nhưng các file này CHƯA
   tồn tại trong `frontend/`. Nếu cài lên màn hình chính iOS lúc này, Safari sẽ tự
   chụp screenshot trang làm icon (xấu). Xem skill `multi-platform-app-icons` (mục
   dưới) để có công thức Python/PIL tạo nhanh.
5. **Offline detection nên dùng ping thật thay vì chỉ tin `navigator.onLine`** — theo
   skill `offline-first-web`, `navigator.onLine` báo sai trên Safari iOS (báo "online"
   dù không có Internet thật). Nên thêm nhánh `?action=ping` trả lời NGAY trong
   `Code.gs` (trước khi mở Spreadsheet) + client tự ping định kỳ, yêu cầu trượt
   liên tiếp 2 lần mới kết luận mất mạng.

## Thư viện SOP/Skill cá nhân của người dùng (tham khảo khi cần)
Người dùng có thư mục skill riêng đúc kết từ dự án HICONIQUE Internal Hub trước đó, tại
`C:\Users\ADMIN\Desktop\HICONIQUE\SOP SKILL CLAUDE\`. Đã đọc toàn bộ ngày 16/9/2026.
Các skill liên quan trực tiếp tới Money Base:
- `gsheets-appscript-web-sync` — kiến trúc Web↔Apps Script↔Sheet tương tự Money Base;
  gợi ý dùng toàn GET với `?action=`, có nhánh `ping` trả lời sớm, cấm ghi song song.
- `appscript-editor-browser-automation` — đúc kết y hệt các sự cố gặp phải khi dựng
  backend thật hôm nay (paste mất ký tự, dropdown chọn hàm sai) + cách né (dùng
  `monaco.editor.getModels()[0].getValue()` để verify, click nút Lưu thật thay vì
  Ctrl+S, xác minh đúng deployment ID trước khi deploy).
- `offline-first-web` — xem mục 5 ở trên.
- `multi-platform-app-icons` — xem mục 4 ở trên.
Các skill khác trong thư mục (bulk-sync-html-pages, cascading-hierarchical-dropdown,
css-flexbox-shrink-pitfall, sortable-id-convention) chưa áp dụng trực tiếp cho Money Base
nhưng nên xem lại nếu gặp tình huống tương ứng.

## Lưu ý kỹ thuật
- Apps Script tự thêm CORS header cho response JSON của doGet/doPost khi deploy "Anyone" — không cần cấu hình thêm.
- `sw.js` bỏ qua cache cho mọi request tới `script.google.com` để dữ liệu API luôn tươi khi online; cache-first cho toàn bộ file tĩnh (app shell) để mở được hoàn toàn offline trên iOS Safari/Android Chrome. Cache hiện tại: `moneybase-cache-v2`.
- Offline queue lưu trong `localStorage` key **`offlineQueue`** (đổi tên từ `moneybase_offline_queue` ngày 16/9); cache lịch sử lưu ở key `moneybase_history_cache`; hạn mức ngân sách lưu ở key `moneybase_budgets`.
- Hàm đồng bộ chính là `syncOfflineData()` trong `app.js`, được gắn vào **3 trigger** để khắc phục việc iOS Safari đóng băng tiến trình nền: sự kiện `online`, `visibilitychange` (khi app quay lại foreground), và ngay sau `DOMContentLoaded` (vừa mở app). Có cờ `state.isSyncing` để tránh chạy trùng khi nhiều trigger bắn gần nhau.
- Nhãn trạng thái mạng thời gian thực (`#network-status-text`, xanh "Online"/đỏ "Offline") luôn hiển thị ở header Trang chủ, cập nhật qua `updateNetworkUI()`.

## Trạng thái
- [x] Viết code 6 file theo yêu cầu (2026-09-16)
- [x] Push code lên GitHub repo trên (2026-09-16)
- [x] Redesign UI giống Money Lover, test qua browser mobile viewport (2026-09-16)
- [x] Offline-first hoàn chỉnh: sw.js cache bền vững + app.js đồng bộ qua 3 trigger + nhãn Online/Offline (2026-09-16)
- [x] Tách 4 tab (Trang chủ/Giao dịch/Ngân sách/Tài khoản) thành 4 màn hình riêng đầy đủ chức năng (2026-09-16)
- [x] Dựng lại Trang chủ giống hệt ảnh chụp Money Lover thật (2026-09-16)
- [x] Kết nối backend thật vào sheet dữ liệu Money Lover 8 năm, deploy Apps Script 2 chiều, điền `API_URL` thật (2026-09-16)
- [x] Nhận diện icon/màu cho tên danh mục tiếng Việt tự do từ dữ liệu thật, không còn gộp hết vào "Khác" (2026-09-16)
- [ ] Test cài đặt PWA trên iOS Safari

## Lỗi đã gặp — tránh lặp lại
- **Push nhầm nhánh:** `git init` không tự biết repo GitHub đã có sẵn nhánh mặc định
  `main` (do GitHub tạo README khi khởi tạo repo). Lần đầu push code lên nhánh
  `master` (nhánh local mặc định của git cũ) nên nhìn trên GitHub (mặc định hiển thị
  `main`) tưởng như chưa push gì. → **Luôn kiểm tra tên nhánh mặc định của repo GitHub
  trước khi push** (`git ls-remote` hoặc xem trên GitHub), đặt local branch trùng tên
  rồi mới push, hoặc push xong nhớ kiểm tra lại đúng nhánh hiển thị trên GitHub.
- **Lỗi GH007 (email privacy):** GitHub chặn push vì commit dùng email cá nhân
  (Gmail) trong khi tài khoản bật "Keep my email addresses private". → Dùng email
  dạng `<username>@users.noreply.github.com` cho `git config user.email` khi commit
  lên repo của tài khoản này.
- **Service Worker cache cũ:** Sau khi sửa code frontend, mở lại app vẫn thấy bản
  cũ vì `sw.js` cache-first các file tĩnh. → Khi test local sau mỗi lần sửa
  HTML/CSS/JS, phải unregister service worker + xoá Cache Storage (hoặc hard reload)
  trước khi chụp/kiểm tra kết quả.
- **Paste vào Apps Script editor (Monaco) có thể làm hỏng 1 ký tự:** Khi dùng
  clipboard.writeText() + Ctrl+V để dán code dài vào Apps Script (qua Claude in
  Chrome), một lần bị lỗi "rov[9]" thay vì "row[9]" (mất 1 ký tự, không rõ nguyên
  nhân — có thể do autocomplete của Monaco can thiệp giữa lúc paste). Hậu quả: API
  báo lỗi `"rov is not defined"` dù source gốc hoàn toàn đúng. → **Sau khi paste
  code dài vào Apps Script, luôn diff lại bằng `monaco.editor.getModels()[0].getValue()`
  so với bản gốc (hash hoặc includes() các đoạn quan trọng) trước khi deploy**, hoặc
  an toàn hơn: dùng `model.setValue(text)` trực tiếp qua JS thay vì mô phỏng
  Ctrl+A/Ctrl+V (đáng tin cậy hơn nhiều, đã áp dụng lần 2 và không còn lỗi).
- **Dropdown "chọn hàm để chạy" trong Apps Script editor không phản hồi click chuột
  đáng tin cậy:** Click vào option trong dropdown này (qua Claude in Chrome) nhiều
  lần không đổi hàm được chọn (label vẫn hiện hàm cũ), khiến bấm "Chạy" chạy nhầm
  hàm. Chỉ hoạt động khi dùng phím mũi tên (ArrowDown/ArrowDown/Enter) để chọn thay
  vì click toạ độ. → Với dropdown dạng này trên Apps Script, ưu tiên điều hướng bằng
  bàn phím (ArrowDown, Enter) hơn là click chuột theo toạ độ; luôn zoom/kiểm tra lại
  label hiển thị trước khi bấm Chạy để chắc chắn đúng hàm.
- **Gõ phím điều hướng khi không chắc focus đang ở đâu có thể phá code:** Một lần
  gửi "ArrowDown ArrowDown Enter" tưởng là điều khiển dropdown nhưng thực chất rơi
  vào Monaco editor (đang giữ focus từ thao tác trước đó), làm mất 1 ký tự "c" của
  từ khoá `const` và chèn 1 ký tự "c" thừa ở dòng khác → code lỗi cú pháp, Apps
  Script báo "không lưu được". → Trước khi gửi phím điều khiển UI (không phải gõ
  text), luôn xác nhận lại phần tử đang có focus (screenshot/zoom) thay vì giả định;
  nếu nghi ngờ code bị ảnh hưởng, ngay lập tức verify lại bằng
  `monaco.editor.getModels()[0].getValue()` trước khi lưu/deploy.

## Nhật ký chỉnh sửa (theo thời gian thực)
> Ghi lại từ **13:59 chiều, 16/9/2026** trở đi (các việc làm trước mốc này được
> tóm tắt lại theo thứ tự, không có giờ chính xác vì lúc đó chưa bắt đầu ghi log).

- **(trước 13:59, 16/9/2026)** — Tạo khung dự án Money Base: `backend/Code.gs`,
  `frontend/index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`; khởi tạo
  git, commit, push lên GitHub (bị nhầm sang nhánh `master`, xem mục Lỗi ở trên).
  Sau đó redesign giao diện theo layout Money Lover (màn hình chính: số dư, tab
  tháng, thẻ tổng tiền vào/ra, danh sách giao dịch gom theo ngày; thanh điều hướng
  dưới có nút + tròn xanh lá mở màn nhập giao dịch). Test qua browser mobile
  viewport bằng dev server local (`npx serve frontend -l 5173`).
- **(trước 13:59, 16/9/2026)** — Phát hiện code chưa lên đúng nhánh `main` mặc định
  trên GitHub. Merge nhánh `master` vào `main` (allow-unrelated-histories), push lại,
  xoá nhánh `master` thừa trên remote + local. Lưu link Google Sheet (database) và
  Apps Script project (backend) vào ghi chú.
- **13:59 chiều, 16/9/2026** — Bổ sung quy trình: từ nay mỗi lần chỉnh sửa dự án sẽ
  ghi log vào mục "Nhật ký chỉnh sửa" kèm mốc thời gian thực lấy từ hệ thống, và mục
  "Lỗi đã gặp" sẽ được cập nhật mỗi khi phát hiện sai sót để không lặp lại.
- **14:06 chiều, 16/9/2026** — Tách 4 tab điều hướng thành 4 màn hình riêng biệt với
  nội dung đầy đủ: Trang chủ (dashboard tổng quan + top danh mục + giao dịch gần đây),
  Giao dịch (danh sách đầy đủ có tab tháng, tách khỏi Trang chủ), Ngân sách (đặt hạn
  mức theo danh mục, thanh tiến độ, lưu `localStorage`), Tài khoản (trạng thái đồng bộ,
  nút đồng bộ thủ công, link Google Sheet/GitHub, thông tin app). Test cả 4 màn qua
  browser mobile viewport, xác nhận điều hướng và dữ liệu hiển thị đúng.
- **14:27 chiều, 16/9/2026** — Người dùng gửi 3 ảnh chụp màn hình "Tổng quan" của
  Money Lover thật, yêu cầu làm Trang chủ giống hệt (số liệu có thể dùng placeholder,
  nối API thật sau). Dựng lại toàn bộ header (số dư to + mắt ẩn/hiện + tìm kiếm +
  chuông), card Ví của tôi, card Báo cáo tháng này (toggle Tuần/Tháng + biểu đồ cột
  so sánh kỳ trước/kỳ này + badge % thay đổi), card Chi tiêu nhiều nhất (% trên tổng,
  không thanh tiến độ, icon màu theo danh mục), Giao dịch gần đây (ngày đầy đủ), và
  card Money Insider. Sửa lỗi nhãn "Tháng trước/Tháng này" không đổi theo khi bấm
  toggle "Tuần" — đã fix để nhãn + tiêu đề đổi động theo `state.reportScope`.
  Test qua browser mobile viewport (bao gồm test nút ẩn số dư và toggle tuần/tháng)
  trước khi push.
- **14:33 chiều, 16/9/2026** — Người dùng gửi ảnh thanh điều hướng dưới cùng thật của
  Money Lover, yêu cầu làm y hệt và đẹp hơn. Thay icon emoji bằng SVG line-icon (nhà,
  ví, layer, người), đổi nhãn "Trang chủ"→"Tổng quan", "Giao dịch"→"Sổ giao dịch" cho
  khớp ảnh. Đổi thanh nav thành dạng pill nổi bo góc lớn (border-radius 26px, margin
  2 bên + đáy, box-shadow), tab active có nền pill xám nhạt bao quanh icon+nhãn. Test
  qua browser mobile viewport, xác nhận chuyển tab đổi đúng trạng thái active.
- **14:58 chiều, 16/9/2026** — Người dùng phản hồi Trang chủ vẫn chưa giống ảnh mẫu
  lắm, yêu cầu bổ sung/cải thiện. Sửa "Giao dịch gần đây" từ nhiều ô trắng rời rạc
  thành 1 card liền mạch có đường kẻ phân cách giữa các dòng (đúng kiểu Money Lover,
  class `.list-card`). Sửa lại bố cục Money Insider thành 3 dòng ("Tháng này" /
  "Trung bình" / giá trị) với badge tròn % + nhãn xếp dọc bên phải thay vì nằm ngang.
  Test bằng cách tạm seed 8 giao dịch mẫu qua console để kiểm tra layout với dữ liệu
  phong phú (nhiều danh mục, biểu đồ có 2 cột rõ rệt) — xác nhận khớp ảnh mẫu, sau đó
  xoá dữ liệu test khỏi localStorage trước khi push.
- **15:15 chiều, 16/9/2026** — Người dùng gửi ảnh cận cảnh 2 icon tìm kiếm + chuông
  thông báo trên header Trang chủ, yêu cầu làm giống hệt. Thay emoji 🔍🔔 bằng SVG
  line-icon đen mảnh không nền tròn (trước đó bọc trong nút tròn `.icon-btn` có nền
  khi nhấn — bỏ nền, chỉ giữ hiệu ứng mờ khi nhấn), tăng khoảng cách giữa 2 icon,
  và chỉnh badge số thông báo màu đỏ nổi đè lên góc trên-phải chuông (viền trắng)
  giống hệt ảnh. Test hiện thử badge "435" qua console để xác nhận vị trí đúng.
- **15:36 chiều, 16/9/2026** — Người dùng yêu cầu hoàn thiện Offline-First: hoạt động
  trơn tru trên iOS Safari và Android Chrome, tự động đồng bộ khi có mạng hoặc khi
  vào lại app. Viết lại `sw.js`: cache từng file tĩnh riêng lẻ bằng `cache.add()`
  thay vì `cache.addAll()` (tránh việc icon-192.png/icon-512.png chưa tồn tại làm
  hỏng toàn bộ cài đặt Service Worker — lỗi tiềm ẩn phát hiện khi rà lại code cũ),
  bump cache lên `v2`. Viết lại phần đồng bộ trong `app.js`: đổi tên key
  `localStorage` thành `offlineQueue` theo đúng yêu cầu, đổi tên hàm
  `syncOfflineQueue` → `syncOfflineData()`, thêm cờ `state.isSyncing` chống chạy
  trùng, gắn hàm này vào đúng 3 trigger (`online`, `visibilitychange`,
  `DOMContentLoaded`) để khắc phục việc iOS đóng băng JS chạy nền. Thêm nhãn nhỏ
  "Online"/"Offline" (xanh/đỏ) luôn hiển thị ở header Trang chủ. Test bằng cách giả
  lập `navigator.onLine = false` + bấm lưu giao dịch (xác nhận lưu đúng vào
  `offlineQueue`), sau đó giả lập có mạng lại qua sự kiện `visibilitychange` và gọi
  tay `syncOfflineData()` — xác nhận cả 2 đều kích hoạt request POST thật (thấy lỗi
  CORS trong console vì `API_URL` còn là placeholder, chứng tỏ request đã được gửi).
- **16:00–18:22 chiều, 16/9/2026** — Người dùng cho xem ảnh chụp Google Sheet
  "DATA MONEY BASE (KHÔNG XÓA)" chứa dữ liệu Money Lover đồng bộ suốt 8 năm (2018–
  2026), yêu cầu đọc hiểu quy trình tạo ID và đồng bộ vào local; sau đó yêu cầu dùng
  Claude in Chrome (tài khoản Google thật của user) để tương tác trực tiếp và tạo
  API Script đồng bộ 2 chiều. Thực hiện:
  - Mở sheet bằng Chrome thật (đã đăng nhập pqhieu3820@gmail.com), xác nhận đây
    chính là file đã lưu ở mục "Google Sheet (database)"; đọc cấu trúc tab "Sổ giao
    dịch" (5173 dòng) và quy ước Id (xem mục "Backend thật" ở trên).
  - Viết lại toàn bộ `backend/Code.gs` để đọc/ghi trực tiếp sheet thật thay vì sheet
    "Chi Tieu" placeholder cũ; mở Apps Script project có sẵn (link đã lưu), dán code
    qua Chrome, xin phép người dùng trước khi bấm chấp thuận OAuth (người dùng tự
    xác nhận quyền), chạy thử `doGet` thành công.
  - Deploy Web App (Execute as: Me, Access: Anyone), test GET/POST thật — phát hiện
    và sửa 2 sự cố trong lúc paste/chạy code qua UI (xem mục "Lỗi đã gặp" ở trên: ký
    tự bị mất khi paste, dropdown chọn hàm không đáng tin cậy, phím điều hướng gõ
    nhầm vào editor). Dùng `monaco.editor.getModels()[0].setValue()` trực tiếp qua
    JS để đảm bảo code chính xác tuyệt đối, verify bằng includes()/hash trước khi
    deploy mỗi phiên bản.
  - Test 1 giao dịch thật qua POST (chèn đúng đầu bảng, dịch Id chính xác), sau đó
    dọn dẹp: xoá giao dịch test + khôi phục đúng Id ban đầu bằng 1 endpoint cleanup
    tạm thời (`?action=cleanup_temp_row2`), xác nhận qua GET `total:5173` khớp số
    liệu gốc, rồi gỡ bỏ nhánh cleanup khỏi code và deploy lại bản sạch (Phiên bản 4).
  - Điền `API_URL` thật vào `frontend/app.js`. Test app với dữ liệu thật (dev server
    local) → phát hiện toàn bộ danh mục hiển thị thành "Khác" 📦 vì `CATEGORIES` cố
    định chỉ có 9 id tiếng Anh, không khớp tên danh mục tiếng Việt tự do trong dữ
    liệu Money Lover thật. Sửa `getCategory()` để nhận cả tên tiếng Việt tự do, thêm
    `guessCategoryStyle_()` đoán icon/màu theo từ khoá (bữa/ăn/cafe→🍜, hoá đơn/điện/
    nước→🧾, mua sắm/áo/giày→🛍️, v.v.), hiển thị đúng tên thật thay vì gộp "Khác".
    Test lại trên dev server: "Chăm sóc cá nhân", "Bữa tối", "Đàn nhạc", "Thiết bị
    điện tử" đều hiện đúng icon/tên. Ghi chú việc còn lại: đồng bộ toàn bộ 5173 giao
    dịch về local qua `?full=1` và deploy frontend lên host HTTPS để cài PWA iOS.
- **19:40 tối, 16/9/2026** — Người dùng yêu cầu đọc toàn bộ thư viện skill cá nhân tại
  `C:\Users\ADMIN\Desktop\HICONIQUE\SOP SKILL CLAUDE\` (đúc kết từ dự án HICONIQUE
  Internal Hub trước đó), đặc biệt skill `gsheets-appscript-web-sync` vì đã dùng thành
  công ở dự án khác. Đọc hết 9 skill, đối chiếu với Money Base: xác nhận kiến trúc
  backend hiện tại đi đúng hướng skill mô tả; phát hiện 2 khoảng trống chưa xử lý (icon
  iOS/Android còn thiếu file, offline detection chưa dùng ping thật) — xem mục "Việc
  cần làm tiếp theo" và "Thư viện SOP/Skill cá nhân" ở trên. Theo yêu cầu người dùng,
  CHỈ ghi nhận lại, CHƯA sửa code — để dành áp dụng khi cần.
