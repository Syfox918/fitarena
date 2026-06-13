/* ============================================================
   FitArena — app.js
   State, constants, audio, navigation, page rendering,
   goals, shop, achievements, settings, daily login.
   ============================================================ */
'use strict';

/* ============================================================
   CONSTANTS / CONTENT DATA
   ============================================================ */
const STORAGE_KEY = 'fitarena_save_v1';

const RANKS = [
  { name: 'Beginner',    min: 1,  color: '#8B96AD' },
  { name: 'Bronze',      min: 5,  color: '#C98A55' },
  { name: 'Silver',      min: 10, color: '#C9D2E0' },
  { name: 'Gold',        min: 15, color: '#FFC95C' },
  { name: 'Platinum',    min: 20, color: '#5CD2C9' },
  { name: 'Diamond',     min: 25, color: '#5CD2FF' },
  { name: 'Master',      min: 30, color: '#B85CFF' },
  { name: 'Grandmaster', min: 35, color: '#FF5C72' },
];

const DAILY_GOAL_TARGETS = [
  { target: 10,  icon: '🥉', xp: 30,  coins: 15 },
  { target: 25,  icon: '🥈', xp: 60,  coins: 30 },
  { target: 50,  icon: '🥇', xp: 120, coins: 60 },
  { target: 100, icon: '🏆', xp: 250, coins: 125 },
  { target: 200, icon: '👑', xp: 500, coins: 250 },
];

const WEEKLY_GOAL = { target: 350, icon: '📅', xp: 600, coins: 300 };
const MONTHLY_GOAL = { target: 1200, icon: '🗓️', xp: 2000, coins: 1000 };

const ACHIEVEMENTS = [
  { id: 'first',       name: 'First Push-Up',       desc: 'Complete your very first rep',  icon: '🎯', xp: 50,   coins: 25,
    check: s => s.totalPushups >= 1 },
  { id: 'hundred',     name: '100 Push-Ups',        desc: 'Reach 100 total push-ups',       icon: '💯', xp: 200,  coins: 100,
    check: s => s.totalPushups >= 100 },
  { id: 'thousand',    name: '1000 Push-Ups',       desc: 'Reach 1,000 total push-ups',     icon: '🏋️', xp: 1000, coins: 500,
    check: s => s.totalPushups >= 1000 },
  { id: 'streak7',     name: '7 Day Streak',        desc: 'Train 7 days in a row',          icon: '🔥', xp: 300,  coins: 150,
    check: s => s.currentStreak >= 7 },
  { id: 'streak30',    name: '30 Day Streak',       desc: 'Train 30 days in a row',         icon: '📆', xp: 1500, coins: 750,
    check: s => s.currentStreak >= 30 },
  { id: 'perfectform', name: 'Perfect Form Master', desc: '50 clean reps in one session',   icon: '✨', xp: 500,  coins: 250,
    check: s => s.bestPerfectSession >= 50 },
];

// Shop catalog -------------------------------------------------
const SHOP_AVATARS = [
  { id: '🙂', name: 'Rookie',     cost: 0,    reqLevel: 1 },
  { id: '💪', name: 'Grinder',    cost: 100,  reqLevel: 1 },
  { id: '🥷', name: 'Shadow',     cost: 250,  reqLevel: 3 },
  { id: '🦾', name: 'Cyborg',     cost: 400,  reqLevel: 6 },
  { id: '🤖', name: 'Machine',    cost: 600,  reqLevel: 9 },
  { id: '🦁', name: 'Lion Heart', cost: 900,  reqLevel: 12 },
  { id: '🐉', name: 'Dragon',     cost: 1500, reqLevel: 18 },
  { id: '👑', name: 'Champion',   cost: 3000, reqLevel: 25 },
];

const SHOP_THEMES = [
  { id: 'default', name: 'Arena',   cost: 0,    reqLevel: 1,  swatch: ['#00E6A0', '#7C5CFF'] },
  { id: 'crimson', name: 'Crimson', cost: 500,  reqLevel: 1,  swatch: ['#FF5C5C', '#FF9F5C'] },
  { id: 'cyber',   name: 'Cyber',   cost: 800,  reqLevel: 8,  swatch: ['#5CD2FF', '#B85CFF'] },
  { id: 'royal',   name: 'Royal',   cost: 1500, reqLevel: 15, swatch: ['#FFC95C', '#7C5CFF'] },
];

const SHOP_BADGES = [
  { id: 'rookie',      name: 'Rookie',      icon: '🔰', cost: 0,    reqLevel: 1 },
  { id: 'grinder',     name: 'Grinder',     icon: '⚙️', cost: 150,  reqLevel: 3 },
  { id: 'formking',    name: 'Form King',   icon: '✅', cost: 300,  reqLevel: 6 },
  { id: 'beastmode',   name: 'Beast Mode',  icon: '🐺', cost: 600,  reqLevel: 10 },
  { id: 'unstoppable', name: 'Unstoppable', icon: '⚡', cost: 1200, reqLevel: 16 },
  { id: 'legend',      name: 'Legend',      icon: '🏛️', cost: 2500, reqLevel: 24 },
];

