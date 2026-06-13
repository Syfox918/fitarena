/* ============================================================
   FitArena — engine.js
   Pose detection (MediaPipe), workout engine, game-mode logic,
   results screen, app initialization.
   ============================================================ */
'use strict';

/* ============================================================
   POSE / REP-DETECTION TUNING
   ============================================================ */
const LM = {
  LSHO: 11, RSHO: 12, LELB: 13, RELB: 14, LWRI: 15, RWRI: 16,
  LHIP: 23, RHIP: 24, LKNE: 25, RKNE: 26, LANK: 27, RANK: 28,
};
const VIS_THRESH = 0.5;
const DOWN_THRESH = 100;            // elbow angle below this = entering "down"
const DEEP_THRESH = 95;             // must dip below this to count as valid depth
const UP_THRESH = 150;              // elbow angle above this = "up" / arms extended
const BODY_STRAIGHT_THRESH = 150;   // shoulder-hip-ankle angle for straight body

function angleDeg(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y), mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 180;
  let cos = dot / (mag1 * mag2);
  cos = Math.min(1, Math.max(-1, cos));
  return Math.acos(cos) * (180 / Math.PI);
}
function avgAngleSide(landmarks, A, B, C) {
  const a = landmarks[A], b = landmarks[B], c = landmarks[C];
  if (!a || !b || !c) return null;
  if ((a.visibility ?? 1) < VIS_THRESH || (b.visibility ?? 1) < VIS_THRESH || (c.visibility ?? 1) < VIS_THRESH) return null;
  return angleDeg(a, b, c);
}

/* ============================================================
   WORKOUT STATE
   ============================================================ */
const Workout = {
  config: null,
  active: false,
  paused: false,
  reps: 0,
  goodReps: 0,
  startTime: 0,
  elapsed: 0,
  combo: 1,
  comboStreak: 0,
  bossHp: 0,
  bossMaxHp: 0,
  timeLeft: 0,
  timerInterval: null,
  repState: 'up',
  minAngle: undefined,
  bodyOkDuringDown: true,
  lastFeedback: '',
  camera: null,
  pose: null,
  _stream: null,
  _xpAccum: 0,
  _pausedTotal: 0,
  _pauseStarted: 0,
};
Workout.pausedAccum = function () { return Workout._pausedTotal / 1000; };

function caloriesPerRep() {
  // ~8 MET, ~3s per rep -> kcal = MET * weight(kg) * (hours)
  return 8 * state.settings.weight * (3 / 3600);
}

function pillHtml(id, val, label, warn) {
  return `<div class="hud-pill ${warn ? 'warn' : ''}" id="${id}"><span class="hud-pill-val">${val}</span><span class="hud-pill-label">${label}</span></div>`;
}

/* ============================================================
   START WORKOUT
   ============================================================ */
