// RNZZ — F1 NEON GP (single-file canvas racer)
// Pure HTML/JS. No assets. Local high score via localStorage.

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const ui = {
  speed: document.getElementById("speed"),
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  hp: document.getElementById("hp"),
  combo: document.getElementById("combo"),
  nitro: document.getElementById("nitro"),
  msg: document.getElementById("msg"),
  submsg: document.getElementById("submsg")
};

const BEST_KEY = "rnzz_f1_best";
let bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
ui.best.textContent = bestScore.toString();

const keys = new Set();
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key)) e.preventDefault();
  if (k === "enter") start();
  if (k === "r") reset();
  if (e.key === " ") togglePause();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

// Touch controls
const touchEl = document.getElementById("touch");
touchEl?.addEventListener("touchstart", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const k = btn.dataset.k;
  if (k === "nitro") keys.add("shift");
  if (k === "left") keys.add("arrowleft");
  if (k === "right") keys.add("arrowright");
  if (k === "up") keys.add("arrowup");
  if (k === "down") keys.add("arrowdown");
  e.preventDefault();
}, {passive:false});

touchEl?.addEventListener("touchend", (e) => {
  // clear all movement keys on touch end (simple)
  keys.delete("shift");
  keys.delete("arrowleft"); keys.delete("arrowright");
  keys.delete("arrowup"); keys.delete("arrowdown");
  e.preventDefault();
}, {passive:false});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);

const track = {
  cx: () => canvas.width / 2,
  w: 520,
  edgeSoft: 26, // soft shoulder before damage
  stripe: 40
};

let state;

function reset(){
  state = {
    started:false,
    paused:false,
    over:false,

    // player
    car: {
      x: track.cx(),
      y: canvas.height * 0.78,
      vx: 0,
      speed: 0,
      max: 980,
      accel: 820,
      brake: 980,
      steer: 980,
      grip: 10.5,  // higher = more grip (less drift)
      w: 22,
      h: 44,
      hp: 100
    },

    // world
    t: 0,
    roadScroll: 0,

    // scoring
    score: 0,
    combo: 1,
    cleanTimer: 0, // time since last hit/off-track
    distance: 0,

    // nitro
    nitro: {
      active:false,
      fuel: 1.0,      // drains when active
      cooldown: 0     // seconds
    },

    // AI traffic
    traffic: [],
    spawnTimer: 0,
    difficulty: 0,

    // visuals
    shake: 0
  };

  ui.msg.textContent = "Press Enter to Start";
  ui.submsg.textContent = "Avoid traffic • Stay on track • Build combos";
  syncUI();
}

function start(){
  if (state.over) return;
  state.started = true;
  ui.msg.textContent = "";
  ui.submsg.textContent = "R to restart • Space to pause • Shift for nitro";
}

function togglePause(){
  if (!state.started || state.over) return;
  state.paused = !state.paused;
  ui.msg.textContent = state.paused ? "PAUSED" : "";
  ui.submsg.textContent = state.paused ? "Press Space to resume" : "R to restart • Space to pause • Shift for nitro";
}

function endGame(){
  state.over = true;
  state.started = false;
  ui.msg.textContent = "RACE OVER";
  ui.submsg.textContent = "Press R to restart";
  if (state.score > bestScore){
    bestScore = state.score|0;
    localStorage.setItem(BEST_KEY, String(bestScore));
    ui.best.textContent = bestScore.toString();
  }
}

function spawnTraffic(){
  // spawn ahead of player, within track
  const laneCount = 3;
  const laneW = track.w / laneCount;
  const lane = Math.floor(rnd(0, laneCount));
  const x = track.cx() - track.w/2 + laneW*(lane+0.5) + rnd(-18, 18);
  const base = 260 + state.difficulty * 120;
  const speed = rnd(base, base + 180); // relative to world scroll
  const colorShift = Math.random() < 0.5;

  state.traffic.push({
    x,
    y: -80,
    w: 22,
    h: 42,
    speed,
    hue: colorShift ? "cyan" : "violet",
    passed:false
  });
}

