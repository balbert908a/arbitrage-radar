# Arbitrage Radar — Release 1.3

Retailer intelligence + connector architecture release.

## Walmart is included
Walmart is a priority retailer in Release 1.3. The app supports Walmart in GPS/Near Me, Hunt Mode,
manual/imported clearance intelligence, and the permitted live-feed connector. It deliberately does
not claim Walmart store-level shelf inventory/pricing unless a legitimate source supplies it.

## Evidence model
- LIVE STORE PRICE
- ONLINE CLEARANCE LEAD
- LOCAL SOURCE
- MANUAL
- VERIFY IN STORE

## Retailer strategy
- Lowe's: official store-price/inventory/aisle API-ready.
- Walmart: priority permitted-feed + GPS/Hunt workflow.
- TJ Maxx / Marshalls: online clearance leads + verify in store.
- Burlington: clearance leads + verify in store.
- Ollie's: deal/buyout leads + local verification.
- Ross: GPS + Hunt Mode.
- Home Depot / Target: Hunt Mode + permitted external intelligence.
- eBay: active-comp API-ready + sold-search evidence.

## Security
Private API credentials must not be embedded in this GitHub Pages PWA. Real authenticated API
connections should be proxied through a small secure backend.

## Update
Upload everything inside this folder over the existing GitHub repository and commit to `main`.