// Boss battles ---------------------------------------------------
const BOSSES = [
  { id: 'b1', name: 'Iron Brute',      emoji: '👹', hp: 25,  time: 45,  reqLevel: 1,  xp: 250,  coins: 120 },
  { id: 'b2', name: 'Steel Colossus',  emoji: '🗿', hp: 40,  time: 60,  reqLevel: 4,  xp: 400,  coins: 200 },
  { id: 'b3', name: 'Shadow Reaper',   emoji: '👻', hp: 60,  time: 75,  reqLevel: 8,  xp: 650,  coins: 320 },
  { id: 'b4', name: 'Inferno Titan',   emoji: '🔥', hp: 85,  time: 90,  reqLevel: 13, xp: 950,  coins: 480 },
  { id: 'b5', name: 'Void Dragon',     emoji: '🐉', hp: 120, time: 110, reqLevel: 19, xp: 1500, coins: 750 },
  { id: 'b6', name: 'The Grandmaster', emoji: '👑', hp: 160, time: 120, reqLevel: 28, xp: 2500, coins: 1250 },
];

const TIME_ATTACK_DURATIONS = [30, 60, 120, 300];
const CHALLENGE_TARGETS = [10, 25, 50, 100, 150, 200];
const SURVIVAL_START_TIME = 20;       // seconds
const SURVIVAL_TIME_PER_REP = 3;      // seconds added per rep

const DAILY_CHALLENGE_TEMPLATES = [
  { label: '40 Push-Ups in 90s',    type: 'challenge',  target: 40, time: 90 },
  { label: 'Survive 45 Seconds',    type: 'survival',   startTime: 25 },
  { label: '60s Time Attack',       type: 'timeattack', duration: 60 },
  { label: '25 Perfect-Form Reps',  type: 'challenge',  target: 25, time: 120, perfectOnly: true },
  { label: '75 Push-Ups, No Limit', type: 'challenge',  target: 75, time: 600 },
  { label: '120s Endurance Push',   type: 'timeattack', duration: 120 },
  { label: 'Survive 60 Seconds',    type: 'survival',   startTime: 30 },
];

const LOGIN_REWARDS = [
  { coins: 20,  xp: 10,  icon: '🪙' },
  { coins: 30,  xp: 15,  icon: '🪙' },
  { coins: 40,  xp: 20,  icon: '💰' },
  { coins: 60,  xp: 30,  icon: '💰' },
  { coins: 80,  xp: 40,  icon: '💎' },
  { coins: 100, xp: 60,  icon: '💎' },
  { coins: 200, xp: 150, icon: '🏆' },
];

const MODE_DEFS = [
  { id: 'classic',    icon: '♾️', name: 'Classic',        desc: 'Unlimited push-ups, no pressure. Stop whenever.', color: '#00E6A0' },
  { id: 'timeattack', icon: '⏱️', name: 'Time Attack',    desc: 'Max reps before the clock runs out.', color: '#5CD2FF' },
  { id: 'challenge',  icon: '🎯', name: 'Challenge',      desc: 'Hit a target rep count as fast as you can.', color: '#7C5CFF' },
  { id: 'survival',   icon: '💀', name: 'Survival',       desc: 'Timer drains fast. Every rep buys time.', color: '#FF5C72' },
  { id: 'endurance',  icon: '🏃', name: 'Endurance',      desc: 'Long-form session tracking, no limits.', color: '#FFC95C' },
  { id: 'daily',      icon: '🎲', name: 'Daily Challenge', desc: '', color: '#00E6A0', wide: true },
  { id: 'boss',       icon: '👹', name: 'Boss Battle',     desc: '', color: '#FF5C72', wide: true },
];

/* ============================================================
   DATE / TIME HELPERS
   ============================================================ */
