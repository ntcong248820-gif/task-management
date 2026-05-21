# Debugger Report: GSC/GA4 Dashboard Shows Zero Despite Cron Success

**Date:** 2026-05-02  
**Cron run investigated:** 2026-05-01T20:01:56Z (3AM Vietnam, UTC+7)

---

## Executive Summary

Dashboard shows all-zero because **three concurrent failures** are happening:

1. `gsc_data_aggregated` is never written by the cron — sync writes to `gsc_data` only, but the analytics API reads exclusively from `gsc_data_aggregated` for top-level metrics.
2. `ga4_properties` table is empty (0 rows) — GA4 auto-discovery returned null (multiple properties found), so GA4 sync silently skipped with `ok:true`.
3. GSC cron likely fetched data for wrong site (`dienmayxanh.com`, first row in `gsc_sites`) and even if data were inserted into `gsc_data`, the analytics endpoint wouldn't show it (see #1).

All three jobs catch errors internally and return `{"ok":true}` regardless, masking all failures.

---

## Evidence: Database State

```
Table                  | Rows
-----------------------+------
projects               | 1
oauth_tokens           | 2    (GSC + GA4, both project_id=1)
gsc_sites              | 3    (dienmayxanh, thegioididong, topzone — ALL project_id=1)
ga4_properties         | 0    ← empty
gsc_data               | 0    ← sync target, empty
gsc_data_aggregated    | 0    ← API read target, empty, NEVER written by cron
ga4_data               | 0    ← empty
```

`oauth_tokens`:
- GSC: `expires_at = 2026-05-01 21:02:09 UTC` (valid at cron run 20:01 UTC, ~60 min remaining)
- GA4: `expires_at = 2026-05-01 21:02:16 UTC` (valid)
- `last_synced_at = NULL` for both — confirms no data was ever synced

---

## Root Cause 1: `gsc_data_aggregated` Never Populated by Cron (PRIMARY)

**Evidence chain:**

- `packages/api-app/src/jobs/sync-gsc.ts` writes exclusively to `gsc_data` (line 198-217):
  ```ts
  await db.insert(gscData).values(rows).onConflictDoUpdate(...)
  ```
- `packages/api-app/src/routes/analytics.ts` reads exclusively from `gscDataAggregated` (lines 59, 71-79, 148-166):
  ```ts
  .from(gscDataAggregated).where(and(...gscWhereConditions))
  ```
- `gsc_data_aggregated` table has different schema — only `(project_id, site_url, date, clicks, impressions, ctr, position)` — no page/query/country/device dimensions.
- Only code that writes to `gsc_data_aggregated` is `apps/api/src/scripts/backfill-gsc-aggregated.ts` — a manual one-time script, **never called by the cron**.
- Result: analytics API always returns 0 for GSC metrics even if `gsc_data` had rows.

**This is the primary blocker for the dashboard.**

---

## Root Cause 2: GA4 — Zero Properties, Sync Silently Skips

**Evidence chain:**

- `ga4_properties` = 0 rows in DB.
- `sync-ga4.ts` `getOrDiscoverPropertyId()` (lines 29-78): if no DB row, calls GA4 Admin API `accountSummaries.list()`. If multiple properties found → `log.warn("Multiple properties found... Please configure manually.")` → returns `null`.
- Line 154-156:
  ```ts
  if (!propertyId) {
      log.error(`No propertyId found for project ${connection.projectId}. Skipping.`);
      continue;  // ← silently skips
  }
  ```
- Cron route (`sync-ga4.ts`) catches no error, returns `{"ok":true,"durationMs":1509}`.
- `ga4_data` = 0 rows confirmed.

The thegioididong.com account likely has multiple GA4 properties (TGDD + dienmayxanh + topzone), triggering the "multiple properties" silent-skip path.

---

## Root Cause 3: GSC Sync Writes Wrong Site's Data

**Evidence chain:**

