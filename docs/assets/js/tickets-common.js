// Shared helpers for the ticket tracker pages: CSV fetching/parsing and balance math.

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
