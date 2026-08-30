// Public read-only dashboard: renders kid balances and recent ledger activity from the CSV data files.

async function renderDashboard() {
  const [children, ledger] = await Promise.all([
    fetchCSV("/data/children.csv"),
    fetchCSV("/data/ledger.csv"),
  ]);

  const balances = computeBalances(ledger);
  const childrenById = Object.fromEntries(children.map((c) => [c.id, c]));

  const cardsEl = document.getElementById("ticketCards");
  cardsEl.innerHTML = "";
  if (children.length === 0) {
    cardsEl.innerHTML = "<p>No kids added yet.</p>";
  }
  for (const child of children) {
    const card = document.createElement("div");
    card.className = "ticket-card";
    card.style.borderTopColor = child.color || "#4a90d9";
    card.innerHTML = `<h3>${escapeHtml(child.name)}</h3><p class="ticket-balance">${balances[child.id] || 0} 🎟️</p>`;
    cardsEl.appendChild(card);
  }

  const rows = [...ledger].reverse().slice(0, 20);
  const bodyEl = document.getElementById("ticketHistoryBody");
  bodyEl.innerHTML = "";
  if (rows.length === 0) {
    bodyEl.innerHTML = '<tr><td colspan="5">No activity yet.</td></tr>';
  }
  for (const entry of rows) {
    const points = parseInt(entry.points, 10) || 0;
    const childName = childrenById[entry.child_id]?.name || entry.child_id;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(entry.timestamp)}</td>
      <td>${escapeHtml(childName)}</td>
      <td>${escapeHtml(entry.type)}</td>
      <td>${escapeHtml(entry.description)}</td>
      <td class="${points >= 0 ? "ticket-positive" : "ticket-negative"}">${points > 0 ? "+" : ""}${points}</td>
    `;
    bodyEl.appendChild(tr);
  }
}

renderDashboard().catch((err) => {
  console.error(err);
  document.getElementById("ticketCards").innerHTML = `<p>Couldn't load ticket data: ${err.message}</p>`;
});
