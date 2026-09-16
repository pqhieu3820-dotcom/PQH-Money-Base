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
Đã đổi sang layout giống Money Lover: màn hình chính hiển thị số dư, tab
Tháng trước/Tháng này/Tương lai, thẻ tổng tiền vào/ra, danh sách giao dịch
gom theo ngày; thanh điều hướng dưới cùng có nút **+** tròn xanh lá để mở
màn nhập giao dịch (bàn phím số, chọn danh mục, ghi chú, ngày).

## Việc cần làm để chạy thật
1. Mở Apps Script project ở link trên (đăng nhập pqhieu3820@gmail.com), dán/cập nhật nội dung `backend/Code.gs`.
2. Deploy → New deployment → Type: Web app → Execute as: Me → Who has access: Anyone.
3. Copy URL deployment (`.../exec`) → dán vào hằng số `API_URL` ở đầu file `frontend/app.js`.
4. Sheet (link ở trên) sẽ tự tạo tab "Chi Tieu" với cột: ID | Ngày | Số tiền | Danh mục | Ghi chú.
5. Deploy phần `frontend/` lên GitHub Pages (hoặc bất kỳ static host nào có HTTPS) để cài PWA trên iOS (Add to Home Screen).

## Lưu ý kỹ thuật
- Apps Script tự thêm CORS header cho response JSON của doGet/doPost khi deploy "Anyone" — không cần cấu hình thêm.
- `sw.js` bỏ qua cache cho mọi request tới `script.google.com` để dữ liệu API luôn tươi khi online.
- Offline queue lưu trong `localStorage` key `moneybase_offline_queue`; cache lịch sử lưu ở key `moneybase_history_cache`.
- Khi có sự kiện `online`, app tự động POST toàn bộ hàng đợi lên Apps Script rồi xoá queue.

## Trạng thái
- [x] Viết code 6 file theo yêu cầu (2026-09-16)
- [x] Push code lên GitHub repo trên (2026-09-16)
- [x] Redesign UI giống Money Lover, test qua browser mobile viewport (2026-09-16)
- [ ] Điền `API_URL` thật sau khi deploy Apps Script
- [ ] Test cài đặt PWA trên iOS Safari
