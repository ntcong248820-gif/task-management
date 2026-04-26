# Codebase Summary

> Quick map of all modules. Read before implementing anything.

## apps/api

| File/Dir | Purpose |
|----------|---------|
| `src/index.ts` | Hono app entry, middleware, cron init, CORS |
| `src/routes/projects.ts` | CRUD `/api/projects` |
| `src/routes/tasks.ts` | CRUD `/api/tasks` with status/filter |
| `src/routes/time-logs.ts` | Time tracking entries |
| `src/routes/analytics.ts` | Combined GSC + GA4 metrics |
| `src/routes/correlation.ts` | Task-traffic correlation data |
| `src/routes/rankings.ts` | Keyword position tracking |
| `src/routes/urls.ts` | URL performance + decline detection |
| `src/routes/keywords.ts` | Keyword detail + SERP history |
| `src/routes/diagnosis.ts` | AI rule-based diagnosis |
| `src/routes/integrations/` | GSC + GA4 OAuth + sync routes |
| `src/jobs/sync-gsc.ts` | GSC daily cron job |
| `src/jobs/sync-ga4.ts` | GA4 daily cron job |
| `src/schemas/` | Zod validation schemas (project-schema.ts, task-schema.ts) |
| `src/utils/crypto-tokens.ts` | AES-256-GCM encrypt/decrypt for OAuth tokens |
| `src/utils/token-refresh.ts` | Decrypt + refresh Google OAuth tokens |
| `src/utils/` | Date helpers, string utilities |

## apps/web

| File/Dir | Purpose |
|----------|---------|
| `src/app/dashboard/page.tsx` | Correlation dashboard (main page) |
| `src/app/dashboard/analytics/` | GSC + GA4 analytics dashboard |
| `src/app/dashboard/rankings/` | Keyword rankings page |
| `src/app/dashboard/urls/` | URL performance page |
| `src/app/dashboard/keywords/` | Keyword details page |
| `src/app/dashboard/tasks/` | Kanban board |
| `src/app/dashboard/integrations/` | OAuth connect page |
| `src/app/dashboard/projects/` | Project management |
| `src/components/ui/` | shadcn/ui primitives |
| `src/components/features/` | Feature components (tasks, analytics, rankings, urls, dashboard) |
| `src/components/error-boundary.tsx` | React error boundary for graceful error handling |
| `src/hooks/` | Custom React hooks with SWR caching (useAnalyticsData, useRankingsData, useURLsData, useDiagnosisData, useKeywordDetailData) |
| `src/stores/` | Zustand stores (timer-store, use-project-store) |
| `src/lib/api-client.ts` | Shared SWR fetcher + apiPost for all data hooks |
| `src/types/` | Frontend-only TypeScript types |

## packages/db

| File/Dir | Purpose |
|----------|---------|
| `src/schema/projects.ts` | Projects table |
| `src/schema/tasks.ts` | Tasks table |
| `src/schema/time-logs.ts` | Time logs table |
| `src/schema/integrations.ts` | OAuth tokens (GSC+GA4), GSC sites, GA4 properties with sync tracking |
| `src/schema/gsc-data.ts` | Raw GSC data |
| `src/schema/gsc-data-aggregated.ts` | Aggregated GSC metrics |
| `src/schema/ga4-data.ts` | GA4 data |
| `src/index.ts` | DB client export |

## packages/types

Shared TypeScript interfaces: `Project`, `Task`, `TimeLog`, `GscData`, `Ga4Data`, etc.

## Root-level Scripts

| File | Purpose |
|------|---------|
| `scripts/add-ga4-property.ts` | Manually add GA4 property |
| `scripts/check-and-sync.ts` | Debug: check integration status + sync |
| `scripts/discover-and-sync.ts` | Discover GA4 properties + sync |
| `scripts/encode-db-url.ts` | Encode DB URL for env vars |
| `setup-all-projects.sh` | One-time project setup script |

## Other Directories

| Dir | Purpose |
|-----|---------|
| `docs/` | ClaudeKit-standard docs + legacy subdirs |
| `plans/` | Implementation plans + agent reports |
| `interface-visual/` | Standalone UI prototype (not part of main app) |
