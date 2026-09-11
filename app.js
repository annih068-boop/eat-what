const defaultDishes = [
  { id: 1, name: '番茄炒蛋', category: '家常菜', time: '20 分钟', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=85' },
  { id: 2, name: '香煎鸡腿', category: '快手菜', time: '35 分钟', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=700&q=85' },
  { id: 3, name: '玉米排骨汤', category: '汤羹', time: '60 分钟', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=700&q=85' },
  { id: 4, name: '蒜蓉西兰花', category: '快手菜', time: '15 分钟', image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=700&q=85' },
  { id: 5, name: '葱油拌面', category: '家常菜', time: '15 分钟', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=85' },
  { id: 6, name: '菌菇豆腐煲', category: '汤羹', time: '30 分钟', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=700&q=85' }
];

const users = JSON.parse(localStorage.getItem('tomorrow-users') || '{}');
const savedUser = localStorage.getItem('tomorrow-current-user') || '';
const legacyDishes = JSON.parse(localStorage.getItem('tomorrow-dishes') || 'null');
const state = {
  dishes: defaultDishes,
  cart: [],
  category: '全部',
  meal: '午饭',
  user: savedUser,
  history: [],
  authMode: 'login'
};

const $ = (selector) => document.querySelector(selector);
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const month = tomorrow.getMonth() + 1;
const day = tomorrow.getDate();
const week = ['日', '一', '二', '三', '四', '五', '六'][tomorrow.getDay()];
$('#tomorrowDate').textContent = `${month}月${day}日`;
$('#tomorrowWeek').textContent = `星期${week}`;
$('#selectedDateLabel').textContent = `${month}月${day}日`;

function renderDishes() {
  const list = state.category === '全部' ? state.dishes : state.dishes.filter((dish) => dish.category === state.category);
  $('#dishGrid').innerHTML = list.map((dish) => `
    <article class="dish-card">
      <img class="dish-image" src="${dish.image}" alt="${dish.name}">
      <div class="dish-info"><p class="dish-name">${dish.name}</p><span class="dish-meta">${dish.category} · ${dish.time}</span></div>
      <button class="add-dish" data-add="${dish.id}" aria-label="添加${dish.name}">＋</button>
    </article>`).join('');
}

function renderCart() {
  const items = state.cart.map((dish) => `
    <div class="cart-item"><img src="${dish.image}" alt=""><div class="cart-item-info"><span class="cart-item-name">${dish.name}</span><span class="cart-item-meta">${dish.category} · ${dish.time}</span></div><button class="remove-item" data-remove="${dish.id}" aria-label="移除${dish.name}">×</button></div>`).join('');
  $('#cartItems').innerHTML = items || '<div class="empty-cart"><span>○</span><p>还没有选择菜品</p><small>从左边挑一道，放进明日计划</small></div>';
  $('#cartCount').textContent = state.cart.length;
  $('#totalCount').textContent = `${state.cart.length} 道`;
  $('#confirmButton').disabled = state.cart.length === 0;
}

function showModal(id) { $(`#${id}`).hidden = false; }
function closeModal(id) { $(`#${id}`).hidden = true; }
function saveUsers() { localStorage.setItem('tomorrow-users', JSON.stringify(users)); }
function currentUserData() { return state.user ? users[state.user] : null; }
function saveCurrentUser() {
  if (!state.user) return;
  users[state.user] = { ...users[state.user], dishes: state.dishes, history: state.history };
  saveUsers();
}
function loadUser(username) {
  state.user = username;
  const profile = users[username];
  state.dishes = profile?.dishes || legacyDishes || defaultDishes;
  state.history = profile?.history || [];
  localStorage.setItem('tomorrow-current-user', username);
  $('#loginLabel').textContent = username;
  renderDishes();
  renderHistory();
}
function saveDishes() { saveCurrentUser(); }

function renderHistory() {
  const list = $('#historyList');
  if (!state.user) {
    $('#historyIntro').textContent = '登录后，这里会成为你的家庭饭桌日记。';
    list.innerHTML = '<div class="history-empty"><span>◷</span><p>先登录，再开始记录</p><small>每次确认食谱后，会自动保存到近 30 天。</small></div>';
    return;
  }
  $('#historyIntro').textContent = `${state.user}的最近饭桌记录，共 ${state.history.length} 天。`;
  list.innerHTML = state.history.length ? state.history.map((entry) => `<article class="history-entry"><div class="history-date"><strong>${entry.month}月${entry.day}日</strong><span>星期${entry.week}</span></div><div class="history-food"><b>${entry.meal}</b><span>${entry.dishes.map((dish) => dish.name).join('、')}</span></div></article>`).join('') : '<div class="history-empty"><span>◷</span><p>还没有点餐记录</p><small>确认一份明日食谱，这里就会留下第一笔。</small></div>';
}

function saveOrder() {
  if (!state.user) return;
  const todayKey = `${tomorrow.getFullYear()}-${month}-${day}-${state.meal}`;
  state.history = state.history.filter((entry) => entry.key !== todayKey);
  state.history.unshift({ key: todayKey, month, day, week, meal: state.meal, dishes: state.cart });
  state.history = state.history.slice(0, 30);
  saveCurrentUser();
  renderHistory();
}

function encodeShareData(data) { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
function decodeShareData(value) { return JSON.parse(decodeURIComponent(escape(atob(value)))); }
function buildShareUrl() {
  const payload = { dishes: state.dishes, cart: state.cart, meal: state.meal };
  return `${window.location.href.split('#')[0]}#share=${encodeShareData(payload)}`;
}

function importSharedData() {
  const value = new URLSearchParams(window.location.hash.slice(1)).get('share');
  if (!value) return;
  try {
    const shared = decodeShareData(value);
    if (Array.isArray(shared.dishes)) state.dishes = shared.dishes;
    if (Array.isArray(shared.cart)) state.cart = shared.cart;
    if (shared.meal) state.meal = shared.meal;
  } catch (error) { window.history.replaceState({}, '', window.location.pathname); }
}

if (state.user && users[state.user]) loadUser(state.user);
importSharedData();
renderDishes();
renderCart();
document.querySelectorAll('.meal-option').forEach((item) => item.classList.toggle('active', item.dataset.meal === state.meal));
$('#selectedMealLabel').textContent = state.meal;
renderHistory();

$('.category-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('.category');
  if (!button) return;
  state.category = button.dataset.category;
  document.querySelectorAll('.category').forEach((item) => item.classList.toggle('active', item === button));
  renderDishes();
});

$('.meal-switch').addEventListener('click', (event) => {
  const button = event.target.closest('.meal-option');
  if (!button) return;
  state.meal = button.dataset.meal;
  document.querySelectorAll('.meal-option').forEach((item) => item.classList.toggle('active', item === button));
  $('#selectedMealLabel').textContent = state.meal;
});

$('#dishGrid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const dish = state.dishes.find((item) => item.id === Number(button.dataset.add));
  if (dish && !state.cart.some((item) => item.id === dish.id)) state.cart.push(dish);
  renderCart();
});

$('#cartItems').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  state.cart = state.cart.filter((item) => item.id !== Number(button.dataset.remove));
  renderCart();
});

$('#uploadButton').addEventListener('click', () => { if (!state.user) { showModal('loginModal'); return; } showModal('uploadModal'); });
$('#loginButton').addEventListener('click', () => showModal('loginModal'));
$('#historyButton').addEventListener('click', () => { renderHistory(); showModal('historyModal'); });
$('#shareButton').addEventListener('click', () => { $('#shareUrl').value = buildShareUrl(); $('#shareMessage').textContent = '这个链接会带上当前菜单和明日计划。'; showModal('shareModal'); });
$('#cartButton').addEventListener('click', () => $('#orderPanel').scrollIntoView({ behavior: 'smooth', block: 'center' }));
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.close)));
document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(backdrop.id); }));

