# Arbitrage Radar Release 2.6

Scanner workflow update:
- Barcode capture now immediately creates a searchable UPC identification and sold-comps workflow.
- Captured photos now expose an Identify from photo step and feed a product clue into item/resale searches.
- The static PWA cannot send image pixels to an AI model without a backend/API. Release 2.6 therefore does not falsely claim automatic visual AI identification.
- The UI is structured so a backend image-identification endpoint can replace the clue step without changing the resale workflow.
- Existing Radar, Community, Reddit/Slickdeals, sightings and BUY/PASS remain.
- No numeric opportunity scoring.
