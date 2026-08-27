# Arbitrage Radar — Release 1.1.1

Production cleanup release.

## What changed
- Removed all built-in/sample clearance opportunities.
- Automatically purges the six legacy V4 demo deal records from existing installs.
- Manual clearance entries are labeled `MANUAL`.
- CSV-imported clearance entries are labeled `IMPORTED`.
- Live local sourcing results remain separate from clearance cards.
- Empty Radar/Home states now remain honestly empty until real data is entered/imported.
- Replaced “Restore demo data” with “Clear clearance data.”
- Preserves settings, purchased inventory, watchlist, treasure terms, and saved route data.
- Bumped the service-worker cache so installed PWAs update.

## Update
Upload everything in this folder over the existing GitHub repository files and commit to `main`.
GitHub Pages will redeploy automatically. Close/reopen the installed app; if needed, refresh the HTTPS site once in Chrome.
