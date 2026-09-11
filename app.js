const APP_VERSION = '2026-09-11-auth-v3';
console.info(`[明天吃啥好] app.js ${APP_VERSION}`);

const defaultDishes = [
  { id: 1, name: '番茄炒蛋', category: '家常菜', time: '20 分钟', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=85' },
  { id: 2, name: '香煎鸡腿', category: '快手菜', time: '35 分钟', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=700&q=85' },
  { id: 3, name: '玉米排骨汤', category: '汤羹', time: '60 分钟', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=700&q=85' },
  { id: 4, name: '蒜蓉西兰花', category: '快手菜', time: '15 分钟', image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=700&q=85' },
  { id: 5, name: '葱油拌面', category: '家常菜', time: '15 分钟', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=85' },
  { id: 6, name: '菌菇豆腐煲', category: '汤羹', time: '30 分钟', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=700&q=85' }
];

const supabaseConfigured = window.SUPABASE_CONFIG?.url?.startsWith('https://') && window.SUPABASE_CONFIG?.anonKey && !window.SUPABASE_CONFIG.anonKey.includes('粘贴');
const supabaseClient = supabaseConfigured ? window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey) : null;
const state = {
  dishes: defaultDishes,
  cart: [],
  category: '全部',
  meal: '午饭',
  user: '',
  userId: '',
  chefName: '我的厨房',
  session: null,
  history: [],
  authMode: 'login',
  editingDishId: null,
  sharedDishes: []
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
      <button class="edit-dish" data-edit="${dish.id}" aria-label="编辑${dish.name}">✎</button>
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
async function loadUserData(session) {
  state.session = session;
  state.userId = session.user.id;
  const profileResult = await supabaseClient.from('profiles').select('username, chef_name').eq('id', state.userId).maybeSingle();
  state.user = profileResult.data?.username || session.user.email.split('@')[0];
  state.chefName = profileResult.data?.chef_name || `${state.user}的厨房`;
  let dishesResult = await supabaseClient.from('dishes').select('*').eq('user_id', state.userId).order('created_at', { ascending: false });
  if (dishesResult.error) throw dishesResult.error;
  if (dishesResult.data.length === 0) {
    const seedDishes = defaultDishes.map((dish) => ({ user_id: state.userId, name: dish.name, category: dish.category, cook_time: dish.time, image_url: dish.image }));
    dishesResult = await supabaseClient.from('dishes').insert(seedDishes).select('*');
    if (dishesResult.error) throw dishesResult.error;
  }
  state.dishes = dishesResult.data.map((dish) => ({ id: dish.id, name: dish.name, category: dish.category, time: dish.cook_time, image: dish.image_url }));
  if (state.sharedDishes.length) state.dishes = [...state.sharedDishes, ...state.dishes];
  const plansResult = await supabaseClient.from('meal_plans').select('id, meal_date, meal_type').eq('user_id', state.userId).gte('meal_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).order('meal_date', { ascending: false });
  if (plansResult.error) throw plansResult.error;
  state.history = [];
  for (const plan of plansResult.data) {
    const links = await supabaseClient.from('meal_plan_dishes').select('sort_order, dishes(name)').eq('meal_plan_id', plan.id).order('sort_order');
    state.history.push({ key: `${plan.meal_date}-${plan.meal_type}`, month: Number(plan.meal_date.slice(5, 7)), day: Number(plan.meal_date.slice(8, 10)), week: ['日', '一', '二', '三', '四', '五', '六'][new Date(`${plan.meal_date}T00:00:00`).getDay()], meal: plan.meal_type, dishes: (links.data || []).map((link) => ({ name: link.dishes?.name || '未命名菜品' })) });
  }
  $('#loginLabel').textContent = state.user;
  renderDishes();
  renderHistory();
}

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

async function saveOrder() {
  if (!state.userId) return;
  const mealDate = tomorrow.toISOString().slice(0, 10);
  for (const dish of state.cart.filter((item) => item.source === 'shared')) {
    const copied = await supabaseClient.from('dishes').insert({ user_id: state.userId, name: dish.name, category: dish.category, cook_time: dish.time, image_url: dish.image }).select().single();
    if (copied.error) throw copied.error;
    dish.id = copied.data.id;
    dish.source = 'owned';
  }
  const planResult = await supabaseClient.from('meal_plans').upsert({ user_id: state.userId, meal_date: mealDate, meal_type: state.meal }, { onConflict: 'user_id,meal_date,meal_type' }).select('id').single();
  if (planResult.error) throw planResult.error;
  const removeResult = await supabaseClient.from('meal_plan_dishes').delete().eq('meal_plan_id', planResult.data.id);
  if (removeResult.error) throw removeResult.error;
  const links = state.cart.map((dish, index) => ({ meal_plan_id: planResult.data.id, dish_id: dish.id, sort_order: index }));
  const insertResult = await supabaseClient.from('meal_plan_dishes').insert(links);
  if (insertResult.error) throw insertResult.error;
  await loadUserData(state.session);
}

function createShareToken() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 10);
}
async function buildShareUrl() {
  if (!state.userId) throw new Error('请先登录后再分享');
  const token = createShareToken();
  const payload = { dishes: state.dishes, cart: state.cart, meal: state.meal, chefName: state.chefName };
  const result = await supabaseClient.from('share_links').insert({ token, owner_id: state.userId, payload }).select('token').single();
  if (result.error) throw result.error;
  return `${window.location.href.split('#')[0]}#s=${result.data.token}`;
}

async function importSharedData() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('s');
  if (!token || !supabaseClient) return;
  try {
    const result = await supabaseClient.from('share_links').select('payload').eq('token', token).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (result.error || !result.data) return;
    const shared = result.data.payload;
    if (Array.isArray(shared.dishes)) state.sharedDishes = shared.dishes.map((dish) => ({ ...dish, id: `shared-${dish.id}`, source: 'shared' }));
    if (Array.isArray(shared.cart)) state.cart = shared.cart.map((dish) => ({ ...dish, id: `shared-${dish.id}`, source: 'shared' }));
    if (shared.meal) state.meal = shared.meal;
    if (shared.chefName) state.chefName = shared.chefName;
    renderDishes();
    renderCart();
    document.querySelectorAll('.meal-option').forEach((item) => item.classList.toggle('active', item.dataset.meal === state.meal));
    $('#selectedMealLabel').textContent = state.meal;
  } catch (error) { console.error('分享链接读取失败', error); }
}

importSharedData();
renderDishes();
renderCart();

async function initializeSupabase() {
  if (!supabaseClient) return;
  const sessionResult = await supabaseClient.auth.getSession();
  if (sessionResult.data.session) await loadUserData(sessionResult.data.session);
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (session) await loadUserData(session);
    else {
      state.user = ''; state.userId = ''; state.session = null; state.dishes = defaultDishes; state.history = [];
      $('#loginLabel').textContent = '登录'; renderDishes(); renderHistory();
    }
  });
}
initializeSupabase();
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

function openDishEditor(dish = null) {
  state.editingDishId = dish?.id || null;
  $('#dishModalEyebrow').textContent = dish ? 'EDIT YOUR DISH' : 'ADD A DISH';
  $('#dishModalTitle').textContent = dish ? '把这道菜改得更好' : '把拿手菜放上来';
  $('#dishModalIntro').textContent = dish ? '可以改名字，也可以换一张更好看的图片。' : '让下一顿饭从你的菜单开始。';
  $('#dishSubmit').innerHTML = dish ? '保存修改 <span>→</span>' : '加入我的菜单 <span>→</span>';
  $('#dishName').value = dish?.name || '';
  $('#dishCategory').value = dish?.category || '家常菜';
  $('#uploadPreview').style.background = dish?.image ? `center / cover url('${dish.image}')` : '';
  $('#uploadPreview').textContent = dish?.image ? '' : '＋';
  $('#dishImageHint').textContent = dish ? '点击更换图片（可选）' : '点击上传菜品图片';
  showModal('uploadModal');
}

$('#dishGrid').addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-edit]');
  if (editButton) {
    const dish = state.dishes.find((item) => String(item.id) === editButton.dataset.edit);
    if (dish) openDishEditor(dish);
    return;
  }
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const dish = state.dishes.find((item) => String(item.id) === button.dataset.add);
  if (dish && !state.cart.some((item) => String(item.id) === String(dish.id))) state.cart.push(dish);
  renderCart();
});

