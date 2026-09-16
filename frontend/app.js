// ==== Money Base — app.js ====

// TODO: Dán URL Web App (Google Apps Script deployment) vào đây
const API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';

const LS_QUEUE_KEY = 'moneybase_offline_queue';
const LS_HISTORY_KEY = 'moneybase_history_cache';
const LS_BUDGET_KEY = 'moneybase_budgets';

const CATEGORIES = [
  { id: 'food', label: 'Ăn uống', icon: '🍜' },
  { id: 'transport', label: 'Di chuyển', icon: '🚌' },
  { id: 'shopping', label: 'Mua sắm', icon: '🛍️' },
  { id: 'bill', label: 'Hóa đơn', icon: '🧾' },
  { id: 'health', label: 'Sức khỏe', icon: '💊' },
  { id: 'education', label: 'Giáo dục', icon: '📚' },
  { id: 'entertainment', label: 'Giải trí', icon: '🎬' },
  { id: 'salary', label: 'Lương', icon: '💰' },
  { id: 'other', label: 'Khác', icon: '📦' }
];

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const state = {
  amount: '0',
  type: 'expense',
  category: CATEGORIES[0].id,
  isOnline: navigator.onLine,
  period: 'this'
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
const homeSummaryInEl = document.getElementById('home-summary-in');
const homeSummaryOutEl = document.getElementById('home-summary-out');
const topCategoriesEl = document.getElementById('top-categories');
const topCategoriesEmptyEl = document.getElementById('top-categories-empty');
const recentListEl = document.getElementById('recent-list');
const recentEmptyEl = document.getElementById('recent-empty');

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
    '<div class="cat-icon">' + cat.icon + '</div>' +
    '<div class="item-main">' +
      '<div class="item-title">' + cat.label + '</div>' +
      (item.note ? '<div class="item-note">' + item.note + '</div>' : '') +
      (item.pending ? '<span class="pending-badge">Chờ đồng bộ</span>' : '') +
    '</div>' +
    '<div class="item-amount' + (isPositive ? ' positive' : '') + '">' + amountStr + '</div>';

  return row;
}

// ---------- 1. Home dashboard ----------
function renderHomeDashboard() {
  const cache = getHistoryCache();
  const allBalance = cache.reduce(function (sum, item) { return sum + item.amount; }, 0);
  homeBalanceEl.textContent = formatNumber(String(allBalance)) + ' ₫';

  const monthItems = cache.filter(function (item) { return isThisMonth(item.date); });
  let inflow = 0;
  let outflow = 0;
  const spendByCategory = {};
  monthItems.forEach(function (item) {
    if (item.amount >= 0) {
      inflow += item.amount;
    } else {
      outflow += Math.abs(item.amount);
      spendByCategory[item.category] = (spendByCategory[item.category] || 0) + Math.abs(item.amount);
    }
  });
  homeSummaryInEl.textContent = '+' + formatNumber(String(inflow)) + ' ₫';
  homeSummaryOutEl.textContent = '-' + formatNumber(String(outflow)) + ' ₫';

  const topCats = Object.keys(spendByCategory)
    .map(function (id) { return { id: id, amount: spendByCategory[id] }; })
    .sort(function (a, b) { return b.amount - a.amount; })
    .slice(0, 5);

  topCategoriesEl.innerHTML = '';
  if (topCats.length === 0) {
    topCategoriesEmptyEl.classList.remove('hidden');
  } else {
    topCategoriesEmptyEl.classList.add('hidden');
    const maxAmount = topCats[0].amount;
    topCats.forEach(function (entry) {
      const cat = getCategory(entry.id);
      const pct = maxAmount > 0 ? Math.round((entry.amount / maxAmount) * 100) : 0;
      const row = document.createElement('div');
      row.className = 'top-cat-row';
      row.innerHTML =
        '<div class="cat-icon">' + cat.icon + '</div>' +
        '<div class="top-cat-main">' +
          '<div class="top-cat-label">' + cat.label + '</div>' +
          '<div class="top-cat-bar-track"><div class="top-cat-bar-fill" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        '<div class="top-cat-amount">' + formatNumber(String(entry.amount)) + ' ₫</div>';
      topCategoriesEl.appendChild(row);
    });
  }

  recentListEl.innerHTML = '';
  const recent = cache.slice(0, 5);
  if (recent.length === 0) {
    recentEmptyEl.classList.remove('hidden');
  } else {
    recentEmptyEl.classList.add('hidden');
    recent.forEach(function (item) {
      recentListEl.appendChild(renderTxRow(item));
    });
  }
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
        '<div class="cat-icon">' + cat.icon + '</div>' +
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
