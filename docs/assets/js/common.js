// Shared helpers for the app tracker pages: session, CSV parsing, and balance math.

const APP_TOKEN_KEY = "familyAppGithubToken";
const APP_CART_KEY = "familyAppPendingActions";

function appSession() {
  return {
    token: sessionStorage.getItem(APP_TOKEN_KEY),
    login: sessionStorage.getItem("familyAppGithubLogin"),
  };
}

function requireActionLogin() {
  const session = appSession();
  if (!session.token || !session.login) {
    window.location.replace("/Login/");
    return false;
  }
  return true;
}

function appLogout() {
  sessionStorage.removeItem(APP_TOKEN_KEY);
  sessionStorage.removeItem("familyAppGithubLogin");
  sessionStorage.removeItem(APP_CART_KEY);
  window.location.replace("/Login/");
}

function pendingCart() {
  try {
    return JSON.parse(sessionStorage.getItem(APP_CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePendingCart(actions) {
  sessionStorage.setItem(APP_CART_KEY, JSON.stringify(actions));
  updateCartNav();
}

function addPendingAction(action, payload, label) {
  const actions = pendingCart();
  actions.push({ id: crypto.randomUUID().slice(0, 8), action, payload, label });
  savePendingCart(actions);
}

function removePendingAction(actionId) {
  savePendingCart(pendingCart().filter((action) => action.id !== actionId));
}

function clearPendingCart() {
  savePendingCart([]);
}

function updateCartNav() {
  const count = document.getElementById("cartCount");
  if (count) count.textContent = pendingCart().length;
}

function cartTextToBase64(text) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

function cartBase64ToText(base64) {
  return new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\n/g, "")), (character) => character.charCodeAt(0)));
}