$('#cartItems').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  state.cart = state.cart.filter((item) => String(item.id) !== button.dataset.remove);
  renderCart();
});

$('#uploadButton').addEventListener('click', () => { if (!state.user) { showModal('loginModal'); return; } openDishEditor(); });
$('#loginButton').addEventListener('click', () => showModal('loginModal'));
$('#settingsButton').addEventListener('click', () => {
  if (!state.userId) { showModal('loginModal'); return; }
  $('#chefName').value = state.chefName;
  $('#settingsMessage').textContent = '';
  showModal('settingsModal');
});
$('#historyButton').addEventListener('click', () => { renderHistory(); showModal('historyModal'); });
$('#shareButton').addEventListener('click', async () => {
  try { $('#shareUrl').value = await buildShareUrl(); $('#shareMessage').textContent = '短链接已生成，有效期 30 天。'; showModal('shareModal'); }
  catch (error) { $('#shareMessage').textContent = `生成失败：${error.message}`; showModal('shareModal'); }
});
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

function usernameEmail(username) {
  const code = Array.from(username).map((character) => character.codePointAt(0).toString(16)).join('');
  return `u-${code}@eat-what-mh26.onrender.com`;
}

function validUsername(username) {
  return /^[A-Za-z0-9\u4e00-\u9fff-]+$/.test(username);
}