- `gsc_sites` has 3 rows for project_id=1. Row order: `dienmayxanh.com` (id=1), `thegioididong.com` (id=2), `topzone.vn` (id=3).
- `sync-gsc.ts` `getOrDiscoverSiteUrl()` (lines 31-38):
  ```ts
  const configuredSite = await db.select().from(gscSites)
      .where(eq(gscSites.projectId, projectId)).limit(1);
  if (configuredSite.length > 0) return configuredSite[0].siteUrl;
  ```
  Returns first row = `https://www.dienmayxanh.com/` — not the project's target domain `thegioididong.com`.
- Even if data were written, it's for the wrong site.
- `gsc_data` = 0 anyway, so GSC API likely returned no data for dienmayxanh.com with this token (restricted access) OR the data is tiny. The `durationMs:3512` is suspicious — 3.5s to fetch and insert 0 rows from a major Vietnamese e-commerce site suggests either empty API response or API error caught silently.

---

## Root Cause 4: Silent Error Masking

Both cron jobs (`sync-gsc.ts`, `sync-ga4.ts`) have inner `try/catch` per connection that logs errors but continues:

```ts
} catch (error: any) {
    log.error(`Error syncing project ${connection.projectId}:`, error);
    // no rethrow — outer function continues
}
```

The Hono route handler only catches outer exceptions. Inner per-connection failures return `ok:true`. Vercel serverless logs are not accessible post-hoc, so actual error messages during the 3AM run are unrecoverable.

---

## Fix Recommendations

### Fix 1 (Critical): Write to `gsc_data_aggregated` in cron — OR — change API to read `gsc_data`

Two options:

**Option A (Preferred — fix the sync job):** Add aggregated sync step to `sync-gsc.ts` at `packages/api-app/src/jobs/sync-gsc.ts` after inserting to `gsc_data`:

```ts
// After existing gsc_data insert loop, add:
// Fetch aggregated data (date-only dimension) and upsert into gsc_data_aggregated
const aggregatedData = await client.fetchAllSearchAnalytics({
    siteUrl,
    startDate: dateStr,
    endDate: dateStr,
    dimensions: ['date'], // date-only for accurate totals
});
if (aggregatedData.length > 0) {
    const aggRows = aggregatedData.map((row: any) => ({
        projectId: connection.projectId,
        siteUrl,
        date: row.date,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr.toString(),
        position: row.position.toString(),
    }));
    await db.insert(gscDataAggregated).values(aggRows).onConflictDoUpdate({
        target: [gscDataAggregated.projectId, gscDataAggregated.siteUrl, gscDataAggregated.date],
        set: { clicks: sql`EXCLUDED.clicks`, impressions: sql`EXCLUDED.impressions`, ctr: sql`EXCLUDED.ctr`, position: sql`EXCLUDED.position`, updatedAt: sql`NOW()` },
    });
}
```

**Option B (Quick fix — change API):** Change `analytics.ts` to read from `gsc_data` with `GROUP BY date` instead of `gsc_data_aggregated`. But this causes click/impression over-counting (multiple rows per date per page/query/device).

### Fix 2 (Critical): GA4 — Store property_id after OAuth connect

In GA4 OAuth callback, after `accountSummaries.list()`, save the discovered property to `ga4_properties` table regardless of count. If multiple, pick first `sc-domain:` equivalent or prompt user. Currently nothing saves to `ga4_properties` at OAuth time.

File to check: GA4 OAuth callback handler (find with `grep -r "ga4/callback\|ga4Properties" ... --include="*.ts"`). Insert to `ga4_properties` during OAuth flow:

```ts
await db.insert(ga4Properties).values({
    projectId,
    propertyId: selectedPropertyId,
    propertyName: selectedProperty.displayName,
}).onConflictDoNothing();
```

### Fix 3 (Medium): GSC — Select correct site (project's domain)

`sync-gsc.ts` `getOrDiscoverSiteUrl()` — when multiple sites exist, select the one matching `project.domain`:

