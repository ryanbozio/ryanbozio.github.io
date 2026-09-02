// Parent admin panel: reads CSV data and commits changes through the GitHub API.

const GITHUB_TOKEN_STORAGE_KEY = "ticketTrackerGithubToken";
let githubToken = sessionStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);
let githubLogin = "";

function showStatus(message, isError) {
  const el = document.getElementById("ticketStatus");
  el.textContent = message;
  el.className = `ticket-status ticket-status-visible ${isError ? "ticket-status-error" : "ticket-status-success"}`;
}

function updateAuthControls(login = "") {
  document.getElementById("githubToken").hidden = Boolean(githubToken);
  document.getElementById("githubConnect").hidden = Boolean(githubToken);
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
  if (!response.ok) {
    const error = new Error(data.message || `GitHub request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
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

function pendingRedemptions(ledger, childId) {
  const usedRedemptionIds = new Set(
    ledger.filter((entry) => entry.type === "redemption_used").map((entry) => entry.description)
  );
  return ledger.filter((entry) => entry.child_id === childId && entry.type === "redemption" && !usedRedemptionIds.has(entry.id));
}

async function appendCsvRow(path, fields, message) {
  if (!githubToken) throw new Error("Sign in with GitHub before making changes.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const file = await githubApi(`/repos/${GITHUB_REPOSITORY}/contents/${path}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
    const current = base64ToText(file.content);
    const updated = `${current.replace(/\n?$/, "")}\n${fields.map(csvField).join(",")}\n`;
    try {
      await githubApi(`/repos/${GITHUB_REPOSITORY}/contents/${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, content: textToBase64(updated), sha: file.sha, branch: GITHUB_BRANCH }),
      });
      return;
    } catch (error) {
      if (error.status !== 409 || attempt === 2) throw error;
    }
  }
}

async function saveAction(action, payload) {
  switch (action) {
    case "add_child":
      await appendCsvRow("docs/data/children.csv", [newId(), payload.name, payload.color || "#4a90d9", payload.githubUsername], `Add child ${payload.name}`);
      break;
    case "add_chore":
      await appendCsvRow("docs/data/chores.csv", [newId(), payload.name, payload.points], `Add chore ${payload.name}`);
      break;
    case "add_prize":
      await appendCsvRow("docs/data/prizes.csv", [newId(), payload.name, payload.cost, payload.category || "other"], `Add prize ${payload.name}`);
      break;
    case "log_chore":
    case "adjustment":
    case "redeem":
    case "use_redemption": {
      const points = action === "redeem" ? -Math.abs(payload.cost) : payload.points;
      const description = action === "adjustment" ? payload.reason : action === "use_redemption" ? payload.redemptionId : payload.description;
      const type = action === "log_chore" ? "chore" : action === "redeem" ? "redemption" : action === "use_redemption" ? "redemption_used" : "adjustment";
      await appendCsvRow("docs/data/ledger.csv", [newId(), new Date().toISOString(), payload.childId, type, description, points || 0], `Ticket ${action}: ${description}`);
      break;
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
  showStatus("Saved! GitHub Pages may take ~a minute to rebuild before the dashboard reflects this.", false);
}

async function submitAction(action, payload, afterSave) {
  try {
    await saveAction(action, payload);
    if (afterSave) afterSave();
    await loadData();
  } catch (error) {
    console.error(error);
    showStatus(error.message, true);
  }
}

async function connectGitHub() {
  githubToken = document.getElementById("githubToken").value.trim();
  if (!githubToken) throw new Error("Paste a GitHub token first.");
  const user = await githubApi("/user");
  githubLogin = user.login.toLowerCase();
  sessionStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, githubToken);
  document.getElementById("githubToken").value = "";
  updateAuthControls(user.login);
  renderAll();
  showStatus("Connected to GitHub.", false);
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
  const managedChildren = githubLogin ? children.filter((child) => child.github_username.toLowerCase() === githubLogin) : [];
  const balances = computeBalances(ledger);
  const childrenById = Object.fromEntries(children.map((c) => [c.id, c]));

  const cardsEl = document.getElementById("ticketCards");
  cardsEl.innerHTML = managedChildren
    .map(
      (c) => {
        const prizes = pendingRedemptions(ledger, c.id);
        const prizeList = prizes.length
          ? `<ul class="ticket-prizes">${prizes.map((prize) => `<li><span>${escapeHtml(prize.description)}</span><button type="button" class="ticket-use-prize" data-child-id="${escapeHtml(c.id)}" data-redemption-id="${escapeHtml(prize.id)}">Use</button></li>`).join("")}</ul>`
          : "";
        return `<div class="ticket-card" style="border-top-color:${c.color || "#4a90d9"}"><h3>${escapeHtml(c.name)}</h3><p class="ticket-balance">${balances[c.id] || 0} 🎟️</p>${prizeList}</div>`;
      }
    )
    .join("") || `<p>${githubLogin ? "No kids are assigned to this GitHub account." : "Connect a GitHub token to manage kids."}</p>`;

  cardsEl.querySelectorAll(".ticket-use-prize").forEach((button) => {
    button.addEventListener("click", () => {
      button.disabled = true;
      submitAction("use_redemption", { childId: button.dataset.childId, redemptionId: button.dataset.redemptionId });
    });
  });

  fillSelect(document.getElementById("logChoreChild"), managedChildren, (c) => c.name);
  fillSelect(document.getElementById("adjustmentChild"), managedChildren, (c) => c.name);
  fillSelect(document.getElementById("redeemChild"), managedChildren, (c) => c.name);
  fillSelect(document.getElementById("logChoreChore"), chores, (c) => `${c.name} (+${c.points})`);
  fillSelect(document.getElementById("redeemPrize"), prizes, (p) => `${p.name} (-${p.cost})`);

  const managedChildIds = new Set(managedChildren.map((child) => child.id));
  const rows = ledger.filter((entry) => managedChildIds.has(entry.child_id)).reverse().slice(0, 50);
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
  await submitAction("log_chore", { childId, description: chore.name, points: parseInt(chore.points, 10) });
});

document.getElementById("adjustmentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const childId = document.getElementById("adjustmentChild").value;
  const points = parseInt(document.getElementById("adjustmentPoints").value, 10);
  const reason = document.getElementById("adjustmentReason").value.trim() || "Behavior adjustment";
  if (!points) return;
  await submitAction("adjustment", { childId, points, reason }, () => document.getElementById("adjustmentForm").reset());
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
  await submitAction("redeem", { childId, description: prize.name, cost: parseInt(prize.cost, 10) });
});

