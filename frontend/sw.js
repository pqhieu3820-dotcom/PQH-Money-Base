// Money Base — Service Worker
// Chiến lược: cache-first cho toàn bộ file tĩnh (app shell) để app mở được
// hoàn toàn offline trên iOS Safari / Android Chrome; không bao giờ can thiệp
// vào request tới Google Apps Script (script.google.com) — luôn đi thẳng ra mạng.

const CACHE_VERSION = 'v2';
const CACHE_NAME = 'moneybase-cache-' + CACHE_VERSION;

const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ---------- install: cache toàn bộ file tĩnh ----------
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Dùng add() riêng lẻ (không addAll) để 1 file lỗi/thiếu (vd icon chưa có)
      // không làm hỏng toàn bộ quá trình cài đặt Service Worker.
      return Promise.all(
        STATIC_ASSETS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] Không thể cache:', url, err);
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// ---------- activate: dọn cache phiên bản cũ ----------
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ---------- fetch: cache-first cho file tĩnh, bỏ qua API ----------
self.addEventListener('fetch', function (event) {
  const request = event.request;
  const url = request.url;

  // Không bao giờ cache/chặn request tới Google Apps Script (API dữ liệu).
  if (url.indexOf('script.google.com') !== -1) {
    return;
  }

  // Chỉ xử lý GET; các request khác (POST...) để trình duyệt tự xử lý.
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) {
        // Có cache → phục vụ ngay (app mở được tức thì kể cả khi mất mạng).
        return cached;
      }

      return fetch(request)
        .then(function (response) {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(function () {
          // Mất mạng và không có cache cho request này.
          // Nếu là điều hướng trang (mở app) → trả về index.html đã cache
          // để app vẫn mở được bình thường thay vì báo lỗi trắng trang.
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});
