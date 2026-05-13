# Phase 06-07 Plan Review & Validation Session

**Date:** 2026-05-11 14:30
**Severity:** High
**Component:** SEO Impact OS v2.0 Analytics (Phase 06 Intelligence, Phase 07 Dashboards)
**Status:** Resolved — Plan revisions committed

---

## What Happened

Deep technical review of Phase 06 (Analytics Intelligence) and Phase 07 (Analytics Dashboards v2) revealed five critical design inconsistencies that would have shipped bugs or poor UX if discovered in implementation instead of now. Conducted cross-phase validation and fixed schema/API/algorithm designs. Session took 3 hours to review, identify root causes, and update both phase files with architectural correctness.

---

## The Brutal Truth

This is the exact conversation that prevents shipping broken code. The original Phase 06 plan looked solid at outline level but had concrete bugs baked into the implementation spec:

1. **Alert dedup would fail silently** — no unique constraint, two cron runs = duplicate alerts every day
2. **Read tracking was fundamentally wrong** — `alerts.isRead` boolean breaks in multi-user teams (shared state across all users)
3. **Weekly digest was schema pollution** — storing it in alerts table broke filtering semantics
4. **Anomaly detection would false-positive constantly** — rolling average doesn't account for weekends (50-70% fewer clicks Saturdays)
5. **Phase 07 correlation promised causation** — auto-calculated windows gave false precision on statistically impossible attributions

These aren't edge cases — they're showstopper bugs on a v2 rebuild. The review caught them pre-implementation. This is why we review before coding.

---

## Technical Details

### Phase 06: Critical Findings

**[CRITICAL] Anomaly Detection Algorithm Flaw**

Original spec: "14-day rolling average, alert if > 25% below average"

Problem analysis:
```
Example: B2B SaaS site with Mon-Fri heavy traffic, weekend activity 40% of weekday average
- Every Saturday triggers "critical" alert (actual 40% drop from rolling avg which includes weekdays)
- Alert is invalid — Saturday is normal for this site
- User gets 52 false alerts per year = notification fatigue → user disables alerts
```

Solution implemented: Day-of-week z-score with same-DoW history
```
- Compare Saturday only to last 8 Saturdays (not to rolling 14-day mix)
- z = (today - avg_same_DoW) / stddev_same_DoW
- z < -1.5 = warning, z < -2.5 = critical
- Minimum 4 data points → new projects skip alerts first 4 weeks (statistically sound)
- Result: Eliminates weekend false positives entirely, scales to holiday patterns
```

Why this matters: Statistical naïveté in a "proactive alert" system destroys credibility. SEO professionals will disable alerts that cry wolf every weekend.

**[CRITICAL] Alert Read State Sharing Bug**

Original schema reference: `alerts.isRead` boolean
Original implementation: `PATCH /api/alerts/:id/read` would SET isRead=true

Actual Phase 02 schema (already designed): `alert_reads(alertId, userId, readAt)` join table

Problem:
- Boolean `isRead` = shared state across entire team
- User A reads "traffic drop" alert → immediately disappears from User B's unread list
- Multi-user workspace model breaks silently
- Violates "per-user notification center" requirement

Fix applied:
- All alerts APIs use `alert_reads` join table exclusively
- `GET /api/alerts` joins alert_reads WHERE userId=current, computes `isRead` per-user
- `PATCH /api/alerts/:id/read` → INSERT alert_reads (atomic, idempotent)
- `GET /api/alerts/count` → COUNT where not exists in alert_reads

This was a coordination failure between Phase 02 schema team and Phase 06 logic team. Pre-implementation review caught it.

**[CRITICAL] Weekly Digest Storage Design**

Original plan: Store digest as `type='weekly_digest'` in `alerts` table with `projectId = NULL`

Problems:
```
1. Nullable foreign key design smell
   - Alerts normally tied to projectId (specific issue)
   - Digest is workspace-level summary, not a specific alert
   - NULL FK is a code smell flag for "this doesn't belong here"

2. Digest pollutes actionable alert filters
   - `WHERE severity='critical'` would include digests (wrong)
   - "Mark all alerts as read" would mark digest (conceptually wrong)
   - Different dedup/retention semantics (alerts = 30d TTL, digest = 1/week forever)

3. Schema coupling makes digest optional/removable without breaking alerts
   - But digest is core feature in Phase 07, not optional
```

