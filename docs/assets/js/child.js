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
  document.getElementById("childHeading").innerHTML = `<p class="app-kicker">CHILD ACCOUNT</p><h1>${escapeHtml(current.name)}</h1>`;
  const balance = computeBalances(ledger)[current.id] || 0;
  document.getElementById("childBalance").textContent = `${balance} points`;
  document.getElementById("childStoreLink").href = `/Store/?id=${encodeURIComponent(current.id)}`;
  const prizes = pendingRedemptions(ledger, current.id);
  document.getElementById("childPrizes").innerHTML = prizes.length
    ? prizes.map((prize) => `<li>${escapeHtml(prize.description)}</li>`).join("")
    : "<li>No unused prizes.</li>";
  document.getElementById("childChores").innerHTML = chores.map((chore) => `<article class="app-store-item"><img src="${choreImage(chore)}" alt=""><div><h3>${escapeHtml(chore.name)}</h3><p>${chore.points} points</p><button type="button" data-chore-id="${chore.id}">Log chore</button></div></article>`).join("");
  const history = ledger.filter((entry) => entry.child_id === current.id).reverse();
  document.getElementById("childHistory").innerHTML = history.length ? history.map((entry) => `<tr><td>${escapeHtml(entry.timestamp)}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.description)}</td><td class="${entry.points >= 0 ? "app-positive" : "app-negative"}">${entry.points > 0 ? "+" : ""}${entry.points}</td></tr>`).join("") : '<tr><td colspan="4">No activity yet.</td></tr>';
}

function choreImage(chore) {
  const images = [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=80",
  ];
  return images[Array.from(chore.id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % images.length];
}

async function logChore(chore) {
  const current = childState.children.find((child) => child.id === childId);
  try {
    await appendLedgerRow([crypto.randomUUID().slice(0, 8), new Date().toISOString(), current.id, "chore", chore.name, chore.points], `Log chore: ${chore.name}`);
    showChildStatus("Chore logged.", false);
    await loadChild();
  } catch (error) {
    showChildStatus(error.message, true);
  }
}

document.getElementById("childChores").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-chore-id]");
  if (!button) return;
  const chore = childState.chores.find((item) => item.id === button.dataset.choreId);
  button.disabled = true;
  logChore(chore).finally(() => { button.disabled = false; });
});

document.getElementById("childAdjustmentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const current = childState.children.find((child) => child.id === childId);
  const points = parseInt(document.getElementById("childAdjustmentPoints").value, 10);
  const reason = document.getElementById("childAdjustmentReason").value.trim();
  if (!points || !reason) return;
  try {
    await appendLedgerRow([crypto.randomUUID().slice(0, 8), new Date().toISOString(), current.id, "adjustment", reason, points], `Adjustment: ${reason}`);
    document.getElementById("childAdjustmentForm").reset();
    showChildStatus("Adjustment saved.", false);
    await loadChild();
  } catch (error) {
    showChildStatus(error.message, true);
  }
});

loadChild().catch((error) => showChildStatus(error.message, true));