function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dateFromStr(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function daysBetween(a, b) {
  const A = dateFromStr(a), B = dateFromStr(b);
  return Math.round((B - A) / 86400000);
}
function weekStartStr(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return todayStr(date);
}
function monthStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function formatTime(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(totalSeconds / 60), s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function formatDateNice(s) {
  const d = dateFromStr(s);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ============================================================
   LEVEL / RANK HELPERS
   ============================================================ */
function xpForLevel(level) { return 100 + (level - 1) * 45; }
function rankForLevel(level) {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.min) r = rank;
  return r;
}

/* ============================================================
   STATE
   ============================================================ */
function defaultState() {
  return {
    username: 'Athlete',
    avatar: '🙂',
    theme: 'default',
    badge: 'rookie',
    level: 1,
    xp: 0,
    coins: 50,
    totalPushups: 0,
    bestSession: 0,
    bestPerfectSession: 0,
    longestStreak: 0,
    currentStreak: 0,
    lastWorkoutDate: null,
    totalCalories: 0,
    history: [],
    achievements: {},
    unlocked: { avatars: ['🙂'], themes: ['default'], badges: ['rookie'] },
    daily: { date: todayStr(), count: 0, claimed: [false, false, false, false, false] },
    weekly: { weekStart: weekStartStr(), count: 0, claimed: false },
    monthly: { month: monthStr(), count: 0, claimed: false },
    activity: {},
    bossProgress: -1,
    lastLoginDate: null,
    loginStreak: 0,
    dailyChallenge: { date: null, completed: false },
    settings: { sound: true, haptics: true, skeleton: true, weight: 70 },
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed, {
      unlocked: Object.assign({ avatars: ['🙂'], themes: ['default'], badges: ['rookie'] }, parsed.unlocked || {}),
      settings: Object.assign({ sound: true, haptics: true, skeleton: true, weight: 70 }, parsed.settings || {}),
      daily: Object.assign({ date: todayStr(), count: 0, claimed: [false, false, false, false, false] }, parsed.daily || {}),
      weekly: Object.assign({ weekStart: weekStartStr(), count: 0, claimed: false }, parsed.weekly || {}),
      monthly: Object.assign({ month: monthStr(), count: 0, claimed: false }, parsed.monthly || {}),
      activity: parsed.activity || {},
      dailyChallenge: parsed.dailyChallenge || { date: null, completed: false },
    });
  } catch (e) {
    console.warn('Save data corrupted, starting fresh.', e);
    return defaultState();
  }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Could not save', e); }
}

function ensurePeriodResets() {
  const today = todayStr();
  const wkStart = weekStartStr();
  const mo = monthStr();

  if (state.daily.date !== today) {
    state.daily = { date: today, count: 0, claimed: [false, false, false, false, false] };
  }
  if (state.weekly.weekStart !== wkStart) {
    state.weekly = { weekStart: wkStart, count: 0, claimed: false };
  }
  if (state.monthly.month !== mo) {
    state.monthly = { month: mo, count: 0, claimed: false };
  }
  if (state.dailyChallenge.date !== today) {
    state.dailyChallenge = { date: today, completed: false };
  }
  if (state.lastWorkoutDate) {
    const diff = daysBetween(state.lastWorkoutDate, today);
    if (diff > 1) state.currentStreak = 0;
  }
}

function addXP(amount) {
  let leveledUp = false, rankedUp = false;
  const prevLevel = state.level;
  const prevRank = rankForLevel(prevLevel);
  state.xp += amount;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level += 1;
    leveledUp = true;
  }
  const newRank = rankForLevel(state.level);
  if (newRank.name !== prevRank.name) rankedUp = true;
  return { leveledUp, newLevel: state.level, rankedUp, newRank: newRank.name };
}

/* ============================================================
   AUDIO (Web Audio synth — no external assets needed)
   ============================================================ */
const Audio_ = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.18, delay = 0) {
    if (!state.settings.sound) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain).connect(c.destination);
      const t0 = c.currentTime + delay;
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch (e) { /* audio not available */ }
  }
  return {
    unlock() { try { getCtx(); } catch (e) {} },
    rep() { tone(660, 0.09, 'square', 0.12); },
    repGood() { tone(880, 0.12, 'triangle', 0.14); },
    warn() { tone(220, 0.18, 'sawtooth', 0.10); },
    click() { tone(440, 0.05, 'square', 0.08); },
    combo() { tone(990, 0.12, 'triangle', 0.16); tone(1320, 0.14, 'triangle', 0.12, 0.06); },
    coin() { tone(1175, 0.08, 'square', 0.1); tone(1568, 0.1, 'square', 0.1, 0.05); },
    levelUp() { tone(523, 0.12, 'triangle', 0.18); tone(659, 0.12, 'triangle', 0.18, 0.1); tone(784, 0.22, 'triangle', 0.2, 0.2); },
    achievement() { tone(784, 0.1, 'sine', 0.18); tone(988, 0.1, 'sine', 0.18, 0.08); tone(1318, 0.25, 'sine', 0.2, 0.16); },
    bossHit() { tone(150, 0.12, 'sawtooth', 0.18); },
    victory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.2, i * 0.11)); },
    countdown() { tone(330, 0.1, 'square', 0.12); },
    start() { tone(440, 0.1, 'triangle', 0.15); tone(660, 0.18, 'triangle', 0.18, 0.12); },
  };
})();