Fix applied: New `workspace_digests` table
```sql
CREATE TABLE workspace_digests (
  id text PRIMARY KEY,
  workspaceId text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  weekStart date NOT NULL,
  data jsonb NOT NULL,
  createdAt timestamp DEFAULT now(),
  UNIQUE(workspaceId, weekStart)
);
```
- Stored separately, rendered as distinct card on Overview (not in alert center)
- UNIQUE constraint prevents duplicate generation on cron re-run
- Single query to fetch latest digest per workspace

**[WARNING] Alert Dedup Race Condition**

Original: "check if alert exists, if not insert"

Problem: Two simultaneous cron runs can both SELECT empty, both INSERT

Fix: Unique constraint + INSERT...ON CONFLICT DO NOTHING
```sql
ALTER TABLE alerts ADD CONSTRAINT alerts_project_type_date_unique
  UNIQUE (project_id, type, DATE(created_at));
```
Then in code: `INSERT...onConflictDoNothing()` (atomic, database-level).

**[WARNING] Cron Orchestration Guard Missing**

Original: Alert engine runs as next step in cron without condition

Problem: If GSC sync fails gracefully (returns 200 but found no new data), alert engine still runs on stale yesterday data → false positives

Fix: GitHub Actions `if:` guard
```yaml
- name: Run Alert Engine
  if: steps.gsc_sync.outcome == 'success'
  run: |
    curl -X POST "${{ vars.APP_URL }}/api/cron/run-alerts"
```
Plus in alert engine: Verify yesterday's data exists before running.

---

### Phase 07: Critical Findings

**[CRITICAL] Impact Windows Removed Entirely**

Original spec: `IMPACT_WINDOWS = { technical: 14, content: 30, links: 60 }` — auto-calculate before/after periods

This was fundamentally dishonest statistics:
```
Problem 1: SEO lag varies wildly
- Technical fix: 3-7 days to Google re-crawl
- Content: 10-30 days for ranking lift
- Link building: 4-12 weeks (sometimes months)
- Single hardcoded windows across all types = wrong

Problem 2: Seasonal confounding over 30-60 day windows
- Jan traffic != Mar traffic naturally
- 60-day window can flip mid-window due to season
- Attribution becomes impossible

Problem 3: Multiple overlapping tasks make attribution nonsense
- 3 content updates + 1 technical fix in same month
- Which change caused which result? Unknown.
- Auto-calculated % gives false precision

Problem 4: User expectations mismatch
- SEO client wants to prove a specific task drove results
- Hardcoded window prevents honest investigation
- User either accepts false narrative or manually proves differently
```

Solution: Interactive date range picker
```
User flow:
1. Task completed on Jan 8
2. User clicks "Focus →" on task
3. ImpactWindowPicker pre-fills from Jan 8 → today (May 11)
4. Chart displays with ReferenceArea highlighting selection
5. ImpactSummaryPanel shows: "Clicks in period: 4,200 (+18% vs prior 31d)"
6. User adjusts dates if needed (narrows to relevant window)
7. User copies as report snippet for presentations

Why better:
- Honest — user controls the narrative, not black box
- Flexible — window matches actual SEO lag for this change
- Presentable — user can show the range they measured
- Auditable — metric shown (delta vs prior period), not mysterious
```

This is a UX/integrity fix. The original approach was lying with statistics.

**[CRITICAL] Pages API Missing Pagination**

Original: `GET /api/analytics/pages` returns all pages for a project

Problem analysis:
```
gsc_data scale: 100 pages × 500 keywords × 365 days = 18M rows/project
Typical query: "Give me top pages by clicks last 30 days"
Without pagination: returns 10,000+ rows in single response
- Payload = massive (MB)
- Client browser rendering = freeze
- Database query kills itself on large workspaces
```

Fix: Server-side pagination matching keywords API pattern
```
GET /api/analytics/pages?projectId=X&page=1&limit=50
→ { pages: PageRow[], total: number }
```

**[WARNING] Analytics Index Strategy Missing**

