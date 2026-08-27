# Arbitrage Radar — Release 1.7

Near Me stability release.

## What is fixed
- GPS runs from an explicit user tap and reports READY or FAILED instead of silently hanging.
- GPS success shows coordinates and approximate accuracy.
- Retry GPS button.
- Nearby sourcing buttons appear before the embedded map and work independently of it.
- Individual searches for Walmart, TJ Maxx, Marshalls, Burlington, Ross, Ollie's, Home Depot, Lowe's, Target, bin/return stores, liquidation, thrift, flea markets, estate sales, garage sales, and auctions.
- If GPS fails, those buttons still open Google Maps using “near me.”
- Diagnostics show HTTPS, location permission, GPS, map-library status, and optional mapped-directory status.
- The mapped-place service is now explicitly optional; it cannot block Near Me.
- Service worker cache bumped to 1.7 with immediate activation behavior.

## Deliberate limitation
The app does not fabricate business pins. If the optional mapped directory cannot return businesses, the embedded map remains a location/base map while the Google Maps search buttons provide current business discovery.

## Update
Upload everything inside this folder over the existing GitHub repository and commit to `main`.