function rectHit(a, b){
  return (
    a.x - a.w < b.x + b.w &&
    a.x + a.w > b.x - b.w &&
    a.y - a.h < b.y + b.h &&
    a.y + a.h > b.y - b.h
  );
}

function damage(amount){
  state.car.hp = clamp(state.car.hp - amount, 0, 100);
  state.combo = 1;
  state.cleanTimer = 0;
  state.shake = Math.max(state.shake, 1);
  if (state.car.hp <= 0) endGame();
}

function offTrackPenalty(dt, distFromCenter){
  // soft shoulder: small penalty, then damage
  state.combo = 1;
  state.cleanTimer = 0;
  state.score = Math.max(0, state.score - (10 * dt));
  if (distFromCenter > (track.w/2 + track.edgeSoft)){
    damage(18 * dt);
  }
}

function update(dt){
  if (!state.started || state.paused || state.over) return;

  state.t += dt;

  // difficulty ramps up
  state.difficulty = clamp(state.t / 40, 0, 1.8);

  // input
  const left  = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const up    = keys.has("arrowup") || keys.has("w");
  const down  = keys.has("arrowdown") || keys.has("s");
  const nitroPressed = keys.has("shift");

  // nitro logic
  if (state.nitro.cooldown > 0) state.nitro.cooldown -= dt;
  if (!state.nitro.active && nitroPressed && state.nitro.cooldown <= 0 && state.nitro.fuel > 0.15){
    state.nitro.active = true;
  }
  if (state.nitro.active){
    state.nitro.fuel -= dt * 0.35;
    if (!nitroPressed || state.nitro.fuel <= 0){
      state.nitro.active = false;
      state.nitro.cooldown = 1.8;
    }
  } else {
    // regen
    state.nitro.fuel = clamp(state.nitro.fuel + dt * 0.08, 0, 1);
  }

  const nitroBoost = state.nitro.active ? 1.28 : 1.0;

  // speed physics
  const targetMax = state.car.max * nitroBoost;
  if (up) state.car.speed += state.car.accel * dt;
  else state.car.speed -= 460 * dt; // engine braking

  if (down) state.car.speed -= state.car.brake * dt;

  state.car.speed = clamp(state.car.speed, 0, targetMax);

  // steering with “drift feel”
  const steerInput = (right ? 1 : 0) - (left ? 1 : 0);
  const targetVx = steerInput * state.car.steer * (0.22 + (state.car.speed / state.car.max) * 0.78);
  state.car.vx = lerp(state.car.vx, targetVx, clamp(dt * state.car.grip, 0, 1));

  state.car.x += state.car.vx * dt;

  // road scroll
  const worldSpeed = (state.car.speed * 0.65) + 140;
  state.roadScroll += worldSpeed * dt;

  // score / distance
  state.distance += worldSpeed * dt;
  state.cleanTimer += dt;
  if (state.cleanTimer > 6) state.combo = clamp(state.combo + dt * 0.15, 1, 4);

  // base score increases with distance and combo
  state.score += (worldSpeed * 0.03) * state.combo * dt;

  // spawn traffic
  state.spawnTimer -= dt;
  const spawnRate = lerp(0.75, 0.35, clamp(state.difficulty / 1.8, 0, 1)); // seconds
  if (state.spawnTimer <= 0){
    spawnTraffic();
    state.spawnTimer = spawnRate;
  }

  // update traffic
  for (const t of state.traffic){
    t.y += (worldSpeed - t.speed) * dt;
    // award “clean pass”
    if (!t.passed && t.y > state.car.y + 60){
      t.passed = true;
      state.score += 35 * state.combo;
    }
  }
  state.traffic = state.traffic.filter(t => t.y < canvas.height + 120);

  // collisions
  const playerBox = { x: state.car.x, y: state.car.y, w: state.car.w, h: state.car.h };
  for (const t of state.traffic){
    const box = { x: t.x, y: t.y, w: t.w, h: t.h };
    if (rectHit(playerBox, box)){
      damage(28);
      // knockback
      state.car.speed = Math.max(0, state.car.speed - 260);
      t.y += 60;
    }
  }

  // track boundaries
  const distFromCenter = Math.abs(state.car.x - track.cx());
  if (distFromCenter > track.w/2 - 10){
    offTrackPenalty(dt, distFromCenter);
  } else {
    // tiny reward for staying centered
    if (distFromCenter < 120) state.score += 4 * dt * state.combo;
  }

  // end condition: hp
  if (state.car.hp <= 0) endGame();

  // camera shake decay
  state.shake = Math.max(0, state.shake - dt*2.5);

  syncUI();
}

