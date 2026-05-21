---
title: "Correlation Annotation Fix — Real Impact & URL Filter"
description: "Fix fake Math.random() impact scores, add affectsWebsite task flag, implement URL-level filter on correlation chart"
status: cancelled
priority: P1
effort: 5h
branch: main
tags: [correlation, tasks, gsc, impact, annotation]
created: 2026-05-10
brainstorm: plans/reports/brainstorm-260510-0002-correlation-impact-fix.md
---

# Correlation Annotation Fix

## Goal

Make the app actually *prove* whether work is effective — the core value proposition.
Three concrete fixes to remove placeholder code and close the gap between the stated
purpose and what the app currently delivers.

## Problem

`correlation.ts:163`:
```ts
impact: Math.round(Math.random() * 15 + 5), // Mock impact %
```
The "High-Impact Tasks" table shows **random numbers**. The `actualImpact`,
`expectedImpactStart`, `expectedImpactEnd` fields in the tasks schema exist but
are never populated. Task type is not shown in TaskDialog UI.

## Design: Annotation-First Correlation

- Proof comes from visually seeing annotations at the point tasks were completed,
  overlaid on the traffic chart — not from a complex algorithm.
- `affectsWebsite` flag separates "website change" tasks from planning/admin tasks.
- URL filter allows drilling into a specific page to see its traffic + relevant annotations.
- before/after % is a supporting metric (replaces Math.random()), not the primary proof.

## Phases

| # | Phase | Files | Effort | Status |
|---|-------|-------|--------|--------|
| 01 | [Task Classification](./phase-01-task-classification.md) | `tasks schema`, `task-schema.ts`, `tasks.ts`, `useTaskForm.ts`, `TaskDialog.tsx` | 1.5h | pending |
| 02 | [Real Impact Calculation](./phase-02-real-impact-calculation.md) | `correlation.ts` | 1.5h | pending |
| 03 | [URL Filter — Correlation Chart](./phase-03-url-filter-correlation-chart.md) | `correlation.ts`, `dashboard/page.tsx`, `CorrelationChart.tsx` | 2h | pending |

## Dependencies

- Phase 01 → 02: Phase 02 uses `affectsWebsite` filter; do Phase 01 first
- Phase 01 → 03: Independent. Phase 03 only touches GSC data filtering
- Phase 02 → 03: Independent. Both modify `correlation.ts` but different sections

## Success Criteria

- [ ] No `Math.random()` in codebase
- [ ] Impact % in RecentTasksTable is calculated from real before/after GSC data
- [ ] `affectsWebsite=false` tasks are excluded from correlation chart annotations
- [ ] URL dropdown in correlation chart allows filtering to a specific page
- [ ] `taskType` selector visible in TaskDialog
- [ ] `actualImpact` field populated when task has >= window days of post-completion data

## Cross-Plan Check

- `260509-2212-analytics-metrics-accuracy-fix` (pending) — touches `analytics.ts`,
  `sync-gsc.ts`, `sync-ga4.ts`. No file overlap. Independent.
- `260426-1337-infra-restructuring` (in-progress, phase-01 pending) — no file overlap.
