// Parent admin panel: loads current CSV data for selects/history, and sends actions to the Cloudflare Worker.

function getPassword() {
  return document.getElementById("parentPassword").value;
}

function showStatus(message, isError) {
  const el = document.getElementById("ticketStatus");
  el.textContent = message;
  el.className = `ticket-status ticket-status-visible ${isError ? "ticket-status-error" : "ticket-status-success"}`;
}

async function callWorker(action, payload) {
  const password = getPassword();
  if (!password) {
    showStatus("Enter the parent password first.", true);
    throw new Error("no password");
  }
  const res = await fetch(TICKET_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    showStatus(data.error || `Request failed (${res.status})`, true);
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  showStatus("Saved! GitHub Pages may take ~a minute to rebuild before the dashboard reflects this.", false);
  return data;
}

let state = { children: [], chores: [], prizes: [], ledger: [] };

async function loadData() {
  const [children, chores, prizes, ledger] = await Promise.all([
    fetchCSV("/data/children.csv"),
    fetchCSV("/data/chores.csv"),
    fetchCSV("/data/prizes.csv"),
    fetchCSV("/data/ledger.csv"),
  ]);
  state = { children, chores, prizes, ledger };
  renderAll();
}

function fillSelect(selectEl, items, labelFn) {
  selectEl.innerHTML = items.map((item) => `<option value="${item.id}">${escapeHtml(labelFn(item))}</option>`).join("");
}

function renderAll() {
  const { children, chores, prizes, ledger } = state;
  const balances = computeBalances(ledger);
  const childrenById = Object.fromEntries(children.map((c) => [c.id, c]));

  const cardsEl = document.getElementById("ticketCards");
  cardsEl.innerHTML = children
    .map(
      (c) =>
        `<div class="ticket-card" style="border-top-color:${c.color || "#4a90d9"}"><h3>${escapeHtml(c.name)}</h3><p class="ticket-balance">${balances[c.id] || 0} 🎟️</p></div>`
    )
    .join("") || "<p>No kids added yet.</p>";

  fillSelect(document.getElementById("logChoreChild"), children, (c) => c.name);
  fillSelect(document.getElementById("adjustmentChild"), children, (c) => c.name);
  fillSelect(document.getElementById("redeemChild"), children, (c) => c.name);
  fillSelect(document.getElementById("logChoreChore"), chores, (c) => `${c.name} (+${c.points})`);
  fillSelect(document.getElementById("redeemPrize"), prizes, (p) => `${p.name} (-${p.cost})`);

  const rows = [...ledger].reverse().slice(0, 50);
  const bodyEl = document.getElementById("ticketHistoryBody");
  bodyEl.innerHTML =
    rows
      .map((entry) => {
        const points = parseInt(entry.points, 10) || 0;
        const childName = childrenById[entry.child_id]?.name || entry.child_id;
        return `<tr>
          <td>${escapeHtml(entry.timestamp)}</td>
          <td>${escapeHtml(childName)}</td>
          <td>${escapeHtml(entry.type)}</td>
          <td>${escapeHtml(entry.description)}</td>
          <td class="${points >= 0 ? "ticket-positive" : "ticket-negative"}">${points > 0 ? "+" : ""}${points}</td>
        </tr>`;
      })
      .join("") || '<tr><td colspan="5">No activity yet.</td></tr>';
}

document.getElementById("logChoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const childId = document.getElementById("logChoreChild").value;
  const choreId = document.getElementById("logChoreChore").value;
  const chore = state.chores.find((c) => c.id === choreId);
  if (!chore) return;
  await callWorker("log_chore", { childId, description: chore.name, points: parseInt(chore.points, 10) });
  await loadData();
});

document.getElementById("adjustmentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const childId = document.getElementById("adjustmentChild").value;
  const points = parseInt(document.getElementById("adjustmentPoints").value, 10);
  const reason = document.getElementById("adjustmentReason").value.trim() || "Behavior adjustment";
  if (!points) return;
  await callWorker("adjustment", { childId, points, reason });
  document.getElementById("adjustmentForm").reset();
  await loadData();
});

document.getElementById("redeemForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const childId = document.getElementById("redeemChild").value;
  const prizeId = document.getElementById("redeemPrize").value;
  const prize = state.prizes.find((p) => p.id === prizeId);
  if (!prize) return;
  const balances = computeBalances(state.ledger);
  if ((balances[childId] || 0) < parseInt(prize.cost, 10)) {
    showStatus("Not enough tickets for that prize.", true);
    return;
  }
  await callWorker("redeem", { childId, description: prize.name, cost: parseInt(prize.cost, 10) });
  await loadData();
});

document.getElementById("addChildForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("addChildName").value.trim();
  const color = document.getElementById("addChildColor").value;
  if (!name) return;
  await callWorker("add_child", { name, color });
  document.getElementById("addChildForm").reset();
  await loadData();
});

document.getElementById("addChoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("addChoreName").value.trim();
  const points = parseInt(document.getElementById("addChorePoints").value, 10);
  if (!name || Number.isNaN(points)) return;
  await callWorker("add_chore", { name, points });
  document.getElementById("addChoreForm").reset();
  await loadData();
});

document.getElementById("addPrizeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("addPrizeName").value.trim();
  const cost = parseInt(document.getElementById("addPrizeCost").value, 10);
  const category = document.getElementById("addPrizeCategory").value;
  if (!name || Number.isNaN(cost)) return;
  await callWorker("add_prize", { name, cost, category });
  document.getElementById("addPrizeForm").reset();
  await loadData();
});

loadData().catch((err) => {
  console.error(err);
  showStatus(`Couldn't load ticket data: ${err.message}`, true);
});
