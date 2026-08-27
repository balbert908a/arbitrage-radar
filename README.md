# Arbitrage Radar — Release 1.6

Near Me reliability release.

## What changed
- Keeps the working GPS + Leaflet/OpenStreetMap map.
- Adds a reliable GPS-aware "Search nearby sourcing" layer that does not depend on the failing structured directory endpoint.
- One-tap current Google Maps searches for:
  - Priority retailers: Walmart, TJ Maxx, Marshalls, Burlington, Ross, Ollie's, Lowe's, Home Depot, Target
  - Return & bin stores
  - Liquidation / overstock
  - Thrift / resale
  - Flea markets
  - Estate sales
  - Garage / yard sales
  - Auctions
- Search links use Google Maps URLs and do not require a Google Maps API key.
- If automatic mapped-place discovery fails, the app now explains that GPS still works and directs the user to the reliable search layer rather than presenting the whole Near Me feature as broken.
- Preserves My Sourcing Intelligence, Hunt Mode, inventory, routes, clearance data and existing local storage.
- No retailer partnerships or private retailer API credentials required.

## Important
The embedded map can only show pins supplied by a working mapped-place data source. Release 1.6 does not fabricate pins. The reliable fallback opens current Google Maps search results centered on the user's GPS location.

## Update
Upload everything inside this folder over the existing GitHub repository and commit to `main`.
