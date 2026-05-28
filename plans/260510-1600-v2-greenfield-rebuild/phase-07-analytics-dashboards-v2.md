---
phase: 7
title: "Analytics Dashboards v2 — Deep Dive & Correlation"
status: completed
priority: P1
effort: "~14h"
dependencies: [2, 5, 6]
reviewed: 2026-05-11
---

# Phase 07: Analytics Dashboards v2

## Overview

Rebuild analytics từ surface-level charts thành deep-dive analytics với
URL-level drill down, keyword analysis, và correlation dashboard cho phép
user **chứng minh hiệu quả công việc** bằng cách chọn date range linh động trên chart.

## Chart Library Decision

> **shadcn/ui Charts** (Recharts-based) for all main dashboard charts.  
> **Lightweight SVG sparklines** (custom or `react-sparklines`) for table row sparklines.
>
> Rationale: project already uses shadcn/ui — visual consistency is free.
> Do NOT use Recharts instances inside table rows — 50 Recharts per page causes severe perf regression.
> `ComposedChart` handles dual-axis (GSC clicks + GA4 sessions).
> `ReferenceArea` handles shaded date range highlight on correlation chart.

## Core Dashboards

1. Analytics Overview (`/dashboard/analytics`)
2. Keywords Deep Dive (`/dashboard/analytics/keywords`)
3. Pages Deep Dive (`/dashboard/analytics/pages`)
4. Correlation Dashboard (sub-section of Overview)

---

## Analytics Overview Page

```
AnalyticsOverviewPage
  ├── DateRangePicker (7d / 30d / 90d / custom) — controls KPIs + TopMovers
  ├── KPICards row
  │   ├── Total Clicks (vs previous period %)
  │   ├── Total Impressions (vs previous period %)
  │   ├── Avg Position (vs previous period)
  │   └── Avg CTR (vs previous period)
  ├── TrafficTrendChart (GSC clicks + GA4 sessions dual-axis)
  │   └── Task annotations overlaid (affectsWebsite=true tasks only)
  ├── TopMoversSection
  │   ├── "Top improving keywords this period"
  │   └── "Top declining keywords this period"
  ├── CrossSourceInsightCard (if discrepancy detected)
  └── WeeklyDigestCard (if digest available — fetches from /api/digest/latest)
```

---

## Keywords Deep Dive (`/dashboard/analytics/keywords`)

```
KeywordsPage
  ├── SearchBar (filter by keyword)
  ├── SortControls (position / clicks / impressions / CTR / change)
  ├── FilterBar (position range: e.g., top 10 only; CTR range; country; device)
  └── KeywordsTable (TanStack Table, server-side pagination)
      Columns: Keyword | Clicks | Impressions | CTR | Avg Position | Δ Position | Trend (sparkline)
      └── Row click → KeywordDetailSlideOver
              ├── 90-day position trend chart (shadcn LineChart)
              ├── Clicks + impressions chart
              ├── Top pages ranking for this keyword
              └── Linked tasks (tasks with this keyword in title/tags)
```

**Key additions vs v1:**
- Δ Position column: change vs previous period with ↑↓ arrows + color coding
- Trend sparkline per row (SVG, not Recharts)
- Filter by CTR range: find high-impression/low-CTR opportunities (position < 10, CTR < 2%)

---

## Pages Deep Dive (`/dashboard/analytics/pages`)

```
PagesPage
  ├── SearchBar (filter by URL)
  ├── SortControls (clicks / impressions / position / decay score)
  ├── FilterBar (decay status, date range)
  ├── DecayAlertBanner (if pages flagged by alert engine from Phase 06)
  └── PagesTable (TanStack Table, server-side pagination)
      Columns: URL | Clicks | Impressions | CTR | Avg Position | Trend | Status
      Status: 🟢 Stable | 🟡 Declining | 🔴 Decaying
      └── Row click → PageDetailSlideOver
              ├── 90-day traffic trend chart
              ├── Top keywords for this page
              ├── Period comparison (this month vs last month)
              └── Linked tasks (tasks targeting this URL)
```

**URL filter connects to correlation:** clicking URL row → opens Overview tab with
correlation chart pre-filtered to that URL (via `?url=` query param).

---

## Correlation Dashboard (Rebuilt)

> Reviewed 2026-05-11: Auto-calculated before/after impact windows removed.
> SEO lag varies too much (3 days for technical, 4-12 weeks for links) to hardcode.
> Replaced with interactive date range selection — user selects range to analyze and present.
> This is more honest (no false precision) and better for presentations.

Sub-section of Analytics Overview (tab or section below TrafficTrendChart).

