# Arbitrage Radar — Release 2.0

Recommendation-engine release.

Near Me is now recommendation-first. The broken embedded directory/map experience is no longer the primary workflow.

## Working experience
- Find opportunities near me → GPS → ranked recommendations.
- Every sourcing category is a real working button.
- Every retailer shortcut is a working Google Maps search.
- Recommendation cards have working Directions / Live Search actions.
- In northeastern Pennsylvania the app includes verified real sourcing locations for immediate recommendations: T.J. Maxx (Honesdale and Dickson City), Walmart (Honesdale and Dickson City), Home Depot Honesdale, Marshalls Dickson City, Burlington Dickson City, Lowe's Dickson City, and Ollie's Scranton.
- Verified place does not mean live clearance inventory; Hunt Mode still verifies the item/price.
- Multiple OpenStreetMap/Overpass endpoints are tried for additional current places; failure never blocks recommendations.
- Estate/garage recommendations use Treasure Watch terms in live searches.
- Personal Sourcing Intelligence boosts places that have produced profitable saved buys.

## Update reliability
Core app files are now network-first, old service-worker caches are deleted on activation, and the new worker claims open clients immediately. This is intended to prevent mixed/stale releases.

## Update
Upload everything inside this folder over the existing GitHub repository and commit to main.