function vibrate(pattern) {
  if (!state.settings.haptics) return;
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer = null;
function showToast(msg, icon = '') {
  const el = document.getElementById('toast');
  el.innerHTML = (icon ? `<span style="font-size:16px">${icon}</span>` : '') + `<span>${msg}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ============================================================
   NAVIGATION
   ============================================================ */
const NAV_ITEMS = [
  { id: 'home',    icon: '🏠', label: 'Home' },
  { id: 'modes',   icon: '🥊', label: 'Train' },
  { id: 'stats',   icon: '📊', label: 'Stats' },
  { id: 'shop',    icon: '🛒', label: 'Shop' },
  { id: 'profile', icon: '👤', label: 'Profile' },
];
const BOTTOMNAV_IDS = ['bottomnav', 'bottomnav-modes', 'bottomnav-profile', 'bottomnav-stats', 'bottomnav-shop'];

function buildBottomNavs() {
  BOTTOMNAV_IDS.forEach(navId => {
    const nav = document.getElementById(navId);
    if (!nav) return;
    nav.innerHTML = '';
    NAV_ITEMS.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.dataset.nav = item.id;
      btn.innerHTML = `<span class="nav-ico">${item.icon}</span><span>${item.label}</span>`;
      btn.addEventListener('click', () => { Audio_.click(); showPage(item.id); });
      nav.appendChild(btn);
    });
  });
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === id);
  });

  if (id === 'home') renderHome();
  if (id === 'modes') renderModes();
  if (id === 'profile') renderProfile();
  if (id === 'stats') renderStats();
  if (id === 'shop') renderShop();
  if (id === 'achievements') renderAchievements();
  if (id === 'settings') renderSettings();
}

document.addEventListener('click', (e) => {
  const navBtn = e.target.closest('[data-nav]');
  if (navBtn && !navBtn.classList.contains('nav-item')) {
    Audio_.click();
    showPage(navBtn.dataset.nav);
  }
});

/* ============================================================
   GOALS LOGIC
   ============================================================ */
function renderGoalItem({ icon, title, progress, target, reward, claimed, onClaim }) {
  const pct = Math.min(100, Math.round((progress / target) * 100));
  const done = progress >= target;
  const wrap = document.createElement('div');
  wrap.className = 'goal-item' + (done ? ' done' : '');
  wrap.innerHTML = `
    <div class="goal-icon">${icon}</div>
    <div class="goal-body">
      <div class="goal-title-row"><span>${title}</span><span>${Math.min(progress, target)}/${target}</span></div>
      <div class="bar bar-goal"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="goal-reward">${reward}</div>
    </div>
  `;
  if (done) {
    const btn = document.createElement('button');
    btn.className = 'goal-claim';
    if (claimed) { btn.textContent = 'Claimed'; btn.disabled = true; }
    else { btn.textContent = 'Claim'; btn.addEventListener('click', () => { Audio_.coin(); onClaim(); }); }
    wrap.appendChild(btn);
  }
  return wrap;
}

function claimDailyGoal(idx) {
  const def = DAILY_GOAL_TARGETS[idx];
  state.daily.claimed[idx] = true;
  state.coins += def.coins;
  const res = addXP(def.xp);
  saveState();
  showToast(`Claimed +${def.xp} XP, +${def.coins} coins`, def.icon);
  if (res.leveledUp) handleLevelUp(res);
  renderHome();
}
function claimWeeklyGoal() {
  state.weekly.claimed = true;
  state.coins += WEEKLY_GOAL.coins;
  const res = addXP(WEEKLY_GOAL.xp);
  saveState();
  showToast(`Weekly goal claimed! +${WEEKLY_GOAL.xp} XP`, WEEKLY_GOAL.icon);
  if (res.leveledUp) handleLevelUp(res);
  renderHome();
}
function claimMonthlyGoal() {
  state.monthly.claimed = true;
  state.coins += MONTHLY_GOAL.coins;
  const res = addXP(MONTHLY_GOAL.xp);
  saveState();
  showToast(`Monthly goal claimed! +${MONTHLY_GOAL.xp} XP`, MONTHLY_GOAL.icon);
  if (res.leveledUp) handleLevelUp(res);
  renderHome();
}

function handleLevelUp(res) {
  Audio_.levelUp();
  vibrate([60, 40, 60, 40, 120]);
  showToast(`Level Up! You're now Level ${res.newLevel}`, '⭐');
  if (res.rankedUp) {
    setTimeout(() => showToast(`New Rank: ${res.newRank}!`, '🏆'), 900);
  }
}

/* ============================================================
   RENDER: HOME
   ============================================================ */
function renderHome() {
  document.getElementById('home-avatar').textContent = state.avatar;
  document.getElementById('home-level-badge').textContent = state.level;
  document.getElementById('home-username').textContent = state.username;
  document.getElementById('home-rank').textContent = rankForLevel(state.level).name;
  document.getElementById('home-coins').textContent = state.coins;
  document.getElementById('home-level').textContent = state.level;
  document.getElementById('home-xp-cur').textContent = state.xp;
  document.getElementById('home-xp-next').textContent = xpForLevel(state.level);
  document.getElementById('home-xp-fill').style.width = `${(state.xp / xpForLevel(state.level)) * 100}%`;
  document.getElementById('home-streak').textContent = state.currentStreak;
  document.getElementById('home-today').textContent = state.daily.count;

  const goalsWrap = document.getElementById('home-daily-goals');
  goalsWrap.innerHTML = '';
  let doneCount = 0;
  DAILY_GOAL_TARGETS.forEach((def, idx) => {
    if (state.daily.count >= def.target) doneCount++;
    goalsWrap.appendChild(renderGoalItem({
      icon: def.icon,
      title: `${def.target} Push-Ups`,
      progress: state.daily.count,
      target: def.target,
      reward: `+${def.xp} XP · +${def.coins} coins`,
      claimed: state.daily.claimed[idx],
      onClaim: () => claimDailyGoal(idx),
    }));
  });
  document.getElementById('home-goals-count').textContent = `${doneCount}/${DAILY_GOAL_TARGETS.length}`;

  const periodWrap = document.getElementById('home-period-goals');
  periodWrap.innerHTML = '';
  periodWrap.appendChild(renderGoalItem({
    icon: WEEKLY_GOAL.icon, title: 'Weekly Goal', progress: state.weekly.count, target: WEEKLY_GOAL.target,
    reward: `+${WEEKLY_GOAL.xp} XP · +${WEEKLY_GOAL.coins} coins`, claimed: state.weekly.claimed,
    onClaim: claimWeeklyGoal,
  }));
  periodWrap.appendChild(renderGoalItem({
    icon: MONTHLY_GOAL.icon, title: 'Monthly Goal', progress: state.monthly.count, target: MONTHLY_GOAL.target,
    reward: `+${MONTHLY_GOAL.xp} XP · +${MONTHLY_GOAL.coins} coins`, claimed: state.monthly.claimed,
    onClaim: claimMonthlyGoal,
  }));

  renderWeekChart('home-week-chart');
}

function renderWeekChart(elId) {
  const wrap = document.getElementById(elId);
  wrap.innerHTML = '';
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const counts = days.map(d => state.activity[todayStr(d)] || 0);
  const max = Math.max(50, ...counts);
  days.forEach((d, i) => {
    const col = document.createElement('div');
    col.className = 'week-bar-col';
    const isToday = todayStr(d) === todayStr();
    const pct = Math.max(3, Math.round((counts[i] / max) * 100));
    col.innerHTML = `
      <div class="week-bar-track"><div class="week-bar-fill" style="height:${pct}%"></div></div>
      <div class="week-bar-label ${isToday ? 'today' : ''}">${d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</div>
    `;
    wrap.appendChild(col);
  });
}

/* ============================================================
   RENDER: MODES
   ============================================================ */
function getDailyChallenge() {
  const today = todayStr();
  let hash = 0;
  for (let i = 0; i < today.length; i++) hash = (hash * 31 + today.charCodeAt(i)) % DAILY_CHALLENGE_TEMPLATES.length;
  return DAILY_CHALLENGE_TEMPLATES[Math.abs(hash) % DAILY_CHALLENGE_TEMPLATES.length];
}
function getNextBoss() {
  const idx = Math.min(state.bossProgress + 1, BOSSES.length - 1);
  return { boss: BOSSES[idx], idx };
}

function renderModes() {
  const grid = document.getElementById('mode-grid');
  grid.innerHTML = '';
  const dc = getDailyChallenge();
  const { boss, idx: bossIdx } = getNextBoss();
  const bossLocked = state.level < boss.reqLevel;
  const allDefeated = state.bossProgress >= BOSSES.length - 1;

  MODE_DEFS.forEach(m => {
    const card = document.createElement('div');
    card.className = 'mode-card' + (m.wide ? ' wide' : '');
    card.style.setProperty('--c', m.color);

    let desc = m.desc, tag = '';
    if (m.id === 'daily') {
      desc = state.dailyChallenge.completed ? 'Completed! Come back tomorrow.' : dc.label;
      tag = state.dailyChallenge.completed ? 'DONE' : 'TODAY';
    }
    if (m.id === 'boss') {
      if (allDefeated) { desc = 'All bosses defeated! Legend status achieved.'; tag = 'CLEARED'; }
      else { desc = `${boss.name} · HP ${boss.hp} · ${boss.time}s`; tag = bossLocked ? `LV ${boss.reqLevel}` : 'READY'; }
      if (bossLocked) card.classList.add('locked');
    }

    card.innerHTML = `
      <div class="mode-glow"></div>
      <div style="position:relative;z-index:1;${m.wide ? 'flex:1;' : ''}">
        <div class="mode-icon">${m.id === 'boss' && !allDefeated ? boss.emoji : m.icon}</div>
        <div class="mode-name">${m.name}</div>
        <div class="mode-desc">${desc}</div>
      </div>
      ${tag ? `<div class="mode-tag">${tag}</div>` : ''}
    `;
    card.addEventListener('click', () => {
      Audio_.click();
      if (m.id === 'boss' && bossLocked) { showToast(`Reach Level ${boss.reqLevel} to unlock`, '🔒'); return; }
      if (m.id === 'boss' && allDefeated) { showToast('You have defeated every boss! 👑'); return; }
      if (m.id === 'daily' && state.dailyChallenge.completed) { showToast('Already completed today. Come back tomorrow!'); return; }
      openModeSheet(m.id);
    });
    grid.appendChild(card);
  });
}

/* ============================================================
   MODE OPTIONS SHEET
   ============================================================ */
let pendingModeConfig = null;

function openModeSheet(modeId) {
  const overlay = document.getElementById('mode-sheet-overlay');
  const title = document.getElementById('mode-sheet-title');
  const desc = document.getElementById('mode-sheet-desc');
  const optsWrap = document.getElementById('mode-sheet-options');
  const goBtn = document.getElementById('mode-sheet-go');
  optsWrap.innerHTML = '';
  pendingModeConfig = null;

  const mkOption = (big, small, selected) => {
    const el = document.createElement('div');
    el.className = 'sheet-option' + (selected ? ' selected' : '');
    el.innerHTML = `<strong>${big}</strong><span>${small}</span>`;
    return el;
  };

  switch (modeId) {
    case 'classic':
      title.textContent = 'Classic Mode';
      desc.textContent = 'Unlimited push-ups. Track reps, calories and XP — stop whenever you like.';
      pendingModeConfig = { type: 'classic' };
      goBtn.textContent = 'Start Workout';
      break;

    case 'timeattack': {
      title.textContent = 'Time Attack';
      desc.textContent = 'Pick a duration. Score as many push-ups as possible before time runs out.';
      const dur = 60;
      pendingModeConfig = { type: 'timeattack', duration: dur };
      TIME_ATTACK_DURATIONS.forEach(d => {
        const el = mkOption(d >= 60 ? `${d / 60}m` : `${d}s`, 'duration', d === dur);
        el.addEventListener('click', () => {
          optsWrap.querySelectorAll('.sheet-option').forEach(o => o.classList.remove('selected'));
          el.classList.add('selected');
          pendingModeConfig = { type: 'timeattack', duration: d };
        });
        optsWrap.appendChild(el);
      });
      goBtn.textContent = 'Start Time Attack';
      break;
    }

    case 'challenge': {
      title.textContent = 'Challenge Mode';
      desc.textContent = 'Pick a target rep count. Complete it as fast as you can — the clock is just for bragging rights.';
      const target = 25;
      pendingModeConfig = { type: 'challenge', target, time: 600 };
      CHALLENGE_TARGETS.forEach(t => {
        const el = mkOption(t, 'reps', t === target);
        el.addEventListener('click', () => {
          optsWrap.querySelectorAll('.sheet-option').forEach(o => o.classList.remove('selected'));
          el.classList.add('selected');
          pendingModeConfig = { type: 'challenge', target: t, time: 600 };
        });
        optsWrap.appendChild(el);
      });
      goBtn.textContent = 'Start Challenge';
      break;
    }

    case 'survival':
      title.textContent = 'Survival Mode';
      desc.textContent = `You start with ${SURVIVAL_START_TIME}s. Each push-up adds ${SURVIVAL_TIME_PER_REP}s back. Keep going until the timer hits zero.`;
      pendingModeConfig = { type: 'survival', startTime: SURVIVAL_START_TIME, perRep: SURVIVAL_TIME_PER_REP };
      goBtn.textContent = 'Start Survival';
      break;

    case 'endurance':
      title.textContent = 'Endurance Mode';
      desc.textContent = 'No limits, no clock pressure. Built for long sessions — every rep and minute is tracked.';
      pendingModeConfig = { type: 'endurance' };
      goBtn.textContent = 'Start Endurance';
      break;

    case 'daily': {
      const dailyCfg = getDailyChallenge();
      title.textContent = "Today's Challenge";
      desc.textContent = dailyCfg.label;
      if (dailyCfg.type === 'challenge') pendingModeConfig = { type: 'challenge', target: dailyCfg.target, time: dailyCfg.time, isDaily: true, perfectOnly: !!dailyCfg.perfectOnly };
      if (dailyCfg.type === 'survival') pendingModeConfig = { type: 'survival', startTime: dailyCfg.startTime, perRep: SURVIVAL_TIME_PER_REP, isDaily: true };
      if (dailyCfg.type === 'timeattack') pendingModeConfig = { type: 'timeattack', duration: dailyCfg.duration, isDaily: true };
      goBtn.textContent = 'Start Daily Challenge';
      break;
    }

    case 'boss': {
      const { boss, idx } = getNextBoss();
      title.textContent = `Boss Battle: ${boss.name}`;
      desc.textContent = `${boss.emoji} HP ${boss.hp} — defeat it within ${boss.time}s. Each clean push-up deals 1 damage.`;
      pendingModeConfig = { type: 'boss', bossIdx: idx, hp: boss.hp, time: boss.time };
      goBtn.textContent = 'Fight!';
      break;
    }
  }

  overlay.classList.add('active');
}

document.getElementById('mode-sheet-cancel').addEventListener('click', () => {
  Audio_.click();
  document.getElementById('mode-sheet-overlay').classList.remove('active');
});
document.getElementById('mode-sheet-go').addEventListener('click', () => {
  Audio_.start();
  document.getElementById('mode-sheet-overlay').classList.remove('active');
  if (pendingModeConfig) startWorkout(pendingModeConfig);
});

/* ============================================================
   RENDER: PROFILE
   ============================================================ */
function renderProfile() {
  document.getElementById('profile-avatar').textContent = state.avatar;
  document.getElementById('profile-username').value = state.username;
  document.getElementById('profile-rank').textContent = rankForLevel(state.level).name;
  document.getElementById('profile-level').textContent = state.level;
  document.getElementById('profile-xp-cur').textContent = state.xp;
  document.getElementById('profile-xp-next').textContent = xpForLevel(state.level);
  document.getElementById('profile-xp-fill').style.width = `${(state.xp / xpForLevel(state.level)) * 100}%`;

  const badgesWrap = document.getElementById('profile-badges');
  badgesWrap.innerHTML = '';
  state.unlocked.badges.forEach(bid => {
    const b = SHOP_BADGES.find(x => x.id === bid);
    if (!b) return;
    const chip = document.createElement('div');
    chip.className = 'badge-chip';
    chip.innerHTML = `<span class="icon">${b.icon}</span><span class="label">${b.name}</span>`;
    if (bid === state.badge) chip.style.borderColor = 'var(--accent)';
    badgesWrap.appendChild(chip);
  });

  const statsWrap = document.getElementById('profile-stats');
  statsWrap.innerHTML = '';
  [
    ['Total Push-Ups', state.totalPushups],
    ['Best Session', state.bestSession],
    ['Longest Streak', `${state.longestStreak}d`],
    ['Calories Burned', Math.round(state.totalCalories)],
  ].forEach(([label, val]) => {
    const box = document.createElement('div');
    box.className = 'stat-box';
    box.innerHTML = `<div class="v">${val}</div><div class="l">${label}</div>`;
    statsWrap.appendChild(box);
  });

  const unlockedCount = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
  document.getElementById('profile-ach-count').textContent = `${unlockedCount}/${ACHIEVEMENTS.length}`;
  const preview = document.getElementById('profile-ach-preview');
  preview.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const mini = document.createElement('div');
    mini.className = 'ach-mini' + (state.achievements[a.id] ? ' unlocked' : '');
    mini.textContent = a.icon;
    preview.appendChild(mini);
  });
}

