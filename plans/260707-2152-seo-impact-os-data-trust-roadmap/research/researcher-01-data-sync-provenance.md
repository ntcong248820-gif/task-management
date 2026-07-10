---
title: Data Sync And Provenance Research
date: 2026-07-07
role: researcher
status: complete
---

# Data Sync And Provenance Research

## Summary

Debugger findings are not all equal:
- Region, cron truth, status metadata, `save=true`, and correlation date validation have code-level fixes.
- Production health still needs live verification after reconnect/redeploy.
- Deep provenance is not fixed: raw GSC/GA4 fact rows still do not identify selected source.

## Evidence

- `apps/web/src/app/api/[[...route]]/route.ts` exports `preferredRegion = 'sin1'`.
- `apps/web/src/app/api/auth/[...all]/route.ts` exports `preferredRegion = 'sin1'`.
- `apps/web/src/app/dashboard/layout.tsx` exports `preferredRegion = "sin1"`.
- `.github/workflows/cron-sync.yml` parses JSON response and fails on `ok=false` or non-empty `errors`.
- `packages/api-app/src/routes/integrations/index.ts` now returns GSC `siteUrl`/`permissionLevel` and GA4 `propertyId`/`propertyName`.
- `apps/web/src/components/features/settings/integration-card.tsx` renders selected source metadata after reload.
- `packages/db/src/schema/gsc_data.ts` has no `siteUrl`.
- `packages/db/src/schema/ga4_data.ts` has no `propertyId`.
- `packages/db/src/schema/gsc-connections.ts` and `ga4-connections.ts` have no `isActive`, no last attempt columns, and no unique active-resource constraints.

## Design Recommendation

Use one active resource per provider/project for internal MVP.

Reason:
- Matches current UI mental model.
- Avoids multi-resource analytics complexity.
- Lets provenance be added without building report-level source combinatorics.

Do not add history/multi-resource behavior in this roadmap. Product decision is one active GSC site and one active GA4 property per project.

## Implementation Shape

1. Production truth check first.
2. Add nullable provenance columns, leave unknown legacy rows untrusted/excluded, update sync writers, then enforce new unique indexes for future writes.
3. Add sync health summary columns to connection tables.
4. Add active-resource semantics with `isActive` and partial unique indexes.
5. Add frontend source/freshness banners after backend contract is stable.

## Risks

- Backfilling old rows to the wrong source is worse than excluding/deleting them.
- Dropping old unique indexes before writer update can cause duplicate rows.
- `invalid_grant` is not solved by code alone; it requires reconnect.

## Resolved Decisions

- 2026-07-09: Legacy unprovenanced rows are excluded from user-facing analytics/reporting.
- 2026-07-09: Source switch deletes old provider analytics data for the project/provider, then fresh sync repopulates.
- 2026-07-09: One project uses one active GSC site and one active GA4 property for MVP.

## Unresolved Questions

None.
