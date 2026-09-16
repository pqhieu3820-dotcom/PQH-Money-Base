// ==== Money Base — app.js ====

// TODO: Dán URL Web App (Google Apps Script deployment) vào đây
const API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';

const LS_QUEUE_KEY = 'moneybase_offline_queue';
const LS_HISTORY_KEY = 'moneybase_history_cache';
const LS_BUDGET_KEY = 'moneybase_budgets';

const CATEGORIES = [
  { id: 'food', label: 'Ăn uống', icon: '🍸', color: '#1C2331' },
  { id: 'transport', label: 'Di chuyển', icon: '🚌', color: '#2E86DE' },
  { id: 'shopping', label: 'Mua sắm', icon: '🛍️', color: '#27AE60' },
  { id: 'bill', label: 'Hóa đơn', icon: '🧾', color: '#2C2C2C' },
  { id: 'health', label: 'Sức khỏe', icon: '💊', color: '#E74C3C' },
  { id: 'education', label: 'Giáo dục', icon: '📚', color: '#8E44AD' },
  { id: 'entertainment', label: 'Giải trí', icon: '🎬', color: '#34495E' },
  { id: 'salary', label: 'Lương', icon: '💰', color: '#F1A417' },
  { id: 'other', label: 'Khác', icon: '📦', color: '#7F8C8D' }
];

// Ví "Tiết kiệm" là placeholder tĩnh — app hiện chỉ theo dõi thật 1 ví "Tiền mặt".
const STATIC_WALLETS = [
  { id: 'saving', name: 'Tiết Kiệm', icon: '👛', staticBalance: 0 }
];

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const state = {
  amount: '0',
  type: 'expense',
  category: CATEGORIES[0].id,
  isOnline: navigator.onLine,
  period: 'this',
  balanceHidden: false,
  reportScope: 'month',
  topScope: 'month'
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
const toastEl = document.getElementById('toast');
const bottomNavEl = document.getElementById('bottom-nav');

// Home dashboard
const homeBalanceEl = document.getElementById('home-balance-amount');
const balanceEyeBtn = document.getElementById('balance-eye');
const walletListEl = document.getElementById('wallet-list');
const reportTotalSpentEl = document.getElementById('report-total-spent');
const reportTotalLabelEl = document.getElementById('report-total-label');
const reportChangeBadgeEl = document.getElementById('report-change-badge');
const chartAxisTopEl = document.getElementById('chart-axis-top');
const chartBarLastEl = document.getElementById('chart-bar-last');
const chartBarThisEl = document.getElementById('chart-bar-this');
const chartLabelLastEl = document.getElementById('chart-label-last');
const chartLabelThisEl = document.getElementById('chart-label-this');
const topCategoriesEl = document.getElementById('top-categories');
const topCategoriesEmptyEl = document.getElementById('top-categories-empty');
const recentListEl = document.getElementById('recent-list');
const recentEmptyEl = document.getElementById('recent-empty');
const insiderCardEl = document.getElementById('insider-card');

// Transactions screen
const historyListEl = document.getElementById('history-list');
const historyEmptyEl = document.getElementById('history-empty');
const txSummaryInEl = document.getElementById('tx-summary-in');
const txSummaryOutEl = document.getElementById('tx-summary-out');
const txSummaryNetEl = document.getElementById('tx-summary-net');

// Budget screen
const budgetListEl = document.getElementById('budget-list');
const budgetTotalLimitEl = document.getElementById('budget-total-limit');
const budgetTotalSpentEl = document.getElementById('budget-total-spent');

// Account screen
const accNetworkStatusEl = document.getElementById('acc-network-status');
const accPendingCountEl = document.getElementById('acc-pending-count');
const accSyncNowBtn = document.getElementById('acc-sync-now');

const screens = {
  home: document.getElementById('view-home'),
  transactions: document.getElementById('view-transactions'),
  entry: document.getElementById('view-entry'),
  budget: document.getElementById('view-budget'),
  account: document.getElementById('view-account')
};

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

  document.getElementById('fab-add').addEventListener('click', function () {
    showScreen('entry');
  });
  document.getElementById('entry-close').addEventListener('click', function () {
    showScreen('home');
    setActiveNav('home');
  });

  document.getElementById('see-all-tx').addEventListener('click', function () {
    showScreen('transactions');
    setActiveNav('transactions');
  });
  document.getElementById('see-budget').addEventListener('click', function () {
    showScreen('budget');
    setActiveNav('budget');
  });

  balanceEyeBtn.addEventListener('click', function () {
    state.balanceHidden = !state.balanceHidden;
    balanceEyeBtn.textContent = state.balanceHidden ? '🙈' : '👁';
    renderHomeDashboard();
  });
  document.getElementById('btn-search').addEventListener('click', function () {
    showToast('Tính năng tìm kiếm sắp ra mắt');
  });
  document.getElementById('btn-bell').addEventListener('click', function () {
    showToast('Chưa có thông báo mới');
  });

  document.querySelectorAll('[data-scope]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-scope]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.reportScope = btn.dataset.scope;
      renderHomeDashboard();
    });
  });
  document.querySelectorAll('[data-top-scope]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-top-scope]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.topScope = btn.dataset.topScope;
      renderHomeDashboard();
    });
  });

  bottomNavEl.querySelectorAll('.nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveNav(btn.dataset.tab);
      showScreen(btn.dataset.tab);
    });
  });

  document.querySelectorAll('.period-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.period-tab').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.period = btn.dataset.period;
      renderTransactionsScreen();
    });
  });

  accSyncNowBtn.addEventListener('click', function () {
    if (!navigator.onLine) {
      showToast('Đang ngoại tuyến, không thể đồng bộ');
      return;
    }
    syncOfflineQueue();
  });

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

