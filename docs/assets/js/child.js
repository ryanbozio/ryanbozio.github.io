if (!requireActionLogin()) throw new Error("Login required");

const childStatus = document.getElementById("childStatus");
const childId = new URLSearchParams(window.location.search).get("id");
let childState = { children: [], chores: [], ledger: [] };

function showChildStatus(message, isError) {
  childStatus.textContent = message;
  childStatus.className = `app-status app-status-visible ${isError ? "app-status-error" : "app-status-success"}`;
}

function githubHeaders() {
  return { Accept: "application/vnd.github+json", Authorization: `Bearer ${appSession().token}`, "X-GitHub-Api-Version": "2022-11-28" };
}

function encodeBase64(text) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

async function appendLedgerRow(fields, message) {
  const path = "docs/data/ledger.csv";
  for (let attempt = 0; attempt < 3; attempt++) {
    const fileResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/contents/${path}?ref=${GITHUB_BRANCH}`, { headers: githubHeaders() });
    const file = await fileResponse.json();
    if (!fileResponse.ok) throw new Error(file.message || "Could not read the ledger.");
    const current = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\n/g, "")), (char) => char.charCodeAt(0)));
    const updated = `${current.replace(/\n?$/, "")}\n${fields.map((value) => String(value ?? "").includes(",") ? `"${String(value).replace(/"/g, '""')}"` : value).join(",")}\n`;
    const saveResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/contents/${path}`, {
      method: "PUT",
      headers: { ...githubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, content: encodeBase64(updated), sha: file.sha, branch: GITHUB_BRANCH }),
    });
    if (saveResponse.ok) return;
    if (saveResponse.status !== 409 || attempt === 2) throw new Error((await saveResponse.json()).message || "Could not save the chore.");
  }
}

async function loadChild() {
  const [children, chores, ledger] = await Promise.all([fetchCSV("/data/children.csv"), fetchCSV("/data/chores.csv"), fetchCSV("/data/ledger.csv")]);
  const current = children.find((child) => child.id === childId && (child.github_username || "").toLowerCase() === appSession().login);
  if (!current) throw new Error("That child is not available for this account.");
  childState = { children, chores, ledger };
  document.getElementById("childHeading").innerHTML = `<p class="app-kicker">${escapeHtml(current.name.toUpperCase())}'S ACCOUNT</p>`;
  const balance = computeBalances(ledger)[current.id] || 0;
  document.getElementById("childBalance").textContent = `${balance} Bozio Bucks 🎟️`;
  document.getElementById("childStoreLink").href = `/Store/?id=${encodeURIComponent(current.id)}`;
  const prizes = pendingRedemptions(ledger, current.id);
  document.getElementById("childPrizes").innerHTML = prizes.length
    ? prizes.map((prize) => `<li><span>${escapeHtml(prize.description)}</span><button type="button" data-use-prize-id="${escapeHtml(prize.id)}">Use</button></li>`).join("")
    : "<li>No unused prizes.</li>";
  document.getElementById("childChores").innerHTML = chores.map((chore) => `<article class="app-store-item"><img src="${choreImage(chore)}" alt="${escapeHtml(chore.name)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80';"><div><h3>${escapeHtml(chore.name)}</h3><p>${chore.points} Bozio Bucks</p><button type="button" data-chore-id="${chore.id}">Log chore</button></div></article>`).join("");
  const history = ledger.filter((entry) => entry.child_id === current.id).reverse();
  document.getElementById("childHistory").innerHTML = history.length ? history.map((entry) => `<tr><td>${escapeHtml(formatActivityDate(entry.timestamp))}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.description)}</td><td class="${entry.points >= 0 ? "app-positive" : "app-negative"}">${entry.points > 0 ? "+" : ""}${entry.points}</td></tr>`).join("") : '<tr><td colspan="4">No activity yet.</td></tr>';
}

function choreImage(chore) {
  const imageByCategory = {
    Kitchen: "kitchen.jpeg",
    Dining: "dining-table.jpeg",
    Trash: "trash.jpeg",
    Bathroom: "bathroom.jpeg",
    Bedroom: "bedroom.jpeg",
    Yardwork: "yardwork.jpeg",
  };
  return `/assets/images/chores/${imageByCategory[chore.category] || "kitchen.jpeg"}`;
}

async function logChore(chore) {
  const current = childState.children.find((child) => child.id === childId);
  addPendingAction("log_chore", { childId: current.id, childName: current.name, description: chore.name, points: chore.points }, `Log chore: ${chore.name}`);
  showChildStatus("Chore added to cart.", false);
}

document.getElementById("childChores").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-chore-id]");
  if (!button) return;
  const chore = childState.chores.find((item) => item.id === button.dataset.choreId);
  button.disabled = true;
  button.textContent = "In cart";
  showChildStatus(`Logging ${chore.name}...`, false);
  logChore(chore);
});

document.getElementById("childPrizes").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-use-prize-id]");
  if (!button) return;
  button.disabled = true;
  const current = childState.children.find((child) => child.id === childId);
  addPendingAction("use_redemption", { childId, childName: current.name, redemptionId: button.dataset.usePrizeId }, "Use redeemed prize");
  button.textContent = "In cart";
  showChildStatus("Prize use added to cart.", false);
});

document.getElementById("childAdjustmentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const current = childState.children.find((child) => child.id === childId);
  const points = parseInt(document.getElementById("childAdjustmentPoints").value, 10);
  const reason = document.getElementById("childAdjustmentReason").value.trim();
  if (!points || !reason) return;
  addPendingAction("adjustment", { childId: current.id, childName: current.name, reason, points }, `Adjustment: ${reason} (${points > 0 ? "+" : ""}${points} Bozio Bucks)`);
  document.getElementById("childAdjustmentForm").reset();
  showChildStatus("Adjustment added to cart.", false);
});

loadChild().catch((error) => showChildStatus(error.message, true));
