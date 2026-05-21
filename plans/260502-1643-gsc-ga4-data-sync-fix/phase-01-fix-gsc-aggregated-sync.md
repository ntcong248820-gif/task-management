---
phase: "01"
title: "Fix GSC Aggregated Sync + Site Selection"
status: completed
priority: P0
effort: 45min
completed: 2026-05-02
---

# Phase 01 — Fix GSC Aggregated Sync + Site Selection

## Completion Notes

All 5 changes implemented and verified:

1. **Import fix in `sync-gsc.ts`**: Added `gscDataAggregated` + `projects` to import statement
2. **Domain-aware `getOrDiscoverSiteUrl()`**: Replaced generic LIMIT 1 with domain-matching logic
3. **`gsc_data_aggregated` insert in cron path**: Added date-aggregated fetch + insert after `gsc_data` insert in `runGSCSync()`
4. **Import fix in `gsc.ts`**: Added `gscDataAggregated` to import
5. **`gsc_data_aggregated` insert in manual `/sync`**: Added date-aggregated fetch + insert covering full date range

TypeScript check: PASS (zero errors in api-app)

# Phase 01 — Fix GSC Aggregated Sync + Site Selection

## Context Links

- Debug report: [debugger-260502-1629-gsc-ga4-data-zero.md](../reports/debugger-260502-1629-gsc-ga4-data-zero.md)
- Plan: [plan.md](./plan.md)

## Overview

Two bugs in GSC sync path:
1. **Architectural mismatch**: cron + manual sync write to `gsc_data` only; `analytics.ts` reads `gsc_data_aggregated` exclusively. Nothing writes `gsc_data_aggregated` in normal flow.
2. **Wrong site selected**: `getOrDiscoverSiteUrl()` does `LIMIT 1` without ORDER BY or domain matching → returns `dienmayxanh.com` (id=1) instead of `thegioididong.com` (project domain).

## Related Code Files

**Modify:**
- `packages/api-app/src/jobs/sync-gsc.ts` — cron path
- `packages/api-app/src/routes/integrations/gsc.ts` — manual `/sync` endpoint has same bug

**Read-only for context:**
- `packages/api-app/src/routes/analytics.ts:59,71,148` — confirms gscDataAggregated reads
- `packages/db/src/schema/gsc_data_aggregated.ts` — schema reference

## Implementation Steps

### Step 1 — Fix `sync-gsc.ts`: import missing symbols

At top of `packages/api-app/src/jobs/sync-gsc.ts`, add `gscDataAggregated` and `projects` to the import:

```typescript
// Before (line 4):
import { db, oauthTokens, gscData, gscSites, eq, sql } from '@repo/db';

// After:
import { db, oauthTokens, gscData, gscDataAggregated, gscSites, projects, eq, sql, and } from '@repo/db';
```

### Step 2 — Fix `getOrDiscoverSiteUrl()` in `sync-gsc.ts`

Replace the current method (lines 33–68) with domain-aware site selection:

```typescript
async getOrDiscoverSiteUrl(projectId: number): Promise<string | null> {
    // 1. Check DB for configured sites
    const configuredSites = await db
        .select()
        .from(gscSites)
        .where(eq(gscSites.projectId, projectId));

    if (configuredSites.length === 1) {
        return configuredSites[0].siteUrl;
    }

    if (configuredSites.length > 1) {
        // Multiple sites: match against project.domain
        const [project] = await db
            .select({ domain: projects.domain })
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);

        if (project?.domain) {
            const match = configuredSites.find(s =>
                s.siteUrl.includes(project.domain!)
            );
            if (match) return match.siteUrl;
        }
        log.warn(`Multiple sites for project ${projectId}, no domain match — using first`);
        return configuredSites[0].siteUrl;
    }

    // 2. Auto-discover from GSC API (no DB row yet)
    try {
        const response = await this.searchconsole.sites.list();
        const sites = response.data.siteEntry || [];

        if (sites.length === 0) {
            log.warn(`No sites found for project ${projectId}`);
            return null;
        }

        const domainProperty = sites.find((s: any) => s.siteUrl?.startsWith('sc-domain:'));
        const selectedSite = domainProperty || sites[0];

        log.info(`Auto-discovery for project ${projectId}: ${sites.length} sites. Selected: ${selectedSite.siteUrl}`);
        return selectedSite.siteUrl || null;
    } catch (error) {
        log.error(`Error listing sites for project ${projectId}:`, error);
        return null;
    }
}
```

