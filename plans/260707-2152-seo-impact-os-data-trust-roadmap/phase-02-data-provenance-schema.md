---
phase: 2
title: "Data Provenance Schema"
status: pending
priority: P1
effort: "2-3d"
dependencies: [1]
---

# Phase 2: Data Provenance Schema

## Context Links

- `plans/reports/debugger-260703-2324-webapp-integrations-performance-sync.md`
- `packages/db/src/schema/gsc_data.ts`
- `packages/db/src/schema/ga4_data.ts`
- `packages/db/src/schema/gsc_data_aggregated.ts`
- `packages/api-app/src/jobs/sync-gsc.ts`
- `packages/api-app/src/jobs/sync-ga4.ts`
- `packages/api-app/src/routes/integrations/gsc.ts`
- `packages/api-app/src/routes/integrations/ga4.ts`

## Overview

Add source provenance to raw analytics fact rows so every metric can answer "which GSC site / GA4 property did this come from?".

## Key Insights

- `gsc_data_aggregated` already stores `site_url`; raw `gsc_data` does not.
- `ga4_data` has source/medium but not GA4 property identity.
- Backfill must be conservative. Wrong source is worse than deleting/resyncing.
- Product decision: legacy rows without source are excluded from user-facing analytics/reporting.

## Requirements

- Functional: add GSC `site_url` and GA4 `property_id` to raw fact rows and all future sync writes.
- Non-functional: do not silently preserve/report old unknown-source rows; avoid silent history mixing; keep date-range query indexes fast.

## Architecture

Add nullable provenance columns first for migration safety. Existing rows with `NULL` source are legacy/untrusted and must be excluded from dashboards/reports/exports. Future writes must always provide source. New unique indexes include source dimensions for non-null provenanced rows; old unique indexes must be replaced only after writer updates are ready.

Recommended migration shape:

```sql
ALTER TABLE gsc_data ADD COLUMN site_url varchar(500);
ALTER TABLE ga4_data ADD COLUMN property_id varchar(100);
-- Do not infer source for raw legacy rows without direct evidence.
-- User-facing analytics filters out rows where source provenance is NULL.
-- Add new partial/non-null unique indexes including source dimensions.
-- Drop old source-blind unique indexes after new writers pass tests.
```

## Related Code Files

- Modify: `packages/db/src/schema/gsc_data.ts`
- Modify: `packages/db/src/schema/ga4_data.ts`
- Create: `packages/db/migrations/{timestamp}_analytics_source_provenance.sql`
- Modify: `packages/api-app/src/jobs/sync-gsc.ts`
- Modify: `packages/api-app/src/jobs/sync-ga4.ts`
- Modify: `packages/api-app/src/routes/integrations/gsc.ts`
- Modify: `packages/api-app/src/routes/integrations/ga4.ts`
- Modify tests around sync writer/upsert behavior.

## Implementation Steps

1. Write migration adding nullable `gsc_data.site_url` and `ga4_data.property_id`.
2. Do not infer provenance for raw legacy rows by default.
   - Leave legacy unknown rows `NULL`.
   - Add follow-up cleanup path to delete `NULL` provider rows after fresh trusted sync.
   - Only copy source into historical rows when source is directly stored on the row or proven by a narrow migration check.
3. Add new unique indexes:
   - GSC: `project_id, site_url, date, page, query, country, device`.
   - GA4: `project_id, property_id, date, source, medium, device_category`.
4. Use partial indexes or a migration-safe equivalent so nullable legacy source values do not create false uniqueness confidence.
5. Drop or replace source-blind unique indexes after new index exists and writer tests pass.
6. Update Drizzle schemas.
7. Update cron GSC writer rows and conflict target to include `siteUrl`.
8. Update manual GSC sync writer rows and conflict target.
9. Update cron GA4 writer rows and conflict target to include `propertyId`.
10. Update manual GA4 sync writer rows and conflict target.
11. Add tests proving same project/date/page/query can store different source rows without collision.
12. Add tests proving new writes never produce `NULL` provenance.
13. Add focused query tests proving legacy `NULL` rows are excluded from analytics/reporting.
14. Run migration locally against a safe DB copy before production.

## Todo List

- [ ] Migration adds provenance columns.
- [ ] Legacy unknown rows remain untrusted or are cleaned up after fresh sync.
- [ ] Unique indexes include source dimension.
- [ ] Nullable legacy rows do not bypass uniqueness assumptions.
- [ ] Drizzle schema updated.
- [ ] GSC cron writer stores `siteUrl`.
- [ ] GSC manual sync stores `siteUrl`.
- [ ] GA4 cron writer stores `propertyId`.
- [ ] GA4 manual sync stores `propertyId`.
- [ ] Tests cover source-separated upserts.
- [ ] Legacy unknown rows excluded from user-facing analytics/reporting.

## Success Criteria

- [ ] New GSC rows always have `site_url`.
- [ ] New GA4 rows always have `property_id`.
- [ ] Old ambiguous rows are not falsely attributed or shown in reports.
- [ ] Existing analytics queries still work after migration.
- [ ] Type-check, lint, focused tests pass.

## Risk Assessment

- Risk: dropping old unique index too early. Mitigation: ship writer/schema/index change in one tested migration sequence.
- Risk: large backfill locks production. Mitigation: batch update or perform during low traffic.
- Risk: NULL provenance causes report confusion. Mitigation: Phase 4 excludes it from user-facing analytics/reporting.
- Risk: partial indexes are not expressible cleanly through Drizzle schema helpers. Mitigation: write raw SQL migration and keep schema comments/tests aligned.
- Risk: deleting old provider rows removes historical charts. Mitigation: require explicit source-switch confirmation and fresh sync; project/tasks remain intact.

## Security Considerations

- Source IDs are not secrets but can reveal property/site ownership. Keep workspace/project access checks unchanged.

## Next Steps

Phase 3 can build health states on top of proven source identities.
