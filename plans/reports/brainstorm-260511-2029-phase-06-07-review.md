# Brainstorm Review: Phase 06 & 07 — Analytics Intelligence + Dashboards v2

**Date:** 2026-05-11  
**Scope:** SEO Impact OS v2.0 — Phase 06 (Analytics Intelligence) & Phase 07 (Analytics Dashboards v2)  
**Status:** Decisions confirmed, phase files updated

---

## Summary of Decisions

| Topic | Original Plan | Decision |
|-------|--------------|----------|
| Anomaly algo | 14-day rolling avg + 25%/50% threshold | Day-of-week z-score (z < -1.5 warning, z < -2.5 critical) |
| Weekly digest storage | `type='weekly_digest'` in alerts table | New `workspace_digests` table (Phase 06 migration) |
| Impact calculation | Auto before/after window per task type | Removed — interactive date range selector on chart |
| Cross-source framing | "possible bot traffic" | "Data discrepancy" + GA4 session source filter |
| alert_reads vs isRead | Plan used `alerts.isRead` directly | Must use `alert_reads` join table throughout |

---

## Phase 06 — Issues Found

### [CRITICAL] alert_reads vs isRead inconsistency

Phase 02 schema defines `alert_reads (alertId, userId, readAt)` for per-user read tracking.  
Phase 06 plan references `alerts.isRead` boolean in API implementation — direct contradiction.

**Impact:** If implemented as-is, all team members share 1 read state per alert. Team member A reads an alert → unread badge disappears for everyone else.

**Fix:** All Phase 06 API implementations must use `alert_reads`:
- `PATCH /api/alerts/:id/read` → INSERT into `alert_reads`, not UPDATE `alerts.isRead`
- `GET /api/alerts/count` → COUNT alerts WHERE NOT EXISTS (SELECT 1 FROM alert_reads WHERE alertId = alerts.id AND userId = currentUserId)
- `PATCH /api/alerts/read-all` → batch INSERT into `alert_reads`

---

### [CRITICAL] Anomaly detection false positives

**Problem:** 14-day rolling average doesn't account for weekly cycles. B2B sites get 50-70% fewer clicks on weekends. A normal Sunday would trigger a "critical" alert every week. High-volume news sites have even higher variance.

**Why z-score is better:**
- Adapts threshold to the site's natural variance (high-variance sites need wider bands)
- Day-of-week comparison eliminates weekend/holiday noise
- Statistically principled — same framework can be extended to more metrics

**Algorithm (confirmed):**
```
For each project daily:
1. Collect same-day-of-week data: last 8 weeks of same weekday (e.g., all Mondays)
2. Compute mean and stddev of clicks for that DoW
3. z = (today.clicks - mean) / stddev
4. z < -1.5 → warning alert
5. z < -2.5 → critical alert
6. Require minimum 4 data points before triggering (new projects = no alerts for 4 weeks)
```

**Same logic applies to:** impressions, avgPosition (inverse: positive z = bad for position).

---

### [CRITICAL] Weekly digest: nullable projectId design smell

`alerts.projectId` is a foreign key. Storing workspace-level digest with `projectId = NULL` violates referential intent and pollutes actionable alert filters.

**Fix:** New `workspace_digests` table added in Phase 06 migration:
```sql
CREATE TABLE workspace_digests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, week_start)  -- 1 digest per workspace per week
);
```

UI renders digest as a distinct card on Overview page, separate from alert notification center.

---

### [WARNING] Alert deduplication: race condition risk

Current plan: application-level check "SELECT → if not found → INSERT". Two simultaneous cron runs can both pass the SELECT check and both INSERT.

**Fix:** Add unique constraint + use INSERT...ON CONFLICT:
```sql
-- Migration: add unique constraint on alerts
ALTER TABLE alerts ADD CONSTRAINT alerts_project_type_date_unique 
  UNIQUE (project_id, type, DATE(created_at));
```
```ts
// INSERT...ON CONFLICT DO NOTHING is atomic — race-safe
await db.insert(alerts).values({...}).onConflictDoNothing();
```

Note: `type='weekly_digest'` is workspace-level so this constraint doesn't apply (handled by `workspace_digests.UNIQUE(workspaceId, weekStart)` instead).

---

### [WARNING] Cron: no guard for alert engine when sync fails

Current: alert engine runs as a separate step after sync step. If sync step fails gracefully (curl returns non-zero), GitHub Actions marks the step failed but continues to next step by default (unless `if:` condition is set).