async function startWorkout(config) {
  Workout.config = config;
  Workout.active = true;
  Workout.paused = false;
  Workout.reps = 0;
  Workout.goodReps = 0;
  Workout.combo = 1;
  Workout.comboStreak = 0;
  Workout.elapsed = 0;
  Workout.repState = 'up';
  Workout.minAngle = undefined;
  Workout.bodyOkDuringDown = true;
  Workout.lastFeedback = '';
  Workout._xpAccum = 0;
  Workout._pausedTotal = 0;
  Audio_.unlock();

  const modeLabel = document.getElementById('workout-mode-label');
  const hudLeft = document.getElementById('hud-left');
  const hudRight = document.getElementById('hud-right');
  const bossWrap = document.getElementById('boss-bar-wrap');
  bossWrap.hidden = true;
  hudLeft.innerHTML = ''; hudRight.innerHTML = '';
  document.getElementById('combo-badge').hidden = true;
  document.getElementById('rep-counter').textContent = '0';
  document.getElementById('wb-time').textContent = '00:00';
  document.getElementById('wb-calories').textContent = '0';
  document.getElementById('wb-xp').textContent = '0';
  document.getElementById('xp-floaters').innerHTML = '';

  switch (config.type) {
    case 'classic':
      modeLabel.textContent = 'Classic Mode';
      hudLeft.innerHTML = pillHtml('elapsed-pill', '00:00', 'Time');
      break;
    case 'timeattack':
      modeLabel.textContent = config.isDaily ? 'Daily · Time Attack' : 'Time Attack';
      Workout.timeLeft = config.duration;
      hudLeft.innerHTML = pillHtml('timeleft-pill', formatTime(Workout.timeLeft), 'Left');
      break;
    case 'challenge':
      modeLabel.textContent = config.isDaily ? 'Daily Challenge' : 'Challenge';
      hudLeft.innerHTML = pillHtml('elapsed-pill', '00:00', 'Time');
      hudRight.innerHTML = pillHtml('target-pill', config.target, 'Target');
      break;
    case 'survival':
      modeLabel.textContent = config.isDaily ? 'Daily · Survival' : 'Survival';
      Workout.timeLeft = config.startTime;
      hudLeft.innerHTML = pillHtml('timeleft-pill', formatTime(Workout.timeLeft), 'Survive', true);
      break;
    case 'endurance':
      modeLabel.textContent = 'Endurance';
      hudLeft.innerHTML = pillHtml('elapsed-pill', '00:00', 'Time');
      break;
    case 'boss': {
      const boss = BOSSES[config.bossIdx];
      modeLabel.textContent = 'Boss Battle';
      Workout.timeLeft = config.time;
      Workout.bossHp = config.hp;
      Workout.bossMaxHp = config.hp;
      hudLeft.innerHTML = pillHtml('timeleft-pill', formatTime(Workout.timeLeft), 'Time', true);
      bossWrap.hidden = false;
      document.getElementById('boss-emoji').textContent = boss.emoji;
      document.getElementById('boss-name').textContent = boss.name;
      document.getElementById('boss-hp-fill').style.width = '100%';
      break;
    }
  }

  setFeedback('Get in frame, start your plank', 'neutral');
  showPage('workout');
  document.getElementById('pause-overlay').hidden = true;

  await ensureCamera();

  Workout.startTime = performance.now();
  Workout.timerInterval = setInterval(workoutTick, 1000);
}

/* ============================================================
   TICK / TIMERS
   ============================================================ */
function workoutTick() {
  if (!Workout.active || Workout.paused) return;
  Workout.elapsed = (performance.now() - Workout.startTime) / 1000 - Workout.pausedAccum();

  document.getElementById('wb-time').textContent = formatTime(Workout.elapsed);
  document.getElementById('wb-calories').textContent = Math.round(Workout.goodReps * caloriesPerRep());

  const cfg = Workout.config;

  if (cfg.type === 'classic' || cfg.type === 'endurance' || cfg.type === 'challenge') {
    const el = document.getElementById('elapsed-pill');
    if (el) el.querySelector('.hud-pill-val').textContent = formatTime(Workout.elapsed);
    if (cfg.type === 'challenge' && Workout.elapsed >= cfg.time) endWorkout('timeup');
  }

  if (cfg.type === 'timeattack') {
    Workout.timeLeft = Math.max(0, cfg.duration - Workout.elapsed);
    const el = document.getElementById('timeleft-pill');
    if (el) el.querySelector('.hud-pill-val').textContent = formatTime(Workout.timeLeft);
    if (Workout.timeLeft <= 0) endWorkout('timeup');
    else if (Workout.timeLeft <= 5) Audio_.countdown();
  }

  if (cfg.type === 'survival') {
    Workout.timeLeft -= 1;
    const el = document.getElementById('timeleft-pill');
    if (el) el.querySelector('.hud-pill-val').textContent = formatTime(Workout.timeLeft);
    if (Workout.timeLeft <= 0) endWorkout('timeup');
    else if (Workout.timeLeft <= 5) Audio_.countdown();
  }

  if (cfg.type === 'boss') {
    Workout.timeLeft -= 1;
    const el = document.getElementById('timeleft-pill');
    if (el) el.querySelector('.hud-pill-val').textContent = formatTime(Workout.timeLeft);
    if (Workout.timeLeft <= 0) endWorkout('timeup');
    else if (Workout.timeLeft <= 5) Audio_.countdown();
  }
}

/* ============================================================
   CAMERA + MEDIAPIPE POSE
   ============================================================ */
