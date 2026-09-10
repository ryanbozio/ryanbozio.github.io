if (!requireActionLogin()) throw new Error("Login required");

const storeStatus = document.getElementById("storeStatus");
const storeImages = {
  dessert: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=600&q=80",
  money: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80",
  activity: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80",
  other: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=600&q=80",
};
let storeState = { child: null, prizes: [], ledger: [] };
const childId = new URLSearchParams(window.location.search).get("id");

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

async function redeemPrize(prize) {
  const path = "docs/data/ledger.csv";
  const fileResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/contents/${path}?ref=main`, { headers: storeHeaders() });
  const file = await fileResponse.json();
  if (!fileResponse.ok) throw new Error(file.message || "Could not read the ledger.");
  const current = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\n/g, "")), (char) => char.charCodeAt(0)));
  const row = [crypto.randomUUID().slice(0, 8), new Date().toISOString(), storeState.child.id, "redemption", prize.name, -Math.abs(prize.cost)];
  const updated = `${current.replace(/\n?$/, "")}\n${row.join(",")}\n`;
  const saveResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/contents/${path}`, { method: "PUT", headers: { ...storeHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ message: `Redeem ${prize.name}`, content: storeBase64(updated), sha: file.sha, branch: "main" }) });
  if (!saveResponse.ok) throw new Error((await saveResponse.json()).message || "Could not redeem that prize.");
}

async function loadStore() {
  const [children, prizes, ledger] = await Promise.all([fetchCSV("/data/children.csv"), fetchCSV("/data/prizes.csv"), fetchCSV("/data/ledger.csv")]);
  storeState.child = children.find((child) => child.id === childId && (child.github_username || "").toLowerCase() === appSession().login);
  if (!storeState.child) throw new Error("No child is assigned to this account.");
  storeState.prizes = prizes;
  storeState.ledger = ledger;
  const balance = computeBalances(ledger)[storeState.child.id] || 0;
  document.getElementById("storeBalance").textContent = `${balance} points available`;
  document.getElementById("storeItems").innerHTML = prizes.map((prize) => `<article class="app-store-item"><img src="${storeImages[prize.category] || storeImages.other}" alt=""><div><p class="app-kicker">${escapeHtml(prize.category || "REWARD")}</p><h2>${escapeHtml(prize.name)}</h2><p>${prize.cost} points</p><button type="button" data-prize-id="${prize.id}" ${balance < parseInt(prize.cost, 10) ? "disabled" : ""}>Redeem</button></div></article>`).join("");
  document.querySelectorAll("#storeItems button").forEach((button) => button.addEventListener("click", async () => {
    const prize = prizes.find((item) => item.id === button.dataset.prizeId);
    button.disabled = true;
    try {
      await redeemPrize(prize);
      showStoreStatus(`${prize.name} redeemed.`, false);
      await loadStore();
    } catch (error) {
      button.disabled = false;
      showStoreStatus(error.message, true);
    }
  }));
}

loadStore().catch((error) => showStoreStatus(error.message, true));
