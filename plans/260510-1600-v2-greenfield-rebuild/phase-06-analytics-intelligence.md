---
phase: 6
title: "Analytics Intelligence — Proactive Alerts & Insights"
status: complete
priority: P1
effort: "~16h"
dependencies: [2]
reviewed: 2026-05-11
---

# Phase 06: Analytics Intelligence

## Overview

Biến app từ passive data display → **proactive intelligence system**.
Thay vì user phải vào xem có gì thay đổi không, app chủ động thông báo khi
có điều gì đáng chú ý.

## Core Features

1. **Cross-source anomaly alerts** — Phát hiện bất thường từ GSC + GA4
2. **Content decay detection** — Trang đang mất impressions/clicks
3. **In-app alert system** — Notification center với per-user unread count
4. **Scheduled weekly digest** — Tổng hợp tuần, gửi in-app (email là Phase 2)
5. **Rule-based recommendations** — Gợi ý hành động dựa trên patterns

## Anomaly Detection Logic

### Approach: Day-of-Week Z-Score

> Reviewed 2026-05-11: Rolling average + percentage threshold was replaced because
> weekends naturally generate 50-70% fewer clicks than weekdays, causing false "critical"
> alerts every weekend. Z-score with same-DoW comparison eliminates this entirely.

```
For each project, daily after sync:

1. Collect same-day-of-week history: last 8 occurrences of same weekday (e.g., all Mondays)
2. Require minimum 4 data points — new projects get no alerts for first 4 weeks (return early)
3. Compute mean + stddev of clicks for that DoW
   ⚠️ CRITICAL: if stddev === 0 (all values identical) → skip, no alert (z-score would be NaN)
4. Skip days where totalImpressions = 0 (indicates missing GSC data, not real traffic drop)
5. z = (yesterday.clicks - mean) / stddev
6. z < -1.5  → alert: traffic_drop (warning)
7. z < -2.5  → alert: traffic_drop (critical)

Same logic for impressions, avgPosition (positive z on position = ranking drop = bad)
```

### Cross-Source Anomaly

```
If GSC clicks z < -1.5 AND GA4 organic sessions z < -1.5 simultaneously
  → alert type: correlated_drop (severity: critical)
  → More likely algorithmic issue, not tracking problem

If GSC impressions drop (z < -1.5) but clicks stable (z > -0.5)
  → alert: ctr_improvement (info) — positions improved, opportunity to optimize CTR

If GSC clicks drop but GA4 sessions stable
  → alert: source_discrepancy (warning) — check GSC filters
```

### Content Decay Detection

```
Weekly batch job — runs Monday (part of weekly-digest cron job)

⚠️ CRITICAL: Do NOT iterate per-page in JS. Use set-based SQL:

SELECT
  page,
  SUM(CASE WHEN date >= NOW() - INTERVAL '7 days' THEN impressions ELSE 0 END) AS current_impressions,
  SUM(CASE WHEN date < NOW() - INTERVAL '7 days' AND date >= NOW() - INTERVAL '14 days' THEN impressions ELSE 0 END) AS prev_impressions,
  AVG(CASE WHEN date >= NOW() - INTERVAL '7 days' THEN position ELSE NULL END) AS current_pos,
  AVG(CASE WHEN date < NOW() - INTERVAL '7 days' AND date >= NOW() - INTERVAL '14 days' THEN position ELSE NULL END) AS prev_pos
FROM gsc_data
WHERE project_id = $projectId
  AND date >= NOW() - INTERVAL '14 days'
GROUP BY page
HAVING
  (current_impressions < prev_impressions * 0.7 AND prev_impressions > 0)  -- 30% drop
  OR (current_pos - prev_pos > 5)                                           -- position drop > 5

→ 1 query per project, not 1 query per page — handles 50K+ pages efficiently
```

## Backend Implementation

### Schema Addition (Migration in Phase 06)

New `workspace_digests` table — do NOT store digest in `alerts`:

```ts
// packages/db/src/schema/workspace-digests.ts
export const workspaceDigests = pgTable('workspace_digests', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueWeek: unique().on(t.workspaceId, t.weekStart), // 1 digest per workspace per week
}));
```

