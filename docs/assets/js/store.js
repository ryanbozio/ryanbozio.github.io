if (!requireActionLogin()) throw new Error("Login required");

const storeStatus = document.getElementById("storeStatus");
const storeImages = {
  time: "15-minutes.jpeg",
  movie: "movie.jpeg",
  money: "money.jpeg",
  outing: "special-outing.jpeg",
  other: "special-outing.jpeg",
};
const storeImageFallback = "/assets/images/store/special-outing.jpeg";
let storeState = { child: null, prizes: [], ledger: [] };
const childId = new URLSearchParams(window.location.search).get("id");

function storeImage(prize) {
  const category = (prize.category || "outing").trim().toLowerCase();
  return `/assets/images/store/${encodeURIComponent(storeImages[category] || storeImages.outing)}`;
}

function showStoreStatus(message, isError) {
  storeStatus.textContent = message;
  storeStatus.className = `app-status app-status-visible ${isError ? "app-status-error" : "app-status-success"}`;
}

function storeHeaders() {
  return { Accept: "application/vnd.github+json", Authorization: `Bearer ${appSession().token}`, "X-GitHub-Api-Version": "2022-11-28" };
}

function storeBase64(text) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

function projectedBalance() {
  return pendingCart().reduce((balance, action) => {
    if (action.payload.childId !== storeState.child.id) return balance;
    if (action.action === "log_chore" || action.action === "adjustment") return balance + Number(action.payload.points || 0);
    if (action.action === "redeem") return balance - Math.abs(Number(action.payload.cost || 0));
    return balance;
  }, computeBalances(storeState.ledger)[storeState.child.id] || 0);
}

function renderStoreItems(prizes) {
  const balance = projectedBalance();
  document.getElementById("storeItems").innerHTML = prizes.map((prize) => {
    const cost = Math.abs(Number(prize.cost));
    const queued = pendingCart().some((action) => action.action === "redeem" && action.payload.childId === storeState.child.id && action.payload.name === prize.name && Number(action.payload.cost) === Number(prize.cost));
    const disabled = queued || balance < cost;
    const buttonText = queued ? "In cart" : "Redeem";
    return `<article class="app-store-item"><img src="${storeImage(prize)}" alt="${escapeHtml(prize.name)}" onerror="this.onerror=null;this.src='${storeImageFallback}'"><div><p class="app-kicker">${escapeHtml(prize.category || "REWARD")}</p><h2>${escapeHtml(prize.name)}</h2><p>${prize.cost} Bozio Bucks</p><button type="button" data-prize-id="${prize.id}"${disabled ? " disabled" : ""}>${buttonText}</button></div></article>`;
  }).join("");
  document.querySelectorAll("#storeItems button:not(:disabled)").forEach((button) => button.addEventListener("click", () => {
    const prize = prizes.find((item) => item.id === button.dataset.prizeId);
    addPendingAction("redeem", { childId: storeState.child.id, childName: storeState.child.name, name: prize.name, cost: prize.cost }, `Redeem: ${prize.name}`);
    renderStoreItems(prizes);
    showStoreStatus(`${prize.name} added to cart.`, false);
  }));
}

async function loadStore() {
  const [children, prizes, ledger] = await Promise.all([fetchCSV("/data/children.csv"), fetchCSV("/data/prizes.csv"), fetchCSV("/data/ledger.csv")]);
  storeState.child = children.find((child) => child.id === childId && (child.github_username || "").toLowerCase() === appSession().login);
  if (!storeState.child) throw new Error("No child is assigned to this account.");
  storeState.prizes = prizes;
  storeState.ledger = ledger;
  const balance = computeBalances(ledger)[storeState.child.id] || 0;
  document.querySelector("#storePage h1").textContent = `${storeState.child.name}'s Store`;
  document.getElementById("storeChildLink").href = `/Child/?id=${encodeURIComponent(storeState.child.id)}`;
  document.getElementById("storeChildLink").textContent = `Back to ${storeState.child.name}`;
  document.getElementById("storeBalance").textContent = `${balance} Bozio Bucks available`;
  renderStoreItems(prizes);
}

loadStore().catch((error) => showStoreStatus(error.message, true));
