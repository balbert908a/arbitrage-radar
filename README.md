# Arbitrage Radar — Release 1.2

Live-data foundation release.

## Changes
- Corrects the visible release badge.
- Keeps production clearance data empty until a real source exists.
- Adds a configurable LIVE clearance feed connector for permitted JSON/CSV sources.
- Feed results are labeled LIVE and carry last-seen timestamps.
- Does not scrape retailer websites or fabricate local price/inventory.
- Keeps GPS/local sourcing, Hunt Mode, eBay sold-search links, routes, inventory, manual entries and CSV imports.
- Preserves existing local data and settings.

## Live feed fields
Supported fields include: `id`, `retailer`, `storeName`/`location`, `item`/`title`, `buy`/`price`,
`was`/`regularPrice`, `resale`, `distance`, `confidence`, `qty`, `penny`, `newMarkdown`, `lastSeen`.

## Update
Upload everything inside this folder over the existing GitHub repository and commit to `main`.