```
CorrelationSection
  ├── URLFilter (dropdown: "All pages" or specific URL — fetches /api/correlation/urls)
  ├── CorrelationChart (shadcn ComposedChart)
  │   ├── GSC aggregated clicks + impressions area chart (dual-axis)
  │   ├── Task annotations: vertical lines (affectsWebsite=true tasks only)
  │   │   └── Click annotation → auto-suggest date range (annotation date → today)
  │   └── ReferenceArea: shaded highlight for selected date range
  ├── ImpactWindowPicker
  │   ├── "From" date + "To" date (DateRangePicker)
  │   └── [Apply] button → updates ImpactSummaryPanel
  └── ImpactSummaryPanel (appears when range is selected)
       ├── "Showing: Jan 8 → Feb 7 (31 days)"
       ├── Clicks in range: 4,200 (+18% vs prior 31d)
       ├── Impressions in range: 48,000 (+12% vs prior 31d)
       ├── Avg Position in range: 14.2 (was 18.1)
       └── [Copy as report snippet] button (for presentations)
```

**Task list (replaces ImpactTasksTable):**

```
TasksInPeriodList
  Columns: Task | Type | Completed
  └── Row: "Focus →" button → sets ImpactWindowPicker from (task.completedAt) to (today)
           and scrolls to chart so user can then adjust the range freely
```

No auto-calculated before/after %. User controls the narrative — selects the range
that shows the most relevant context for their work.

---

## Cross-Source Insight

> Reviewed 2026-05-11: "possible bot traffic" label replaced with investigation framing.
> GSC/GA4 delta has many causes (social traffic spike, JS rendering, cookie consent, channel mix).
> SEO pros also need GA4 session source filter for apples-to-apples comparison:
> GSC is organic-only; GA4 defaults to all sessions. Filtering GA4 to organic is essential.

```
CrossSourceInsightCard
  ├── GA4 Source filter: [All sessions ▾] → Organic | Direct | Social | Referral | All
  │   └── Helper text: "Filter GA4 to 'Organic' for accurate GSC comparison"
  ├── Insight text (dynamic based on selected source + date range):
  │   "GSC clicks +8% vs GA4 organic sessions +2% — 6% gap detected"
  └── Tooltip on "gap detected":
      "Possible causes: bot traffic, JS tracking gaps, consent refusals, channel mix shift"
      [Investigate in Alerts →]
```

---

## Backend API

### Analytics Routes

```
GET /api/analytics/overview?projectId=X&days=30
  → { kpis: KPIData, trafficTrend: DailyMetric[], topMovers: { improving: Keyword[], declining: Keyword[] } }

GET /api/analytics/keywords?projectId=X&days=30&sort=clicks&order=desc&page=1&limit=50
  → { keywords: KeywordRow[], total: number }

GET /api/analytics/keywords/:keyword?projectId=X&days=90
  → { positionHistory: DailyMetric[], clicksHistory: DailyMetric[], topPages: PageRow[] }

GET /api/analytics/pages?projectId=X&days=30&sort=clicks&order=desc&page=1&limit=50
  → { pages: PageRow[], total: number }
  ⚠️ Pagination required — projects can have 10,000+ unique pages

GET /api/analytics/pages/detail?projectId=X&url=X&days=90
  → { trafficHistory: DailyMetric[], topKeywords: KeywordRow[], linkedTasks: Task[] }
```

### Correlation Routes

```
GET /api/correlation?projectId=X&days=90&url=X (optional)
  → { chartData: DailyMetric[], tasks: TaskAnnotation[] }

GET /api/correlation/urls?projectId=X
  → { urls: string[] }

GET /api/correlation/impact-window?projectId=X&from=DATE&to=DATE&url=X (optional)
  → {
      rangeClicks: number,
      rangeImpressions: number,
      rangeAvgPosition: number,
      priorPeriodClicks: number,      // equivalent prior period for comparison
      priorPeriodImpressions: number,
      deltaClicks: number,            // % change
      deltaImpressions: number,
    }
```

### Cross-Source Insight

```
GET /api/analytics/overview?projectId=X&days=30&ga4Source=organic
  → adds ga4Source filter to GA4 query (WHERE session_source = 'google' for organic)
```

```ts
async function getCrossSourceInsight(projectId: string, days: number, ga4Source?: string) {
  const gscGrowth = ...; // GSC clicks growth % vs prior period
  const ga4Growth = ...; // GA4 sessions growth % (filtered by ga4Source if provided)
  const delta = Math.abs(gscGrowth - ga4Growth);

  if (delta > 15) {
    return {
      type: 'source_discrepancy',
      severity: delta > 30 ? 'warning' : 'info',
      message: `GSC ${gscGrowth > 0 ? '+' : ''}${gscGrowth}% vs GA4 ${ga4Source ?? 'all'} ${ga4Growth > 0 ? '+' : ''}${ga4Growth}% — ${delta}% gap`,
      tooltip: 'Possible causes: bot traffic, tracking gaps, consent refusals, or channel mix shift.',
    };
  }
  return null;
}
```

## Database Index Strategy

> gsc_data can reach tens of millions of rows (100 pages × 500 keywords × 365 days = 18M/project).
> These indexes must be added in Phase 07 migration before implementing the analytics routes.

