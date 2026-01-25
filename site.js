const games = [
  { name:"Aim Trainer", tags:["Arcade","Mouse"], desc:"Click targets • 30s", href:"play.html?g=aim" },
  { name:"Reaction Time", tags:["Skill"], desc:"Wait for green then click", href:"play.html?g=react" },
  { name:"Click Frenzy", tags:["Arcade"], desc:"Clicks in 10 seconds", href:"play.html?g=click" },
  { name:"Dodge Blocks", tags:["Arcade","Mouse"], desc:"Avoid falling blocks", href:"play.html?g=dodge" },
  { name:"Breakout Mini", tags:["Classic"], desc:"Break all bricks", href:"play.html?g=breakout" },
  { name:"Flappy Dot", tags:["Classic"], desc:"Flap through pipes", href:"play.html?g=flappy" },
  { name:"Neon Runner", tags:["Classic"], desc:"Jump over spikes", href:"play.html?g=runner" },
  { name:"Asteroids Lite", tags:["Shooter"], desc:"Move + shoot rocks", href:"play.html?g=ast" },
  { name:"Memory Lights", tags:["Memory"], desc:"Repeat the pattern", href:"play.html?g=simon" },
  { name:"Spacebar Meter", tags:["Arcade"], desc:"Mash space to score", href:"play.html?g=meter" },

  { name:"Catch Orbs", tags:["Arcade"], desc:"Catch falling orbs", href:"play.html?g=catch" },
  { name:"Laser Lines", tags:["Arcade"], desc:"Avoid laser lines", href:"play.html?g=lines" },
  { name:"Mouse Drift", tags:["Skill"], desc:"Stay inside the ring", href:"play.html?g=drift" },
  { name:"Tap Targets", tags:["Arcade"], desc:"Click the square", href:"play.html?g=tap" },
  { name:"Mini Maze", tags:["Puzzle"], desc:"WASD to the goal", href:"play.html?g=maze" },
  { name:"Orbit", tags:["Arcade"], desc:"Hold click to pull", href:"play.html?g=orbit" },

  // The rest auto-fill as Bonus games if you keep microgames.js as-is
  { name:"Bonus 17", tags:["Arcade"], desc:"Extra mini-game", href:"play.html?g=bonus17" },
  { name:"Bonus 18", tags:["Arcade"], desc:"Extra mini-game", href:"play.html?g=bonus18" },
  { name:"Bonus 19", tags:["Arcade"], desc:"Extra mini-game", href:"play.html?g=bonus19" },
  { name:"Bonus 20", tags:["Arcade"], desc:"Extra mini-game", href:"play.html?g=bonus20" },
];

const grid = document.getElementById("grid");
const search = document.getElementById("search");

function render(list){
  grid.innerHTML = "";
  list.forEach(g => {
    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => (location.href = g.href);
    card.innerHTML = `
      <div class="thumb">${g.name.split(" ")[1] || "GAME"}</div>
      <div class="title">${g.name}</div>
      <div class="muted">${g.desc}</div>
      <div class="meta">
        ${g.tags.map(t => `<span class="badge">${t}</span>`).join("")}
      </div>
    `;
    grid.appendChild(card);
  });
  if (!list.length){
    grid.innerHTML = `<div class="muted">No games found.</div>`;
  }
}

render(games);

search?.addEventListener("input", () => {
  const q = search.value.trim().toLowerCase();
  render(games.filter(g =>
    g.name.toLowerCase().includes(q) ||
    g.tags.join(" ").toLowerCase().includes(q)
  ));
});
