# Phase 04 — Historical Data Cleanup & Backfill

**Priority:** P1 (High) | **Status:** pending (blocked by Phase 02 + Phase 03) | **Effort:** 1h

## Overview
After Phase 02 fixes the cron (add `type: 'web'`) and Phase 03 adds `ga4DataDaily`,
historical data still has two inconsistencies:

1. **GSC**: `gsc_data_aggregated` rows from May 05-06 (old cron, no type filter) may include
   image/video/news clicks — inflate totals vs dashboard
2. **GA4**: `ga4DataDaily` table is empty until backfill — analytics returns 0 for `totalUsers`

This phase runs both backfills sequentially via existing scripts + a new GA4 daily script.

## Prerequisites
- Phase 02 deployed (cron now uses `type: 'web'`)
- Phase 03 deployed + `db:push` run (`ga4_data_daily` table exists)
- Vercel env vars available locally (`vercel env pull` as done in Phase 04 of prior plan)

## Part A — GSC Backfill (type:web)

### What
Regenerate all `gsc_data_aggregated` rows for last 30 days using `type: 'web'`
to replace any rows that may have been written without the filter.

### How
Existing script already uses `type: 'web'` (confirmed in Phase 01 of gsc-ga4-data-sync-fix plan):
```bash
cd apps/api && \
  DATABASE_URL="..." \
  ENCRYPTION_KEY="..." \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  GOOGLE_REDIRECT_URI="..." \
  npm run backfill-gsc-agg -- 1 2026-04-09 2026-05-06 --dry-run

# If dry-run looks correct:
npm run backfill-gsc-agg -- 1 2026-04-09 2026-05-06
```

The script upserts on `(projectId, siteUrl, date)` → safely overwrites existing rows.

### Verify
```sql
SELECT site_url, COUNT(*), MIN(date), MAX(date) FROM gsc_data_aggregated WHERE project_id = 1 GROUP BY site_url;
-- Expected: 3 sites × 28 rows, 2026-04-09 to 2026-05-06
```

## Part B — GA4 Daily Users Backfill

### What
Populate `ga4DataDaily` with last 30 days of date-only user metrics.

### How
Write a new backfill script `apps/api/src/scripts/backfill-ga4-daily.ts`.
**Use `googleapis` (same as `sync-ga4.ts`), NOT `@google-analytics/data`:**

```ts
import 'dotenv/config';
import { google } from 'googleapis';
import { db, oauthTokens, ga4Properties, ga4DataDaily, eq, and, sql } from '@repo/db';
import { getValidAccessToken } from '../utils/token-refresh';
import { decryptTokenValue } from '../utils/crypto-tokens';

async function backfillGA4Daily(projectId: number, startDate: string, endDate: string, dryRun = false) {
    const [token] = await db.select().from(oauthTokens)
        .where(and(eq(oauthTokens.projectId, projectId), eq(oauthTokens.provider, 'google_analytics')))
        .limit(1);

    if (!token) throw new Error(`No GA4 token for project ${projectId}`);

    const [property] = await db.select().from(ga4Properties)
        .where(eq(ga4Properties.projectId, projectId))
        .orderBy(ga4Properties.id)
        .limit(1);

    if (!property) throw new Error(`No GA4 property for project ${projectId}`);

    const validToken = await getValidAccessToken(token);
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
    );
    oauth2Client.setCredentials({
        access_token: validToken,
        refresh_token: decryptTokenValue(token.refreshToken),
    });
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });

    const response = await analyticsdata.properties.runReport({
        property: `properties/${property.propertyId}`,
        requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'totalUsers' }, { name: 'newUsers' }],
        },
    });

    const rows = (response.data.rows || []).map((row: any) => ({
        projectId,
        date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        users: parseInt(row.metricValues[0].value) || 0,
        newUsers: parseInt(row.metricValues[1].value) || 0,
    }));

    console.log(`Fetched ${rows.length} daily rows for project ${projectId} (${startDate} → ${endDate})`);
    if (dryRun) { console.log('DRY RUN — sample:', rows.slice(0, 2)); return; }

    await db.insert(ga4DataDaily).values(rows).onConflictDoUpdate({
        target: [ga4DataDaily.projectId, ga4DataDaily.date],
        set: { users: sql`EXCLUDED.users`, newUsers: sql`EXCLUDED.new_users`, updatedAt: sql`NOW()` },
    });
    console.log(`Inserted/updated ${rows.length} rows into ga4_data_daily`);
}

const [, , projectId, startDate, endDate, dryRun] = process.argv;
backfillGA4Daily(parseInt(projectId), startDate, endDate, dryRun === '--dry-run')
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
```

Add to `apps/api/package.json` scripts:
```json
"backfill-ga4-daily": "tsx src/scripts/backfill-ga4-daily.ts"
```

Run:
```bash
cd apps/api && \
  DATABASE_URL="..." ENCRYPTION_KEY="..." GOOGLE_CLIENT_ID="..." \
  npm run backfill-ga4-daily -- 1 2026-04-09 2026-05-06 --dry-run

# If correct:
npm run backfill-ga4-daily -- 1 2026-04-09 2026-05-06
```

### Verify
```sql
SELECT COUNT(*), MIN(date), MAX(date), SUM(users) FROM ga4_data_daily WHERE project_id = 1;
-- Expected: ~28 rows, 2026-04-09 to 2026-05-06, users ~20k-100k/day range
```

## Todo
- [ ] Gather env vars: `vercel env pull` from apps/web
- [ ] **Part A**: dry-run GSC backfill → confirm 84 rows → run live
- [ ] Verify GSC: `gsc_data_aggregated` has correct rows per site
- [ ] **Part B**: create `apps/api/src/scripts/backfill-ga4-daily.ts`
- [ ] Add `"backfill-ga4-daily"` script to `apps/api/package.json`
- [ ] Dry-run GA4 backfill → confirm row count → run live
- [ ] Verify GA4: `ga4_data_daily` has ~28 rows for project 1
- [ ] Hit `/api/analytics/ga4?projectId=1` → confirm `totalUsers` > 0
- [ ] Compare GA4 API `totalUsers` vs GA4 dashboard (expect ±2%)

## Success Criteria
- `gsc_data_aggregated`: all rows type=web (no mixed-type artifacts)
- `ga4_data_daily`: 28+ rows, users value close to GA4 dashboard (±2%)
- API `totalUsers` for last 30 days matches GA4 UI within ±2%

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GA4 API auth fails (token expired) | Medium | Medium | `getValidAccessToken` auto-refreshes; re-run if 401 |
| GSC backfill returns 0 for some sites | Low | Low | Check `gscSites` table; re-auth if needed |
| `backfill-ga4-daily.ts` auth client incompatible | Medium | Low | Test auth pattern from existing `sync-ga4.ts` |

## Rollback
No rollback needed — both backfills are upserts. Reverting Phase 02/03 code removes the data source; tables remain but unused.
