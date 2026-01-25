const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const qs = new URLSearchParams(location.search);
const gameId = qs.get("g") || "aim";

const keys = new Set();
let mouse = {x: W/2, y: H/2, down:false, clicked:false};
window.addEventListener("keydown", e => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
canvas.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top) * (H / r.height);
});
canvas.addEventListener("mousedown", () => (mouse.down=true, mouse.clicked=true));
window.addEventListener("mouseup", () => (mouse.down=false));

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const irnd=(a,b)=>Math.floor(rnd(a,b));
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);

function bg(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle="rgba(2,6,23,0.85)";
  ctx.fillRect(0,0,W,H);
}
function text(s,x,y,size=18,alpha=1){
  ctx.globalAlpha=alpha;
  ctx.fillStyle="rgba(229,231,235,0.95)";
  ctx.font=`bold ${size}px system-ui`;
  ctx.fillText(s,x,y);
  ctx.globalAlpha=1;
}
function hud(g){
  text(`Score: ${g.score??0}`, 16, 26, 18);
  if (g.timeLeft!=null) text(`Time: ${Math.max(0,g.timeLeft|0)}`, 16, 48, 14, 0.9);
  if (g.lives!=null) text(`Lives: ${g.lives}`, 16, 68, 14, 0.9);
}
function centerMsg(title, sub){
  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(229,231,235,0.95)";
  ctx.font="bold 48px system-ui";
  ctx.fillText(title, W/2 - ctx.measureText(title).width/2, H/2);
  ctx.font="18px system-ui";
  ctx.fillStyle="rgba(148,163,184,0.95)";
  ctx.fillText(sub, W/2 - ctx.measureText(sub).width/2, H/2 + 34);
}