async function ensureCamera() {
  const overlay = document.getElementById('camera-overlay');
  const err = document.getElementById('camera-err');
  err.textContent = '';

  if (Workout.pose) { overlay.hidden = true; return; }

  document.getElementById('btn-enable-camera').onclick = async () => {
    try {
      await initPose();
      overlay.hidden = true;
    } catch (e) {
      console.error(e);
      const name = e && e.name ? e.name : 'Error';
      if (name === 'NotAllowedError') err.textContent = 'Kamera izni reddedildi. Tarayıcı ayarlarından bu site için kameraya izin ver.';
      else if (name === 'NotReadableError') err.textContent = 'Kamera başka bir uygulama tarafından kullanılıyor olabilir. Diğer sekmeleri/uygulamaları kapatıp tekrar deneyin.';
      else if (name === 'NotFoundError') err.textContent = 'Cihazda kamera bulunamadı.';
      else err.textContent = `Kamera hatası: ${name}. Lütfen tekrar deneyin.`;
    }
  };

  try {
    await initPose();
    overlay.hidden = true;
  } catch (e) {
    overlay.hidden = false;
  }
}

async function initPose() {
  if (Workout.pose) return;

  const video = document.getElementById('cam-video');
  let stream = null;
  let lastErr = null;

  // Try a series of progressively looser constraints so we work on as many
  // devices/browsers as possible.
  const attempts = [
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
    { video: { facingMode: 'environment' }, audio: false },
    { video: { facingMode: 'user' }, audio: false },
    { video: true, audio: false },
  ];

  for (const constraints of attempts) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!stream) throw lastErr || new Error('No camera available');

  video.srcObject = stream;
  Workout._stream = stream;
  await video.play();

  const canvas = document.getElementById('cam-canvas');
  const ctx = canvas.getContext('2d');

  const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
  pose.onResults((results) => onPoseResults(results, ctx, canvas));
  Workout.pose = pose;

  const camera = new Camera(video, {
    onFrame: async () => {
      if (Workout.active && !Workout.paused && Workout.pose) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        await Workout.pose.send({ image: video });
      }
    },
    width: 640,
    height: 480,
  });
  camera.start();
  Workout.camera = camera;
}

