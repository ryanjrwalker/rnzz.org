const games = [
  {
    id: "snake",
    name: "Neon Snake",
    tags: ["Arcade", "Keyboard"],
    desc: "Eat, grow, don’t crash. Classic Snake with neon vibes.",
    href: "games/snake/index.html"
  },
  {
    id: "pong",
    name: "Neon Pong",
    tags: ["Arcade", "1 Player"],
    desc: "Pong vs a simple AI. First to 7 wins.",
    href: "games/pong/index.html"
  }
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
