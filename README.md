# Arbitrage Radar — Release 1.1

Release 1.1 builds on the installed Release 1.0 and preserves the same localStorage data.

## New in 1.1

- Embedded interactive OpenStreetMap/Leaflet map inside **Near Me**
- GPS search center with mapped sourcing pins
- Pan the map and use **Search this map area** to scan a different location
- Pin popups with source type, approximate straight-line distance and Google Maps directions
- Map legend tied to the current source filter
- Expanded retailer dropdown and retail discovery for TJ Maxx, Marshalls, Burlington, Ross Dress for Less, Ollie's Bargain Outlet, Five Below, Dollar Tree, Family Dollar, Walgreens, CVS, Macy's, Kohl's, Best Buy, Staples, Office Depot, Tractor Supply and Harbor Freight, plus the existing major chains
- TJ Maxx/Marshalls/Burlington are treated as **online clearance leads / in-store verification**, not as proof of local shelf price
- Release cache updated so installed PWAs pick up the new build

## Existing features retained

- Clearance Radar, Penny Watch, ROI/profit scoring and CSV imports
- Live OpenStreetMap/Overpass local-business discovery
- Return & bin stores, liquidation, flea markets, thrift stores, auctions and retail sourcing
- Current web/Maps discovery for estate and garage/yard sales
- Treasure Watch terms
- Multi-stop Google Maps sourcing routes
- Barcode/photo Hunt Mode
- eBay sold/completed and active-listing searches
- BUY/PASS math, inventory, watchlist and listing prep

## Data integrity

The embedded map shows public mapped locations returned by OpenStreetMap/Overpass. Coverage varies. Retailer online clearance does not prove an item or price exists at a specific local store. Estate/garage-sale events remain current search links until a reliable structured event provider is connected.

## Deploy over the existing GitHub Pages app

1. Extract `Arbitrage_Radar_Release_1.1.zip`.
2. Open the `arbitrage_radar_release_1_1` folder.
3. In the existing `arbitrage-radar` GitHub repository choose **Add file → Upload files**.
4. Upload everything inside this folder to the repository root, including `icons`.
5. Commit the replacements to `main`.
6. GitHub Pages redeploys automatically.
7. Reopen the installed app. If the old version persists, open the site once in Chrome and refresh.

The embedded map library and map tiles require an internet connection. The rest of the PWA shell continues to use the service-worker cache.
