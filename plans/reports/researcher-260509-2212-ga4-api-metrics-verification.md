# GA4 Data API Metrics Verification Report

## Executive Summary

GA4 API user/session metrics use **HyperLogLog++ approximation**, not exact counting. Summing across dimensions overcounts users and sessions because each dimension combination returns independent cardinality estimates. Data is available 12-24 hours after event collection, not real-time.

---

## 1. Users Metric & Deduplication

**CRITICAL FINDING:** The GA4 API returns `activeUsers` as an *approximated* cardinality estimate per dimension combination, not an exact count.

**Official Definition** ([GA4 Data Freshness docs](https://support.google.com/analytics/answer/11198161)):
- **activeUsers**: Users who logged ≥1 event during the selected date range
- **totalUsers**: All users who logged ≥1 event (independent of active/inactive status)

**Deduplication Method** ([API Schema Reference](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)):
> "The data returned by the API is consistent with the data shown in the Google Analytics user interface" and "fully respects the Reporting Identity settings configured for your Google Analytics property" (Blended, Observed, or Device-based).

**The Deduplication Problem** ([BigQuery vs UI Blog](https://developers.google.com/analytics/blog/2023/bigquery-vs-ui)):
- When summing `activeUsers` across multiple rows with dimensions [date, source, medium, deviceCategory], **each row returns an independent HyperLogLog++ estimate**
- A user appearing in multiple dimension combinations (e.g., Desktop+Direct on Day 1 AND Mobile+Google on Day 2) gets counted **multiple times** when you SUM
- **This is NOT the same as the dashboard total**, which deduplicates across all dimensions

**Example of Double-Counting:**
```
Query: dimensions=[date, source, medium], metrics=[activeUsers]
Day 1, Direct, (none): 100 activeUsers
Day 1, Google, organic: 80 activeUsers
SUM = 180 activeUsers (WRONG — dashboard shows 150 because some users used both channels)
```

---

## 2. Sessions Metric Accuracy

**SUM(sessions) across rows is NOT accurate for total session count.**

**Why:** Sessions are calculated per dimension combination. Unlike users (which deduplicate), sessions don't re-aggregate—each dimension returns independent session counts.

**Official Reference** ([HyperLogLog Blog](https://developers.google.com/analytics/blog/2022/hll)):
> "HLL++ estimates cardinality while using less memory and improving performance"
> Sessions use "precision 12" (±1.63% error at 95% confidence)

**Correct Approach:**
- Query with `date` as only dimension to get true daily session totals
- Then SUM across dates to avoid dimension-based fragmentation
- Do NOT aggregate sessions across source/medium/deviceCategory and expect accuracy

---

## 3. Data Freshness & Processing Delay

**Official Timeline** ([GA4 Data Freshness SLA](https://support.google.com/analytics/answer/12233314)):

| Data Interval | Availability | Standard Property |
|---|---|---|
| **Realtime** | Few minutes | Limited dimensions |
| **Intraday** | 2–6 hours | Continuous updates |
| **Daily** | 12–24+ hours | After timezone cutoff |

**For Yesterday's Data (Example):**
- 5:00 AM (next day): 98% available in BigQuery (360 customers only)
- 11:30 AM: Ready in Explore interface
- 12:00 PM: Available in Reports
- 3:30 PM: Fully available in API

**Critical Caveat** ([GA4 Data Freshness docs](https://support.google.com/analytics/answer/11198161)):
> "This is typical processing time but NOT a guarantee, nor an SLA or an SLO. Data can be delayed beyond these times, particularly for large properties, complex data, or during processing slowdowns."

Data may shift for up to **12 days** as Google Analytics' key event modeling improves.

---

## 4. Correct Approach for "Total Users Over N Days"

**WRONG:**
```
Query: date_range=[day1, dayN], dimensions=[date, source], metrics=[activeUsers]
SUM(activeUsers) across all rows
```
Result: **Overcounts** users who appear in multiple dimension combinations.

**CORRECT:**
```
Query: date_range=[day1, dayN], dimensions=[date], metrics=[activeUsers]
SUM(activeUsers) by day, then aggregate by business logic
```
OR use BigQuery export with `COUNT(DISTINCT user_pseudo_id) WHERE is_active_user = true` for exact counts.

**Official Guidance** ([BigQuery vs UI](https://developers.google.com/analytics/blog/2023/bigquery-vs-ui)):
> "Active Users Definition: The UI reports 'Active Users' by default, but counting all distinct user IDs in BigQuery yields 'Total Users.'"

Use BigQuery for **exact counts**; use API for **dimension-specific estimates**.

---

## 5. HyperLogLog++ Algorithm Details

GA4 uses HyperLogLog++ cardinality estimation ([Unique Count Approximation Blog](https://developers.google.com/analytics/blog/2022/hll)):
- **activeUsers precision**: 14 (±1.63% error)
- **sessions precision**: 12 (±1.63% error)
- **Approximation error**: ±1.63% at 95% confidence

**When Precision Matters:**
- UI uses "sparse precision value of 25"
- BigQuery exports use "sparse precision value of 19"
- Small discrepancies (1–3%) between UI and API are **expected**

---

## Key Recommendations

1. **Do NOT sum `activeUsers` across dimensions**—use dashboard totals for cross-channel user counts
2. **Query single dimension at a time** for accurate aggregation
3. **Wait 24 hours** after event date before treating data as final
4. **Use BigQuery exports** for exact user/session counts requiring high precision
5. **Expect ±1.63% variance** in all metric sums due to HyperLogLog++ approximation

---

## Unresolved Questions

- Does GA4 API support a native "sum users across dimensions without double-count" operator? (Appears not—requires manual deduplication or BigQuery)
- Are there precision degradation penalties when querying very high-cardinality dimension combinations (100K+ combinations)?