document.getElementById('profile-username').addEventListener('change', (e) => {
  const val = e.target.value.trim().slice(0, 16);
  state.username = val || 'Athlete';
  e.target.value = state.username;
  saveState();
  renderHome();
});
document.getElementById('profile-avatar-btn').addEventListener('click', () => {
  Audio_.click();
  showPage('shop');
  document.querySelector('#shop-tabs .tab[data-tab="avatars"]').click();
});
document.getElementById('home-avatar-btn').addEventListener('click', () => { Audio_.click(); showPage('profile'); });

/* ============================================================
   RENDER: STATS
   ============================================================ */
function modeIcon(id) { const m = MODE_DEFS.find(x => x.id === id); return m ? m.icon : '🏋️'; }
function modeName(id) { const m = MODE_DEFS.find(x => x.id === id); return m ? m.name : 'Workout'; }

function renderStats() {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  [
    ['Total Push-Ups', state.totalPushups],
    ['Today', state.daily.count],
    ['This Week', state.weekly.count],
    ['This Month', state.monthly.count],
    ['Best Session', state.bestSession],
    ['Longest Streak', `${state.longestStreak}d`],
    ['Current Streak', `${state.currentStreak}d`],
    ['Calories Burned', Math.round(state.totalCalories)],
  ].forEach(([label, val]) => {
    const box = document.createElement('div');
    box.className = 'stat-box';
    box.innerHTML = `<div class="v">${val}</div><div class="l">${label}</div>`;
    grid.appendChild(box);
  });

  renderWeekChart('stats-week-chart');

  const hist = document.getElementById('stats-history');
  hist.innerHTML = '';
  if (state.history.length === 0) {
    hist.innerHTML = `<div class="stat-box" style="text-align:center;color:var(--text-dim)">No workouts yet. Start training to build your history.</div>`;
  } else {
    state.history.slice().reverse().slice(0, 30).forEach(h => {
      const row = document.createElement('div');
      row.className = 'goal-item';
      row.innerHTML = `
        <div class="goal-icon">${modeIcon(h.mode)}</div>
        <div class="goal-body">
          <div class="goal-title-row"><span>${h.reps} reps · ${modeName(h.mode)}</span><span>${formatDateNice(h.date)}</span></div>
          <div class="goal-reward">${formatTime(h.duration)} · ${Math.round(h.calories)} kcal · +${h.xp} XP</div>
        </div>
      `;
      hist.appendChild(row);
    });
  }
}

