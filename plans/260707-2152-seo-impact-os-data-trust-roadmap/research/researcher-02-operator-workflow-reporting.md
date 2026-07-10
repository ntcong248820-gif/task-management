---
title: Operator Workflow And Reporting Research
date: 2026-07-07
role: researcher
status: complete
---

# Operator Workflow And Reporting Research

## Summary

The product is already more than a dashboard. The next missing layer is operator flow:
- Trust the data.
- Understand the alert.
- Convert insight to task.
- Report impact.
- Coordinate team work.

Without this, the app remains impressive but not operationally complete.

## Evidence

- `docs/project-roadmap.md` marks Phase 06 Analytics Intelligence and Phase 07 Analytics Dashboards v2 complete.
- `packages/api-app/src/routes/alerts.ts` supports list/count/read/delete, but no accepted/dismissed/task-created lifecycle.
- `packages/db/src/schema/alerts.ts` stores `type`, `severity`, `title`, `body`, `metadata`, but no `status`, `linkedTaskId`, `dismissedBy`, or `acceptedBy`.
- `packages/db/src/schema/tasks.ts` has `targetUrl`, `actualImpact`, `expectedImpactStart`, `expectedImpactEnd`, and `tags`, so alert-to-task can reuse existing task model.
- `apps/web/src/app/dashboard/analytics/page.tsx` already has impact summary and correlation UI, so reporting can start with export/snippet improvements before a full report builder.

## Design Recommendation

Do not build a full reporting suite or competitor module first.

Recommended sequence:
1. Make data trustworthy and fresh.
2. Add alert lifecycle and create-task flow.
3. Add lightweight exports and report snippets.
4. Defer broad team ops and external SEO integrations to separate future plans.

## Implementation Shape

- Alert lifecycle should be small: `new`, `accepted`, `dismissed`, `task_created`.
- Create task from alert should prefill project, URL, tags, priority, and source metadata.
- Reporting should be "builder-lite": selected KPIs, top movers, alerts, completed tasks, data freshness, source labels.
- Email/Slack is out of MVP scope; report stays in app.
- Team routing is out of MVP scope; alert action actor is recorded, and task assignment follows existing task defaults.

## Risks

- Alert-to-task without confidence/explanation will create noisy tasks.
- Reporting without source labels will spread untrusted numbers.
- Team workflow before alert lifecycle will multiply notification noise.

## Resolved Decisions

- 2026-07-09: No alert owner routing in this plan. Current actor is recorded for accept/dismiss/create-task actions.
- 2026-07-09: Dismissed alerts remain lifecycle records; normal dismiss is not hard delete.
- 2026-07-09: MVP report stays in app; no email/Slack.
- 2026-07-09: Broad team ops starts after Phase 6 as separate work.

## Unresolved Questions

None.
