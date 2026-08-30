# Ticket Tracker Worker

A tiny Cloudflare Worker that lets the static GitHub Pages site at `docs/tickets/admin/`
write to the CSV files under `docs/data/` by committing directly to GitHub via the
Contents API (no server to host, no local git needed).

## How it fits together
- `docs/tickets/` (public dashboard) and `docs/tickets/admin/` (parent admin) are plain
  static pages, served by GitHub Pages. They read `docs/data/*.csv` directly.
- The admin page calls this Worker over HTTPS with `{ password, action, payload }`.
- The Worker checks the password against a secret, then uses a GitHub token to fetch,
  modify, and commit the relevant CSV file. Every action = one commit.
- After a commit, GitHub Pages rebuilds automatically (usually under a minute) and the
  dashboard/admin page will show the update on next load.

## One-time setup
1. Install [Node.js](https://nodejs.org/) and the Cloudflare Wrangler CLI:
   ```powershell
   cd worker
   npm install
   npx wrangler login
   ```
2. Edit `wrangler.toml`:
   - `GITHUB_REPO`: `owner/repo` (e.g. `ryanbozio/BozioStore`).
   - `GITHUB_BRANCH`: usually `main`.
   - `ALLOWED_ORIGIN`: your GitHub Pages URL (e.g. `https://ryanbozio.github.io`).
3. Create a GitHub **fine-grained personal access token**
   (Settings → Developer settings → Fine-grained tokens) scoped to just this repo,
   with **Contents: Read and write** permission only. Then set it as a Worker secret:
   ```powershell
   npx wrangler secret put GITHUB_TOKEN
   ```
4. Pick a parent password and set it as a secret (stored encrypted by Cloudflare, never
   sent to the browser):
   ```powershell
   npx wrangler secret put ADMIN_PASSWORD
   ```
5. Deploy:
   ```powershell
   npx wrangler deploy
   ```
   Wrangler prints a URL like `https://ticket-tracker.<your-subdomain>.workers.dev`.
6. Paste that URL into `TICKET_WORKER_URL` in
   [docs/tickets-admin.markdown](../docs/tickets-admin.markdown), commit, and push.

## Notes
- The Worker is stateless — it doesn't store any ticket data itself, it only relays
  writes to GitHub. All data lives in `docs/data/*.csv` in this repo.
- If two updates happen at the exact same moment there's a small chance of a commit
  conflict (stale `sha`); the failed request will show an error and can just be retried.
- Cloudflare Workers' free tier (100k requests/day) is far more than a family needs.
