// Public read-only dashboard: renders kid balances and recent ledger activity from the CSV data files.

async function renderDashboard() {
  if (!requireActionLogin()) return;
  const [children, ledger] = await Promise.all([
    fetchCSV("/data/children.csv"),
    fetchCSV("/data/ledger.csv"),
  ]);

  const balances = computeBalances(ledger);
  const login = appSession().login;
  const managedChildren = children.filter((child) => (child.github_username || "").toLowerCase() === login);

  const cardsEl = document.getElementById("appCards");
  cardsEl.innerHTML = "";
  if (managedChildren.length === 0) {
    cardsEl.innerHTML = "<p>No kids are assigned to this account.</p>";
  }
  for (const child of managedChildren) {
    const card = document.createElement("a");
    card.className = "app-card";
    card.href = `/Child/?id=${encodeURIComponent(child.id)}`;
    card.style.borderTopColor = child.color || "#4a90d9";
    const prizes = pendingRedemptions(ledger, child.id);
    const prizeList = prizes.length
      ? `<div class="app-card-prizes"><strong>Unused prizes</strong><ul>${prizes.map((prize) => `<li>${escapeHtml(prize.description)}</li>`).join("")}</ul></div>`
      : "";
    card.innerHTML = `<h3>${escapeHtml(child.name)}</h3><p class="app-balance">${balances[child.id] || 0} 🎟️</p>${prizeList}`;
    cardsEl.appendChild(card);
  }
}

renderDashboard().catch((err) => {
  console.error(err);
  document.getElementById("appCards").innerHTML = `<p>Couldn't load app data: ${err.message}</p>`;
});
