// RNZZ Trade — basic local demo (no login)
// Data stored in localStorage: skins, inventory, listings, offers

const LS = {
  SKINS: "rnzz_skins",
  INV: "rnzz_inventory",
  LIST: "rnzz_listings",
  OFFERS: "rnzz_offers"
};

const rarities = ["Consumer","Industrial","Mil-Spec","Restricted","Classified","Covert"];

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function uid(prefix="id") { return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`; }

function ensureData() {
  if (!localStorage.getItem(LS.SKINS)) save(LS.SKINS, []);
  if (!localStorage.getItem(LS.INV)) save(LS.INV, []);
  if (!localStorage.getItem(LS.LIST)) save(LS.LIST, []);
  if (!localStorage.getItem(LS.OFFERS)) save(LS.OFFERS, []);
}

function seedDemoSkins() {
  const skins = load(LS.SKINS, []);
  if (skins.length) return;
  const demo = [
    { id: uid("skin"), name: "AK-47 | Neon Circuit", rarity:"Covert", price: 850 },
    { id: uid("skin"), name: "M4A1-S | Arctic Pulse", rarity:"Classified", price: 520 },
    { id: uid("skin"), name: "AWP | Voidstrike", rarity:"Covert", price: 1200 },
    { id: uid("skin"), name: "Glock-18 | Holo Drift", rarity:"Restricted", price: 220 },
    { id: uid("skin"), name: "Desert Eagle | Prism Fang", rarity:"Classified", price: 410 },
    { id: uid("skin"), name: "USP-S | Night Bloom", rarity:"Restricted", price: 260 },
    { id: uid("skin"), name: "MP9 | Pixel Surge", rarity:"Mil-Spec", price: 120 },
    { id: uid("skin"), name: "Karambit | Cyan Edge", rarity:"Covert", price: 2500 }
  ];
  save(LS.SKINS, demo);

  // also give you a starter inventory
  const inv = [
    { id: uid("inv"), skinId: demo[0].id },
    { id: uid("inv"), skinId: demo[3].id },
    { id: uid("inv"), skinId: demo[6].id }
  ];
  save(LS.INV, inv);
}

function skinById(id) {
  const skins = load(LS.SKINS, []);
  return skins.find(s => s.id === id);
}

function renderCard({ title, rarity, price, ctaText, onClick, sub }) {
  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="thumb">${title.split("|")[0].trim()}</div>
    <div class="row">
      <div style="font-weight:700">${title}</div>
    </div>
    <div class="row">
      <span class="badge">${rarity}</span>
      <span class="price">${price ? price + " credits" : ""}</span>
    </div>
    ${sub ? `<div class="muted" style="font-size:12px">${sub}</div>` : ""}
    ${ctaText ? `<button class="btn">${ctaText}</button>` : ""}
  `;
  if (onClick) el.addEventListener("click", onClick);
  return el;
}

// ---------- Market page ----------
function initMarket() {
  const marketGrid = document.getElementById("marketGrid");
  const listingsGrid = document.getElementById("listingsGrid");
  const search = document.getElementById("search");
  const rarityFilter = document.getElementById("rarityFilter");
  const seedBtn = document.getElementById("seedBtn");

  if (!marketGrid || !listingsGrid) return;

  seedBtn?.addEventListener("click", () => {
    seedDemoSkins();
    draw();
  });

  function draw() {
    const skins = load(LS.SKINS, []);
    const listings = load(LS.LIST, []);
    const q = (search?.value || "").toLowerCase();
    const rf = rarityFilter?.value || "";

    marketGrid.innerHTML = "";
    listingsGrid.innerHTML = "";

    const filtered = skins.filter(s =>
      (!q || s.name.toLowerCase().includes(q)) &&
      (!rf || s.rarity === rf)
    );

    if (!filtered.length) {
      marketGrid.innerHTML = `<div class="muted">No skins yet. Click "Seed demo skins".</div>`;
    } else {
      filtered.forEach(s => {
        marketGrid.appendChild(renderCard({
          title: s.name,
          rarity: s.rarity,
          price: s.price,
          ctaText: "View",
          onClick: () => alert("This is the market catalogue. Go to Inventory to list skins.")
        }));
      });
    }

    const openListings = listings.filter(l => l.status === "OPEN");
    if (!openListings.length) {
      listingsGrid.innerHTML = `<div class="muted">No listings yet. Go to Inventory and click a skin to list it.</div>`;
    } else {
      openListings.forEach(l => {
        const s = skinById(l.skinId);
        if (!s) return;
        listingsGrid.appendChild(renderCard({
          title: s.name,
          rarity: s.rarity,
          price: l.askPrice,
          ctaText: "Make offer",
          sub: `Listing ID: ${l.id.slice(-6)}`,
          onClick: () => location.href = `trade.html?id=${encodeURIComponent(l.id)}`
        }));
      });
    }
  }

  search?.addEventListener("input", draw);
  rarityFilter?.addEventListener("change", draw);

  draw();
}

// ---------- Inventory page ----------
function initInventory() {
  const inventoryGrid = document.getElementById("inventoryGrid");
  const addRandomBtn = document.getElementById("addRandomBtn");
  const resetBtn = document.getElementById("resetBtn");
  const offersGrid = document.getElementById("offersGrid");

  if (!inventoryGrid) return;

  function addRandomSkinToInv() {
    const skins = load(LS.SKINS, []);
    if (!skins.length) seedDemoSkins();
    const skins2 = load(LS.SKINS, []);
    const pick = skins2[Math.floor(Math.random() * skins2.length)];
    const inv = load(LS.INV, []);
    inv.push({ id: uid("inv"), skinId: pick.id });
    save(LS.INV, inv);
  }

  addRandomBtn?.addEventListener("click", () => {
    addRandomSkinToInv();
    draw();
  });

  resetBtn?.addEventListener("click", () => {
    localStorage.removeItem(LS.SKINS);
    localStorage.removeItem(LS.INV);
    localStorage.removeItem(LS.LIST);
    localStorage.removeItem(LS.OFFERS);
    ensureData();
    draw();
  });

  function createListingFromInv(invItemId) {
    const inv = load(LS.INV, []);
    const item = inv.find(i => i.id === invItemId);
    if (!item) return;
    const skin = skinById(item.skinId);
    if (!skin) return;

    const ask = prompt(`Set asking price (credits) for "${skin.name}"`, String(skin.price));
    if (ask === null) return;
    const askPrice = Math.max(1, parseInt(ask, 10) || skin.price);

    // remove from inventory and add listing
    const inv2 = inv.filter(i => i.id !== invItemId);
    save(LS.INV, inv2);

    const listings = load(LS.LIST, []);
    listings.push({
      id: uid("list"),
      skinId: skin.id,
      askPrice,
      status: "OPEN
