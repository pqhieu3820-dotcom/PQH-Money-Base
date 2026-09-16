# Ghi chú dự án — Money Base

## Thông tin chung
- Tên app: **Money Base**
- Tài khoản Google Sheets/Apps Script dùng để triển khai: **pqhieu3820@gmail.com**
- GitHub repo: https://github.com/pqhieu3820-dotcom/PQH-Money-Base.git

## Cấu trúc thư mục
```
backend/
  Code.gs        # Google Apps Script (doGet/doPost, ghi/đọc Sheet "Chi Tieu")
frontend/
  index.html     # Giao diện PWA (mobile-first, kiểu Money Lover)
  style.css      # Modern Minimalist / Quiet Luxury theme
  app.js         # Logic offline-first, hàng đợi đồng bộ, cache lịch sử
  manifest.json  # Cấu hình PWA
  sw.js          # Service Worker cache-first cho file tĩnh
```

## Việc cần làm để chạy thật
1. Mở Google Sheets mới (đăng nhập bằng pqhieu3820@gmail.com) → Extensions → Apps Script.
2. Dán nội dung `backend/Code.gs` vào, Deploy → New deployment → Type: Web app → Execute as: Me → Who has access: Anyone.
3. Copy URL deployment (`.../exec`) → dán vào hằng số `API_URL` ở đầu file `frontend/app.js`.
4. Sheet sẽ tự tạo tab "Chi Tieu" với cột: ID | Ngày | Số tiền | Danh mục | Ghi chú.
5. Deploy phần `frontend/` lên GitHub Pages (hoặc bất kỳ static host nào có HTTPS) để cài PWA trên iOS (Add to Home Screen).

## Lưu ý kỹ thuật
- Apps Script tự thêm CORS header cho response JSON của doGet/doPost khi deploy "Anyone" — không cần cấu hình thêm.
- `sw.js` bỏ qua cache cho mọi request tới `script.google.com` để dữ liệu API luôn tươi khi online.
- Offline queue lưu trong `localStorage` key `moneybase_offline_queue`; cache lịch sử lưu ở key `moneybase_history_cache`.
- Khi có sự kiện `online`, app tự động POST toàn bộ hàng đợi lên Apps Script rồi xoá queue.

## Trạng thái
- [x] Viết code 6 file theo yêu cầu (2026-09-16)
- [ ] Điền `API_URL` thật sau khi deploy Apps Script
- [ ] Push code lên GitHub repo trên
- [ ] Test cài đặt PWA trên iOS Safari