Also add unique constraint on alerts for dedup safety:
```sql
ALTER TABLE alerts ADD CONSTRAINT alerts_project_type_date_unique
  UNIQUE (project_id, type, DATE(created_at));
-- Handles race condition: INSERT...ON CONFLICT DO NOTHING is atomic
```

### Alert Engine (`packages/api-app/src/jobs/alert-engine.ts`)

```ts
// ⚠️ projectId is UUID string (from Phase 02 schema) — NOT number
export async function runAlertEngine(workspaceId: string, projectId: string) {
  // Verify yesterday's data exists before running (guard against partial sync)
  const yesterday = subDays(new Date(), 1).toISOString().split('T')[0];
  const hasData = await db.select().from(gscDataAggregated)
    .where(and(eq(gscDataAggregated.projectId, projectId), eq(gscDataAggregated.date, yesterday)))
    .limit(1);
  if (!hasData.length) return; // sync hasn't completed for yesterday

  await detectTrafficAnomalies(workspaceId, projectId);
  await detectContentDecay(workspaceId, projectId);
  await detectCrossSourceAnomalies(workspaceId, projectId);
  await generateRecommendations(workspaceId, projectId);
}

async function detectTrafficAnomalies(workspaceId: string, projectId: string) {
  // 1. Get last 8 weeks of aggregated daily data
  // 2. Group by day-of-week, compute mean+stddev per DoW
  // 3. Get yesterday's data, compute z-score vs its DoW group
  // 4. If z < threshold → INSERT with ON CONFLICT DO NOTHING (race-safe dedup)
  await db.insert(alerts).values({ ... }).onConflictDoNothing();
}
```

### Alerts API (`packages/api-app/src/routes/alerts.ts`)

> ⚠️ CRITICAL: Use `alert_reads` join table for read tracking — NOT `alerts.isRead` boolean.
> Phase 02 schema has per-user `alert_reads(alertId, userId, readAt)`. Marking read must
> be per-user — team member A reading an alert must not affect B's unread count.

```
GET    /api/alerts             — list (workspaceId, projectId, severity, unreadOnly)
  → Join alert_reads WHERE userId=currentUser to compute isRead per alert

PATCH  /api/alerts/:id/read    — mark as read
  → INSERT INTO alert_reads (alertId, userId, readAt) ON CONFLICT DO NOTHING

PATCH  /api/alerts/read-all    — mark all read
  → Batch INSERT into alert_reads for all unread alerts for currentUser

DELETE /api/alerts/:id         — dismiss (hard delete, or soft-delete with dismissedBy)

GET    /api/alerts/count       — unread count for notification bell
  → COUNT alerts WHERE NOT EXISTS (SELECT 1 FROM alert_reads WHERE alertId=alerts.id AND userId=currentUser)
```

### Recommendations Engine

Rule-based config extracted to separate file for maintainability:

```ts
// packages/api-app/src/config/recommendation-rules.ts
interface RuleContext {
  projectId: string;
  avgCTR: number;
  avgPosition: number;
  impressionsTrend: number;  // % change vs previous period (negative = declining)
  clicksTrend: number;
  topPageDecayCount: number;
}

interface RecommendationRule {
  condition: (ctx: RuleContext) => boolean;
  recommendation: {
    type: string;
    title: string;
    body: string;
    priority: 'high' | 'medium' | 'low';
  };
}

export const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    condition: (ctx) => ctx.avgCTR < 0.02 && ctx.avgPosition < 10,
    recommendation: {
      type: 'optimize_meta',
      title: 'Optimize title tags',
      body: 'Pages ranking in top 10 with CTR < 2% — improve title/meta to increase clicks',
      priority: 'high',
    }
  },
  {
    condition: (ctx) => ctx.impressionsTrend < -0.15 && ctx.clicksTrend < -0.1,
    recommendation: {
      type: 'refresh_content',
      title: 'Content refresh needed',
      body: 'Impressions and clicks declining — consider updating content or improving topical relevance',
      priority: 'medium',
    }
  },
  // Add more rules here — engine in alert-engine.ts iterates this array
];
```

### Weekly Digest (`packages/api-app/src/jobs/weekly-digest.ts`)

Stored in `workspace_digests` table — NOT in `alerts`:

```ts
async function generateWeeklyDigest(workspaceId: string) {
  const weekStart = startOfWeek(subWeeks(new Date(), 1)); // last week

  const data = {
    weeklyClicks: ...,        // GSC this week vs last week (%, absolute)
    weeklyImpressions: ...,
    alertsTriggered: ...,     // Count of alerts triggered this week
    tasksCompleted: ...,      // Tasks completed this week
    topImprovements: [...],   // Keywords that improved most (top 3)
    topDeclines: [...],       // Keywords that declined most (top 3)
  };

  // workspace_digests has UNIQUE(workspaceId, weekStart) — safe to re-run
  await db.insert(workspaceDigests).values({
    workspaceId,
    weekStart: weekStart.toISOString().split('T')[0],
    data,
  }).onConflictDoUpdate({ target: [workspaceDigests.workspaceId, workspaceDigests.weekStart], set: { data } });
}
```

API to expose digest:
```
GET /api/digest/latest?workspaceId=X  → { digest: WorkspaceDigest | null }
```

## Frontend

### Alerts Page (`/dashboard/analytics/alerts`)

```
AlertsPage
  ├── FilterBar (severity: all/critical/warning/info, type, project)
  ├── MarkAllRead button
  └── AlertsList
      └── AlertCard
          ├── Severity icon (🔴 critical / 🟡 warning / 🔵 info)
          ├── Type badge (traffic_drop / content_decay / recommendation)
          ├── Title + body (truncated)
          ├── Project + timestamp
          ├── isRead state derived from alert_reads join (per current user)
          ├── [Mark read] [Dismiss] [View details →]
          └── Expanded: full metadata, chart preview, suggested action
```

### Alert Detail (click → expand or slide-over)

For `traffic_drop` / `correlated_drop`:
- Mini GSC aggregated chart: 15 days context + anomaly day highlighted
- Z-score value shown: "Traffic dropped 2.4 standard deviations below Tuesday average"
- Button: "Create task to investigate →" (pre-fills task with alert context)

For `content_decay`:
- Page URL + impressions trend chart
- Button: "Create optimization task →"

For `source_discrepancy`:
- GSC clicks vs GA4 organic sessions side by side
- Tooltip: "Possible causes: tracking gaps, consent refusals, channel mix shift"
- Link: "View Analytics →"

### Notification Bell (in Header)

- Unread count from `GET /api/alerts/count` (per-user, via alert_reads)
- Click → dropdown with last 5 unread alerts
- "View all alerts →" link
- **Polling strategy**: `setInterval(() => mutate('/api/alerts/count'), 30_000)` — 30s interval
  SWR deduplicates concurrent requests. Upgrade to SSE in v3 if needed.

### Weekly Digest Card (on Overview page)

Fetches from `GET /api/digest/latest` — displayed as distinct card, not in alert list:

```
📊 Weekly SEO Digest — Week of May 5
Clicks: +12% | Tasks done: 8 | 2 content pages decaying
[View full digest →]
```

## Cron Integration