function csvField(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function applyPendingCart() {
  const actions = pendingCart();
  if (!actions.length) throw new Error("Your cart is empty.");
  const session = appSession();
  if (!session.token || !session.login) throw new Error("Sign in before applying the cart.");

  async function githubRequest(path, options = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${session.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `GitHub request failed (${response.status})`);
    return data;
  }

  const paths = ["docs/data/children.csv", "docs/data/chores.csv", "docs/data/prizes.csv", "docs/data/ledger.csv"];
  const files = {};
  for (const path of paths) {
    const file = await githubRequest(`/repos/${GITHUB_REPOSITORY}/contents/${path}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
    const text = cartBase64ToText(file.content);
    files[path] = { sha: file.sha, text, headers: text.split(/\r?\n/, 1)[0], rows: parseCSV(text) };
  }

  const children = files["docs/data/children.csv"].rows;
  const ledger = files["docs/data/ledger.csv"].rows;
  const balances = computeBalances(ledger);
  const usedRedemptionIds = new Set(ledger.filter((entry) => entry.type === "redemption_used").map((entry) => entry.description));
  const additions = Object.fromEntries(paths.map((path) => [path, []]));

  function requireChild(childId) {
    if (!children.some((child) => child.id === childId)) throw new Error("Cannot apply cart: the selected child no longer exists.");
  }

  for (const queued of actions) {
    const payload = queued.payload;
    if (queued.action === "add_chore") {
      additions["docs/data/chores.csv"].push([crypto.randomUUID().slice(0, 8), payload.name, payload.points, payload.category]);
    } else if (queued.action === "add_prize") {
      additions["docs/data/prizes.csv"].push([crypto.randomUUID().slice(0, 8), payload.name, payload.cost, payload.category]);
    } else if (queued.action === "log_chore") {
      requireChild(payload.childId);
      const row = [crypto.randomUUID().slice(0, 8), new Date().toISOString(), payload.childId, "chore", payload.description, payload.points];
      additions["docs/data/ledger.csv"].push(row);
      ledger.push({ id: row[0], timestamp: row[1], child_id: row[2], type: row[3], description: row[4], points: row[5] });
      balances[payload.childId] = (balances[payload.childId] || 0) + Number(payload.points || 0);
    } else if (queued.action === "adjustment") {
      requireChild(payload.childId);
      const points = Number(payload.points);
      if (!Number.isFinite(points) || points === 0 || !payload.reason) throw new Error("Cannot apply cart: the behavior adjustment is invalid.");
      const row = [crypto.randomUUID().slice(0, 8), new Date().toISOString(), payload.childId, "adjustment", payload.reason, points];
      additions["docs/data/ledger.csv"].push(row);
      ledger.push({ id: row[0], timestamp: row[1], child_id: row[2], type: row[3], description: row[4], points: row[5] });
      balances[payload.childId] = (balances[payload.childId] || 0) + points;
    } else if (queued.action === "redeem") {
      requireChild(payload.childId);
      const cost = Math.abs(Number(payload.cost));
      if ((balances[payload.childId] || 0) < cost) {
        throw new Error(`Cannot apply cart: ${payload.name} needs ${cost} Bozio Bucks, but only ${balances[payload.childId] || 0} are available.`);
      }
      const row = [crypto.randomUUID().slice(0, 8), new Date().toISOString(), payload.childId, "redemption", payload.name, -cost];
      additions["docs/data/ledger.csv"].push(row);
      ledger.push({ id: row[0], timestamp: row[1], child_id: row[2], type: row[3], description: row[4], points: row[5] });
      balances[payload.childId] -= cost;
    } else if (queued.action === "use_redemption") {
      requireChild(payload.childId);
      const redemption = ledger.find((entry) => entry.id === payload.redemptionId && entry.child_id === payload.childId && entry.type === "redemption");
      if (!redemption || usedRedemptionIds.has(payload.redemptionId)) throw new Error("Cannot apply cart: that prize has already been used or no longer exists.");
      const row = [crypto.randomUUID().slice(0, 8), new Date().toISOString(), payload.childId, "redemption_used", payload.redemptionId, 0];
      additions["docs/data/ledger.csv"].push(row);
      usedRedemptionIds.add(payload.redemptionId);
    } else {
      throw new Error(`Cannot apply cart: unknown action ${queued.action}.`);
    }
  }

  const changedFiles = [];
  for (const path of paths) {
    const rows = additions[path];
    if (!rows.length) continue;
    const file = files[path];
    const updated = `${file.text.replace(/\n?$/, "")}\n${rows.map((row) => row.map(csvField).join(",")).join("\n")}\n`;
    changedFiles.push({ path, content: updated });
  }

  const branchRef = await githubRequest(`/repos/${GITHUB_REPOSITORY}/git/ref/heads/${encodeURIComponent(GITHUB_BRANCH)}`);
  const headCommit = await githubRequest(`/repos/${GITHUB_REPOSITORY}/git/commits/${branchRef.object.sha}`);
  const treeEntries = [];
  for (const file of changedFiles) {
    const blob = await githubRequest(`/repos/${GITHUB_REPOSITORY}/git/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: cartTextToBase64(file.content), encoding: "base64" }),
    });
    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await githubRequest(`/repos/${GITHUB_REPOSITORY}/git/trees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: treeEntries }),
  });
  const commit = await githubRequest(`/repos/${GITHUB_REPOSITORY}/git/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `Apply cart (${actions.length} actions)`, tree: tree.sha, parents: [branchRef.object.sha] }),
  });
  await githubRequest(`/repos/${GITHUB_REPOSITORY}/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  clearPendingCart();
}

async function fetchCSV(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return parseCSV(await res.text());
}

// Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes, commas in quotes.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const filtered = rows.filter((r) => r.some((cell) => cell !== ""));
  if (filtered.length === 0) return [];
  const [header, ...body] = filtered;
  return body.map((cells) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key.trim()] = cells[idx] !== undefined ? cells[idx] : "";
    });
    return obj;
  });
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function computeBalances(ledger) {
  const balances = {};
  for (const entry of ledger) {
    const childId = entry.child_id;
    const points = parseInt(entry.points, 10) || 0;
    balances[childId] = (balances[childId] || 0) + points;
  }
  return balances;
}

function pendingRedemptions(ledger, childId) {
  const usedIds = new Set(
    ledger.filter((entry) => entry.type === "redemption_used").map((entry) => entry.description)
  );
  return ledger.filter(
    (entry) => entry.child_id === childId && entry.type === "redemption" && !usedIds.has(entry.id)
  );
}

function formatActivityDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

window.addEventListener("storage", updateCartNav);
updateCartNav();

