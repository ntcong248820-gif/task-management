---
title: "Phase 4: Analytics Freshness UI complete"
date: 2026-08-16
summary: "Legacy-row provenance filters on analytics/correlation queries + DataSourceBanner UI on 3 analytics pages, one High-severity GA4 prev-period bug caught in review"
---

# Phase 4: Analytics Freshness UI complete

## What happened

Implemented Phase 4 of the SEO Impact OS data-trust roadmap: analytics freshness UI + legacy-row exclusion.

**Backend:** added `isNotNull(gscData.siteUrl)` / `isNotNull(ga4Data.propertyId)` provenance filters to `packages/api-app/src/routes/analytics.ts` (`/overview` current+previous period, `/keywords`, `/keywords/:keyword`, `/pages`, `/pages/detail`) and `correlation.ts` (`/`, `/urls`, `/impact-window`). Excludes pre-migration-0008 rows with NULL provenance from every live analytics/correlation read. GSC tables already carry a DB-level `NOT NULL` constraint on `siteUrl`, so no extra filter was needed there beyond what the code already reflects.

**Frontend:** built `apps/web/src/components/features/analytics/data-source-banner.tsx`, reusing Phase 3's `useIntegrationStatus` hook and `HEALTH_BADGE` styling from `integration-card.tsx`. Shows active GSC/GA4 source, health state, last sync on all 3 analytics pages (overview/keywords/pages). Renders nothing while loading or when no source is active — never blocks the page. No new backend endpoint; reused `/api/integrations/status` per the plan's DRY decision.

**Code review caught a real bug:** `/overview`'s previous-period GA4 comparison conditions (`ga4PrevConditions`) were missing the `propertyId` provenance filter that the current-period conditions already had — an apples-to-oranges growth-rate calc in `crossSourceInsight`. Fixed and reverified.

Review also flagged missing test coverage the plan explicitly required ("healthy/stale/error/source states and legacy exclusion"). Added `data-source-banner.test.tsx` (6 cases) and `analytics-provenance-api.test.ts` (2 cases, proving exclusion at the live API response level, not just raw `db.select`). One review question — whether hiding a connected-but-inactive/legacy source is intentional — resolved by writing a dedicated test that locks in the behavior as correct, rather than leaving it open.

Manual browser verification against real project data matched Settings page health state exactly.

Side note: `apps/api/.env` had a stale `DATABASE_URL` pointing to the wrong Supabase project ref plus a missing `ENCRYPTION_KEY` — both blocked the standalone dev API (port 3001) needed for browser verification. Fixed locally to match root `.env`; gitignored, not committed, no production impact.

## Decision

Kept the "hide connected-but-inactive source" behavior as-is (test-locked) rather than escalating as an open question — consistent with the plan's "active source" framing and Phase 3's source-switch model where only one source per provider is ever active.

## Next steps

- Phase 5 (Alert to Task Workflow) is next in the roadmap; phases 1–3 remain correct as previously verified, phases 5–7 confirmed still pending.
- Final verification: 104/104 tests passing (54 api + 50 web), lint clean, type-check clean across all 8 packages.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
