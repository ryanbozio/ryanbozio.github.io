// Parent admin panel: reads CSV data and commits changes directly through GitHub OAuth.

const GITHUB_TOKEN_STORAGE_KEY = "ticketTrackerGithubToken";
let githubToken = sessionStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);

function showStatus(message, isError) {
  const el = document.getElementById("ticketStatus");
  el.textContent = message;
  el.className = `ticket-status ticket-status-visible ${isError ? "ticket-status-error" : "ticket-status-success"}`;
}

function updateAuthControls(login = "") {
  document.getElementById("githubSignIn").hidden = Boolean(githubToken);
  document.getElementById("githubSignOut").hidden = !githubToken;
  document.getElementById("githubIdentity").textContent = login ? `Signed in as ${login}` : githubToken ? "Signed in" : "";
}

async function githubApi(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub request failed (${response.status})`);
  return data;
}

function textToBase64(text) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

function base64ToText(base64) {
  return new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\n/g, "")), (char) => char.charCodeAt(0)));
}

function csvField(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function newId() {
  return crypto.randomUUID().slice(0, 8);
}

async function appendCsvRow(path, fields, message) {
  if (!githubToken) throw new Error("Sign in with GitHub before making changes.");
  const file = await githubApi(`/repos/${GITHUB_REPOSITORY}/contents/${path}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
  const current = base64ToText(file.content);
  const updated = `${current.replace(/\n?$/, "")}\n${fields.map(csvField).join(",")}\n`;
  await githubApi(`/repos/${GITHUB_REPOSITORY}/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: textToBase64(updated), sha: file.sha, branch: GITHUB_BRANCH }),
  });
}

async function saveAction(action, payload) {
  switch (action) {
    case "add_child":
      await appendCsvRow("docs/data/children.csv", [newId(), payload.name, payload.color || "#4a90d9"], `Add child ${payload.name}`);
      break;
    case "add_chore":
      await appendCsvRow("docs/data/chores.csv", [newId(), payload.name, payload.points], `Add chore ${payload.name}`);
      break;
    case "add_prize":
      await appendCsvRow("docs/data/prizes.csv", [newId(), payload.name, payload.cost, payload.category || "other"], `Add prize ${payload.name}`);
      break;
    case "log_chore":
    case "adjustment":
    case "redeem": {
      const points = action === "redeem" ? -Math.abs(payload.cost) : payload.points;
      const description = action === "adjustment" ? payload.reason : payload.description;
      await appendCsvRow("docs/data/ledger.csv", [newId(), new Date().toISOString(), payload.childId, action === "log_chore" ? "chore" : action === "redeem" ? "redemption" : "adjustment", description, points], `Ticket ${action}: ${description}`);
      break;
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
  showStatus("Saved! GitHub Pages may take ~a minute to rebuild before the dashboard reflects this.", false);
}

async function signInWithGitHub() {
  if (!GITHUB_OAUTH_CLIENT_ID || GITHUB_OAUTH_CLIENT_ID.startsWith("PASTE_")) {
    throw new Error("Set GITHUB_OAUTH_CLIENT_ID before signing in.");
  }
  const deviceResponse = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GITHUB_OAUTH_CLIENT_ID, scope: "repo" }),
  });
  const device = await deviceResponse.json();
  if (!deviceResponse.ok) throw new Error(device.error_description || "Could not start GitHub sign-in.");
  showStatus(`Enter code ${device.user_code} at ${device.verification_uri}.`, false);
  window.open(device.verification_uri, "_blank", "noopener");
  const expiresAt = Date.now() + device.expires_in * 1000;
  const pollForToken = async () => {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: GITHUB_OAUTH_CLIENT_ID, device_code: device.device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }),
    });
    const data = await response.json();
    if (data.access_token) return data.access_token;
    if (data.error === "authorization_pending" && Date.now() < expiresAt) {
      await new Promise((resolve) => setTimeout(resolve, device.interval * 1000));
      return pollForToken();
    }
    throw new Error(data.error_description || "GitHub sign-in expired or was declined.");
  };
  githubToken = await pollForToken();
  sessionStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, githubToken);
  const user = await githubApi("/user");
  updateAuthControls(user.login);
  showStatus("Signed in with GitHub.", false);
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
  await saveAction("log_chore", { childId, description: chore.name, points: parseInt(chore.points, 10) });
  await loadData();
});

document.getElementById("adjustmentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const childId = document.getElementById("adjustmentChild").value;
  const points = parseInt(document.getElementById("adjustmentPoints").value, 10);
  const reason = document.getElementById("adjustmentReason").value.trim() || "Behavior adjustment";
  if (!points) return;
  await saveAction("adjustment", { childId, points, reason });
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
  await saveAction("redeem", { childId, description: prize.name, cost: parseInt(prize.cost, 10) });
  await loadData();
});

document.getElementById("addChildForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("addChildName").value.trim();
  const color = document.getElementById("addChildColor").value;
  if (!name) return;
  await saveAction("add_child", { name, color });
  document.getElementById("addChildForm").reset();
  await loadData();
});

document.getElementById("addChoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("addChoreName").value.trim();
  const points = parseInt(document.getElementById("addChorePoints").value, 10);
  if (!name || Number.isNaN(points)) return;
  await saveAction("add_chore", { name, points });
  document.getElementById("addChoreForm").reset();
  await loadData();
});

document.getElementById("addPrizeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("addPrizeName").value.trim();
  const cost = parseInt(document.getElementById("addPrizeCost").value, 10);
  const category = document.getElementById("addPrizeCategory").value;
  if (!name || Number.isNaN(cost)) return;
  await saveAction("add_prize", { name, cost, category });
  document.getElementById("addPrizeForm").reset();
  await loadData();
});

document.getElementById("githubSignIn").addEventListener("click", () => {
  signInWithGitHub().catch((error) => showStatus(error.message, true));
});

document.getElementById("githubSignOut").addEventListener("click", () => {
  sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
  githubToken = null;
  updateAuthControls();
  showStatus("Signed out.", false);
});

loadData().catch((err) => {
  console.error(err);
  showStatus(`Couldn't load ticket data: ${err.message}`, true);
});

if (githubToken) {
  githubApi("/user")
    .then((user) => updateAuthControls(user.login))
    .catch(() => {
      sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
      githubToken = null;
      updateAuthControls();
    });
} else {
  updateAuthControls();
}
