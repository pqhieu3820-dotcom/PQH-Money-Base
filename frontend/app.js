// ==== Money Base — app.js ====

// TODO: Dán URL Web App (Google Apps Script deployment) vào đây
const API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';

const LS_QUEUE_KEY = 'moneybase_offline_queue';
const LS_HISTORY_KEY = 'moneybase_history_cache';

const CATEGORIES = [
  { id: 'food', label: 'Ăn uống', icon: '🍜' },
  { id: 'transport', label: 'Di chuyển', icon: '🚌' },
  { id: 'shopping', label: 'Mua sắm', icon: '🛍️' },
  { id: 'bill', label: 'Hóa đơn', icon: '🧾' },
  { id: 'health', label: 'Sức khỏe', icon: '💊' },
  { id: 'education', label: 'Giáo dục', icon: '📚' },
  { id: 'entertainment', label: 'Giải trí', icon: '🎬' },
  { id: 'other', label: 'Khác', icon: '📦' }
];

const state = {
  amount: '0',
  type: 'expense',
  category: CATEGORIES[0].id,
  isOnline: navigator.onLine
};

// ---------- DOM ----------
const amountValueEl = document.getElementById('amount-value');
const categoryGridEl = document.getElementById('category-grid');
const noteInputEl = document.getElementById('note-input');
const dateInputEl = document.getElementById('date-input');
const saveBtnEl = document.getElementById('save-btn');
const keypadEl = document.getElementById('keypad');
const networkBannerEl = document.getElementById('network-banner');
const syncIndicatorEl = document.getElementById('sync-indicator');
const historyListEl = document.getElementById('history-list');
const historyEmptyEl = document.getElementById('history-empty');
const toastEl = document.getElementById('toast');
const viewEntry = document.getElementById('view-entry');
const viewHistory = document.getElementById('view-history');

// ---------- Init ----------
function init() {
  dateInputEl.value = new Date().toISOString().slice(0, 10);
  renderCategories();
  bindEvents();
  updateNetworkUI();
  registerServiceWorker();
  loadHistory();
}

function bindEvents() {
  document.querySelectorAll('.toggle-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.toggle-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.type = btn.dataset.type;
    });
  });

  keypadEl.addEventListener('click', function (e) {
    const key = e.target.closest('.key');
    if (!key) return;
    handleKeypad(key.dataset.key);
  });

  saveBtnEl.addEventListener('click', saveTransaction);

  document.getElementById('nav-history').addEventListener('click', function () {
    switchView('history');
  });
  document.getElementById('nav-back').addEventListener('click', function () {
    switchView('entry');
  });

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

function switchView(name) {
  viewEntry.classList.toggle('active', name === 'entry');
  viewHistory.classList.toggle('active', name === 'history');
  keypadEl.style.display = name === 'entry' ? 'grid' : 'none';
}

// ---------- Categories ----------
function renderCategories() {
  categoryGridEl.innerHTML = '';
  CATEGORIES.forEach(function (cat) {
    const el = document.createElement('button');
    el.className = 'category-item' + (cat.id === state.category ? ' selected' : '');
    el.dataset.id = cat.id;
    el.innerHTML = '<span class="cat-icon">' + cat.icon + '</span><span class="cat-label">' + cat.label + '</span>';
    el.addEventListener('click', function () {
      state.category = cat.id;
      document.querySelectorAll('.category-item').forEach(function (n) { n.classList.remove('selected'); });
      el.classList.add('selected');
    });
    categoryGridEl.appendChild(el);
  });
}

function getCategory(id) {
  return CATEGORIES.find(function (c) { return c.id === id; }) || CATEGORIES[CATEGORIES.length - 1];
}

// ---------- Keypad ----------
function handleKeypad(key) {
  if (key === 'del') {
    state.amount = state.amount.length > 1 ? state.amount.slice(0, -1) : '0';
  } else if (key === '000') {
    if (state.amount !== '0') state.amount += '000';
  } else {
    state.amount = state.amount === '0' ? key : state.amount + key;
  }
  if (state.amount.length > 12) state.amount = state.amount.slice(0, 12);
  amountValueEl.textContent = formatNumber(state.amount);
}

function formatNumber(numStr) {
  return Number(numStr).toLocaleString('vi-VN');
}

