# Arbitrage Radar V4 — Local Sourcing Radar

V4 is the master phone-first PWA. It combines Clearance Radar, Penny Watch, Hunt Mode, BUY/PASS math, inventory/listing prep and a GPS-powered Local Sourcing Radar.

## New in V4

- Return & Bin Stores (including searches for return stores, bin stores, liquidation bins, overstock and Amazon-returns terminology)
- Liquidation / Overstock
- Estate Sales
- Garage / Yard Sales
- Flea Markets
- Thrift Stores
- Auctions
- Retail Clearance
- GPS radius: 5 / 10 / 25 / 50 miles
- Treasure Watches for terms such as sterling, watches, tools and toys
- TODAY source tiles and source-priority scoring
- Live discovery links to Maps/search rather than fake local results

## Installation

Host this folder on any HTTPS static host, open the URL in Chrome on Android, and use **Install app** / **Add to Home screen**. GPS, camera and service-worker features require HTTPS (localhost is also allowed for testing).

## Important data note

The packaged app does not claim to have live retailer inventory, current estate-sale listings, or eBay sold comps. V4 opens current local discovery searches from your GPS location and keeps the internal data model ready for approved live APIs/connectors. This avoids showing fabricated opportunities.

## Files

`index.html` app shell; `app.js` logic/data; `styles.css` UI; `manifest.webmanifest` install metadata; `sw.js` offline shell; `sample_deals.csv` import example.
