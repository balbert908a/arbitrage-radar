# Arbitrage Radar — Release 1.8

Near Me UX cleanup release.

## What changed
- Removes the failed mapped-directory service from the user-facing Near Me promise.
- Nearby sourcing buttons are now the primary business-discovery experience.
- Embedded Leaflet/OpenStreetMap view is presented as **Your location map** for GPS/search-area context.
- Removes alarming directory-failure language.
- Diagnostics now describe business discovery as **MAPS SEARCH** rather than a failed/optional directory.
- Removes the misleading emphasis on “0 mapped” business pins.
- Adds substantially more bottom scroll clearance so the fixed navigation bar does not cover sourcing buttons, diagnostics, Treasure Watches, or lower Near Me content.
- Preserves the working GPS flow, retry control, retailer/category searches, Hunt Mode, personal sourcing intelligence, inventory, and local data.
- Service-worker cache bumped to Release 1.8.

## Near Me flow
1. Tap **Use my location**.
2. GPS confirms your location.
3. Tap Walmart, TJ Maxx, Marshalls, Burlington, Ross, Ollie's, Home Depot, Lowe's, Target, bins, liquidation, thrift, flea markets, estate sales, garage sales, or auctions.
4. Current Google Maps results open around your location.
5. The embedded map provides location context only; it no longer pretends to be a reliable business directory.

## Update
Upload everything inside this folder over the existing GitHub repository and commit to `main`.
