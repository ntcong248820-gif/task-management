# Phase 4 Completion Report — Analytics Freshness UI

Date: 2026-08-16 (session)
Status: **completed**

## Scope Delivered

- `packages/api-app/src/routes/analytics.ts`: added `isNotNull(gscData.siteUrl)` / `isNotNull(ga4Data.propertyId)` legacy-row-exclusion filters to `/overview` (both current AND previous-period GA4 conditions), `/keywords`, `/keywords/:keyword`, `/pages`, `/pages/detail`. Legacy `/`, `/gsc`, `/ga4`, `/sites/:projectId` routes left untouched (no live consumer). GSC-side tables carry a `NOT NULL` DB constraint on `siteUrl` already, so GSC queries needed no additional filter.
- `packages/api-app/src/routes/correlation.ts`: same provenance filter added to `/`, `/urls`, `/impact-window`.
- `apps/web/src/components/features/analytics/data-source-banner.tsx` (new): client component consuming existing `useIntegrationStatus(projectId)` hook (Phase 3), reusing `HEALTH_BADGE` styling from `integration-card.tsx`. Renders one line per connected+active source (GSC site / GA4 property), health badge, last-synced time. Renders nothing while loading or when no source is connected or active — never blocks the page.
- Wired `<DataSourceBanner projectId={projectId} />` into `apps/web/src/app/dashboard/analytics/page.tsx`, `analytics/keywords/page.tsx`, `analytics/pages/page.tsx`, directly under `PageHeader`.
- Reused `/api/integrations/status` (Phase 3) — no new backend endpoint built, matching the plan's "reuse over new endpoint" decision to avoid duplicate backend logic.

## Verification

- New tests: `apps/api/src/__tests__/analytics-provenance-api.test.ts` (2 tests, legacy-row exclusion proven at the live API response level, not just raw `db.select`); `apps/web/src/components/features/analytics/data-source-banner.test.tsx` (6 tests — healthy GSC, needs_reconnect GA4, error badge, null-while-loading, null-when-nothing-connected, and exclusion of a connected-but-inactive/legacy source).
- Code review (code-reviewer subagent) found:
  - **High**: `/overview`'s `ga4PrevConditions` (previous-period comparison) was missing `isNotNull(ga4Data.propertyId)` while the current-period `ga4WhereConditions` already had it — apples-to-oranges GA4 growth calc in `crossSourceInsight`. Fixed.
  - **Medium**: plan explicitly required banner tests ("healthy/stale/error/source states and legacy exclusion") — none existed yet. Fixed (6-test file above).
  - **Question resolved via test**: whether hiding a connected-but-inactive source is intentional — confirmed correct per plan's "active source" framing; locked in with a dedicated test case rather than left as an open question.
- Manual browser verification: dev server, real project ("Thế Giới Di Động"), banner renders correctly on all 3 analytics pages, GSC/GA4 "Needs reconnect" states with sync timestamps matched the Settings page state for the same project.
- Tests: 104/104 passing repo-wide (54 api + 50 web).
- Lint: clean, 0 warnings.
- Type-check: clean across all 8 packages.

## Plan Sync-Back

- `phase-04-analytics-freshness-ui.md`: `status: completed`, all Todo + Success Criteria checkboxes marked `[x]`.
- Full-plan sweep (via project-manager agent): Phase 1 "Pass w/ Concerns" unchanged (pre-existing, unrelated blockers). Phase 2, 3 confirmed already correct (completed). Phases 5–7 confirmed correctly pending, no work started.
- Overall roadmap progress: 4/7 phases complete (57%).

## Known Gaps / Unresolved Questions

1. None blocking. The sync-back agent surfaced three questions that are already resolved by this report: (a) which routes implement the legacy filter — the five `analytics.ts` routes + three `correlation.ts` routes listed above, all verified via the new provenance test; (b) the High-severity `ga4PrevConditions` bug — fixed and reverified, not still open; (c) Phase 1's GSC production-reconnect block (Google OAuth passkey / testing-mode consent) is unrelated to Phase 4 and remains as carried forward from Phase 1/3, not something Phase 4 could resolve.
2. Unrelated local-dev-only fix made as a blocking prerequisite for browser verification: `apps/api/.env` had a stale `DATABASE_URL` pointing to a different Supabase project ref than the rest of the app, plus a missing `ENCRYPTION_KEY`. Corrected to match root `.env` / `apps/web/.env.local`. Gitignored, not committed, no production impact.