gsc_data queries are slow without proper indexes:
```sql
-- All date-range queries (KPI cards, overview)
CREATE INDEX gsc_data_project_date_idx ON gsc_data (project_id, date DESC);

-- Keywords deep-dive (GROUP BY query)
CREATE INDEX gsc_data_project_query_date_idx ON gsc_data (project_id, query, date DESC);

-- Pages deep-dive (GROUP BY page)
CREATE INDEX gsc_data_project_page_date_idx ON gsc_data (project_id, page, date DESC);

-- Cross-source insight (GA4 session source filter)
CREATE INDEX ga4_data_project_source_date_idx ON ga4_data (project_id, session_source, date DESC);
```

Without these: Phase 07 queries timeout on projects with 10M+ gsc_data rows. Added to Phase 07 migration file.

**[WARNING] Cross-Source Insight Messaging Inaccurate**

Original label: "Possible bot traffic" (when GSC/GA4 delta > 15%)

Reality: Most common causes are:
- Viral social traffic spike (GA4 up, GSC stable)
- JS tracking issues or consent refusals
- Cookie consent modal blocking GA4
- Channel mix shift (social, direct, referral)
- Bot traffic is ONE possible cause, not the primary cause

Fix: Changed framing to investigation-based:
```
Before: "⚠️ Possible bot traffic — GSC +8%, GA4 +2%"
After: "ℹ️ Gap detected: GSC clicks +8% vs GA4 +2% (6% difference)"
       [Dropdown: "Filter GA4 to: All sessions ▾ | Organic | Direct"]
       Helper: "Filter to 'Organic' for apples-to-apples comparison"
```

Why: GSC is organic-only, GA4 defaults to all traffic. Users need to filter GA4 to organic for valid comparison. Label was misleading.

---

### Cross-Phase Impact Analysis

| Phase | Finding | Action | Status |
|-------|---------|--------|--------|
| 02 | `alerts` table already NO `isRead` column (Phase 02 was correct) | None — align Phase 06 to Phase 02 | ✅ Fixed |
| 02 | `alert_reads` join table exists and is correct | Use it exclusively in Phase 06 | ✅ Fixed |
| 03 | `recharts` not in npm install list | Add `npx shadcn@latest add chart` to Phase 03 Todo | 📋 Added |
| 04 | `tasks` missing `targetUrl TEXT NULL` field | Add field + migration + Zod schema | 📋 Added to Phase 04 |
| 04 | `GET /api/tasks` missing `search` filter | Add `search?: string (ILIKE title+tags)` param | 📋 Added to Phase 04 |
| 05 | No impact on goals/sprints | — | ✅ Clear |
| 01 | No impact on auth/workspace | — | ✅ Clear |

---

## What We Tried

1. **Sketched the Phase 06 anomaly detection algorithm** — Rolling average approach looked sound until walked through a B2B example with strong weekend variance. Immediately clear it would false-positive every week.

