---
title: "Fix GSC/GA4 Data Sync — Dashboard Shows Zero"
description: "Fix 3 concurrent root causes causing all dashboard charts/tables to display 0 despite cron running successfully"
status: in-progress
priority: P0
effort: 3h
branch: main
tags: [bugfix, gsc, ga4, analytics, sync, cron]
created: 2026-05-02
blockedBy: []
blocks: []
---

# Fix GSC/GA4 Data Sync — Dashboard Shows Zero

## Goal

Fix all root causes discovered in debug session. After fix, cron jobs will correctly populate
`gsc_data_aggregated` and `ga4_data`, and dashboard charts will show real data.

## Root Cause Summary

Three concurrent failures, all masked by silent error swallowing (`ok:true` regardless):

| # | Root Cause | Severity | Files |
|---|---|---|---|
| 1 | Cron writes `gsc_data`, API reads `gsc_data_aggregated` — never connected | CRITICAL | `sync-gsc.ts`, `gsc.ts` |
| 2 | GA4 property not stored at OAuth time → sync skips silently | CRITICAL | `ga4.ts` callback, `sync-ga4.ts` |
| 3 | GSC site selection picks first row (`dienmayxanh.com`) not project domain | MEDIUM | `sync-gsc.ts` |
| 4 | `ok:true` masking real errors, `last_synced_at` never updated | LOW | both sync jobs + cron routes |

**Evidence**: `gsc_data=0`, `gsc_data_aggregated=0`, `ga4_data=0`, `ga4_properties=0`, `oauth_tokens.last_synced_at=NULL` confirmed via psql.

## Phases

| # | Phase | Status | Effort | Priority |
|---|-------|--------|--------|----------|
| 01 | [Fix GSC aggregated sync + site selection](./phase-01-fix-gsc-aggregated-sync.md) | completed | 45min | P0 |
| 02 | [Fix GA4 property storage at OAuth + sync](./phase-02-fix-ga4-property-storage.md) | completed | 45min | P0 |
| 03 | [Error surfacing + last_synced_at](./phase-03-error-surfacing.md) | completed | 30min | P1 |
| 04 | [Historical data backfill (manual ops)](./phase-04-historical-backfill.md) | pending | 30min | P1 |

## Files to Modify

```
packages/api-app/src/jobs/sync-gsc.ts          ← Phase 01 + 03
packages/api-app/src/jobs/sync-ga4.ts          ← Phase 02 + 03
packages/api-app/src/routes/integrations/gsc.ts ← Phase 01 (manual sync also broken)
packages/api-app/src/routes/integrations/ga4.ts ← Phase 02 (callback auto-save property)
packages/api-app/src/routes/cron/sync-gsc.ts   ← Phase 03 (return result)
packages/api-app/src/routes/cron/sync-ga4.ts   ← Phase 03 (return result)
```

## Dependency Order

```
01 (GSC aggregated) ──┐
                      ├──> 04 (backfill — needs fixed sync first)
02 (GA4 property)  ───┘

03 (error surfacing) — independent, can run alongside 01+02
```

## Success Criteria

- [ ] `gsc_data_aggregated` gets rows after next cron run (or manual sync)
- [ ] `ga4_properties` has at least 1 row after GA4 OAuth
- [ ] `ga4_data` gets rows after next cron run
- [ ] Dashboard Analytics, Rankings, URLs pages show non-zero data
- [ ] `oauth_tokens.last_synced_at` set after successful sync
- [ ] Cron response body includes `synced` + `errors` counts
- [ ] GitHub Actions logs reveal actual sync outcome (not just ok:true)

## Debug Report

Full evidence chain: [debugger-260502-1629-gsc-ga4-data-zero.md](../reports/debugger-260502-1629-gsc-ga4-data-zero.md)