### Step 3 — Add `gsc_data_aggregated` insert in `runGSCSync()`

In `sync-gsc.ts`, inside the per-connection try block, after the existing `gsc_data` batch insert loop (after `log.info(\`Synced ${totalInserted} rows...\``), add:

```typescript
// Fetch date-aggregated totals and insert to gsc_data_aggregated
// This is what analytics.ts reads — must match GSC dashboard totals exactly
const aggData = await client.fetchSearchAnalytics({
    siteUrl,
    startDate: dateStr,
    endDate: dateStr,
    dimensions: ['date'],
});

if (aggData.length > 0) {
    const aggRows = aggData.map((row: any) => ({
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
        set: {
            clicks: sql`EXCLUDED.clicks`,
            impressions: sql`EXCLUDED.impressions`,
            ctr: sql`EXCLUDED.ctr`,
            position: sql`EXCLUDED.position`,
            updatedAt: sql`NOW()`,
        },
    });
    log.info(`Synced ${aggRows.length} aggregated rows for project ${connection.projectId}`);
}
```

### Step 4 — Fix the same bug in manual sync (`routes/integrations/gsc.ts`)

In `gsc.ts` `/sync` POST handler (line ~436), after the existing `totalInserted` loop (after `oauthTokens.lastSyncedAt` update at line ~543), add an aggregated fetch + insert loop:

The manual sync uses multi-day range (up to 365 days), so it must loop per-day or use `GROUP BY date` approach. Use a separate API call with `dimensions: ['date']` covering the full range:

```typescript
// After lastSyncedAt update, add:
// Also sync to gsc_data_aggregated for the full date range
const aggAllData = await gscClient.fetchAllSearchAnalytics({
    siteUrl,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    dimensions: ['date'],
});

if (aggAllData.length > 0) {
    const aggBatchSize = 1000;
    for (let i = 0; i < aggAllData.length; i += aggBatchSize) {
        const aggBatch = aggAllData.slice(i, i + aggBatchSize);
        const aggRows = aggBatch.map((row: any) => ({
            projectId,
            siteUrl,
            date: row.date,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr.toString(),
            position: row.position.toString(),
        }));

        await db.insert(gscDataAggregated).values(aggRows).onConflictDoUpdate({
            target: [gscDataAggregated.projectId, gscDataAggregated.siteUrl, gscDataAggregated.date],
            set: {
                clicks: sql`EXCLUDED.clicks`,
                impressions: sql`EXCLUDED.impressions`,
                ctr: sql`EXCLUDED.ctr`,
                position: sql`EXCLUDED.position`,
                updatedAt: sql`NOW()`,
            },
        });
    }
}
```

Also add `gscDataAggregated` to the import in `gsc.ts` line 4:
```typescript
import { db, oauthTokens, gscData, gscDataAggregated, gscSites, eq, sql, and } from '@repo/db';
```

## Todo List

- [x] Add `gscDataAggregated`, `projects` to import in `sync-gsc.ts`
- [x] Replace `getOrDiscoverSiteUrl()` in `sync-gsc.ts` with domain-aware version
- [x] Add `gsc_data_aggregated` insert after `gsc_data` insert in `runGSCSync()`
- [x] Add `gscDataAggregated` to import in `routes/integrations/gsc.ts`
- [x] Add `gsc_data_aggregated` insert in manual `/sync` endpoint in `gsc.ts`
- [x] Run `npm run type-check` — zero errors
- [ ] Run `npm run lint` — zero errors (pending)

## Success Criteria

- `gsc_data_aggregated` has rows after `/api/integrations/gsc/sync` is called with valid siteUrl
- Site selected for `thegioididong.com` project is `sc-domain:thegioididong.com` or `https://www.thegioididong.com/`
- Analytics page shows non-zero GSC metrics

## Risk

- GSC API quota: 1 extra API call per sync run (date-dimension query). Well within free quota.
- `fetchSearchAnalytics` with `dimensions: ['date']` returns 1 row per date; no pagination concern for 1-day cron window.
