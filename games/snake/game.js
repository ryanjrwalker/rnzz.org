const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const GRID = 26;
const COLS = Math.floor(canvas.width / GRID);
const ROWS = Math.floor(canvas.height / GRID);

let snake, dir, food, score, speed, paused, over;

function randCell(){
  return { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
}

function reset(){
  snake = [{x: Math.floor(COLS/2), y: Math.floor(ROWS/2)}];
  dir = {x: 1, y: 0};
  food = randCell();
  score = 0;
  speed = 10; // ticks/sec
  paused = false;
  over = false;
}
reset();

document.getElementById("restartBtn").addEventListener("click", reset);

const keys = new Set();
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);

  if (e.key === " "){
    paused = !paused;
    e.preventDefault();
  }

  // prevent arrow scroll
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function setDir(nx, ny){
  // disallow direct reversal
  if (snake.length > 1 && dir.x === -nx && dir.y === -ny) return;
  dir = {x:nx, y:ny};
}

function input(){
  if (keys.has("arrowup") || keys.has("w")) setDir(0,-1);
  else if (keys.has("arrowdown") || keys.has("s")) setDir(0,1);
  else if (keys.has("arrowleft") || keys.has("a")) setDir(-1,0);
  else if (keys.has("arrowright") || keys.has("d")) setDir(1,0);
}

function cellEq(a,b){ return a.x===b.x && a.y===b.y; }

function respawnFood(){
  let f;
  do { f = randCell(); }
  while (snake.some(s => cellEq(s,f)));
  food = f;
}

function step(){
  if (paused || over) return;

  input();

  const head = snake[0];
  const next = { x: head.x + dir.x, y: head.y + dir.y };

  // walls
  if (next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS){
    over = true; return;
  }
  // self
  if (snake.some(s => cellEq(s,next))){
    over = true; return;
  }

  snake.unshift(next);

  if (cellEq(next, food)){
    score++;
    if (score % 5 === 0) speed = Math.min(18, speed + 1);
    respawnFood();
  } else {
    snake.pop();
  }
}

function draw(){
  // background
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "rgba(2,6,23,0.75)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // grid glow
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = "#ffffff";
  for (let x=0;x<=COLS;x++){
    ctx.beginPath();
    ctx.moveTo(x*GRID,0);
    ctx.lineTo(x*GRID,canvas.height);
    ctx.stroke();
  }
  for (let y=0;y<=ROWS;y++){
    ctx.beginPath();
    ctx.moveTo(0,y*GRID);
    ctx.lineTo(canvas.width,y*GRID);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // food
  ctx.fillStyle = "rgba(0,229,255,0.9)";
  ctx.shadowColor = "rgba(0,229,255,0.8)";
  ctx.shadowBlur = 18;
  ctx.fillRect(food.x*GRID+4, food.y*GRID+4, GRID-8, GRID-8);

  // snake
  ctx.shadowColor = "rgba(124,58,237,0.8)";
  ctx.shadowBlur = 14;
  snake.forEach((p, i) => {
    const inset = i===0 ? 3 : 5;
    ctx.fillStyle = i===0 ? "rgba(124,58,237,0.95)" : "rgba(124,58,237,0.7)";
    ctx.fillRect(p.x*GRID+inset, p.y*GRID+inset, GRID-inset*2, GRID-inset*2);
  });

  // HUD
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(229,231,235,0.95)";
  ctx.font = "bold 18px system-ui";
  ctx.fillText(`Score: ${score}`, 16, 26);

  ctx.fillStyle = "rgba(148,163,184,0.95)";
  ctx.font = "14px system-ui";
  ctx.fillText(`Speed: ${speed}`, 16, 46);

  if (paused){
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "rgba(229,231,235,0.95)";
    ctx.font = "bold 44px system-ui";
    ctx.fillText("PAUSED", canvas.width/2 - 98, canvas.height/2);
  }

  if (over){
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "rgba(229,231,235,0.95)";
    ctx.font = "bold 44px system-ui";
    ctx.fillText("GAME OVER", canvas.width/2 - 155, canvas.height/2 - 10);
    ctx.font = "18px system-ui";
    ctx.fillStyle = "rgba(148,163,184,0.95)";
    ctx.fillText("Press Restart to play again", canvas.width/2 - 122, canvas.height/2 + 28);
  }
}

let last = 0;
function loop(ts){
  const dt = (ts - last) / 1000;
  last = ts;

  // fixed-step based on speed
  loop.acc = (loop.acc || 0) + dt;
  const stepTime = 1 / speed;
  while (loop.acc > stepTime){
    step();
    loop.acc -= stepTime;
  }

  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
