# Arbitrage Radar Release 2.5

Mobile scanner regression fix.

- Fixes camera preview visibility/state handling.
- Barcode camera now explicitly opens/closes and keeps scanning until detection or Stop.
- Adds a 15-second fallback message instead of silently appearing stuck.
- Photo capture is no longer hidden behind JavaScript only: a native camera/file chooser is visibly available as a guaranteed fallback.
- Open camera/photo and Retake reset the picker correctly.
- Barcode detection still fills UPC and exposes Identify UPC + eBay sold.
- Radar, Community, sightings, BUY/PASS, Reddit/Slickdeals evidence remain.
- No numeric opportunity scoring.