**Fix:**
```yaml
- name: Run GSC Sync
  id: gsc_sync
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${{ vars.APP_URL }}/api/cron/sync-gsc" ...)
    [ "$response" = "200" ] || exit 1

- name: Run Alert Engine
  if: steps.gsc_sync.outcome == 'success'
  run: |
    curl -X POST "${{ vars.APP_URL }}/api/cron/run-alerts" ...
```

Also: alert engine should validate that `gsc_data_aggregated` has data for yesterday before running. Defensive check against partial sync.

---

### [INFO] Recommendations engine: type safety improvement

Hardcoded rules array is fine for MVP (5-10 rules). No need for DB-stored rules or hot reloading at this scale.

**One improvement:** Type the rule data interface explicitly to avoid runtime errors:
```ts
// packages/api-app/src/config/recommendation-rules.ts
interface RuleContext {
  avgCTR: number;
  avgPosition: number;
  impressionsTrend: number;  // % change vs previous period
  clicksTrend: number;
  topPageDecayCount: number;
}

// Separate config from engine logic — extract rules to own file
export const RECOMMENDATION_RULES: Array<{
  condition: (ctx: RuleContext) => boolean;
  recommendation: Omit<Recommendation, 'id' | 'createdAt'>;
}> = [...];
```

---

## Phase 07 — Issues Found

### [CRITICAL] Impact calculation removed — replaced with interactive date range

**Original design problem:** Auto-calculated before/after windows starting at task completion date capture the period BEFORE Google re-crawls changes. SEO lag varies wildly (technical fixes: 3-7 days; content: 2-4 weeks; links: 4-12 weeks). Any hardcoded window would be misleading or inaccurate.

**More fundamental issue:** "Impact" is correlation, not causation. Multiple tasks overlap, algorithm updates confound results, seasonal variance distorts the before/after comparison.

**Decision:** Remove auto-calculated impact. Replace with interactive date range selection.

**New Correlation Dashboard design:**
```
CorrelationSection
  ├── URLFilter (dropdown: All pages | specific URL)
  ├── DateRangePicker (separate from chart, controls highlighted window)
  ├── CorrelationChart
  │   ├── GSC clicks/impressions area chart
  │   ├── Task annotations (vertical lines, affectsWebsite=true only)
  │   ├── Highlighted window (shaded area = selected DateRange)
  │   └── Click annotation → auto-suggest range (annotation date to today)
  └── ImpactSummaryPanel (appears when range is selected)
       ├── Selected range: Jan 8 → Feb 7 (30 days)
       ├── Clicks in range: 4,200 (+18% vs prior 30d)
       ├── Impressions in range: 48,000 (+12% vs prior 30d)
       └── "Copy as report" button (for presentations)
```

**ImpactTasksTable:** Repurpose as simple task list — columns: Task | Type | Completed | "Focus →" (click → auto-select chart range from task date to task date + 30d as suggestion, user can adjust).

**API changes:**
```
GET /api/correlation?projectId=X&days=90&url=X  → unchanged (chart data)
GET /api/correlation/impact-window?projectId=X&from=DATE&to=DATE
  → { clicks: N, impressions: N, avgPosition: N, priorPeriodClicks: N, delta: N% }
```

No more `calculateTaskImpact()` function. Cleaner, more honest, better for presentations.

---

### [CRITICAL] Pages API missing pagination

`GET /api/analytics/pages?projectId=X&days=30` has no pagination. A project with 10,000 pages returns 10,000 rows in a single response.

**Fix:** Add pagination matching keywords API:
```
GET /api/analytics/pages?projectId=X&days=30&sort=clicks&order=desc&page=1&limit=50
→ { pages: [...], total: N }
```

---

### [WARNING] No index strategy — gsc_data performance risk

`gsc_data` can reach tens of millions of rows (100 pages × 500 keywords × 365 days = 18M rows/project). The keywords and pages aggregation queries GROUP BY + ORDER BY across date ranges on this table. Without indexes, full table scans on every request.

**Required indexes (add in Phase 07 migration):**
```sql
-- Primary covering index for all analytics queries
CREATE INDEX gsc_data_project_date_idx ON gsc_data (project_id, date DESC);

-- For keyword deep-dive (GROUP BY query)
CREATE INDEX gsc_data_project_query_idx ON gsc_data (project_id, query, date DESC);

-- For pages deep-dive (GROUP BY page)
CREATE INDEX gsc_data_project_page_idx ON gsc_data (project_id, page, date DESC);

-- For keyword detail slide-over (single keyword history)
-- Covered by gsc_data_project_query_idx above
```

