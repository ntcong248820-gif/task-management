---
title: SEO Impact OS Product Gap Proposal
date: 2026-07-03
skills:
  - ck:find-skills
  - ck:brainstorm
status: proposal-no-code-change
---

# SEO Impact OS Product Gap Proposal

## Skill Selection

Used `ck:find-skills` first.

External search result from `npx skills find "product strategy app audit"` found generic app/marketing skills, but the requested constraint was a **ck skill**. Best local match: `ck:brainstorm`.

Why `ck:brainstorm`:
- Acts as technical/product advisor.
- Covers architecture, UX/DX, technical debt, feasibility, trade-offs.
- Explicitly fits "tell hard truths" product direction review.

## Context Found

- Product direction: "SEO Operating System", not just Kanban + dashboards.
- Core promise: tell SEO team **what happened, what to do next, and whether work moved metrics**.
- Current implemented base: auth/workspace, tasks, goals/sprints, GSC/GA4, alerts, digest, analytics dashboards, settings.
- Current pain: data trust and operations are weaker than UI feature count.

## Brutal Summary

The app is feature-complete as an MVP shell, but not yet trustworthy as an SEO OS.

Reason: a real SEO operator first asks:
1. Which source is this data from?
2. Did the sync run and import rows?
3. Is the data fresh?
4. What changed and what should I do?
5. Can I report this to stakeholders?

Today the app answers parts of 4, but is weak on 1-3 and 5.

## Product Gaps

| Gap | Severity | Why It Matters |
|---|---:|---|
| Source provenance missing | P0 | User cannot trust analytics without knowing GSC site / GA4 property. |
| Sync health missing | P0 | Workflow can be green while data syncs 0 rows. |
| Resource selection UX incomplete | P0 | Connected account is not same as selected property/site. |
| Region/performance hardening missing | P0 | Slow DB-backed pages reduce operator trust quickly. |
| Data freshness indicators missing | P1 | Old data can look like live insight. |
| Report/export layer thin | P1 | SEO teams need stakeholder-ready output, not just on-screen charts. |
| Recommendation workflow incomplete | P1 | Alerts need conversion into prioritized tasks with owner/due date. |
| Team collaboration incomplete | P1 | Invite email, comments, notifications, audit trail are deferred. |
| Monitoring/ops not mature | P1 | No Sentry/Uptime/cron business alerting in current backlog completion. |
| Competitor/SERP/backlink context absent | P2 | Needed for full SEO OS, but not before data foundation is fixed. |

## Recommended Direction

### Option A - Data Trust Foundation First (Recommended)

Fix source identity, sync reliability, freshness, performance, and observability before adding more SEO features.

**Pros**
- Directly addresses current user pain.
- Makes every existing dashboard more credible.
- Lowers support/debug cost.
- Enables later advanced features safely.

**Cons**
- Less visually exciting than new analytics features.
- Requires schema migration and careful backfill.

**Use when:** Current data trust is the blocker. It is.

### Option B - Feature Growth First

Build competitor tracking, SERP features, exports, advanced recommendations now.

**Pros**
- More product-visible progress.
- Better demo surface.

**Cons**
- Builds on untrusted data foundation.
- Increases complexity while sync/source bugs remain.

**Verdict:** Not recommended yet.

### Option C - Infra Only

Only fix Vercel/Supabase region, cron failure semantics, and monitoring.

**Pros**
- Fastest path to stability.
- Minimal product churn.

**Cons**
- Does not solve source selection/provenance UX.
- User still cannot understand which property/site powers data.

**Verdict:** Good first phase, not enough as full proposal.

## Proposed New Implementation Plan

### Phase 01 - Performance & Runtime Region

Goal: Make DB-backed pages predictably fast.

Deliverables:
- Pin DB/API/auth Node route handlers to Singapore region where possible.
- Measure before/after API timings.
- Review Supabase pooler mode: 6543 transaction vs 5432 session.
- Add lightweight timing logs for DB-backed API handlers.

Success:
- `/api/health` and authenticated lightweight APIs no longer execute in `iad1`.
- P95 API latency target documented after measurement.

### Phase 02 - Sync Health & Cron Truth

Goal: Green workflow must mean useful sync.

Deliverables:
- Cron workflow parses JSON body, not just HTTP status.
- Business failure if `errors.length > 0` or `synced === 0` with connected projects.
- Sync attempts table or columns: lastAttemptAt, lastSuccessAt, lastRowsSynced, lastError.
- Settings card shows health state: Healthy, Needs reconnect, Stale, Error.