document.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => {
  state.authMode = button.dataset.authMode;
  document.querySelectorAll('.auth-tab').forEach((item) => item.classList.toggle('active', item === button));
  $('#authTitle').textContent = state.authMode === 'register' ? '注册你的厨房' : '登录，一起选';
  $('#authIntro').textContent = state.authMode === 'register' ? '注册后，你添加的菜和每次点餐都会自动保存。' : '登录后，你上传的菜和明日计划会留在这里。';
  $('#authSubmit').innerHTML = state.authMode === 'register' ? '创建账号 <span>→</span>' : '进入厨房 <span>→</span>';
  $('#authMessage').textContent = '';
}));

$('#dishImage').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { $('#uploadPreview').style.background = `center / cover url('${reader.result}')`; $('#uploadPreview').textContent = ''; };
  reader.readAsDataURL(file);
});

$('#uploadForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const file = $('#dishImage').files[0];
  const finish = (image) => {
    state.dishes.unshift({ id: Date.now(), name: $('#dishName').value.trim(), category: $('#dishCategory').value, time: '自定义', image });
    saveDishes(); renderDishes(); closeModal('uploadModal'); event.target.reset(); $('#uploadPreview').style.background = ''; $('#uploadPreview').textContent = '＋';
  };
  if (file) { const reader = new FileReader(); reader.onload = () => finish(reader.result); reader.readAsDataURL(file); } else finish('https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=85');
});

$('#loginForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = $('#username').value.trim();
  const password = $('#password').value;
  if (state.authMode === 'register') {
    if (users[username]) { $('#authMessage').textContent = '这个用户名已经注册过了。'; return; }
    users[username] = { password, dishes: legacyDishes || defaultDishes, history: [] };
    saveUsers();
  } else if (!users[username] || users[username].password !== password) {
    $('#authMessage').textContent = '用户名或密码不正确。';
    return;
  }
  loadUser(username);
  closeModal('loginModal');
  event.target.reset();
});

