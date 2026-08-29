# Arbitrage Radar — Release 3.0

This is the first backend-enabled build.

## What now works once the backend is deployed
- Barcode -> product identification -> web-backed resale research.
- Photo -> AI product identification -> web-backed resale research.
- Product title is filled into Scan automatically.
- Verified typical sold value, when found, fills Expected Resale automatically.
- If sold evidence cannot be verified, the backend returns `INSUFFICIENT_SOLD_EVIDENCE` rather than inventing a resale value.
- BUY/PASS still uses the actual shelf price plus your profit/ROI rules.
- Radar, Community, Reddit/Slickdeals and sightings remain.

## Backend data sources
- UPC/EAN database lookup uses UPCitemdb's documented trial API where applicable.
- AI image/product identification and web research use the OpenAI Responses API with image input + web search.
- The OpenAI API key is stored only on the backend.

## Deploy backend (Render)
1. Put the `backend` folder in a GitHub repository (it can be this same repo).
2. In Render, create a new Web Service from the repo.
3. Set the Root Directory to `backend`.
4. Use the Docker runtime.
5. Add secret environment variable `OPENAI_API_KEY`.
6. Set `ALLOWED_ORIGINS` to your GitHub Pages origin, e.g. `https://balbert908a.github.io`.
7. Deploy.
8. Copy the Render service URL.
9. In Arbitrage Radar -> Tools -> Intelligence backend, paste that URL and tap Test connection.

## GitHub Pages
Upload the front-end files and `data` folder as before. The `backend` folder will not interfere with Pages.

## Important resale rule
Release 3.0 does not promote MSRP or compare-at values as resale evidence. The backend is explicitly instructed to return no typical sold value unless it can verify completed/sold evidence.