const Games = {
  // 1) Aim Trainer
  aim: {
    name:"Aim Trainer", help:"Click targets • 30s",
    init(){ return {t:{x:rnd(80,W-80), y:rnd(80,H-80), r:28}, score:0, timeLeft:30}; },
    update(g,dt){
      g.timeLeft -= dt;
      if (g.timeLeft<=0) g.over=true;
      if (mouse.clicked && dist(mouse.x,mouse.y,g.t.x,g.t.y) <= g.t.r){
        g.score++; g.t = {x:rnd(80,W-80), y:rnd(80,H-80), r: clamp(28 - g.score*0.3, 12, 28)};
      }
    },
    draw(g){
      bg(); hud(g);
      ctx.shadowBlur=18; ctx.shadowColor="rgba(0,229,255,0.8)";
      ctx.fillStyle="rgba(0,229,255,0.9)";
      ctx.beginPath(); ctx.arc(g.t.x,g.t.y,g.t.r,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      if (g.over) centerMsg("TIME!", `Final score: ${g.score}`);
    }
  },

  // 2) Reaction Time
  react: {
    name:"Reaction Time", help:"Wait for green • click ASAP",
    init(){ return {phase:"wait", timer:rnd(1.5,4.0), score:0, best:null}; },
    update(g,dt){
      if (g.phase==="wait"){ g.timer-=dt; if(g.timer<=0) {g.phase="go"; g.start=performance.now();} }
      if (g.phase==="go" && mouse.clicked){
        const ms = performance.now()-g.start;
        g.score = ms|0;
        g.best = g.best==null? g.score : Math.min(g.best,g.score);
        g.phase="done";
      }
      if (g.phase==="wait" && mouse.clicked){ g.phase="fail"; }
      if ((g.phase==="done"||g.phase==="fail") && keys.has("r")) Object.assign(g, Games.react.init());
    },
    draw(g){
      bg();
      if (g.phase==="wait"){
        ctx.fillStyle="rgba(124,58,237,0.85)"; ctx.fillRect(0,0,W,H);
        text("WAIT…", W/2-80, H/2, 56);
        text("Don’t click yet", W/2-90, H/2+36, 18, 0.9);
      } else if (g.phase==="go"){
        ctx.fillStyle="rgba(0,229,255,0.35)"; ctx.fillRect(0,0,W,H);
        text("CLICK!", W/2-85, H/2, 56);
      } else if (g.phase==="done"){
        centerMsg(`${g.score} ms`, `Best: ${g.best} ms • Press R to retry`);
      } else if (g.phase==="fail"){
        centerMsg("Too early!", "Press R to retry");
      }
    }
  },

  // 3) Click Frenzy
  click: {
    name:"Click Frenzy", help:"Click as fast as you can • 10s",
    init(){ return {score:0, timeLeft:10}; },
    update(g,dt){ g.timeLeft-=dt; if(g.timeLeft<=0) g.over=true; if(mouse.clicked && !g.over) g.score++; },
    draw(g){ bg(); hud(g); text("CLICK!", W/2-80, H/2, 72, 0.9); if(g.over) centerMsg("DONE", `Clicks: ${g.score}`); }
  },

  // 4) Dodge Blocks
  dodge: {
    name:"Dodge Blocks", help:"Move mouse • avoid squares",
    init(){ return {p:{x:W/2,y:H/2,r:14}, blocks:[], score:0, time:0, lives:1}; },
    update(g,dt){
      g.time += dt; g.score = (g.time*10)|0;
      g.p.x = clamp(mouse.x, 10, W-10); g.p.y = clamp(mouse.y, 10, H-10);
      if (g.blocks.length<10 && Math.random()<0.08){
        g.blocks.push({x:rnd(0,W), y:-30, s:rnd(18,40), vy:rnd(140,320)});
      }
      for (const b of g.blocks){ b.y += b.vy*dt; }
      g.blocks = g.blocks.filter(b=>b.y< H+60);
      for (const b of g.blocks){
        if (Math.abs(g.p.x-b.x) < (g.p.r+b.s/2) && Math.abs(g.p.y-b.y) < (g.p.r+b.s/2)) g.over=true;
      }
    },
    draw(g){
      bg(); text(`Score: ${g.score}`,16,26);
      ctx.shadowBlur=18; ctx.shadowColor="rgba(0,229,255,0.7)";
      ctx.fillStyle="rgba(0,229,255,0.9)";
      ctx.beginPath(); ctx.arc(g.p.x,g.p.y,g.p.r,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle="rgba(124,58,237,0.8)";
      g.blocks.forEach(b=>ctx.fillRect(b.x-b.s/2,b.y-b.s/2,b.s,b.s));
      if (g.over) centerMsg("HIT!", `Score: ${g.score}`);
    }
  },

  // 5) Breakout Mini
  breakout: {
    name:"Breakout Mini", help:"Mouse paddle • break blocks",
    init(){
      const bricks=[];
      for(let y=0;y<5;y++)for(let x=0;x<10;x++) bricks.push({x:80+x*75,y:70+y*34,w:62,h:22,alive:true});
      return {p:{x:W/2,w:140,h:14,y:H-40}, b:{x:W/2,y:H/2,r:9,vx:260,vy:-260}, bricks, score:0, lives:3};
    },
    update(g,dt){
      if (g.over) return;
      g.p.x = clamp(mouse.x, g.p.w/2, W-g.p.w/2);
      g.b.x += g.b.vx*dt; g.b.y += g.b.vy*dt;
      if (g.b.x<g.b.r || g.b.x>W-g.b.r) g.b.vx*=-1;
      if (g.b.y<g.b.r) g.b.vy*=-1;
      // paddle
      if (g.b.y+g.b.r>g.p.y && g.b.y<g.p.y+g.p.h && Math.abs(g.b.x-g.p.x) < g.p.w/2){
        g.b.vy = -Math.abs(g.b.vy)*1.02;
        g.b.vx += ((g.b.x-g.p.x)/(g.p.w/2))*80;
      }
      // bricks
      for (const br of g.bricks){
        if (!br.alive) continue;
        if (g.b.x>br.x && g.b.x<br.x+br.w && g.b.y>br.y && g.b.y<br.y+br.h){
          br.alive=false; g.score++; g.b.vy*=-1;
        }
      }
      if (g.b.y>H+40){
        g.lives--; g.b={x:W/2,y:H/2,r:9,vx:260*(Math.random()>.5?1:-1),vy:-260};
        if (g.lives<=0) g.over=true;
      }
      if (g.score===g.bricks.length) g.win=true, g.over=true;
    },
    draw(g){
      bg(); hud(g);
      ctx.fillStyle="rgba(0,229,255,0.9)";
      ctx.fillRect(g.p.x-g.p.w/2,g.p.y,g.p.w,g.p.h);
      ctx.beginPath(); ctx.arc(g.b.x,g.b.y,g.b.r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(124,58,237,0.85)";
      g.bricks.forEach(br=>{ if(br.alive) ctx.fillRect(br.x,br.y,br.w,br.h); });
      if (g.over) centerMsg(g.win?"YOU WIN":"GAME OVER", `Score: ${g.score}`);
    }
  },

  // 6) Flappy Dot
  flappy: {
    name:"Flappy Dot", help:"Click/Space to flap",
    init(){ return {p:{x:180,y:H/2,vy:0,r:12}, pipes:[], score:0, t:0}; },
    update(g,dt){
      if (g.over) return;
      if (mouse.clicked || keys.has(" ")) g.p.vy = -320;
      g.p.vy += 820*dt; g.p.y += g.p.vy*dt;
      g.t += dt;
      if (g.p.y<0 || g.p.y>H) g.over=true;
      if (g.pipes.length===0 || g.pipes[g.pipes.length-1].x < W-260){
        const gap=140, gy=rnd(120,H-120);
        g.pipes.push({x:W+40, gy, gap, w:60, passed:false});
      }
      for (const p of g.pipes){
        p.x -= 220*dt;
        const topH = p.gy - p.gap/2;
        const botY = p.gy + p.gap/2;
        const hitX = g.p.x+g.p.r>p.x && g.p.x-g.p.r<p.x+p.w;
        const hitY = g.p.y-g.p.r<topH || g.p.y+g.p.r>botY;
        if (hitX && hitY) g.over=true;
        if (!p.passed && p.x+p.w < g.p.x){ p.passed=true; g.score++; }
      }
      g.pipes = g.pipes.filter(p=>p.x>-80);
    },
    draw(g){
      bg(); hud(g);
      ctx.fillStyle="rgba(0,229,255,0.9)";
      ctx.beginPath(); ctx.arc(g.p.x,g.p.y,g.p.r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(124,58,237,0.85)";
      g.pipes.forEach(p=>{
        const topH = p.gy - p.gap/2;
        const botY = p.gy + p.gap/2;
        ctx.fillRect(p.x,0,p.w,topH);
        ctx.fillRect(p.x,botY,p.w,H-botY);
      });
      if (g.over) centerMsg("CRASH!", `Score: ${g.score}`);
    }
  },

  // 7) Runner
  runner: {
    name:"Neon Runner", help:"Space to jump • avoid spikes",
    init(){ return {p:{x:160,y:H-90,vy:0,w:26,h:40,on:true}, obs:[], score:0, t:0}; },
    update(g,dt){
      if (g.over) return;
      if ((keys.has(" ") || mouse.clicked) && g.p.on){ g.p.vy=-520; g.p.on=false; }
      g.p.vy += 1200*dt; g.p.y += g.p.vy*dt;
      if (g.p.y>H-90){ g.p.y=H-90; g.p.vy=0; g.p.on=true; }
      g.t+=dt; g.score=(g.t*10)|0;
      if (g.obs.length===0 || g.obs[g.obs.length-1].x < W-260){
        g.obs.push({x:W+40, y:H-90, w:irnd(18,28), h:irnd(22,46)});
      }
      for (const o of g.obs) o.x -= 320*dt;
      g.obs = g.obs.filter(o=>o.x>-80);
      for (const o of g.obs){
        const hit = g.p.x < o.x+o.w && g.p.x+g.p.w > o.x && g.p.y < o.y+o.h && g.p.y+g.p.h > o.y;
        if (hit) g.over=true;
      }
    },
    draw(g){
      bg(); text(`Score: ${g.score}`,16,26);
      ctx.fillStyle="rgba(148,163,184,0.35)"; ctx.fillRect(0,H-50,W,2);
      ctx.fillStyle="rgba(0,229,255,0.9)";
      ctx.fillRect(g.p.x,g.p.y,g.p.w,g.p.h);
      ctx.fillStyle="rgba(124,58,237,0.85)";
      g.obs.forEach(o=>ctx.fillRect(o.x,o.y,o.w,o.h));
      if (g.over) centerMsg("DOWN!", `Score: ${g.score}`);
    }
  },

  // 8) Asteroids Lite
  ast: {
    name:"Asteroids Lite", help:"WASD move • click to shoot",
    init(){ return {p:{x:W/2,y:H/2,vx:0,vy:0,a:0}, shots:[], rocks:[], score:0, lives:3, t:0}; },
    update(g,dt){
      if (g.over) return;
      g.t+=dt;
      if (g.rocks.length<8 && Math.random()<0.05) g.rocks.push({x:rnd(0,W),y:rnd(0,H),r:rnd(16,34),vx:rnd(-90,90),vy:rnd(-90,90)});
      const ax = (keys.has("d")?1:0)-(keys.has("a")?1:0);
      const ay = (keys.has("s")?1:0)-(keys.has("w")?1:0);
      g.p.vx += ax*520*dt; g.p.vy += ay*520*dt;
      g.p.vx *= 0.985; g.p.vy *= 0.985;
      g.p.x = (g.p.x + g.p.vx*dt + W)%W;
      g.p.y = (g.p.y + g.p.vy*dt + H)%H;

      if (mouse.clicked){
        g.shots.push({x:g.p.x,y:g.p.y,vx:(mouse.x-g.p.x)*2.2,vy:(mouse.y-g.p.y)*2.2,life:1.1});
      }
      g.shots.forEach(s=>{ s.x+=s.vx*dt; s.y+=s.vy*dt; s.life-=dt; });
      g.shots = g.shots.filter(s=>s.life>0);

      g.rocks.forEach(r=>{ r.x=(r.x+r.vx*dt+W)%W; r.y=(r.y+r.vy*dt+H)%H; });

      // collisions
      for (const r of g.rocks){
        if (dist(g.p.x,g.p.y,r.x,r.y) < r.r+10){ g.lives--; g.p.x=W/2; g.p.y=H/2; if(g.lives<=0) g.over=true; }
      }
      for (const s of g.shots){
        for (const r of g.rocks){
          if (dist(s.x,s.y,r.x,r.y) < r.r){ r.dead=true; s.life=0; g.score++; }
        }
      }
      g.rocks = g.rocks.filter(r=>!r.dead);
    },
    draw(g){
      bg(); hud(g);
      ctx.fillStyle="rgba(0,229,255,0.9)";
      ctx.beginPath(); ctx.arc(g.p.x,g.p.y,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(229,231,235,0.9)";
      g.shots.forEach(s=>ctx.fillRect(s.x-2,s.y-2,4,4));
      ctx.strokeStyle="rgba(124,58,237,0.85)";
      g.rocks.forEach(r=>{ ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.stroke(); });
      if (g.over) centerMsg("GAME OVER", `Score: ${g.score}`);
    }
  },

  // 9) Memory Lights
  simon: {
    name:"Memory Lights", help:"Watch pattern • repeat clicks",
    init(){ return {seq:[irnd(0,4)], idx:0, phase:"show", timer:0.7, score:0}; },
    update(g,dt){
      const pads = [
        {x:W/2-160,y:H/2-160,w:140,h:140},
        {x:W/2+20,y:H/2-160,w:140,h:140},
        {x:W/2-160,y:H/2+20,w:140,h:140},
        {x:W/2+20,y:H/2+20,w:140,h:140},
      ];
      g.pads=pads;

      if (g.phase==="show"){
        g.timer-=dt;
        if (g.timer<=0){
          g.idx++;
          if (g.idx >= g.seq.length){ g.phase="input"; g.idx=0; }
          g.timer=0.55;
        }
      } else if (g.phase==="input"){
        if (mouse.clicked){
          const hit = pads.findIndex(p=>mouse.x>p.x&&mouse.x<p.x+p.w&&mouse.y>p.y&&mouse.y<p.y+p.h);
          if (hit<0) return;
          if (hit === g.seq[g.idx]){
            g.idx++;
            if (g.idx===g.seq.length){
              g.score++;
              g.seq.push(irnd(0,4));
              g.phase="show"; g.idx=0; g.timer=0.7;
            }
          } else {
            g.over=true;
          }
        }
      }
    },
    draw(g){
      bg(); text(`Score: ${g.score}`,16,26);
      const colors=[
        "rgba(0,229,255,0.25)","rgba(124,58,237,0.25)","rgba(0,229,255,0.18)","rgba(124,58,237,0.18)"
      ];
      g.pads.forEach((p,i)=>{
        ctx.fillStyle=colors[i];
        ctx.fillRect(p.x,p.y,p.w,p.h);
        ctx.strokeStyle="rgba(255,255,255,0.15)";
        ctx.strokeRect(p.x,p.y,p.w,p.h);
      });
      if (g.phase==="show"){
        const i = g.seq[g.idx] ?? g.seq[g.seq.length-1];
        const p=g.pads[i];
        ctx.fillStyle="rgba(0,229,255,0.85)";
        ctx.fillRect(p.x,p.y,p.w,p.h);
        text("WATCH", W/2-60, 70, 26, 0.9);
      } else {
        text("REPEAT", W/2-65, 70, 26, 0.9);
      }
      if (g.over) centerMsg("WRONG!", `Final score: ${g.score}`);
    }
  },

  // 10) Spacebar Meter
  meter: {
    name:"Spacebar Meter", help:"Mash SPACE • 8s",
    init(){ return {score:0, timeLeft:8, power:0}; },
    update(g,dt){
      g.timeLeft-=dt; if(g.timeLeft<=0) g.over=true;
      if (keys.has(" ") && !g.over){ g.score+=2; g.power = clamp(g.power+0.08,0,1); }
      g.power *= 0.96;
    },
    draw(g){
      bg(); hud(g);
      ctx.fillStyle="rgba(148,163,184,0.2)"; ctx.fillRect(W/2-260,H/2-20,520,40);
      ctx.fillStyle="rgba(0,229,255,0.8)"; ctx.fillRect(W/2-260,H/2-20,520*g.power,40);
      text("MASH SPACE", W/2-135, H/2-50, 28, 0.9);
      if (g.over) centerMsg("DONE", `Power score: ${g.score}`);
    }
  },
};

// Fill the remaining 10 with simple variants so you get 20 total:
function makeVariant(id, name, help, factory){
  Games[id] = { name, help, init:factory.init, update:factory.update, draw:factory.draw };
}

// 11) Catch
makeVariant("catch","Catch Orbs","Move mouse • catch blue","", {
  init(){ return {p:{x:W/2,y:H-70,r:18}, orbs:[], score:0, lives:3}; },
  update(g,dt){
    if (g.over) return;
    g.p.x = clamp(mouse.x, 20, W-20);
    if (Math.random()<0.08) g.orbs.push({x:rnd(20,W-20),y:-20,r:12,vy:rnd(200,340)});
    g.orbs.forEach(o=>o.y+=o.vy*dt);
    for (const o of g.orbs){
      if (dist(g.p.x,g.p.y,o.x,o.y) < g.p.r+o.r){ o.hit=true; g.score++; }
      if (o.y>H+30){ o.miss=true; g.lives--; if(g.lives<=0) g.over=true; }
    }
    g.orbs = g.orbs.filter(o=>!o.hit && !o.miss);
  },
  draw(g){
    bg(); hud(g);
    ctx.fillStyle="rgba(0,229,255,0.9)";
    ctx.beginPath(); ctx.arc(g.p.x,g.p.y,g.p.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(124,58,237,0.85)";
    g.orbs.forEach(o=>{ ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill(); });
    if (g.over) centerMsg("DONE", `Score: ${g.score}`);
  }
});

// 12) Avoid Lines
makeVariant("lines","Laser Lines","Move mouse • don’t touch","", {
  init(){ return {p:{x:W/2,y:H/2,r:14}, lines:[], score:0, t:0}; },
  update(g,dt){
    if (g.over) return;
    g.t+=dt; g.score=(g.t*10)|0;
    g.p.x=clamp(mouse.x,10,W-10); g.p.y=clamp(mouse.y,10,H-10);
    if (Math.random()<0.06) g.lines.push({x1:rnd(0,W),y1:rnd(0,H),x2:rnd(0,W),y2:rnd(0,H),life:1.2});
    g.lines.forEach(l=>l.life-=dt);
    g.lines=g.lines.filter(l=>l.life>0);
    for (const l of g.lines){
      // point-to-segment distance
      const A={x:l.x1,y:l.y1}, B={x:l.x2,y:l.y2}, P=g.p;
      const vx=B.x-A.x, vy=B.y-A.y;
      const t=clamp(((P.x-A.x)*vx+(P.y-A.y)*vy)/(vx*vx+vy*vy||1),0,1);
      const px=A.x+vx*t, py=A.y+vy*t;
      if (dist(P.x,P.y,px,py) < g.p.r+4) g.over=true;
    }
  },
  draw(g){
    bg(); text(`Score: ${g.score}`,16,26);
    ctx.fillStyle="rgba(0,229,255,0.9)"; ctx.beginPath(); ctx.arc(g.p.x,g.p.y,g.p.r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(124,58,237,0.8)"; ctx.lineWidth=4;
    g.lines.forEach(l=>{ ctx.globalAlpha=clamp(l.life,0,1); ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.stroke(); });
    ctx.globalAlpha=1; ctx.lineWidth=1;
    if (g.over) centerMsg("ZAPPED!", `Score: ${g.score}`);
  }
});

// 13–20: quick “score chase” games (simple but playable)
makeVariant("drift","Mouse Drift","Stay inside the ring","", {
  init(){ return {c:{x:W/2,y:H/2,r:90}, p:{x:W/2,y:H/2}, score:0, t:0}; },
  update(g,dt){ if(g.over) return; g.t+=dt; g.score=(g.t*10)|0; g.p.x=mouse.x; g.p.y=mouse.y; if(dist(g.p.x,g.p.y,g.c.x,g.c.y)>g.c.r) g.over=true; if(Math.random()<0.02){g.c={x:rnd(120,W-120),y:rnd(120,H-120),r:rnd(70,110)};} },
  draw(g){ bg(); text(`Score: ${g.score}`,16,26); ctx.strokeStyle="rgba(0,229,255,0.7)"; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(g.c.x,g.c.y,g.c.r,0,Math.PI*2); ctx.stroke(); ctx.lineWidth=1; ctx.fillStyle="rgba(124,58,237,0.9)"; ctx.beginPath(); ctx.arc(g.p.x,g.p.y,10,0,Math.PI*2); ctx.fill(); if(g.over) centerMsg("OUT!", `Score: ${g.score}`); }
});

makeVariant("tap","Tap Targets","Click the pink squares","", {
  init(){ return {t:{x:rnd(60,W-60),y:rnd(80,H-60),s:40}, score:0, timeLeft:20}; },
  update(g,dt){ g.timeLeft-=dt; if(g.timeLeft<=0) g.over=true; if(mouse.clicked && mouse.x>g.t.x-g.t.s/2 && mouse.x<g.t.x+g.t.s/2 && mouse.y>g.t.y-g.t.s/2 && mouse.y<g.t.y+g.t.s/2){ g.score++; g.t={x:rnd(60,W-60),y:rnd(80,H-60),s:clamp(40-g.score*0.6,16,40)}; } },
  draw(g){ bg(); hud(g); ctx.fillStyle="rgba(124,58,237,0.85)"; ctx.fillRect(g.t.x-g.t.s/2,g.t.y-g.t.s/2,g.t.s,g.t.s); if(g.over) centerMsg("DONE", `Score: ${g.score}`); }
});

makeVariant("maze","Mini Maze","WASD • reach the goal","", {
  init(){
    const walls=[];
    for(let i=0;i<10;i++) walls.push({x:rnd(120,W-220), y:rnd(90,H-150), w:rnd(120,220), h:rnd(16,26)});
    return {p:{x:60,y:90,r:12}, goal:{x:W-70,y:H-70,r:18}, walls, score:0};
  },
  update(g,dt){
    if(g.over) return;
    const sp=260;
    const vx=((keys.has("d")?1:0)-(keys.has("a")?1:0))*sp*dt;
    const vy=((keys.has("s")?1:0)-(keys.has("w")?1:0))*sp*dt;
    g.p.x=clamp(g.p.x+vx,10,W-10); g.p.y=clamp(g.p.y+vy,10,H-10);
    for(const w of g.walls){
      if (g.p.x>w.x && g.p.x<w.x+w.w && g.p.y>w.y && g.p.y<w.y+w.h){ g.over=true; g.fail=true; }
    }
    if(dist(g.p.x,g.p.y,g.goal.x,g.goal.y) < g.goal.r+g.p.r){ g.over=true; g.win=true; }
  },
  draw(g){
    bg(); text("Reach the goal", 16, 26, 18, 0.9);
    ctx.fillStyle="rgba(124,58,237,0.85)";
    g.walls.forEach(w=>ctx.fillRect(w.x,w.y,w.w,w.h));
    ctx.fillStyle="rgba(0,229,255,0.9)";
    ctx.beginPath(); ctx.arc(g.goal.x,g.goal.y,g.goal.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(229,231,235,0.95)";
    ctx.beginPath(); ctx.arc(g.p.x,g.p.y,g.p.r,0,Math.PI*2); ctx.fill();
    if(g.over) centerMsg(g.win?"WIN!":"FAIL!", g.win?"Nice.":"You hit a wall.");
  }
});

makeVariant("orbit","Orbit","Hold click to pull","", {
  init(){ return {p:{x:W/2,y:H/2,vx:120,vy:-80}, c:{x:W/2,y:H/2}, score:0, t:0}; },
  update(g,dt){
    if(g.over) return;
    g.t+=dt; g.score=(g.t*10)|0;
    if(mouse.down){
      const dx=mouse.x-g.p.x, dy=mouse.y-g.p.y;
      g.p.vx += dx*1.2*dt; g.p.vy += dy*1.2*dt;
    }
    g.p.vx*=0.995; g.p.vy*=0.995;
    g.p.x+=g.p.vx*dt; g.p.y+=g.p.vy*dt;
    if(g.p.x<0||g.p.x>W||g.p.y<0||g.p.y>H) g.over=true;
  },
  draw(g){
    bg(); text(`Score: ${g.score}`,16,26);
    ctx.strokeStyle="rgba(148,163,184,0.18)"; ctx.beginPath(); ctx.moveTo(mouse.x,mouse.y); ctx.lineTo(W/2,H/2); ctx.stroke();
    ctx.fillStyle="rgba(0,229,255,0.9)"; ctx.beginPath(); ctx.arc(g.p.x,g.p.y,10,0,Math.PI*2); ctx.fill();
    if(g.over) centerMsg("OUT!", `Score: ${g.score}`);
  }
});

// 20 total entries required: check + add small placeholders if needed
const ids = Object.keys(Games);
while (Object.keys(Games).length < 20){
  const n = Object.keys(Games).length+1;
  Games["bonus"+n] = {
    name:`Bonus ${n}`, help:"(placeholder) press R to restart",
    init(){ return {score:0, timeLeft:10}; },
    update(g,dt){ g.timeLeft-=dt; if(mouse.clicked) g.score++; if(g.timeLeft<=0) g.over=true; if(keys.has("r")) Object.assign(g, Games["bonus"+n].init()); },
    draw(g){ bg(); hud(g); text(`Bonus ${n}`, W/2-70, H/2, 44, 0.9); if(g.over) centerMsg("DONE", `Score: ${g.score}`); }
  };
}

const G = Games[gameId] || Games.aim;
document.getElementById("gameTitle").textContent = G.name.toUpperCase();
document.getElementById("gameSub").textContent = "RNZZ Arcade";
document.getElementById("help").textContent = G.help || "";
document.getElementById("restartBtn").onclick = () => state = G.init();

let state = G.init();
let last = performance.now();
function loop(t){
  const dt = Math.min(0.03, (t-last)/1000);
  last = t;
  mouse.clicked = false;

  if (state && !state._init){ state._init=true; }
  if (G.update) G.update(state, dt);
  if (G.draw) G.draw(state);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