function validPassword(password) {
  return password.length >= 6 && password.length <= 20 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

$('#dishImage').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { $('#uploadPreview').style.background = `center / cover url('${reader.result}')`; $('#uploadPreview').textContent = ''; };
  reader.readAsDataURL(file);
});

$('#uploadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.userId) { $('#authMessage').textContent = '请先登录。'; closeModal('uploadModal'); showModal('loginModal'); return; }
  const file = $('#dishImage').files[0];
  let image = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=85';
  try {
    if (file) {
      const path = `${state.userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      const uploadResult = await supabaseClient.storage.from('dish-images').upload(path, file, { upsert: false });
      if (uploadResult.error) throw uploadResult.error;
      image = supabaseClient.storage.from('dish-images').getPublicUrl(path).data.publicUrl;
    }
    const dishData = { name: $('#dishName').value.trim(), category: $('#dishCategory').value, cook_time: '自定义', image_url: image };
    const dishResult = state.editingDishId
      ? await supabaseClient.from('dishes').update(dishData).eq('id', state.editingDishId).eq('user_id', state.userId).select().single()
      : await supabaseClient.from('dishes').insert({ ...dishData, user_id: state.userId }).select().single();
    if (dishResult.error) throw dishResult.error;
    await loadUserData(state.session);
    closeModal('uploadModal'); event.target.reset(); state.editingDishId = null; $('#uploadPreview').style.background = ''; $('#uploadPreview').textContent = '＋';
  } catch (error) { $('#authMessage').textContent = `上传失败：${error.message}`; }
});

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) { $('#authMessage').textContent = 'Supabase 配置还没有加载。'; return; }
  const username = $('#username').value.trim();
  const password = $('#password').value;
  if (!validUsername(username)) { $('#authMessage').textContent = '用户名只能包含中文、英文、数字和短横线。'; return; }
  if (!validPassword(password)) { $('#authMessage').textContent = '密码需为 6-20 位，并同时包含大写字母、小写字母和数字。'; return; }
  const email = usernameEmail(username);
  $('#authMessage').textContent = '正在处理…';
  try {
    if (state.authMode === 'register') {
      const existing = await supabaseClient.from('profiles').select('id').eq('username', username).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) { $('#authMessage').textContent = '这个用户名已经存在，请直接登录。'; return; }
    }
    const result = state.authMode === 'register'
      ? await supabaseClient.auth.signUp({ email, password })
      : await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (state.authMode === 'register' && result.data.user) {
      const profileResult = await supabaseClient.from('profiles').insert({ id: result.data.user.id, username });
      if (profileResult.error) throw profileResult.error;
    }
    if (!result.data.session) {
      $('#authMessage').textContent = '注册请求已提交，但 Supabase 仍要求邮箱确认。请在 Authentication → Providers → Email 中关闭 Confirm email，然后重新部署。';
      return;
    }
    await loadUserData(result.data.session);
    closeModal('loginModal'); event.target.reset(); $('#authMessage').textContent = '';
  } catch (error) {
    const message = error.message.includes('Email address') ? '账号服务仍需要一个内部邮箱标识，请确认已重新部署最新代码。' : error.message;
    $('#authMessage').textContent = `操作失败：${message}`;
  }
});

$('#copyShareButton').addEventListener('click', async () => {
  const url = $('#shareUrl').value;
  try { await navigator.clipboard.writeText(url); $('#shareMessage').textContent = '链接已复制，可以发给朋友了。'; }
  catch (error) { $('#shareUrl').select(); $('#shareMessage').textContent = '请手动复制上面的链接。'; }
});

$('#settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const chefName = $('#chefName').value.trim();
  if (!chefName || !state.userId) return;
  const result = await supabaseClient.from('profiles').update({ chef_name: chefName }).eq('id', state.userId);
  if (result.error) { $('#settingsMessage').textContent = `保存失败：${result.error.message}`; return; }
  state.chefName = chefName;
  $('#settingsMessage').textContent = '已保存。';
  closeModal('settingsModal');
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
  ctx.fillStyle = color.muted; ctx.font = `500 ${20 * scale}px Noto Sans SC`; ctx.fillText(`${state.meal}  |  ${state.chefName || '一起好好吃饭'}`, 80 * scale, 315 * scale);
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

$('#confirmButton').addEventListener('click', async () => {
  if (!state.userId) { showModal('loginModal'); return; }
  try { await saveOrder(); drawRecipe(); showModal('recipeModal'); }
  catch (error) { $('#authMessage').textContent = `保存失败：${error.message}`; showModal('loginModal'); }
});