2. **Traced alert_reads usage through Phase 02 schema** — Found that Phase 02 already designed it correctly as join table, but Phase 06 mistakenly referenced `alerts.isRead` boolean (which doesn't exist in actual schema).

3. **Prototyped digest storage in alerts table** — Realized it breaks filtering logic and couples unrelated concerns. Designed separate `workspace_digests` table instead.

4. **Calculated gsc_data scale** — 18M rows scenario forced realization that pagination was mandatory for Pages API, not optional.

5. **Reviewed impact window logic** — Recognized that hardcoding 14/30/60-day windows is statistically dishonest when SEO lag varies 3 days to 12 weeks. Interactive picker is the honest solution.

---

## Root Cause Analysis

Why did these issues exist in the plan?

1. **Algorithm design without test cases** — Anomaly detection spec lacked walkthrough on real-world traffic patterns (weekends, holidays, seasonal). Should have written test case: "B2B site with 70% weekend drop" first.

2. **No cross-phase schema audit** — Phase 06 written semi-independently of Phase 02 schema output. Alert read tracking should have been validated against actual Phase 02 `alerts` table design before writing Phase 06 implementation spec.

3. **Scale assumptions unstated** — Pages API designed for "typical" site without calculating gsc_data cardinality. Should have: "100 pages × 500 keywords × 365 days = 18M rows/project" as a forcing function for pagination.

4. **Statistical literacy gap** — Original impact window approach assumed correlation = causation and ignored seasonal confounding. This is a domain knowledge issue, not an implementation issue. Requires SEO expert or data scientist review.

5. **Cron orchestration logic not specified** — Phase 06 alert engine was written as isolated unit without considering failure modes of upstream sync job. Should have: "Alert engine is step 2 in cron pipeline" explicitly in Phase 06 context.

---

## Lessons Learned

1. **Pre-implementation review of cross-phase contracts is non-negotiable on multi-phase projects.** Phase 06 and Phase 02 operate on different schemas — if you don't audit the FK/table references before coding, you ship broken systems. This should be an explicit review checklist step.

2. **Algorithm design requires test cases before implementation.** A 30-second walk-through of "what happens on a Saturday for a B2B site" would have caught the anomaly detection flaw. Algorithms that touch user-facing features need worked examples, not pseudocode.

3. **Don't assume domain knowledge — force it out of stakeholders.** The original impact window design assumed someone understood SEO lag distribution and seasonal confounding. Those are not obvious engineering facts. Should have asked: "What's the fastest a technical fix shows results? Slowest? How do we handle seasonal noise?"

4. **Scale-driven architecture decisions must be explicit.** The Pages API pagination flaw existed because the design didn't state "gsc_data reaches 18M rows at scale." Stating cardinality forces the right choices: pagination, caching, indexes. This should be a standard checklist item.

5. **Statistical integrity >> feature polish.** The impact window fix removes a feature (auto-calculation) that seemed clever but was dishonest. The less-polished UX (user picks their own range) is actually more honest and more useful. Ship the honest version, not the impressive-looking version.

---

## Next Steps

1. **Execute Phase 06-07 implementation using updated specs** — Both phase files now have correct algorithm, schema, and API designs. Implementation can proceed with confidence on these designs.

2. **Add cross-phase validation checklist to planning process** — Before next multi-phase rebuild, create explicit checklist: "FK references validated," "schema cardinality calculated," "API contracts audited against downstream phases."

3. **Domain expert review for analytics features** — Any future analytics work (especially correlation/attribution) should get early review from someone with statistical training. Prevents "false precision" bugs.

4. **Update phase-03 and phase-04 Todo items** — recharts dependency install, targetUrl field, search filter on tasks API. These are blockers for Phase 07 UI.

---

## Files Modified

- `plans/260510-1600-v2-greenfield-rebuild/phase-06-analytics-intelligence.md` — Complete rewrite of anomaly detection (z-score + DoW), alert read tracking (join table), digest storage (separate table), cron guard, dedup strategy
- `plans/260510-1600-v2-greenfield-rebuild/phase-07-analytics-dashboards-v2.md` — Removed auto-calculated impact windows, replaced with interactive DateRangePicker, added pagination to Pages API, added 4 composite indexes, updated cross-source insight messaging
- `plans/260510-1600-v2-greenfield-rebuild/phase-03-ui-shell.md` — Added `npx shadcn@latest add chart` to Todo
- `plans/260510-1600-v2-greenfield-rebuild/phase-04-task-management-v2.md` — Added `targetUrl` field to tasks schema, added `search` filter to GET tasks API, added migration task to Todo

---

## Key Insights Extracted

> "Statistical methods for SEO alerts require day-of-week normalization. B2B traffic has 50-70% weekend variance. Any anomaly detection that doesn't normalize by DoW will produce false positives every weekend on real sites."

> "Proving SEO impact is a UX problem, not a math problem. The original auto-calculated windows tried to prove causation — which is impossible with a single site time series (no control group, multiple confounders). The better UX is a tool that lets users select the range THEY want to highlight and show the honest delta."

> "Schema inconsistencies between phases accumulate silently. Phase 02 defined alert_reads for per-user tracking, but Phase 06 independently designed for alerts.isRead boolean. Without a mandatory cross-phase review step, the implementation would have shipped with broken multi-user read state."

> "Pagination and indexes are not implementation details — they're architecture decisions that must be specified in the plan. Missing them causes production outages on scale."