/* ============================================================
   RENDER: SHOP
   ============================================================ */
let shopTab = 'avatars';
document.getElementById('shop-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  Audio_.click();
  document.querySelectorAll('#shop-tabs .tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  shopTab = tab.dataset.tab;
  renderShop();
});

function renderShop() {
  document.getElementById('shop-coins').textContent = state.coins;
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';

  let items, unlockedKey, equippedKey, applyEquip;
  if (shopTab === 'avatars') {
    items = SHOP_AVATARS; unlockedKey = 'avatars'; equippedKey = 'avatar';
    applyEquip = (id) => { state.avatar = id; };
  } else if (shopTab === 'themes') {
    items = SHOP_THEMES; unlockedKey = 'themes'; equippedKey = 'theme';
    applyEquip = (id) => { state.theme = id; document.body.dataset.theme = id; };
  } else {
    items = SHOP_BADGES; unlockedKey = 'badges'; equippedKey = 'badge';
    applyEquip = (id) => { state.badge = id; };
  }

  items.forEach(item => {
    const owned = state.unlocked[unlockedKey].includes(item.id);
    const equipped = state[equippedKey] === item.id;
    const locked = state.level < item.reqLevel;

    const card = document.createElement('div');
    card.className = 'shop-item' + (equipped ? ' equipped' : '');
    let iconHtml;
    if (shopTab === 'avatars') iconHtml = item.id;
    else if (shopTab === 'badges') iconHtml = item.icon;
    else iconHtml = `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, ${item.swatch[0]}, ${item.swatch[1]})"></div>`;

    let btnLabel, btnClass, disabled = false;
    if (equipped) { btnLabel = 'Equipped'; btnClass = 'equipped'; disabled = true; }
    else if (owned) { btnLabel = 'Equip'; btnClass = 'owned'; }
    else if (locked) { btnLabel = `Unlock @ Lv ${item.reqLevel}`; btnClass = ''; disabled = true; }
    else { btnLabel = item.cost === 0 ? 'Free' : `Buy · ${item.cost}`; btnClass = ''; disabled = item.cost > state.coins; }

    card.innerHTML = `
      <div class="shop-item-icon">${iconHtml}</div>
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-price">${owned || locked ? '' : (item.cost === 0 ? 'Free' : `<span class="icon-coin"></span>${item.cost}`)}</div>
      <button class="shop-item-btn ${btnClass}" ${disabled ? 'disabled' : ''}>${btnLabel}</button>
    `;
    const btn = card.querySelector('button');
    if (!disabled) {
      btn.addEventListener('click', () => {
        Audio_.coin();
        if (!owned) {
          state.coins -= item.cost;
          state.unlocked[unlockedKey].push(item.id);
          showToast(`Unlocked ${item.name}!`, '🎉');
        }
        applyEquip(item.id);
        saveState();
        renderShop();
        if (shopTab === 'avatars') renderHome();
      });
    }
    grid.appendChild(card);
  });
}