document.getElementById("addChildForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("addChildName").value.trim();
  const color = document.getElementById("addChildColor").value;
  if (!name || !githubLogin) {
    showStatus("Connect a GitHub token before adding a kid.", true);
    return;
  }
  await submitAction("add_child", { name, color, githubUsername: githubLogin }, () => document.getElementById("addChildForm").reset());
});

document.getElementById("addChoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("addChoreName").value.trim();
  const points = parseInt(document.getElementById("addChorePoints").value, 10);
  if (!name || Number.isNaN(points)) return;
  await submitAction("add_chore", { name, points }, () => document.getElementById("addChoreForm").reset());
});

document.getElementById("addPrizeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("addPrizeName").value.trim();
  const cost = parseInt(document.getElementById("addPrizeCost").value, 10);
  const category = document.getElementById("addPrizeCategory").value;
  if (!name || Number.isNaN(cost)) return;
  await submitAction("add_prize", { name, cost, category }, () => document.getElementById("addPrizeForm").reset());
});

document.getElementById("githubConnect").addEventListener("click", () => {
  connectGitHub().catch((error) => {
    githubToken = null;
    updateAuthControls();
    showStatus(error.message, true);
  });
});

document.getElementById("githubSignOut").addEventListener("click", () => {
  sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
  githubToken = null;
  githubLogin = "";
  document.getElementById("githubToken").value = "";
  updateAuthControls();
  renderAll();
  showStatus("Disconnected from GitHub.", false);
});

loadData().catch((err) => {
  console.error(err);
  showStatus(`Couldn't load ticket data: ${err.message}`, true);
});

if (githubToken) {
  githubApi("/user")
    .then((user) => {
      githubLogin = user.login.toLowerCase();
      updateAuthControls(user.login);
      renderAll();
    })
    .catch(() => {
      sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
      githubToken = null;
      githubLogin = "";
      updateAuthControls();
      renderAll();
    });
} else {
  updateAuthControls();
}
