---
title: "SEO Impact OS Data Trust and Operator Roadmap"
description: "Make SEO Impact OS trustworthy for analytics and task management before adding more SEO market features."
status: in-progress
priority: P1
effort: "12-16d"
branch: "main"
tags: [feature, backend, frontend, database, infra, data-trust]
blockedBy: []
blocks: []
created: "2026-07-07T14:52:31.798Z"
createdBy: "ck:plan"
source: skill
---

# SEO Impact OS Data Trust and Operator Roadmap

## Overview

Implement the post-debugger roadmap from the July 2026 reports. The goal is not "more dashboard"; the goal is an analytics + task management operating system users can trust: source-known data, honest sync health, fresh analytics, alert-to-task action, and in-app reporting.

## Scope Challenge

- Existing code: region pinning, cron business-error failure, integration source metadata, selected-source display, `save=true` quarantine, and correlation date validation already landed.
- Minimum change set: production truth check, raw data provenance, sync health, freshness/source UI. Alert-to-task and reporting follow after data trust.
- Complexity: touches DB schema, sync jobs, analytics APIs, settings UI, alerts, task creation, export endpoints. `--hard` is justified.
- Selected mode: **HOLD SCOPE**. Do not add competitor/SERP/backlink, email/Slack delivery, or broad team ops before analytics + task management trust layer.

## Resolved Product Decisions

- One project has exactly one active GSC site and one active GA4 property for MVP.
- When user changes GSC site or GA4 property, delete old provider analytics data for that project; source changes usually mean wrong connection, so old data is not useful.
- Legacy/unprovenanced rows are excluded from dashboards, reports, and exports.
- MVP reporting stays in app only. No email/Slack delivery in this plan.
- External SEO data sources are deferred. No rank tracker, SERP API, or backlink scope in this plan.
- Team ops is deferred until after Phase 6. This plan only adds alert-to-task workflow, not full team coordination.

## Debugger Fix Status

| Finding | Status Now | Plan Action |
|---|---|---|
| F1 API region mismatch | Code-level fixed with `preferredRegion='sin1'` | Phase 1 verifies live Vercel region |
| F2 Green cron but failed sync | Code-level fixed to fail on business errors | Phase 1 reconnects OAuth and proves rows > 0; Phase 3 adds health state |
| F3 Resource selection UX | Partially fixed: discover/select sync works; `save=true` disabled | Phase 3 adds active-source semantics and change confirmation |
| F4 Source display missing | Fixed in status API + integration card | Phase 4 repeats source/freshness on analytics pages |
| F5 Raw data provenance missing | Not fixed | Phase 2 adds `site_url` / `property_id` provenance |
| F6 Alerts can run on stale data | Workflow sequencing improved | Phase 3-4 add freshness/health guardrails and UI labels |
| F7 Impact-window date validation | Code-level fixed | Phase 1 regression test/verification |

## Source Reports

- `plans/reports/debugger-260703-2324-webapp-integrations-performance-sync.md`
- `plans/reports/brainstorm-260703-2324-seo-impact-os-product-gap-proposal.md`
- `plans/reports/brainstorm-260707-0022-seo-impact-os-roadmap-after-assessment.md`
- `plans/260707-2152-seo-impact-os-data-trust-roadmap/research/researcher-01-data-sync-provenance.md`
- `plans/260707-2152-seo-impact-os-data-trust-roadmap/research/researcher-02-operator-workflow-reporting.md`
- `plans/260707-2152-seo-impact-os-data-trust-roadmap/reports/red-team-review.md`

## Architecture Direction

- One active GSC site and one active GA4 property per project for internal MVP.
- Source switch is destructive for provider analytics data: delete old GSC/GA4 rows for that project/provider, then sync fresh source data.
- Exclude unprovenanced legacy rows from dashboards, reports, and exports.
- Use connection summary columns for current sync health; defer full sync-run history table unless needed.
- Add source/freshness metadata to analytics responses before building exports.
- Convert alerts to tasks through existing task model; avoid a separate recommendation backlog table until lifecycle proves valuable.
- Keep reporting in app for MVP.

## Hard-Mode Review Notes

- Red-team review completed and folded into phases.
- Phase 2 must treat nullable provenance carefully: new unique indexes should protect non-null provenanced rows; legacy unknown rows are excluded from user-facing analytics/reporting.
- Phase 3 must not assume latest updated connection is definitely correct; migration output needs human confirmation.
- Phase 5 must preserve lifecycle audit trail; normal user dismiss should not be hard delete.
- Phase 6 MVP exports need row caps or truncation metadata.

## Not In Scope

- Multi-active-source analytics per project.
- Competitor/SERP/backlink integrations.
- Full drag-and-drop report builder.
- Email/Slack digest delivery.
- Team ops beyond alert-to-task workflow.
- SaaS-grade tenant billing or external client permissions.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Production Truth Check](./phase-01-production-truth-check.md) | Pass w/ Concerns (2026-07-10; F1 region + OAuth verify blocked) |
| 2 | [Data Provenance Schema](./phase-02-data-provenance-schema.md) | Completed (2026-08-13) |
| 3 | [Sync Health Source Management](./phase-03-sync-health-source-management.md) | Completed |
| 4 | [Analytics Freshness UI](./phase-04-analytics-freshness-ui.md) | Pending |
| 5 | [Alert To Task Workflow](./phase-05-alert-to-task-workflow.md) | Pending |
| 6 | [Operator Reporting](./phase-06-operator-reporting.md) | Pending |
| 7 | [Team Ops Expansion Gates](./phase-07-team-ops-expansion-gates.md) | Pending |

## Dependencies

- No active overlapping implementation plan found. Relevant older plans are completed or cancelled.
- Phase 1 can start immediately.
- Phase 2 blocks reliable Phase 4 and Phase 6 reporting.
- Phase 5 should not start before Phase 3 health states exist.
- Phase 6 should not ship before Phase 4 adds visible source/freshness.

## Validation Commands

- `npm run type-check`
- `npm run lint`
- `npm --workspace @seo-impact-os/web run test`
- `npm run build` with required placeholder env locally
- `npm run test` only after local/test DB schema includes latest `tasks.target_url`

## Plan Validation

- 2026-07-09: `ck plan validate plans/260707-2152-seo-impact-os-data-trust-roadmap/plan.md` => PASS, 7 phases detected, 0 errors, 0 warnings.
- Whole-plan consistency sweep after product decisions:
  - Files reread: `plan.md`, all `phase-*.md`, plan-scoped research, red-team report.
  - Decision deltas checked: single active source, destructive source switch, exclude legacy unknown rows, in-app report only, defer external SEO, defer broad team ops.
  - Reconciled stale references: legacy include/preserve options, email/Slack pull-forward, external provider selection, team ops now.
  - Unresolved contradictions: 0.

## Open Questions

None. Product decisions resolved on 2026-07-09.