function stopCamera() {
  if (Workout._stream) {
    Workout._stream.getTracks().forEach(t => t.stop());
    Workout._stream = null;
  }
  if (Workout.camera) {
    try { Workout.camera.stop(); } catch (e) {}
    Workout.camera = null;
  }
  Workout.pose = null;
  const canvas = document.getElementById('cam-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* ============================================================
   POSE RESULTS -> REP STATE MACHINE
   ============================================================ */
function onPoseResults(results, ctx, canvas) {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.settings.skeleton && results.poseLandmarks) {
    try {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00E6A0', lineWidth: 3 });
      drawLandmarks(ctx, results.poseLandmarks, { color: '#7C5CFF', lineWidth: 1, radius: 3 });
    } catch (e) { /* drawing utils may not be ready yet */ }
  }
  ctx.restore();

  if (!Workout.active || Workout.paused) return;
  if (!results.poseLandmarks) { setFeedback('Move into frame — full body needs to be visible', 'warn'); return; }

  const lm = results.poseLandmarks;

  const elbowL = avgAngleSide(lm, LM.LSHO, LM.LELB, LM.LWRI);
  const elbowR = avgAngleSide(lm, LM.RSHO, LM.RELB, LM.RWRI);
  const elbowAngles = [elbowL, elbowR].filter(a => a !== null);
  if (elbowAngles.length === 0) { setFeedback('Position your arms in view', 'warn'); return; }
  const elbowAngle = elbowAngles.reduce((s, v) => s + v, 0) / elbowAngles.length;

  const bodyL = avgAngleSide(lm, LM.LSHO, LM.LHIP, LM.LANK);
  const bodyR = avgAngleSide(lm, LM.RSHO, LM.RHIP, LM.RANK);
  const bodyAngles = [bodyL, bodyR].filter(a => a !== null);
  const bodyAngle = bodyAngles.length ? bodyAngles.reduce((s, v) => s + v, 0) / bodyAngles.length : 180;
  const bodyOk = bodyAngle >= BODY_STRAIGHT_THRESH;

  processRepStateMachine(elbowAngle, bodyOk);
}

function processRepStateMachine(elbowAngle, bodyOk) {
  const w = Workout;

  if (w.repState === 'up') {
    if (elbowAngle < DOWN_THRESH) {
      w.repState = 'down';
      w.minAngle = elbowAngle;
      w.bodyOkDuringDown = bodyOk;
    } else {
      if (!bodyOk) setFeedback('Keep your body straight — engage your core', 'warn');
      else if (elbowAngle < UP_THRESH && w.reps > 0) setFeedback('Extend your arms fully at the top', 'warn');
      else setFeedback('Good form! Lower into your next rep', 'good');
    }
  } else { // down
    w.minAngle = Math.min(w.minAngle ?? elbowAngle, elbowAngle);
    if (!bodyOk) w.bodyOkDuringDown = false;

    if (elbowAngle > UP_THRESH) {
      w.repState = 'up';
      const deepEnough = w.minAngle <= DEEP_THRESH;
      const formOk = deepEnough && w.bodyOkDuringDown;
      if (formOk) {
        countRep(true);
        setFeedback('Perfect rep! 🔥', 'good');
      } else if (!deepEnough) {
        setFeedback('Go lower next time — chest closer to the ground', 'warn');
        countRep(false);
        breakCombo();
      } else {
        setFeedback('Keep your body straight throughout the rep', 'warn');
        countRep(false);
        breakCombo();
      }
      w.minAngle = undefined;
    } else {
      if (w.minAngle > DOWN_THRESH + 5) setFeedback('Go lower', 'warn');
      else if (!bodyOk) setFeedback('Keep your body straight', 'warn');
      else setFeedback('Now push back up', 'good');
    }
  }
}

function setFeedback(text, kind) {
  if (Workout.lastFeedback === text) return;
  Workout.lastFeedback = text;
  const el = document.getElementById('feedback-banner');
  document.getElementById('feedback-text').textContent = text;
  el.classList.remove('good', 'warn');
  if (kind === 'good') el.classList.add('good');
  if (kind === 'warn') el.classList.add('warn');
}

function breakCombo() {
  Workout.comboStreak = 0;
  if (Workout.combo > 1) {
    Workout.combo = 1;
    document.getElementById('combo-badge').hidden = true;
  }
}

/* ============================================================
   REP COUNTING
   ============================================================ */
function countRep(good) {
  const w = Workout;
  w.reps += 1;

  if (good) {
    w.goodReps += 1;
    w.comboStreak += 1;
    if (w.comboStreak >= 10) w.combo = 3;
    else if (w.comboStreak >= 6) w.combo = 2;
    else if (w.comboStreak >= 3) w.combo = 1.5;
    else w.combo = 1;

    if (w.combo > 1) {
      const badge = document.getElementById('combo-badge');
      badge.hidden = false;
      document.getElementById('combo-mult').textContent = `x${w.combo}`;
      badge.style.animation = 'none';
      requestAnimationFrame(() => { badge.style.animation = 'comboPop .35s ease'; });
      if ([3, 6, 10].includes(w.comboStreak)) Audio_.combo();
    }
  }

  const counter = document.getElementById('rep-counter');
  counter.textContent = w.goodReps;
  counter.classList.remove('bump');
  requestAnimationFrame(() => counter.classList.add('bump'));
  setTimeout(() => counter.classList.remove('bump'), 160);

  Audio_[good ? 'repGood' : 'rep']();
  vibrate(good ? 25 : 15);

  if (good) {
    const xpGain = Math.round(10 * w.combo);
    floatXP(`+${xpGain}`);
    w._xpAccum += xpGain;
    document.getElementById('wb-xp').textContent = w._xpAccum;
  }
  document.getElementById('wb-calories').textContent = Math.round(w.goodReps * caloriesPerRep());

  const cfg = w.config;
  if (cfg.type === 'challenge') {
    const el = document.getElementById('target-pill');
    const remaining = Math.max(0, cfg.target - w.goodReps);
    if (el) el.querySelector('.hud-pill-val').textContent = remaining;
    if (w.goodReps >= cfg.target) endWorkout('complete');
  }
  if (cfg.type === 'survival' && good) {
    w.timeLeft += cfg.perRep;
    const el = document.getElementById('timeleft-pill');
    if (el) el.querySelector('.hud-pill-val').textContent = formatTime(w.timeLeft);
  }
  if (cfg.type === 'boss' && good) {
    w.bossHp = Math.max(0, w.bossHp - 1);
    document.getElementById('boss-hp-fill').style.width = `${(w.bossHp / w.bossMaxHp) * 100}%`;
    Audio_.bossHit();
    vibrate(40);
    if (w.bossHp <= 0) endWorkout('bossdefeated');
  }
  if (cfg.type === 'endurance' && good && w.goodReps % 25 === 0) {
    showToast(`${w.goodReps} reps! Keep going 💪`, '🏃');
  }
}

function floatXP(text) {
  const wrap = document.getElementById('xp-floaters');
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = text;
  el.style.left = `${30 + Math.random() * 40}%`;
  el.style.top = `${40 + Math.random() * 10}%`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/* ============================================================
   PAUSE / RESUME / EXIT
   ============================================================ */
document.getElementById('btn-pause-workout').addEventListener('click', () => {
  if (!Workout.active) return;
  Audio_.click();
  Workout.paused = true;
  Workout._pauseStarted = performance.now();
  document.getElementById('pause-overlay').hidden = false;
});
document.getElementById('btn-resume-workout').addEventListener('click', () => {
  Audio_.click();
  Workout._pausedTotal += performance.now() - Workout._pauseStarted;
  Workout.paused = false;
  document.getElementById('pause-overlay').hidden = true;
});
document.getElementById('btn-quit-workout').addEventListener('click', () => {
  Audio_.click();
  document.getElementById('pause-overlay').hidden = true;
  endWorkout('quit');
});
document.getElementById('btn-exit-workout').addEventListener('click', () => {
  Audio_.click();
  if (!Workout.active) { showPage('home'); return; }
  if (Workout.goodReps > 0) {
    Workout.paused = true;
    Workout._pauseStarted = performance.now();
    document.getElementById('pause-overlay').hidden = false;
  } else {
    endWorkout('quit');
  }
});

/* ============================================================
   END WORKOUT
   ============================================================ */
function endWorkout(reason) {
  if (!Workout.active) return;
  Workout.active = false;
  clearInterval(Workout.timerInterval);
  stopCamera();

  const w = Workout;
  const today = todayStr();
  ensurePeriodResets();
  const durationSec = Math.round(w.elapsed);
  const calories = w.goodReps * caloriesPerRep();
  const repXP = w._xpAccum || 0;

  let bonusXP = 0, bonusCoins = 0;
  if (reason === 'complete') { bonusXP += 50; bonusCoins += 25; }
  if (reason === 'bossdefeated') {
    const boss = BOSSES[w.config.bossIdx];
    bonusXP += boss.xp; bonusCoins += boss.coins;
    if (w.config.bossIdx > state.bossProgress) state.bossProgress = w.config.bossIdx;
    Audio_.victory();
  }

  // Streak
  if (w.goodReps > 0 && state.lastWorkoutDate !== today) {
    if (state.lastWorkoutDate) {
      const diff = daysBetween(state.lastWorkoutDate, today);
      state.currentStreak = diff === 1 ? state.currentStreak + 1 : 1;
    } else {
      state.currentStreak = 1;
    }
    state.lastWorkoutDate = today;
    if (state.currentStreak > state.longestStreak) state.longestStreak = state.currentStreak;
  }

  // Counters
  state.totalPushups += w.goodReps;
  state.daily.count += w.goodReps;
  state.weekly.count += w.goodReps;
  state.monthly.count += w.goodReps;
  state.activity[today] = (state.activity[today] || 0) + w.goodReps;
  state.totalCalories += calories;
  if (w.goodReps > state.bestSession) state.bestSession = w.goodReps;
  if (w.reps === w.goodReps && w.goodReps > state.bestPerfectSession) state.bestPerfectSession = w.goodReps;

  // Daily challenge completion
  if (w.config.isDaily) {
    let success = false;
    if (w.config.type === 'challenge') success = w.goodReps >= w.config.target;
    else if (w.config.type === 'survival') success = w.goodReps >= 10;
    else if (w.config.type === 'timeattack') success = w.goodReps >= 10;
    if (success) {
      state.dailyChallenge.completed = true;
      bonusXP += 100; bonusCoins += 50;
    }
  }

  const totalXP = repXP + bonusXP;
  state.coins += bonusCoins;
  const xpRes = addXP(totalXP);

  state.history.push({ date: today, mode: w.config.type, reps: w.goodReps, duration: durationSec, calories, xp: totalXP });

  const newAchievements = checkAchievements();
  saveState();

  renderResults({ reason, totalXP, bonusCoins, xpRes, newAchievements });
  showPage('results');
}

/* ============================================================
   RESULTS SCREEN
   ============================================================ */
function renderResults({ reason, totalXP, bonusCoins, xpRes, newAchievements }) {
  const w = Workout;

  document.getElementById('results-count').textContent = w.goodReps;

  let title, sub;
  switch (reason) {
    case 'quit':
      title = 'Workout Ended'; sub = 'Every rep counts — nice work.'; break;
    case 'timeup':
      title = "Time's Up!";
      sub = w.config.type === 'survival' ? 'You survived the gauntlet.' : (w.config.type === 'boss' ? 'The boss escaped this time.' : 'Great hustle!');
      break;
    case 'complete':
      title = 'Challenge Complete!'; sub = 'Target smashed 🎯'; break;
    case 'bossdefeated':
      title = 'Boss Defeated!'; sub = `${BOSSES[w.config.bossIdx].name} has fallen.`; break;
    default:
      title = 'Workout Complete!'; sub = 'Great effort, soldier.';
  }
  document.getElementById('results-title').textContent = title;
  document.getElementById('results-sub').textContent = sub;
  document.getElementById('results-time').textContent = formatTime(w.elapsed);
  document.getElementById('results-cal').textContent = Math.round(w.goodReps * caloriesPerRep());
  document.getElementById('results-xp').textContent = `+${totalXP}`;
  document.getElementById('results-coins').textContent = `+${bonusCoins}`;

  const levelupEl = document.getElementById('results-levelup');
  if (xpRes.leveledUp) {
    levelupEl.hidden = false;
    document.getElementById('results-newlevel').textContent = xpRes.newLevel;
    Audio_.levelUp(); vibrate([60, 40, 60, 40, 120]);
  } else levelupEl.hidden = true;

  const rankupEl = document.getElementById('results-rankup');
  if (xpRes.rankedUp) {
    rankupEl.hidden = false;
    document.getElementById('results-newrank').textContent = xpRes.newRank;
  } else rankupEl.hidden = true;

  const achWrap = document.getElementById('results-achievements');
  achWrap.innerHTML = '';
  newAchievements.forEach(a => {
    Audio_.achievement();
    const row = document.createElement('div');
    row.className = 'ach-toast-row';
    row.innerHTML = `<span class="ach-icon">${a.icon}</span><div><strong>${a.name}</strong><span>+${a.xp} XP · +${a.coins} coins</span></div>`;
    achWrap.appendChild(row);
  });

  const goalsWrap = document.getElementById('results-goals');
  goalsWrap.innerHTML = '';
  DAILY_GOAL_TARGETS.forEach((def, idx) => {
    goalsWrap.appendChild(renderGoalItem({
      icon: def.icon, title: `${def.target} Push-Ups`, progress: state.daily.count, target: def.target,
      reward: `+${def.xp} XP · +${def.coins} coins`, claimed: state.daily.claimed[idx], onClaim: () => claimDailyGoal(idx),
    }));
  });
}

document.getElementById('btn-results-done').addEventListener('click', () => {
  Audio_.click();
  showPage('home');
});

/* ============================================================
   APP INITIALIZATION / SPLASH
   ============================================================ */
function applyTheme() {
  document.body.dataset.theme = state.unlocked.themes.includes(state.theme) ? state.theme : 'default';
}

function initSplash() {
  const bar = document.getElementById('splash-progress');
  const status = document.getElementById('splash-status');
  const enterBtn = document.getElementById('btn-enter-app');

  const steps = [
    { pct: 20, text: 'Loading pose engine…' },
    { pct: 45, text: 'Calibrating tracking models…' },
    { pct: 70, text: 'Preparing arena…' },
    { pct: 90, text: 'Syncing your progress…' },
    { pct: 100, text: 'Ready!' },
  ];
  let i = 0;
  const interval = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(interval);
      enterBtn.hidden = false;
      setTimeout(() => { if (document.getElementById('page-splash').classList.contains('active')) enterApp(); }, 600);
      return;
    }
    bar.style.width = steps[i].pct + '%';
    status.textContent = steps[i].text;
    i++;
  }, 380);
}

function enterApp() {
  showPage('home');
  checkDailyLogin();
}
document.getElementById('btn-enter-app').addEventListener('click', () => { Audio_.click(); enterApp(); });

document.addEventListener('DOMContentLoaded', () => {
  ensurePeriodResets();
  applyTheme();
  buildBottomNavs();
  saveState();
  initSplash();
});