// ---------- Save transaction ----------
function saveTransaction() {
  const amount = Number(state.amount);
  if (!amount || amount <= 0) {
    showToast('Vui lòng nhập số tiền');
    return;
  }

  const tx = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    date: dateInputEl.value ? new Date(dateInputEl.value).toISOString() : new Date().toISOString(),
    amount: state.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
    category: state.category,
    note: noteInputEl.value.trim()
  };

  prependToHistoryCache(tx, true);
  resetEntryForm();
  renderHistory();

  if (navigator.onLine) {
    sendTransactions([tx])
      .then(function () {
        markSynced(tx.id);
        renderHistory();
        showToast('Đã lưu giao dịch');
      })
      .catch(function () {
        queueOffline(tx);
        showToast('Không gửi được, đã lưu để đồng bộ sau');
      });
  } else {
    queueOffline(tx);
    showToast('Đã lưu ngoại tuyến, sẽ đồng bộ khi có mạng');
  }
}

function resetEntryForm() {
  state.amount = '0';
  amountValueEl.textContent = '0';
  noteInputEl.value = '';
  dateInputEl.value = new Date().toISOString().slice(0, 10);
}

// ---------- Networking ----------
function sendTransactions(transactions) {
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(transactions)
  }).then(function (res) {
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  });
}

function fetchHistory() {
  return fetch(API_URL, { method: 'GET' }).then(function (res) {
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  });
}

function loadHistory() {
  if (navigator.onLine) {
    fetchHistory()
      .then(function (result) {
        if (result && result.success) {
          localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(result.data));
        }
        renderHistory();
      })
      .catch(function () {
        renderHistory();
      });
  } else {
    renderHistory();
  }
}

// ---------- Offline queue ----------
function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(LS_QUEUE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(queue));
}

function queueOffline(tx) {
  const queue = getQueue();
  queue.push(tx);
  saveQueue(queue);
  updateNetworkUI();
}

function syncOfflineQueue() {
  const queue = getQueue();
  if (queue.length === 0) return;

  syncIndicatorEl.className = 'sync-indicator pending';
  sendTransactions(queue)
    .then(function () {
      queue.forEach(function (tx) { markSynced(tx.id); });
      saveQueue([]);
      updateNetworkUI();
      renderHistory();
      loadHistory();
      showToast('Đã đồng bộ ' + queue.length + ' giao dịch');
    })
    .catch(function () {
      updateNetworkUI();
    });
}

// ---------- History cache ----------
function getHistoryCache() {
  try {
    return JSON.parse(localStorage.getItem(LS_HISTORY_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function prependToHistoryCache(tx, pending) {
  const cache = getHistoryCache();
  cache.unshift(Object.assign({}, tx, { pending: !!pending }));
  localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(cache.slice(0, 50)));
}

function markSynced(id) {
  const cache = getHistoryCache();
  const updated = cache.map(function (item) {
    if (item.id === id) {
      const copy = Object.assign({}, item);
      delete copy.pending;
      return copy;
    }
    return item;
  });
  localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(updated));
}

function renderHistory() {
  const cache = getHistoryCache();
  historyListEl.innerHTML = '';

  if (cache.length === 0) {
    historyEmptyEl.classList.remove('hidden');
    return;
  }
  historyEmptyEl.classList.add('hidden');

  cache.forEach(function (item) {
    const cat = getCategory(item.category);
    const row = document.createElement('div');
    row.className = 'history-item' + (item.pending ? ' pending-sync' : '');

    const dateStr = item.date ? new Date(item.date).toLocaleDateString('vi-VN') : '';
    const amountStr = (item.amount >= 0 ? '+' : '') + formatNumber(String(item.amount)) + ' ₫';

    row.innerHTML =
      '<div class="cat-icon">' + cat.icon + '</div>' +
      '<div class="item-main">' +
        '<div class="item-title">' + cat.label + '</div>' +
        '<div class="item-note">' + (item.note || dateStr) + '</div>' +
        (item.pending ? '<span class="pending-badge">Chờ đồng bộ</span>' : '') +
      '</div>' +
      '<div class="item-amount">' + amountStr + '</div>';

    historyListEl.appendChild(row);
  });
}

// ---------- Network UI ----------
function handleOnline() {
  state.isOnline = true;
  updateNetworkUI();
  syncOfflineQueue();
  loadHistory();
}

function handleOffline() {
  state.isOnline = false;
  updateNetworkUI();
}

function updateNetworkUI() {
  const queue = getQueue();
  if (!navigator.onLine) {
    networkBannerEl.classList.remove('hidden');
    syncIndicatorEl.className = 'sync-indicator offline';
  } else {
    networkBannerEl.classList.add('hidden');
    syncIndicatorEl.className = 'sync-indicator' + (queue.length > 0 ? ' pending' : '');
  }
}

// ---------- Toast ----------
let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toastEl.classList.add('hidden');
  }, 2200);
}

// ---------- Service Worker ----------
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function (err) {
      console.error('SW registration failed', err);
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