**Materialized views:** Not needed for MVP. Add the indexes first. If query time > 2s with indexes at 5+ projects, consider daily pre-aggregation job for keywords/pages summaries.

**Caching:** Next.js `unstable_cache` with key `[projectId, days, lastSyncDate]` and 1h TTL. No Redis needed at 5-20 users. This covers the case where users reload analytics pages multiple times per session.

---

### [WARNING] Cross-source insight: inaccurate labeling + missing SEO context

**Problem 1 (confirmed):** GSC/GA4 delta ≠ bot traffic. Common causes: viral social traffic, JS rendering issues, cookie consent reduction, channel mix changes. "Possible bot traffic" is misleading for most cases.

**Problem 2 (raised by user):** SEO professionals verify GA4 traffic using session source filters and URL regex. Without session source filtering, the cross-source comparison is apples-to-oranges: GSC is organic-only, GA4 defaults to ALL sessions including direct, social, email.

**Fix 1 — Investigation framing:**
```ts
return {
  type: 'source_discrepancy',
  severity: delta > 30 ? 'warning' : 'info',
  message: `GSC +${gscGrowth}% vs GA4 +${ga4Growth}% organic — ${delta}% gap`,
  tooltip: 'Possible causes: bot traffic, tracking gaps, consent refusals, channel mix shift.',
  cta: 'Investigate →'
}
```

**Fix 2 — GA4 session source filter:**  
`ga4_data.sessionSource` IS stored in schema. Expose filter in analytics overview:

```
CrossSourceInsightCard
  ├── GA4 Source filter: [All sessions ▾] → [Organic | Direct | Social | Referral | All]
  ├── "When comparing GSC vs GA4, filter to 'Organic' for accurate comparison"
  └── Insight text updates dynamically based on selected source
```

API change:
```
GET /api/analytics/overview?projectId=X&days=30&ga4Source=organic
```

The `ga4_data` GROUP BY `sessionSource` query already exists — just needs the WHERE clause filter exposed to frontend.

---

### [INFO] Chart library not specified

**Decision:** shadcn/ui Charts (Recharts-based) for main dashboards, lightweight SVG sparklines for table rows.

**Rationale:**
- Project already uses shadcn/ui — visual consistency is free
- `<ChartContainer>` + `<AreaChart>` + `<LineChart>` cover all dashboard needs
- Dual-axis chart (GSC + GA4) supported via `ComposedChart`
- Shaded date range highlight via Recharts `ReferenceArea` component

**For table row sparklines:** Do NOT use Recharts instances — rendering 50 Recharts instances per page causes significant performance regression. Use either:
- Custom SVG sparklines (30 lines of code, zero dependencies)
- `react-sparklines` (lightweight, 3kb)

---

## Summary: Required Plan Updates

### Phase 06 Updates
- [ ] Replace anomaly algorithm with day-of-week z-score
- [ ] Add `workspace_digests` table migration; remove `type='weekly_digest'` from alerts
- [ ] Fix all API implementations to use `alert_reads` join table, not `alerts.isRead`
- [ ] Add unique constraint on `alerts(projectId, type, DATE(createdAt))` for dedup
- [ ] Add cron guard: `if: steps.sync.outcome == 'success'`
- [ ] Extract rules to typed `recommendation-rules.ts` config file

### Phase 07 Updates
- [ ] Remove `calculateTaskImpact()` and `IMPACT_WINDOWS`
- [ ] Redesign correlation dashboard with interactive date range + ImpactSummaryPanel
- [ ] Add pagination to pages API (`page=1&limit=50`)
- [ ] Add index strategy section (4 composite indexes on `gsc_data`)
- [ ] Change cross-source insight framing to investigation + add GA4 source filter
- [ ] Specify chart library: shadcn/ui Charts + SVG sparklines for table rows

---

## Unresolved Questions

1. **Correlation chart interaction UX** — Drag-on-chart or separate DateRangePicker? The latter is simpler to implement and more accessible. Recommend DateRangePicker with "apply" button.
2. **workspace_digests table** — Phase 02 migration is finalized. Phase 06 adds this as a new migration file in `packages/db/src/migrations/`. Confirm this is the right approach vs amending Phase 02.
3. **Z-score for new projects** — Min 4 data points threshold means new projects get no alerts for 4 weeks. Is this acceptable, or should we use a global baseline fallback?
