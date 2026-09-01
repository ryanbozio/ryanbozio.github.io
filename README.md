# ryanbozio.github.io

## Ticket admin setup

The ticket dashboard reads its data directly from the CSV files in `docs/data/`.
The parent admin page commits updates to those files through the GitHub API with
a token you provide for the current browser session.

1. Create a fine-grained personal access token at
	https://github.com/settings/personal-access-tokens/new.
2. Limit repository access to `ryanbozio/ryanbozio.github.io` and grant
	**Contents: Read and write** permission.
3. Paste the token into the GitHub token field on `/tickets/admin/` and select
	**Connect**. The token is stored only in that browser tab's session storage
	and is removed on disconnect or when the tab closes.

Each successful admin action adds one row to the relevant CSV and commits it to
the `main` branch. GitHub Pages will publish the updated data after its normal
build completes.