Success:
- `invalid_grant` surfaces as red state in UI and GitHub Actions.

### Phase 03 - Source Resource Management

Goal: Connect account is separate from selecting data source.

Deliverables:
- Resource picker after OAuth before first sync.
- Status API returns GSC site and GA4 property metadata.
- Change resource flow with confirmation.
- Unique constraints on connection/resource rows.
- Remove dangerous `save=true` all-resource write path.

Success:
- User can see and change selected GSC site / GA4 property without guessing.

### Phase 04 - Data Provenance Schema

Goal: Every analytics row is traceable to source.

Deliverables:
- Add `site_url` to `gsc_data`.
- Add `property_id` to `ga4_data`.
- Update upsert unique keys.
- Backfill existing rows from current connection if safe; otherwise mark as unknown/current-source-assumed.
- Analytics filters support active resource vs historical resource.

Success:
- Dashboard can answer "this metric came from which source?".

### Phase 05 - Operator-Ready Reporting

Goal: Convert insight to stakeholder artifact.

Deliverables:
- CSV export for analytics tables.
- Chart/report snippet export.
- Weekly digest delivery options: in-app first, email/slack later.
- Report builder-lite: selected KPIs, alerts, tasks completed, source freshness.

Success:
- SEO lead can produce a weekly report without manual GSC/GA4 export.

### Phase 06 - Recommendation-to-Task Workflow

Goal: Alerts become work, not noise.

Deliverables:
- Alert -> create task with linked URL/keyword/source.
- Priority scoring: impact, confidence, freshness, owner.
- Recommendation backlog with status: new, accepted, dismissed, task-created.
- Explain why recommendation exists.

Success:
- User can move from anomaly to assigned action in < 2 minutes.

### Phase 07 - Product Completion Backlog

Goal: Grow toward full SEO OS after foundation is trustworthy.

Candidates:
- Invite email provider and real team onboarding.
- Comments/activity log on tasks and alerts.
- Sentry + uptime + cron business-result alerting.
- OpenAPI docs.
- SERP feature/rank tracker integration.
- Competitor monitoring via third-party API.
- Backlink monitoring only if business value justifies integration cost.

## Missing Features by Product Pillar

### Proactive Analytics Intelligence

Missing:
- Data freshness banner.
- Sync health center.
- Alert confidence/reasoning UI.
- Alert lifecycle: accepted/dismissed/task-created.
- External notifications.
- Source-specific anomaly detection.

### Advanced Task Management

Missing:
- Action conversion from alert/recommendation.
- Task comments/activity history.
- Task impact review workflow after completion.
- Bulk import/export.
- SLA/due-date views for SEO operations.

### Multi-User / Team

Missing:
- Real invite email.
- Member activity audit.
- Team notifications.
- Permission granularity for reports/sources.
- Async standup/team reporting.

### Reporting / Stakeholder Value

Missing:
- CSV export.
- Chart image export.
- Scheduled stakeholder digest.
- Report templates.
- "What changed this week?" narrative.

### SEO Market Completeness

Missing but should wait:
- Competitor keyword monitoring.
- SERP feature tracking.
- Backlink gain/loss monitoring.
- Content gap discovery.
- Search appearance analysis.

## Recommended Priority

1. **P0:** Region + sync truth + reconnect invalid tokens.
2. **P0:** Show selected source and allow changing source.
3. **P0:** Add provenance to raw data.
4. **P1:** Sync health center + data freshness UX.
5. **P1:** Reporting/export layer.
6. **P1:** Alert-to-task workflow.
7. **P2:** Competitor/SERP/backlink integrations.

## Success Metrics

| Metric | Target |
|---|---|
| Cron business failures | Visible in GitHub Actions and UI within same run |
| Data source clarity | Every integration card shows source resource |
| Data freshness | Every analytics page shows last successful sync |
| Manual report time | Reduce weekly report prep by >50% |
| Alert actionability | >50% alerts either dismissed or converted to tasks |
| API latency | Measured P95 target after region pinning |

## Risks

- Provenance migration can mix historical data if done casually.
- Reconnecting OAuth without source selection can repeat wrong-source issue.
- Region pinning may be limited by Vercel plan/config.
- More features before sync trust will worsen product credibility.

## Unresolved Questions

- Should one project support multiple GSC sites/GA4 properties at once?
- Should historical rows be preserved across source changes, or reset by source?
- Is email/slack reporting required for internal MVP, or is in-app digest enough?
- Which external source should be first after foundation: rank tracker, SERP API, or backlinks?