$('#copyShareButton').addEventListener('click', async () => {
  const url = $('#shareUrl').value;
  try { await navigator.clipboard.writeText(url); $('#shareMessage').textContent = '链接已复制，可以发给朋友了。'; }
  catch (error) { $('#shareUrl').select(); $('#shareMessage').textContent = '请手动复制上面的链接。'; }
});

function drawRecipe() {
  const canvas = $('#recipeCanvas');
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / 1000;
  const color = { ink: '#2f302b', muted: '#858278', red: '#c96b50', sage: '#617b62', gold: '#e9bd68', paper: '#fffaf1' };
  const roundRect = (x, y, width, height, radius) => { ctx.beginPath(); ctx.roundRect(x * scale, y * scale, width * scale, height * scale, radius * scale); ctx.fill(); };
  ctx.fillStyle = color.paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f1e7d8'; ctx.fillRect(0, 0, canvas.width, 27 * scale);
  ctx.fillStyle = color.gold; ctx.beginPath(); ctx.arc(826 * scale, 160 * scale, 105 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color.red; ctx.beginPath(); ctx.arc(863 * scale, 136 * scale, 24 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color.sage; ctx.beginPath(); ctx.arc(795 * scale, 213 * scale, 19 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color.red; ctx.font = `700 ${21 * scale}px Noto Sans SC`; ctx.fillText('明天吃啥好', 78 * scale, 105 * scale);
  ctx.fillStyle = color.ink; ctx.font = `700 ${76 * scale}px Noto Sans SC`; ctx.fillText('明日食谱', 74 * scale, 215 * scale);
  ctx.fillStyle = color.red; ctx.font = `500 ${25 * scale}px Noto Sans SC`; ctx.fillText(`${month}月${day}日  ·  星期${week}`, 80 * scale, 275 * scale);
  ctx.fillStyle = color.muted; ctx.font = `500 ${20 * scale}px Noto Sans SC`; ctx.fillText(`${state.meal}  |  ${state.user ? `${state.user}的厨房` : '一起好好吃饭'}`, 80 * scale, 315 * scale);
  ctx.strokeStyle = '#dfd5c5'; ctx.lineWidth = 2 * scale; ctx.beginPath(); ctx.moveTo(80 * scale, 362 * scale); ctx.lineTo(920 * scale, 362 * scale); ctx.stroke();
  ctx.fillStyle = color.sage; ctx.font = `700 ${15 * scale}px Noto Sans SC`; ctx.fillText('今晚的选择', 80 * scale, 415 * scale);
  state.cart.forEach((dish, index) => {
    const y = 454 + index * 126;
    ctx.fillStyle = index % 2 === 0 ? '#f5eee3' : '#f8f3ea'; roundRect(80, y, 840, 94, 5);
    ctx.fillStyle = index % 2 === 0 ? color.red : color.sage; ctx.beginPath(); ctx.arc(125 * scale, (y + 46) * scale, 17 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffaf1'; ctx.font = `700 ${16 * scale}px Noto Sans SC`; ctx.textAlign = 'center'; ctx.fillText(String(index + 1).padStart(2, '0'), 125 * scale, (y + 52) * scale); ctx.textAlign = 'left';
    ctx.fillStyle = color.ink; ctx.font = `700 ${28 * scale}px Noto Sans SC`; ctx.fillText(dish.name, 176 * scale, (y + 43) * scale);
    ctx.fillStyle = color.muted; ctx.font = `500 ${16 * scale}px Noto Sans SC`; ctx.fillText(`${dish.category}  ·  ${dish.time}`, 176 * scale, (y + 70) * scale);
    ctx.fillStyle = color.red; ctx.font = `500 ${28 * scale}px Georgia`; ctx.fillText('〜', 820 * scale, (y + 54) * scale);
  });
  ctx.fillStyle = color.gold; roundRect(80, 950, 840, 116, 5);
  ctx.fillStyle = color.ink; ctx.font = `700 ${23 * scale}px Noto Sans SC`; ctx.fillText('把明天，留给一顿好饭。', 116 * scale, 1001 * scale);
  ctx.fillStyle = '#776849'; ctx.font = `500 ${17 * scale}px Noto Sans SC`; ctx.fillText('先决定吃什么，再慢慢期待明天。', 116 * scale, 1035 * scale);
  ctx.fillStyle = color.sage; ctx.font = `500 ${16 * scale}px Noto Sans SC`; ctx.fillText('明天吃啥好  ·  好好吃饭，慢慢生活', 80 * scale, 1160 * scale);
  ctx.fillStyle = color.muted; ctx.font = `500 ${14 * scale}px Noto Sans SC`; ctx.fillText('保存这张图，明天照着吃。', 80 * scale, 1197 * scale);
  $('#downloadRecipe').href = canvas.toDataURL('image/png');
}

$('#confirmButton').addEventListener('click', () => {
  if (!state.user) { showModal('loginModal'); return; }
  saveOrder();
  drawRecipe();
  showModal('recipeModal');
});
