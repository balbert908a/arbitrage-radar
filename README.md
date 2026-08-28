# Arbitrage Radar — Release 2.1

Evidence engine release. Numeric opportunity scoring and priority numbers have been removed.

## Core decisions
- **HUNT** — specific merchandise/deal worth looking for based on current evidence.
- **CHECK** — event/source worth investigating, but not enough item-level evidence yet.
- **BUY / PASS** — only calculated in Hunt Mode from the actual shelf price, expected resale, fees, shipping, minimum profit and minimum ROI.

## Current evidence
Release 2.1 ships with a dated, expiring evidence snapshot containing current public leads from Walmart, TJ Maxx, Marshalls, Ollie's and current northeastern-PA estate/tag-sale listings. Every record carries:
- source
- observed date
- expiration date
- exact observed price when available
- evidence explanation
- direct source link
- eBay sold-search action
- local inventory warning when appropriate

Expired evidence hides automatically rather than pretending it is still current.

## No fake inventory
Online Walmart/TJ Maxx/Marshalls prices are **HUNT leads**, not claims that your local store has that shelf price or quantity.

## Extensible engine
Tools can import additional JSON opportunity feeds using the same schema. This lets future permitted data sources plug into the same app without changing the interface.

## Update
Upload everything inside this folder—including the new `data` folder—over the existing GitHub repository and commit to `main`.
