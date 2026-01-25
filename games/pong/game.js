const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let keys = new Set();
window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if (["arrowup","arrowdown"].includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

const W = canvas.width, H = canvas.height;

let player, ai, ball, score, over;

function reset(){
  player = { x: 24, y: H/2 - 60, w: 14, h: 120, vy: 0 };
  ai     = { x: W-38, y: H/2 - 60, w: 14, h: 120, vy: 0 };
  ball   = { x: W/2, y: H/2, r: 9, vx: (Math.random()>.5?1:-1)*380, vy: (Math.random()-.5)*240 };
  score  = { p: 0, a: 0 };
  over = false;
}
reset();

document.getElementById("restartBtn").addEventListener("click", reset);

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function step(dt){
  if (over) return;

  // player input
  const up = keys.has("w") || keys.has("arrowup");
  const down = keys.has("s") || keys.has("arrowdown");
  player.vy = (down ? 520 : 0) + (up ? -520 : 0);
  player.y = clamp(player.y + player.vy * dt, 10, H - player.h - 10);

  // AI tracks ball with smoothing
  const target = ball.y - ai.h/2;
  const diff = target - ai.y;
  ai.vy = clamp(diff * 6, -460, 460);
  ai.y = clamp(ai.y + ai.vy * dt, 10, H - ai.h - 10);

  // move ball
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // top/bottom bounce
  if (ball.y - ball.r < 10){ ball.y = 10 + ball.r; ball.vy *= -1; }
  if (ball.y + ball.r > H - 10){ ball.y = H - 10 - ball.r; ball.vy *= -1; }

  // paddle collisions
  function hit(p){
    const inX = ball.x + ball.r > p.x && ball.x - ball.r < p.x + p.w;
    const inY = ball.y + ball.r > p.y && ball.y - ball.r < p.y + p.h;
    return inX && inY;
  }

  if (hit(player) && ball.vx < 0){
    ball.x = player.x + player.w + ball.r;
    ball.vx *= -1.05;
    const offset = (ball.y - (player.y + player.h/2)) / (player.h/2);
    ball.vy += offset * 220;
  }

  if (hit(ai) && ball.vx > 0){
    ball.x = ai.x - ball.r;
    ball.vx *= -1.05;
    const offset = (ball.y - (ai.y + ai.h/2)) / (ai.h/2);
    ball.vy += offset * 220;
  }

  // scoring
  if (ball.x < -40){
    score.a++;
    ball = { x: W/2, y: H/2, r: 9, vx: 380, vy: (Math.random()-.5)*240 };
  }
  if (ball.x > W + 40){
    score.p++;
    ball = { x: W/2, y: H/2, r: 9, vx: -380, vy: (Math.random()-.5)*240 };
  }

  if (score.p >= 7 || score.a >= 7) over = true;
}

function draw(){
  ctx.clearRect(0,0,W,H);

  // background
  ctx.fillStyle = "rgba(2,6,23,0.75)";
  ctx.fillRect(0,0,W,H);

  // center dashed line
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#ffffff";
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(W/2, 12);
  ctx.lineTo(W/2, H-12);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // paddles glow
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(0,229,255,0.7)";
  ctx.fillStyle = "rgba(0,229,255,0.9)";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.shadowColor = "rgba(124,58,237,0.7)";
  ctx.fillStyle = "rgba(124,58,237,0.9)";
  ctx.fillRect(ai.x, ai.y, ai.w, ai.h);

  // ball
  ctx.shadowBlur = 16;
  ctx.shadowColor = "rgba(229,231,235,0.65)";
  ctx.fillStyle = "rgba(229,231,235,0.95)";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // score
  ctx.fillStyle = "rgba(229,231,235,0.95)";
  ctx.font = "bold 42px system-ui";
  ctx.fillText(score.p, W/2 - 80, 60);
  ctx.fillText(score.a, W/2 + 54, 60);

  if (over){
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "rgba(229,231,235,0.95)";
    ctx.font = "bold 44px system-ui";
    const win = score.p > score.a ? "YOU WIN" : "YOU LOSE";
    ctx.fillText(win, W/2 - 95, H/2);
    ctx.font = "18px system-ui";
    ctx.fillStyle = "rgba(148,163,184,0.95)";
    ctx.fillText("Press Restart to play again", W/2 - 122, H/2 + 34);
  }
}

let last = 0;
function loop(ts){
  const dt = (ts - last) / 1000;
  last = ts;

  // cap dt to avoid huge jumps on tab switch
  step(Math.min(dt, 0.02));
  draw();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