```sql
-- Covering index for all date-range aggregation queries
CREATE INDEX IF NOT EXISTS gsc_data_project_date_idx
  ON gsc_data (project_id, date DESC);

-- For keywords deep-dive (GROUP BY query with date filter)
CREATE INDEX IF NOT EXISTS gsc_data_project_query_date_idx
  ON gsc_data (project_id, query, date DESC);

-- For pages deep-dive (GROUP BY page with date filter)
CREATE INDEX IF NOT EXISTS gsc_data_project_page_date_idx
  ON gsc_data (project_id, page, date DESC);

-- ga4_data source filter for cross-source insight
CREATE INDEX IF NOT EXISTS ga4_data_project_source_date_idx
  ON ga4_data (project_id, session_source, date DESC);
```

Add these as a migration file: `packages/db/src/migrations/[timestamp]_add_analytics_indexes.sql`

**Caching:** Use Next.js `unstable_cache` with key `[projectId, days, lastSyncDate]` and 1h TTL
for analytics endpoints. No Redis needed at 5-20 users. Invalidate on sync completion.

## Related Code Files

**Rewrite:**
- `packages/api-app/src/routes/analytics.ts` — Full redesign (overview, keywords, pages)
- `packages/api-app/src/routes/correlation.ts` — Rebuild: remove impact calc, add impact-window endpoint + URL filter
- `packages/api-app/src/routes/rankings.ts` → merged into `analytics.ts` keywords endpoint
- `packages/api-app/src/routes/urls.ts` → merged into `analytics.ts` pages endpoint

**Create:**
- `packages/db/src/migrations/[timestamp]_add_analytics_indexes.sql`
- `apps/web/src/app/(app)/dashboard/analytics/page.tsx` (overview)
- `apps/web/src/app/(app)/dashboard/analytics/keywords/page.tsx`
- `apps/web/src/app/(app)/dashboard/analytics/pages/page.tsx`
- `apps/web/src/components/features/analytics/traffic-trend-chart.tsx`
- `apps/web/src/components/features/analytics/kpi-cards.tsx`
- `apps/web/src/components/features/analytics/correlation-chart-v2.tsx`
- `apps/web/src/components/features/analytics/impact-window-picker.tsx`
- `apps/web/src/components/features/analytics/impact-summary-panel.tsx`
- `apps/web/src/components/features/analytics/cross-source-insight-card.tsx`
- `apps/web/src/components/features/analytics/keywords-table.tsx`
- `apps/web/src/components/features/analytics/pages-table.tsx`
- `apps/web/src/components/features/analytics/keyword-detail-panel.tsx`
- `apps/web/src/components/features/analytics/page-detail-panel.tsx`
- `apps/web/src/components/features/analytics/sparkline.tsx` (lightweight SVG sparkline)
- `apps/web/src/hooks/use-analytics.ts`
- `apps/web/src/hooks/use-correlation.ts`

**Delete:**
- Old analytics, rankings, urls, correlation, keywords route files
- Old frontend components for these pages

## Todo

- [x] Add analytics indexes migration (4 composite indexes on gsc_data + ga4_data)
- [x] Redesign `analytics.ts` — overview, keywords (paginated), pages (paginated) endpoints
- [x] Add `ga4Source` filter to overview endpoint for cross-source insight
- [x] Redesign `correlation.ts` — remove calculateTaskImpact, add impact-window endpoint
- [x] Add `/api/correlation/urls` endpoint
- [x] Implement `getCrossSourceInsight()` with investigation framing
- [x] Build Analytics Overview page + KPI cards
- [x] Build TrafficTrendChart (shadcn ComposedChart, dual-axis, task annotations)
- [x] Build TopMovers section
- [x] Build Correlation section with URLFilter + ImpactWindowPicker + ImpactSummaryPanel
- [x] Build CrossSourceInsightCard with GA4 source filter dropdown
- [x] Build lightweight SVG sparkline component for table rows
- [x] Build Keywords page (TanStack Table, server-side paginated)
- [x] Build KeywordDetailPanel (slide-over, shadcn charts)
- [x] Build Pages page (TanStack Table, server-side paginated, decay status)
- [x] Build PageDetailPanel (slide-over)
- [x] Wire "Focus →" on task list → sets ImpactWindowPicker + scrolls to chart
- [x] Wire URL click in pages table → opens correlation with ?url= param
- [x] Write SWR hooks for analytics + correlation
- [x] Run `npm run type-check`

## Success Criteria

- [x] No auto-calculated impact %  anywhere in correlation code
- [x] ImpactSummaryPanel shows correct delta when date range selected
- [x] "Focus →" on task pre-fills date range from task.completedAt to today
- [x] URL filter on correlation chart updates both chart data and summary panel
- [x] Task annotations only show `affectsWebsite=true` tasks
- [x] Keywords table server-side paginated (50/page), sorts + filters correctly
- [x] Pages table server-side paginated (50/page), shows decay status 🟢🟡🔴
- [x] Cross-source insight uses "gap detected" framing, not "bot traffic"
- [x] GA4 source filter updates insight dynamically
- [x] KPI cards period-over-period % correct
- [x] Analytics queries complete in < 2s with indexes in place
- [x] Sparklines in table rows render without page performance regression
