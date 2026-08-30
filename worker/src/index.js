// Cloudflare Worker: receives admin actions from the static ticket-tracker pages and
// writes them to CSV files in the GitHub repo via the Contents API (which auto-commits).

const ADMIN_PASSWORD = "Boziofam19!";

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

function timingSafeEqual(a, b) {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToText(base64) {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function textToBase64(text) {
  return bytesToBase64(new TextEncoder().encode(text));
}

function csvField(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

async function githubRequest(env, path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "ticket-tracker-worker",
      Accept: "application/vnd.github+json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API ${options.method || "GET"} ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function appendCsvRow(env, path, fields, message) {
  const file = await githubRequest(env, `${path}?ref=${env.GITHUB_BRANCH}`);
  const current = base64ToText(file.content);
  const newLine = fields.map(csvField).join(",");
  const updated = current.replace(/\n?$/, "") + "\n" + newLine + "\n";
  await githubRequest(env, path, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: textToBase64(updated),
      sha: file.sha,
      branch: env.GITHUB_BRANCH,
    }),
  });
}

function newId() {
  return crypto.randomUUID().slice(0, 8);
}

async function handleAction(env, action, payload) {
  switch (action) {
    case "add_child":
      return appendCsvRow(
        env,
        "docs/data/children.csv",
        [newId(), payload.name, payload.color || "#4a90d9"],
        `Add child ${payload.name}`
      );
    case "add_chore":
      return appendCsvRow(
        env,
        "docs/data/chores.csv",
        [newId(), payload.name, payload.points],
        `Add chore '${payload.name}' (${payload.points} pts)`
      );
    case "add_prize":
      return appendCsvRow(
        env,
        "docs/data/prizes.csv",
        [newId(), payload.name, payload.cost, payload.category || "other"],
        `Add prize '${payload.name}' (${payload.cost} pts)`
      );
    case "log_chore":
      return appendCsvRow(
        env,
        "docs/data/ledger.csv",
        [newId(), new Date().toISOString(), payload.childId, "chore", payload.description, payload.points],
        `Log chore '${payload.description}' (+${payload.points})`
      );
    case "adjustment":
      return appendCsvRow(
        env,
        "docs/data/ledger.csv",
        [newId(), new Date().toISOString(), payload.childId, "adjustment", payload.reason, payload.points],
        `Adjustment: ${payload.reason} (${payload.points > 0 ? "+" : ""}${payload.points})`
      );
    case "redeem":
      return appendCsvRow(
        env,
        "docs/data/ledger.csv",
        [newId(), new Date().toISOString(), payload.childId, "redemption", payload.description, -Math.abs(payload.cost)],
        `Redeem '${payload.description}' (-${Math.abs(payload.cost)})`
      );
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, env);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, env);
    }

    const { password, action, payload } = body || {};
    if (!timingSafeEqual(String(password || ""), ADMIN_PASSWORD)) {
      return json({ error: "Unauthorized" }, 401, env);
    }
    if (!action || typeof payload !== "object") {
      return json({ error: "Missing action or payload" }, 400, env);
    }

    try {
      await handleAction(env, action, payload);
      return json({ ok: true }, 200, env);
    } catch (err) {
      return json({ error: err.message }, 500, env);
    }
  },
};