/* ============================================================
   RENDER: ACHIEVEMENTS
   ============================================================ */
function renderAchievements() {
  const list = document.getElementById('ach-list');
  list.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const unlocked = !!state.achievements[a.id];
    const card = document.createElement('div');
    card.className = 'ach-card' + (unlocked ? ' unlocked' : '');
    card.innerHTML = `
      <div class="ach-card-icon">${a.icon}</div>
      <div class="ach-card-body">
        <div class="ach-card-title"><span>${a.name}</span>${unlocked ? `<small>+${a.xp} XP</small>` : ''}</div>
        <div class="ach-card-desc">${a.desc}</div>
      </div>
    `;
    list.appendChild(card);
  });
}

/* ============================================================
   RENDER: SETTINGS
   ============================================================ */
function renderSettings() {
  document.getElementById('setting-sound').checked = state.settings.sound;
  document.getElementById('setting-haptics').checked = state.settings.haptics;
  document.getElementById('setting-skeleton').checked = state.settings.skeleton;
  document.getElementById('setting-weight').value = state.settings.weight;
}
document.getElementById('setting-sound').addEventListener('change', e => { state.settings.sound = e.target.checked; saveState(); });
document.getElementById('setting-haptics').addEventListener('change', e => { state.settings.haptics = e.target.checked; if (e.target.checked) vibrate(30); saveState(); });
document.getElementById('setting-skeleton').addEventListener('change', e => { state.settings.skeleton = e.target.checked; saveState(); });
document.getElementById('setting-weight').addEventListener('change', e => {
  let w = parseInt(e.target.value, 10);
  if (isNaN(w) || w < 30) w = 30; if (w > 200) w = 200;
  state.settings.weight = w; e.target.value = w; saveState();
});
document.getElementById('btn-export-data').addEventListener('click', () => {
  Audio_.click();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'fitarena-save.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast('Save data exported', '💾');
});
document.getElementById('btn-reset-data').addEventListener('click', () => {
  Audio_.warn();
  if (confirm('This will permanently erase all FitArena progress on this device. Continue?')) {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    document.body.dataset.theme = 'default';
    saveState();
    showToast('Progress reset', '🔄');
    showPage('home');
  }
});