```ts
// packages/api-app/src/jobs/sync-gsc.ts, replace getOrDiscoverSiteUrl():
const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
const domainSite = configuredSites.find(s => s.siteUrl.includes(project[0].domain));
return (domainSite || configuredSites[0]).siteUrl;
```

### Fix 4 (Low): Surface sync errors in cron response

`routes/cron/sync-gsc.ts` and `sync-ga4.ts` — return error count in response body so GitHub Actions logs show actual outcome:

```ts
return c.json({ ok: true, durationMs: Date.now() - start, syncResult: result });
```

where `runGSCSync` returns `{ synced, errors }`.

### Fix 5 (Backfill): Populate `gsc_data_aggregated` for existing date range

Run the existing backfill script:
```bash
cd apps/api && npx ts-node src/scripts/backfill-gsc-aggregated.ts 1 2026-04-01 2026-05-01
```

---

## Timeline

| Time (UTC) | Event |
|---|---|
| 2026-05-01 10:38:31 | GSC OAuth token created in new Supabase DB |
| 2026-05-01 10:38:50 | GA4 OAuth token created |
| 2026-05-01 10:38:56–58 | 3 sites saved to `gsc_sites` (dienmayxanh, thegioididong, topzone) |
| 2026-05-01 20:01:56 | Cron: sync-gsc starts (token valid, ~60min remaining) |
| 2026-05-01 20:02:09 | sync-gsc returns `{"ok":true,"durationMs":3512}` — data for dienmayxanh.com fetched? — no rows in `gsc_data`, likely API empty/error caught silently |
| 2026-05-01 20:02:16 | Cron: sync-ga4 starts |
| 2026-05-01 20:02:18 | sync-ga4 returns `{"ok":true,"durationMs":1509}` — ga4_properties empty → skipped |
| 2026-05-02 | `gsc_data=0`, `gsc_data_aggregated=0`, `ga4_data=0`, `last_synced_at=NULL` |

---

## Hypothesis Elimination

| Hypothesis | Result | Evidence |
|---|---|---|
| A: gsc_sites/ga4_properties not selected | CONFIRMED (GA4), PARTIAL (GSC) | `ga4_properties=0`; `gsc_sites=3` but wrong site selected |
| B: projectId mismatch | ELIMINATED | All `oauth_tokens.project_id=1`, `gsc_sites.project_id=1` — no mismatch |
| C: Aggregation table empty / not written | CONFIRMED (PRIMARY) | Sync writes `gsc_data`, API reads `gsc_data_aggregated`; nothing writes aggregated in cron |
| D: Date range mismatch | ELIMINATED | Frontend default = last 30 days, cron syncs yesterday — would overlap if data existed |
| E: Cron silent fail | CONFIRMED | `last_synced_at=NULL`, `gsc_data=0`, `ga4_data=0` despite `ok:true` response |

---

## Unresolved Questions

1. During the 3AM cron run, did GSC API return data for `dienmayxanh.com` or throw a permission error? Vercel function logs for that invocation are needed (Vercel dashboard → Functions → filter by timestamp).
2. Does the Google account used for OAuth have `siteOwner`/`siteRestrictedUser` access to dienmayxanh.com that allows fetching data? `permission_level=siteRestrictedUser` for all 3 sites — this may restrict data access.
3. How many GA4 properties does this account have? Determines if auto-discovery returning null is expected.

---

**Status:** DONE_WITH_CONCERNS  
**Summary:** Three concurrent root causes found — primary is architectural (cron writes `gsc_data`, API reads `gsc_data_aggregated`, these are never connected); secondary is GA4 property not stored at OAuth time. All failures masked by silent error swallowing returning `ok:true`.  
**Concerns:** GSC API behavior during the 3AM run (permissioned access to dienmayxanh.com vs thegioididong.com) is unverifiable without Vercel function logs.
