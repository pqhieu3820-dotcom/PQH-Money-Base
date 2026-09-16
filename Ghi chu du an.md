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
  Code.gs        # Google Apps Script (doGet/doPost, ghi/đọc Sheet "Chi Tieu")
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
1. **Trang chủ** — dashboard: số dư tổng, tổng tiền vào/ra tháng này, top danh mục
   chi tiêu nhiều nhất (thanh tiến độ), 5 giao dịch gần đây + nút "Xem tất cả".
2. **Giao dịch** — danh sách đầy đủ, có tab Tháng trước/Tháng này/Tương lai, thẻ
   tổng tiền vào/ra/chênh lệch, danh sách gom theo ngày.
3. **Ngân sách** — đặt hạn mức chi tiêu theo từng danh mục (lưu trong `localStorage`
   key `moneybase_budgets`), thanh tiến độ đổi màu đỏ khi vượt hạn mức, tổng hạn mức
   + tổng đã chi ở đầu trang.
4. **Tài khoản** — thông tin ví/email, trạng thái mạng + số giao dịch chờ đồng bộ +
   nút "Đồng bộ ngay", link nhanh tới Google Sheet và GitHub repo, thông tin phiên bản app.

Nút **+** tròn xanh lá ở giữa thanh điều hướng mở màn nhập giao dịch (bàn phím số,
chọn danh mục, ghi chú, ngày) dạng slide-up, ẩn thanh nav khi đang nhập.

## Việc cần làm để chạy thật
1. Mở Apps Script project ở link trên (đăng nhập pqhieu3820@gmail.com), dán/cập nhật nội dung `backend/Code.gs`.
2. Deploy → New deployment → Type: Web app → Execute as: Me → Who has access: Anyone.
3. Copy URL deployment (`.../exec`) → dán vào hằng số `API_URL` ở đầu file `frontend/app.js`.
4. Sheet (link ở trên) sẽ tự tạo tab "Chi Tieu" với cột: ID | Ngày | Số tiền | Danh mục | Ghi chú.
5. Deploy phần `frontend/` lên GitHub Pages (hoặc bất kỳ static host nào có HTTPS) để cài PWA trên iOS (Add to Home Screen).

## Lưu ý kỹ thuật
- Apps Script tự thêm CORS header cho response JSON của doGet/doPost khi deploy "Anyone" — không cần cấu hình thêm.
- `sw.js` bỏ qua cache cho mọi request tới `script.google.com` để dữ liệu API luôn tươi khi online.
- Offline queue lưu trong `localStorage` key `moneybase_offline_queue`; cache lịch sử lưu ở key `moneybase_history_cache`; hạn mức ngân sách lưu ở key `moneybase_budgets`.
- Khi có sự kiện `online`, app tự động POST toàn bộ hàng đợi lên Apps Script rồi xoá queue.

## Trạng thái
- [x] Viết code 6 file theo yêu cầu (2026-09-16)
- [x] Push code lên GitHub repo trên (2026-09-16)
- [x] Redesign UI giống Money Lover, test qua browser mobile viewport (2026-09-16)
- [x] Tách 4 tab (Trang chủ/Giao dịch/Ngân sách/Tài khoản) thành 4 màn hình riêng đầy đủ chức năng (2026-09-16)
- [ ] Điền `API_URL` thật sau khi deploy Apps Script
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