/* ============================================================
   DAILY LOGIN REWARD
   ============================================================ */
function checkDailyLogin() {
  const today = todayStr();
  if (state.lastLoginDate === today) return;

  if (state.lastLoginDate) {
    const diff = daysBetween(state.lastLoginDate, today);
    state.loginStreak = diff === 1 ? state.loginStreak + 1 : 1;
  } else {
    state.loginStreak = 1;
  }
  state.lastLoginDate = today;
  saveState();

  const cycleDay = (state.loginStreak - 1) % 7;
  document.getElementById('login-streak-text').textContent = `Day ${state.loginStreak} streak`;
  const rewardsWrap = document.getElementById('login-rewards');
  rewardsWrap.innerHTML = '';
  LOGIN_REWARDS.forEach((r, i) => {
    const el = document.createElement('div');
    el.className = 'login-reward-item' + (i === cycleDay ? ' today' : '');
    el.innerHTML = `<div>${r.icon}</div><span>D${i + 1}</span>`;
    rewardsWrap.appendChild(el);
  });

  const overlay = document.getElementById('login-overlay');
  overlay.classList.add('active', 'center-active');

  document.getElementById('btn-claim-login').onclick = () => {
    const reward = LOGIN_REWARDS[cycleDay];
    state.coins += reward.coins;
    const res = addXP(reward.xp);
    saveState();
    Audio_.coin();
    overlay.classList.remove('active', 'center-active');
    showToast(`+${reward.coins} coins, +${reward.xp} XP`, reward.icon);
    if (res.leveledUp) handleLevelUp(res);
    renderHome();
  };
}

/* ============================================================
   ACHIEVEMENTS CHECK
   ============================================================ */
function checkAchievements() {
  const unlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (!state.achievements[a.id] && a.check(state)) {
      state.achievements[a.id] = true;
      state.coins += a.coins;
      addXP(a.xp);
      unlocked.push(a);
    }
  });
  return unlocked;
}
