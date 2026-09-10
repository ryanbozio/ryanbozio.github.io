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
  document.getElementById("childChore").innerHTML = chores.map((chore) => `<option value="${chore.id}">${escapeHtml(chore.name)} (+${chore.points})</option>`).join("");
  const history = ledger.filter((entry) => entry.child_id === current.id).reverse();
  document.getElementById("childHistory").innerHTML = history.length ? history.map((entry) => `<tr><td>${escapeHtml(entry.timestamp)}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.description)}</td><td class="${entry.points >= 0 ? "app-positive" : "app-negative"}">${entry.points > 0 ? "+" : ""}${entry.points}</td></tr>`).join("") : '<tr><td colspan="4">No activity yet.</td></tr>';
}

document.getElementById("childChoreForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const chore = childState.chores.find((item) => item.id === document.getElementById("childChore").value);
  const current = childState.children.find((child) => child.id === childId);
  try {
    await appendLedgerRow([crypto.randomUUID().slice(0, 8), new Date().toISOString(), current.id, "chore", chore.name, chore.points], `Log chore: ${chore.name}`);
    showChildStatus("Chore logged.", false);
    await loadChild();
  } catch (error) {
    showChildStatus(error.message, true);
  }
});

loadChild().catch((error) => showChildStatus(error.message, true));
