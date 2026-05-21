# GSC API Metrics Calculation Research

**Date:** 2026-05-09 | **Focus:** Official GSC API documentation for metrics formulas, data freshness, and aggregation behavior

---

## 1. CTR Calculation

**Official Definition** (Google Search Console Help):
> "CTR (click-through rate): The click count divided by the impression count."

**Implementation:** Simple arithmetic ratio applied at query time.
- **Dashboard vs API:** Both use identical calculation: CTR = SUM(clicks) / SUM(impressions)
- **No special handling:** Direct division; no weighting or smoothing applied
- **Result format:** API returns 0 to 1.0 (e.g., 0.25 = 25%)

Source: [Google Search Console Help - Impressions, position, and clicks](https://support.google.com/webmasters/answer/7042828)

---

## 2. Average Position Calculation

**Official Method** (GSC Help):
> "The topmost position occupied by a link to your property or page in search results, averaged across all queries."

**Formula:** Impression-weighted average
- **Exact calculation:** Sum of (position × impressions for that position) / Total impressions
- **Example:** If 3 impressions at position 2, 2 at position 3 = (2×3 + 3×2) / (3+2) = 2.4
- **Weighting importance:** High-frequency queries carry more weight than rare ones; query mix affects metric movement
- **No deduplication:** Each impression-position pair is counted separately

Source: [Google Search Console Help - Impressions, position, and clicks](https://support.google.com/webmasters/answer/7042828)

---

## 3. Search Type Filter (type Parameter)

**Available Values** (API Reference):
- `web` (default) — Combined "All" tab results
- `image` — Image search tab
- `news` — News tab
- `video` — Video search
- `discover` — Google Discover results
- `googleNews` — News.google.com and Google News app

**Dashboard Default:** GSC UI uses `web` (equivalent to "All" tab across web, image, video combined)
**Backward Compatibility:** Old parameter name `searchType` still supported

Source: [Search Console API - searchanalytics.query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)

---

## 4. Data Freshness/Delay

**Official Stated Delay:**
- **Standard:** 2-3 days for complete data set
- **Recent improvements (2025):** Google reduced average delay by ~50%; hourly data now available for last 10 days
- **Same source:** API pulls from identical backend as web UI, so delays are identical

**Current Status:** Latest 24-hour view available with "only a few hours" delay (per 2025 updates).

Source: [GSC API Data Freshness - April 2025 Update](https://developers.google.com/search/blog/2025/04/san-hourly-data)

---

## 5. Date Dimension Aggregation Behavior

**Key Finding:** Raw metrics DO sum correctly across dimension combinations.

**Exact Behavior:**
- Query `dimensions: ['date']` = all data grouped by date only
- Query `dimensions: ['date', 'page', 'query', 'country', 'device']` = same data split into granular rows
- **Summing raw rows matches date aggregate:** If you SUM(clicks, impressions) across all granular rows for a date, result equals the single date-only row
- **No deduplication:** GSC returns raw combinations; aggregation is pure summation
- **Important limitation:** Maximum 50,000 rows per query per search type (sorted by clicks); data beyond top 50k is dropped

**Exception (Data Loss):** When grouping by page AND/or query dimensions together, GSC drops data "to calculate results in a reasonable time using reasonable computing resources." Avoid this pattern.

Source: [Getting your performance data - Search Console API](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data)

---

## Summary Table

| Metric | Formula | Weighting | Source |
|--------|---------|-----------|--------|
| CTR | clicks ÷ impressions | None (raw ratio) | Official definition |
| Avg Position | Σ(position × impressions) ÷ Σ(impressions) | Impression-weighted | Official definition |
| Type Filter | web/image/news/video/discover | Dashboard default: web | API reference |
| Data Delay | 2-3 days (standard) | No formula | Official statement |
| Dimension Sum | Raw summation (no dedup) | None | API behavior confirmed |

---

## Unresolved Questions

1. **Hourly data precision:** When using the new hourly dimension (added April 2025), does Google apply identical impression-weighting to average position, or use a different formula for sub-day granularity?

2. **Search Appearance metrics:** Do `searchAppearance` dimension results (like FAQ, Rich Result types) use identical CTR/position formulas, or are they calculated separately?

3. **Discover ranking metric:** GSC documentation states "position is not supported" for Google Discover results—what metric is used instead to measure ranking in Discover feed?
