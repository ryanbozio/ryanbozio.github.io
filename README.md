# ryanbozio.github.io

## Ticket admin setup

The ticket dashboard reads its data directly from the CSV files in `docs/data/`.
The parent admin page commits updates to those files through the GitHub API after
you sign in with GitHub.

1. Create a GitHub OAuth App at https://github.com/settings/developers.
2. Set its homepage URL to `https://ryanbozio.github.io`.
3. Copy its Client ID into `GITHUB_OAUTH_CLIENT_ID` in
	`docs/tickets-admin.markdown`.
4. Sign in on `/tickets/admin/` with a GitHub account that has write access to
	this repository. The access token is stored only in that browser tab's
	session storage and is removed on sign-out or when the tab closes.

Each successful admin action adds one row to the relevant CSV and commits it to
the `main` branch. GitHub Pages will publish the updated data after its normal
build completes.