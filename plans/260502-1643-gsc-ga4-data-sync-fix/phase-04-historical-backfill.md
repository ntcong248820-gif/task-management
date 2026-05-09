---
phase: "04"
title: "Historical Data Backfill (Manual Ops)"
status: completed
priority: P1
effort: 30min
---

# Phase 04 — Historical Data Backfill (Manual Ops)

## Context Links

- Debug report: [debugger-260502-1629-gsc-ga4-data-zero.md](../reports/debugger-260502-1629-gsc-ga4-data-zero.md)
- Plan: [plan.md](./plan.md)

## Overview

After Phase 01–03 fix is deployed, `gsc_data_aggregated` will only have data going forward.
For historical context (last 30 days visible in dashboard charts), run a manual backfill once.

**This is a manual ops step — not automated code.** Run via shell command.

## Backfill Command

After deploying Phase 01 (GSC aggregated sync fix), run:

```bash
# Requires: valid GSC OAuth token, correct siteUrl
# Replace PROJECT_ID and SITE_URL with actual values

cd apps/api && \
npx ts-node -e "
const { runGSCSync } = require('./src/jobs/sync-gsc.ts');
// Note: ts-node can't import directly — use ts-node with --esm flag
// Or run via the manual sync endpoint:
// POST /api/integrations/gsc/sync with { projectId: 1, siteUrl: 'https://www.thegioididong.com/', days: 30 }
"
```

Better approach — use the manual sync API endpoint after deploying Phase 01 fix:

```bash
# Trigger via curl to Vercel deployment
curl -X POST https://task-management-web-zeta.vercel.app/api/integrations/gsc/sync \
  -H "Content-Type: application/json" \
  -d '{"projectId": 1, "siteUrl": "https://www.thegioididong.com/", "days": 30}'
```

Or from local dev:

```bash
curl -X POST http://localhost:3001/api/integrations/gsc/sync \
  -H "Content-Type: application/json" \
  -d '{"projectId": 1, "siteUrl": "https://www.thegioididong.com/", "days": 30}'
```

## Expected Result

After backfill:
- `gsc_data_aggregated`: ~30 rows (1 per day) for `thegioididong.com`
- Dashboard analytics page shows GSC metrics for past 30 days

## Todo List

- [ ] Deploy Phase 01 fix to production
- [ ] Run manual sync `/api/integrations/gsc/sync` with `days: 30`
- [ ] Verify `gsc_data_aggregated` has 28–30 rows
- [ ] Check analytics dashboard shows non-zero GSC data
- [ ] Mark Phase 04 complete in plan.md

## Note

If backfill returns 0 rows, possible causes:
- GSC OAuth token lacks permission for `thegioididong.com` → re-connect OAuth
- GSC API returns no data for that date range (site might be new) → check `gsc_data` (raw table) for any data
- Site URL mismatch → verify exact siteUrl in `gsc_sites` table matches what's used for backfill