function setActiveNav(tab) {
  bottomNavEl.querySelectorAll('.nav-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
}

function showScreen(name) {
  Object.keys(screens).forEach(function (key) {
    screens[key].classList.toggle('active', key === name);
  });
  bottomNavEl.classList.toggle('hidden', name === 'entry');

  if (name === 'home') renderHomeDashboard();
  if (name === 'transactions') renderTransactionsScreen();
  if (name === 'budget') renderBudgetScreen();
  if (name === 'account') renderAccountScreen();
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

function coloredCatIcon(cat) {
  return '<div class="cat-icon" style="background:' + cat.color + '">' + cat.icon + '</div>';
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

function formatCompact(n) {
  if (n >= 1000000) return Math.round(n / 1000000) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(Math.round(n));
}

function formatFullDate(date) {
  const d = new Date(date);
  return WEEKDAYS[d.getDay()] + ', ' + d.getDate() + ' tháng ' + (d.getMonth() + 1) + ' ' + d.getFullYear();
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
  showScreen('home');
  setActiveNav('home');

  if (navigator.onLine) {
    sendTransactions([tx])
      .then(function () {
        markSynced(tx.id);
        refreshCurrentScreen();
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
        renderHomeDashboard();
      })
      .catch(function () {
        renderHomeDashboard();
      });
  } else {
    renderHomeDashboard();
  }
}

function refreshCurrentScreen() {
  const activeKey = Object.keys(screens).find(function (key) { return screens[key].classList.contains('active'); });
  if (activeKey) showScreen(activeKey);
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
  if (queue.length === 0) {
    showToast('Không có giao dịch nào cần đồng bộ');
    return;
  }

  syncIndicatorEl.className = 'sync-indicator pending';
  sendTransactions(queue)
    .then(function () {
      queue.forEach(function (tx) { markSynced(tx.id); });
      saveQueue([]);
      updateNetworkUI();
      refreshCurrentScreen();
      loadHistory();
      showToast('Đã đồng bộ ' + queue.length + ' giao dịch');
    })
    .catch(function () {
      updateNetworkUI();
      showToast('Đồng bộ thất bại, thử lại sau');
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
  localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(cache.slice(0, 200)));
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

// ---------- Period filtering ----------
function isInPeriod(date, period) {
  const now = new Date();
  const d = new Date(date);
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  if (period === 'this') {
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }
  if (period === 'last') {
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  }
  if (period === 'future') {
    return d > now;
  }
  return true;
}

function isThisMonth(date) {
  return isInPeriod(date, 'this');
}

// scope: 'month' | 'week' — offset: 0 = current period, 1 = previous period
function getScopeRange(scope, offset) {
  const now = new Date();
  if (scope === 'week') {
    const end = new Date(now.getTime() - offset * 7 * 24 * 3600 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
    return [start, end];
  }
  const base = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return [start, end];
}

function sumSpentInRange(cache, start, end) {
  return cache
    .filter(function (item) {
      const d = new Date(item.date);
      return item.amount < 0 && d >= start && d < end;
    })
    .reduce(function (sum, item) { return sum + Math.abs(item.amount); }, 0);
}

function spendByCategoryInRange(cache, start, end) {
  const map = {};
  cache.forEach(function (item) {
    const d = new Date(item.date);
    if (item.amount < 0 && d >= start && d < end) {
      map[item.category] = (map[item.category] || 0) + Math.abs(item.amount);
    }
  });
  return map;
}

function groupByDay(items) {
  const groups = [];
  const map = {};
  items.forEach(function (item) {
    const d = new Date(item.date);
    const key = d.toISOString().slice(0, 10);
    if (!map[key]) {
      map[key] = { date: d, items: [] };
      groups.push(map[key]);
    }
    map[key].items.push(item);
  });
  return groups;
}

function renderTxRow(item) {
  const cat = getCategory(item.category);
  const row = document.createElement('div');
  row.className = 'history-item' + (item.pending ? ' pending-sync' : '');

  const isPositive = item.amount >= 0;
  const amountStr = (isPositive ? '+' : '') + formatNumber(String(item.amount)) + ' ₫';

  row.innerHTML =
    coloredCatIcon(cat) +
    '<div class="item-main">' +
      '<div class="item-title">' + cat.label + '</div>' +
      (item.note ? '<div class="item-note">' + item.note + '</div>' : '') +
      (item.pending ? '<span class="pending-badge">Chờ đồng bộ</span>' : '') +
    '</div>' +
    '<div class="item-amount' + (isPositive ? ' positive' : '') + '">' + amountStr + '</div>';

  return row;
}

function renderRecentRow(item) {
  const cat = getCategory(item.category);
  const row = document.createElement('div');
  row.className = 'history-item' + (item.pending ? ' pending-sync' : '');

  const isPositive = item.amount >= 0;
  const amountStr = (isPositive ? '+' : '') + formatNumber(String(item.amount)) + ' ₫';
  const title = item.note ? item.note : cat.label;

  row.innerHTML =
    coloredCatIcon(cat) +
    '<div class="item-main">' +
      '<div class="item-title">' + title + '</div>' +
      '<div class="item-note">' + formatFullDate(item.date) + '</div>' +
      (item.pending ? '<span class="pending-badge">Chờ đồng bộ</span>' : '') +
    '</div>' +
    '<div class="item-amount' + (isPositive ? ' positive' : '') + '">' + amountStr + '</div>';

  return row;
}

// ---------- 1. Home dashboard ----------
function renderHomeDashboard() {
  const cache = getHistoryCache();
  const allBalance = cache.reduce(function (sum, item) { return sum + item.amount; }, 0);
  const maskedText = '••••••• ₫';

  homeBalanceEl.textContent = state.balanceHidden ? maskedText : (formatNumber(String(allBalance)) + ' ₫');

  // Ví của tôi
  walletListEl.innerHTML = '';
  const wallets = [
    { id: 'cash', name: 'Tiền mặt', icon: '👛', balance: allBalance }
  ].concat(STATIC_WALLETS.map(function (w) { return { id: w.id, name: w.name, icon: w.icon, balance: w.staticBalance }; }));

  wallets.forEach(function (w) {
    const row = document.createElement('div');
    row.className = 'wallet-item';
    const amountText = state.balanceHidden ? maskedText : (formatNumber(String(w.balance)) + ' ₫');
    row.innerHTML =
      '<div class="wallet-item-icon">' + w.icon + '</div>' +
      '<div class="wallet-item-name">' + w.name + '</div>' +
      '<div class="wallet-item-amount">' + amountText + '</div>';
    walletListEl.appendChild(row);
  });

  // Báo cáo tháng này (chart tuần/tháng)
  const [curStart, curEnd] = getScopeRange(state.reportScope, 0);
  const [prevStart, prevEnd] = getScopeRange(state.reportScope, 1);
  const curSpent = sumSpentInRange(cache, curStart, curEnd);
  const prevSpent = sumSpentInRange(cache, prevStart, prevEnd);

  reportTotalSpentEl.textContent = formatNumber(String(curSpent)) + ' ₫';
  const isWeekScope = state.reportScope === 'week';
  reportTotalLabelEl.textContent = isWeekScope ? 'Tổng đã chi tuần này' : 'Tổng đã chi tháng này';
  chartLabelLastEl.textContent = isWeekScope ? 'Tuần trước' : 'Tháng trước';
  chartLabelThisEl.textContent = isWeekScope ? 'Tuần này' : 'Tháng này';

  let changePct = 0;
  if (prevSpent > 0) {
    changePct = Math.round(((curSpent - prevSpent) / prevSpent) * 100);
  } else if (curSpent > 0) {
    changePct = 100;
  }
  const isDown = changePct <= 0;
  reportChangeBadgeEl.textContent = (isDown ? '↓ ' : '↑ ') + Math.abs(changePct) + '%';
  reportChangeBadgeEl.className = 'report-change-badge ' + (isDown ? 'down' : 'up');

  const maxVal = Math.max(curSpent, prevSpent, 1);
  chartAxisTopEl.textContent = formatCompact(maxVal);
  chartBarLastEl.style.height = Math.max(4, Math.round((prevSpent / maxVal) * 100)) + '%';
  chartBarThisEl.style.height = Math.max(4, Math.round((curSpent / maxVal) * 100)) + '%';

  // Chi tiêu nhiều nhất
  const [topStart, topEnd] = getScopeRange(state.topScope, 0);
  const spendMap = spendByCategoryInRange(cache, topStart, topEnd);
  const totalTopSpend = Object.keys(spendMap).reduce(function (s, k) { return s + spendMap[k]; }, 0);

  const topCats = Object.keys(spendMap)
    .map(function (id) { return { id: id, amount: spendMap[id] }; })
    .sort(function (a, b) { return b.amount - a.amount; })
    .slice(0, 5);

  topCategoriesEl.innerHTML = '';
  if (topCats.length === 0) {
    topCategoriesEmptyEl.classList.remove('hidden');
  } else {
    topCategoriesEmptyEl.classList.add('hidden');
    topCats.forEach(function (entry) {
      const cat = getCategory(entry.id);
      const pct = totalTopSpend > 0 ? Math.round((entry.amount / totalTopSpend) * 100) : 0;
      const row = document.createElement('div');
      row.className = 'top-cat-row';
      row.innerHTML =
        coloredCatIcon(cat) +
        '<div class="top-cat-main">' +
          '<div class="top-cat-name">' + cat.label + '</div>' +
          '<div class="top-cat-sub">' + formatNumber(String(entry.amount)) + ' ₫</div>' +
        '</div>' +
        '<div class="top-cat-pct">' + pct + '%</div>';
      topCategoriesEl.appendChild(row);
    });
  }

  // Giao dịch gần đây
  recentListEl.innerHTML = '';
  const recent = cache.slice(0, 5);
  if (recent.length === 0) {
    recentEmptyEl.classList.remove('hidden');
  } else {
    recentEmptyEl.classList.add('hidden');
    recent.forEach(function (item) {
      recentListEl.appendChild(renderRecentRow(item));
    });
  }

  renderInsiderCard(cache, topCats);
}

function renderInsiderCard(cache, topCats) {
  if (!topCats || topCats.length === 0) {
    insiderCardEl.innerHTML = '<div class="mini-empty" style="background:none;padding:4px 0">Chưa có đủ dữ liệu để phân tích chi tiêu.</div>';
    return;
  }

  const top = topCats[0];
  const cat = getCategory(top.id);
  const now = new Date();
  const daysElapsed = Math.max(1, now.getDate());
  const avgPerDay = Math.round(top.amount / daysElapsed);

  const [lastStart, lastEnd] = getScopeRange('month', 1);
  const lastMonthCatSpend = spendByCategoryInRange(cache, lastStart, lastEnd)[top.id] || 0;
  let pct = 100;
  let higher = true;
  if (lastMonthCatSpend > 0) {
    pct = Math.round((top.amount / lastMonthCatSpend) * 100);
    higher = top.amount >= lastMonthCatSpend;
  }

  insiderCardEl.innerHTML =
    '<div class="insider-head">' + cat.icon + ' ' + cat.label + ' <span class="info-dot">?</span></div>' +
    '<div class="insider-row"><span class="label">Tổng đã chi</span><span class="value">' + formatNumber(String(top.amount)) + ' ₫</span></div>' +
    '<div class="insider-avg-row">' +
      '<div>' +
        '<div class="insider-avg-label">Tháng này · Trung bình</div>' +
        '<div class="insider-avg-value">' + formatNumber(String(avgPerDay)) + ' đ/ngày</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<div class="insider-badge">' + pct + '%</div>' +
        '<div class="insider-badge-label">' + (higher ? 'Cao hơn' : 'Thấp hơn') + ' tháng trước</div>' +
      '</div>' +
    '</div>' +
    '<button class="insider-outline-btn" type="button">Xu hướng chi tiêu</button>' +
    '<button class="insider-solid-btn" type="button">Đăng ký ngay</button>';

  insiderCardEl.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () { showToast('Tính năng sắp ra mắt'); });
  });
}

// ---------- 2. Transactions screen ----------
function renderTransactionsScreen() {
  const cache = getHistoryCache();
  const filtered = cache.filter(function (item) { return isInPeriod(item.date, state.period); });

  let inflow = 0;
  let outflow = 0;
  filtered.forEach(function (item) {
    if (item.amount >= 0) inflow += item.amount;
    else outflow += Math.abs(item.amount);
  });
  const net = inflow - outflow;
  txSummaryInEl.textContent = '+' + formatNumber(String(inflow)) + ' ₫';
  txSummaryOutEl.textContent = '-' + formatNumber(String(outflow)) + ' ₫';
  txSummaryNetEl.textContent = (net >= 0 ? '+' : '') + formatNumber(String(net)) + ' ₫';

  historyListEl.innerHTML = '';

  if (filtered.length === 0) {
    historyEmptyEl.classList.remove('hidden');
    return;
  }
  historyEmptyEl.classList.add('hidden');

  const groups = groupByDay(filtered);
  groups.forEach(function (group) {
    const groupEl = document.createElement('div');
    groupEl.className = 'tx-day-group';

    const header = document.createElement('div');
    header.className = 'tx-day-header';
    header.innerHTML =
      '<div class="day-num">' + group.date.getDate() + '</div>' +
      '<div class="day-meta">' +
        '<div class="day-name">' + WEEKDAYS[group.date.getDay()] + '</div>' +
        '<div class="day-month">Tháng ' + (group.date.getMonth() + 1) + ' ' + group.date.getFullYear() + '</div>' +
      '</div>';
    groupEl.appendChild(header);

    group.items.forEach(function (item) {
      groupEl.appendChild(renderTxRow(item));
    });

    historyListEl.appendChild(groupEl);
  });
}

// ---------- 3. Budget screen ----------
function getBudgets() {
  try {
    return JSON.parse(localStorage.getItem(LS_BUDGET_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveBudgets(budgets) {
  localStorage.setItem(LS_BUDGET_KEY, JSON.stringify(budgets));
}

function renderBudgetScreen() {
  const budgets = getBudgets();
  const cache = getHistoryCache();
  const monthItems = cache.filter(function (item) { return isThisMonth(item.date) && item.amount < 0; });

  const spendByCategory = {};
  monthItems.forEach(function (item) {
    spendByCategory[item.category] = (spendByCategory[item.category] || 0) + Math.abs(item.amount);
  });

  let totalLimit = 0;
  let totalSpent = 0;

  budgetListEl.innerHTML = '';
  CATEGORIES.filter(function (c) { return c.id !== 'salary'; }).forEach(function (cat) {
    const limit = Number(budgets[cat.id]) || 0;
    const spent = spendByCategory[cat.id] || 0;
    totalLimit += limit;
    totalSpent += spent;

    const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    const overBudget = limit > 0 && spent > limit;

    const row = document.createElement('div');
    row.className = 'budget-item';
    row.innerHTML =
      '<div class="budget-item-top">' +
        coloredCatIcon(cat) +
        '<div class="budget-item-name">' + cat.label + '</div>' +
        '<input type="number" min="0" step="10000" class="budget-input" data-cat="' + cat.id + '" placeholder="Đặt hạn mức" value="' + (limit || '') + '" />' +
      '</div>' +
      '<div class="top-cat-bar-track"><div class="top-cat-bar-fill' + (overBudget ? ' over' : '') + '" style="width:' + pct + '%"></div></div>' +
      '<div class="budget-item-meta">' +
        '<span>Đã chi: ' + formatNumber(String(spent)) + ' ₫</span>' +
        (limit > 0 ? '<span' + (overBudget ? ' class="over-text"' : '') + '>' + pct + '%</span>' : '<span>Chưa đặt hạn mức</span>') +
      '</div>';

    budgetListEl.appendChild(row);
  });

  budgetTotalLimitEl.textContent = formatNumber(String(totalLimit)) + ' ₫';
  budgetTotalSpentEl.textContent = formatNumber(String(totalSpent)) + ' ₫';

  budgetListEl.querySelectorAll('.budget-input').forEach(function (input) {
    input.addEventListener('change', function () {
      const budgets2 = getBudgets();
      const val = Number(input.value) || 0;
      if (val > 0) {
        budgets2[input.dataset.cat] = val;
      } else {
        delete budgets2[input.dataset.cat];
      }
      saveBudgets(budgets2);
      renderBudgetScreen();
    });
  });
}

// ---------- 4. Account screen ----------
function renderAccountScreen() {
  const queue = getQueue();
  accPendingCountEl.textContent = String(queue.length);
  accNetworkStatusEl.textContent = navigator.onLine ? 'Online' : 'Offline';
  accNetworkStatusEl.className = 'status-pill' + (navigator.onLine ? '' : ' offline');
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
  if (screens.account.classList.contains('active')) renderAccountScreen();
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