function syncUI(){
  ui.speed.textContent = `${(state.car.speed/10)|0}`;
  ui.score.textContent = `${state.score|0}`;
  ui.hp.textContent = `${state.car.hp|0}`;
  ui.combo.textContent = `x${(state.combo*10|0)/10}`;
  ui.nitro.textContent =
    state.nitro.active ? "BOOST" :
    (state.nitro.cooldown > 0 ? `CD ${(state.nitro.cooldown*10|0)/10}s` : "READY");
}

// ----- Rendering -----
function draw(){
  // shake
  const shake = state.shake * 6;
  const sx = (Math.random()-0.5)*shake;
  const sy = (Math.random()-0.5)*shake;

  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.translate(sx, sy);

  // background
  ctx.fillStyle = "rgba(2,6,23,0.75)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // subtle speed lines
  ctx.globalAlpha = 0.12;
  for (let i=0;i<18;i++){
    const x = rnd(0, canvas.width);
    const y = ( (state.roadScroll*0.35 + i*70) % (canvas.height+120) ) - 120;
    ctx.fillStyle = Math.random()<0.5 ? "rgba(0,229,255,0.7)" : "rgba(124,58,237,0.7)";
    ctx.fillRect(x, y, 2, 60);
  }
  ctx.globalAlpha = 1;

  // track
  const cx = track.cx();
  const left = cx - track.w/2;
  const right = cx + track.w/2;

  // grass
  ctx.fillStyle = "rgba(7,10,18,0.9)";
  ctx.fillRect(0,0,left,canvas.height);
  ctx.fillRect(right,0,canvas.width-right,canvas.height);

  // asphalt
  const grad = ctx.createLinearGradient(left,0,right,0);
  grad.addColorStop(0,"rgba(11,18,36,0.9)");
  grad.addColorStop(0.5,"rgba(2,6,23,0.9)");
  grad.addColorStop(1,"rgba(11,18,36,0.9)");
  ctx.fillStyle = grad;
  ctx.fillRect(left,0,track.w,canvas.height);

  // kerbs (F1 vibe)
  const kerbW = 16;
  ctx.fillStyle = "rgba(0,229,255,0.15)";
  ctx.fillRect(left-kerbW,0,kerbW,canvas.height);
  ctx.fillRect(right,0,kerbW,canvas.height);

  // lane stripes
  const stripeH = 46;
  const stripeGap = 34;
  const offset = state.roadScroll % (stripeH + stripeGap);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "rgba(229,231,235,0.9)";
  for (let i=-1;i<20;i++){
    const y = i*(stripeH+stripeGap) - offset;
    ctx.fillRect(cx-3, y, 6, stripeH);
  }
  ctx.globalAlpha = 1;

  // draw traffic cars
  for (const t of state.traffic){
    drawCar(t.x, t.y, t.w, t.h, t.hue === "cyan" ? "cyan" : "violet", false);
  }

  // draw player car
  drawCar(state.car.x, state.car.y, state.car.w, state.car.h, "player", true);

  // overlays
  if (!state.started && !state.over){
    overlay("Press Enter to start", "Avoid traffic • Use nitro for speed • Keep it clean");
  }
  if (state.paused){
    overlay("Paused", "Press Space to resume");
  }
  if (state.over){
    overlay("Race Over", `Score: ${state.score|0} • Best: ${bestScore|0} • Press R`);
  }
}

function overlay(title, sub){
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "rgba(229,231,235,0.95)";
  ctx.font = "900 54px system-ui";
  ctx.fillText(title, canvas.width/2 - ctx.measureText(title).width/2, canvas.height/2);
  ctx.font = "16px system-ui";
  ctx.fillStyle = "rgba(148,163,184,0.95)";
  ctx.fillText(sub, canvas.width/2 - ctx.measureText(sub).width/2, canvas.height/2 + 36);
}

