# Arbitrage Radar — Release 2.3

This release merges the evidence engine with the full in-store workflow.

## Restored / added
- Live phone-camera barcode scanning using the browser BarcodeDetector API when supported.
- Manual UPC/EAN entry fallback.
- Photo capture for bins, thrift, estate-sale and no-barcode items.
- eBay SOLD search, eBay active search and Google item search from the same screen.
- Actual shelf-price entry.
- BUY/PASS based on configurable minimum net profit + ROI, not a numeric opportunity score.
- Save sighting, scan history and saved buys.
- Retailer + store/location capture, including GPS coordinate capture.
- Radar leads can be sent directly into the scanner and remain linked as the active lead.
- Slickdeals + Reddit remain first-class evidence sources in Radar/Community.

## Important
Photo capture stores the image with the local scan record. Release 2.3 does not perform AI image identification in the static GitHub Pages build.
Barcode camera detection depends on browser support. Manual barcode entry and photo capture remain available as fallback.

## Update
Upload all contents of this folder over the existing repository, including the `data` folder.
