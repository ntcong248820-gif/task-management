# Red Team Review

Date: 2026-07-07
Mode: `ck:plan --hard`
Status: DONE_WITH_CONCERNS, concerns folded back into phase files

## Findings

1. Provenance columns are nullable by design, but unique indexes with nullable source columns can still allow duplicate legacy rows. Phase 2 must use partial/non-null indexes for new provenanced rows and keep legacy unknown rows excluded from user-facing analytics/reporting.

2. Active-source backfill by latest `updatedAt` can select the wrong GSC site or GA4 property. Phase 3 must surface the selected source for human confirmation after migration, and Phase 1 should record the pre-migration source.

3. Partial unique indexes may need raw SQL migrations instead of Drizzle-only schema declarations. Phase 3 should state this explicitly.

4. `lastRowsSynced` can be misleading if it stores project count or connection count. Phase 3 must store provider fact rows written for that connection and provider.

5. Connection health columns duplicate fields across GSC and GA4 tables. This is acceptable for KISS now, but should be called intentional to avoid premature sync-run table design.

6. Alert hard delete conflicts with lifecycle reporting. Phase 5 should make normal dismiss/status changes auditable and keep delete as admin cleanup only.

7. CSV exports can overload API routes on large projects. Phase 6 must cap rows in MVP and display/export truncation metadata.

8. Production verification may require real Google account access and production permissions. Phase 1 can legitimately end `BLOCKED` if access is missing; do not mark it pass from local checks.

## Resolved Decisions

- 2026-07-09: Legacy unknown rows are excluded from dashboards, reports, and exports.
- 2026-07-09: Source switch deletes old provider analytics data for that project/provider.
- 2026-07-09: MVP supports one active GSC site and one active GA4 property per project.
- 2026-07-09: MVP report stays in app; no email/Slack.
- 2026-07-09: External SEO data and broad team ops are deferred.

## Unresolved Questions

None.