```yaml
# .github/workflows/cron-sync.yml additions

- name: Run GSC Sync
  id: gsc_sync
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${{ vars.APP_URL }}/api/cron/sync-gsc" \
      -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}")
    [ "$response" = "200" ] || exit 1

# Alert engine runs ONLY if sync succeeded
- name: Run Alert Engine
  if: steps.gsc_sync.outcome == 'success'
  run: |
    curl -X POST "${{ vars.APP_URL }}/api/cron/run-alerts" \
      -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

# Weekly digest — separate Monday job
- name: Weekly Digest
  # schedule: '0 8 * * 1' (Monday 8am UTC) — configure in workflow trigger
  run: |
    curl -X POST "${{ vars.APP_URL }}/api/cron/weekly-digest" \
      -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Related Code Files

**Create:**
- `packages/db/src/schema/workspace-digests.ts` — new table
- `packages/db/src/migrations/[timestamp]_add_workspace_digests.sql`
- `packages/api-app/src/config/recommendation-rules.ts` — typed rules config
- `packages/api-app/src/jobs/alert-engine.ts`
- `packages/api-app/src/jobs/weekly-digest.ts`
- `packages/api-app/src/routes/alerts.ts`
- `packages/api-app/src/routes/digest.ts`
- `packages/api-app/src/routes/cron/run-alerts.ts`
- `packages/api-app/src/routes/cron/weekly-digest.ts`
- `apps/web/src/app/(app)/dashboard/analytics/alerts/page.tsx`
- `apps/web/src/components/features/alerts/alert-card.tsx`
- `apps/web/src/components/features/alerts/alert-filters.tsx`
- `apps/web/src/components/layout/notification-bell.tsx`
- `apps/web/src/hooks/use-alerts.ts`

**Modify:**
- `.github/workflows/cron-sync.yml` — add alert engine + weekly digest jobs with sync guard
- `packages/api-app/src/routes/cron/` — register new cron routes
- `apps/web/src/app/(app)/dashboard/page.tsx` — add weekly digest card
- `packages/db/src/migrations/` — add unique constraint on `alerts(projectId, type, date)`

## Todo

- [ ] Add `workspace_digests` schema + migration
- [ ] Add unique constraint migration on `alerts(project_id, type, DATE(created_at))`
- [ ] Implement `alert-engine.ts` with day-of-week z-score anomaly detection
  - Guard: `if (dataPoints.length < 4) return` — no alert for new projects
  - Guard: `if (stddev === 0) continue` — skip when all values identical (NaN protection)
  - Guard: `if (totalImpressions === 0) return` — skip missing-data days (GSC API down)
- [ ] Add UI empty state: "Collecting baseline data — alerts active after 4 weeks"
- [ ] Implement content decay detection — set-based SQL (1 query per project, not per-page loop)
- [ ] Implement cross-source anomaly detection (correlated_drop, source_discrepancy)
- [ ] Extract `recommendation-rules.ts` with typed `RuleContext` interface
- [ ] Implement `generateRecommendations()` engine that iterates rules
- [ ] Create `alerts.ts` API (all read tracking via `alert_reads`, not `isRead`)
- [ ] Create `digest.ts` API
- [ ] Create cron routes: `run-alerts.ts`, `weekly-digest.ts`
- [ ] Implement `weekly-digest.ts` generator → inserts to `workspace_digests`
- [ ] Update GitHub Actions workflow with sync-guard on alert engine
- [ ] Build AlertsPage with filter + mark-all-read
- [ ] Build AlertCard (per-user read state, severity icons, expand)
- [ ] Build NotificationBell (per-user unread count) — add 30s polling via `setInterval + mutate`
- [ ] Add weekly digest card to Overview page
- [ ] Write `use-alerts.ts` SWR hook
- [ ] Test: trigger alert manually, verify per-user read state
- [ ] Test: z-score with stddev=0 → verify no alert generated (NaN guard)
- [ ] Test: new project with <4 data points → verify no alerts
- [ ] Test: GSC API down day (0 impressions) → verify no false traffic_drop alert
- [ ] Run `npm run type-check`

## Success Criteria

- [ ] Alert engine runs only when sync succeeds (cron guard in place)
- [ ] Z-score anomaly: no false positives on weekends/holidays
- [ ] Alert dedup: `INSERT...ON CONFLICT DO NOTHING` — no duplicates on cron re-run
- [ ] `GET /api/alerts/count` is per-user (uses alert_reads, not isRead)
- [ ] Team member A marking alert read does NOT affect B's unread count
- [ ] Weekly digest stored in `workspace_digests`, not in alerts table
- [ ] Content decay detection identifies pages losing impressions weekly
- [ ] Notification bell shows correct per-user unread count
- [ ] "Create task" from alert pre-fills task dialog with context
- [ ] New projects with < 4 weeks of data trigger no z-score alerts

## Anomaly Thresholds

| Alert Type | Z-Score Threshold | Severity |
|-----------|-------------------|----------|
| Traffic drop | z < -1.5 | warning |
| Traffic drop (severe) | z < -2.5 | critical |
| Impressions drop | z < -1.5 | warning |
| Content decay (7d comparison) | > 30% impressions drop | warning |
| Position drop | > 5 spots (weekly avg) | warning |
| Correlated drop (GSC + GA4) | Both z < -1.5 | critical |
| Source discrepancy | GSC drop, GA4 stable | warning |