function drawCar(x,y,w,h,theme,isPlayer){
  // body glow
  ctx.save();
  ctx.translate(x,y);

  const speedGlow = isPlayer ? clamp(state.car.speed / 1200, 0, 1) : 0.25;
  const glow = 12 + speedGlow*18;

  if (theme === "player"){
    ctx.shadowColor = state.nitro.active ? "rgba(0,229,255,0.9)" : "rgba(124,58,237,0.8)";
    ctx.fillStyle = state.nitro.active ? "rgba(0,229,255,0.95)" : "rgba(124,58,237,0.92)";
  } else if (theme === "cyan"){
    ctx.shadowColor = "rgba(0,229,255,0.75)";
    ctx.fillStyle = "rgba(0,229,255,0.55)";
  } else {
    ctx.shadowColor = "rgba(124,58,237,0.75)";
    ctx.fillStyle = "rgba(124,58,237,0.55)";
  }

  ctx.shadowBlur = glow;
  // main chassis
  roundRect(-w, -h, w*2, h*2, 10, true);

  // cockpit
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(2,6,23,0.75)";
  roundRect(-w+6, -h+10, (w*2)-12, h*0.9, 8, true);

  // front wing
  ctx.fillStyle = "rgba(229,231,235,0.25)";
  ctx.fillRect(-w-6, -h+6, w*2+12, 6);

  // rear wing
  ctx.fillStyle = "rgba(229,231,235,0.22)";
  ctx.fillRect(-w-6, h-12, w*2+12, 7);

  // wheels
  ctx.fillStyle = "rgba(229,231,235,0.18)";
  ctx.fillRect(-w-8, -h+10, 8, 14);
  ctx.fillRect(w, -h+10, 8, 14);
  ctx.fillRect(-w-8, h-24, 8, 14);
  ctx.fillRect(w, h-24, 8, 14);

    // nitro flame
  if (isPlayer && state.nitro.active){
    ctx.fillStyle = "rgba(0,229,255,0.65)";
    ctx.shadowColor = "rgba(0,229,255,0.9)";
    ctx.shadowBlur = 20;

    // little animated flame out the back (bottom)
    const flick = 6 + Math.sin(state.t * 30) * 3 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(-w*0.55,  h + 8);
    ctx.lineTo( 0,      h + 8 + flick);
    ctx.lineTo( w*0.55, h + 8);
    ctx.closePath();
    ctx.fill();

    // inner flame
    ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(229,231,235,0.55)";
    ctx.beginPath();
    ctx.moveTo(-w*0.32, h + 6);
    ctx.lineTo( 0,      h + 6 + flick*0.75);
    ctx.lineTo( w*0.32, h + 6);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function roundRect(x, y, w, h, r, fill){
  const rr = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y,     x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x,     y + h, rr);
  ctx.arcTo(x,     y + h, x,     y,     rr);
  ctx.arcTo(x,     y,     x + w, y,     rr);
  ctx.closePath();
  if (fill) ctx.fill();
  else ctx.stroke();
}

// ---- Main loop ----
let last = performance.now();

function frame(now){
  const dt = Math.min(0.033, (now - last) / 1000); // cap dt for tab switches
  last = now;

  // update + draw
  update(dt);
  draw();

  requestAnimationFrame(frame);
}

// ---- Optional: responsive canvas sizing (keeps gameplay consistent) ----
// If you want fixed resolution, you can remove this.
function fitCanvas(){
  // keeps a nice aspect ratio on different screens
  const maxW = 1100;
  const pad = 16;
  const w = Math.min(maxW, window.innerWidth - pad*2);
  const h = Math.min(620, Math.max(480, Math.floor(w * 0.58)));

  canvas.width = Math.floor(w * devicePixelRatio);
  canvas.height = Math.floor(h * devicePixelRatio);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);

  // keep player anchored after resize
  if (state?.car){
    state.car.y = canvas.height / devicePixelRatio * 0.78;
    state.car.x = track.cx();
  }
}

// ---- Boot ----
reset();
fitCanvas();
window.addEventListener("resize", fitCanvas);
requestAnimationFrame(frame);
