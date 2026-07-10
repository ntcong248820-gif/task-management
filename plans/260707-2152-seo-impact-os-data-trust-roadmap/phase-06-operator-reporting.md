---
phase: 6
title: "Operator Reporting"
status: pending
priority: P2
effort: "2-3d"
dependencies: [4, 5]
---

# Phase 6: Operator Reporting

## Context Links

- `packages/api-app/src/routes/analytics.ts`
- `packages/api-app/src/routes/digest.ts`
- `packages/api-app/src/jobs/weekly-digest.ts`
- `apps/web/src/app/dashboard/analytics/page.tsx`
- `apps/web/src/components/features/analytics/impact-summary-panel.tsx`
- `apps/web/src/hooks/use-analytics.ts`
- `apps/web/src/hooks/use-alerts.ts`

## Overview

Build lightweight reporting that an SEO lead can use immediately: CSV exports, better report snippets, and a weekly report view with source/freshness included.

## Key Insights

- Full report builder is not needed yet.
- Exporting without source/freshness would amplify trust issues.
- Existing weekly digest and impact summary are enough foundation for report builder-lite.
- Product decision: MVP report stays inside the app. No email/Slack delivery in this plan.

## Requirements

- Functional: in-app CSV export for keyword/page data, copyable report snippets, report view using KPIs/top movers/alerts/tasks/source freshness.
- Non-functional: exports respect workspace/project scope, date range, source filter, and pagination constraints.

## Architecture

Add export endpoints or query parameters on analytics routes:
- `GET /api/analytics/keywords/export?projectId=&days=&format=csv`
- `GET /api/analytics/pages/export?projectId=&days=&format=csv`
- Optional `GET /api/reports/weekly?projectId=&weekStart=`

Use server-side CSV generation with stable headers, row caps, and truncation metadata. Add source/freshness metadata to report header.

No email/Slack sender, digest scheduler, or external delivery provider in this phase.

## Related Code Files

- Modify: `packages/api-app/src/routes/analytics.ts`
- Create or modify: `packages/api-app/src/routes/reports.ts` if report route is cleaner.
- Modify: `packages/api-app/src/app.ts` if adding reports route.
- Modify: `apps/web/src/app/dashboard/analytics/page.tsx`
- Create: `apps/web/src/components/features/analytics/export-button.tsx`
- Create: `apps/web/src/components/features/reports/weekly-report-panel.tsx`
- Add tests for CSV headers, filters, and auth scope.

## Implementation Steps

1. Decide route shape: analytics export endpoints vs new reports route.
2. Implement CSV utility with escaping and deterministic headers.
3. Add keywords CSV export using same filters/sort where practical.
4. Add pages CSV export using same filters/sort where practical.
5. Add MVP row cap and include `truncated=true/false` metadata in response or CSV comment/header.
6. Add source/freshness header rows or metadata block.
7. Improve `ImpactSummaryPanel` copy text:
   - selected date range.
   - source labels.
   - prior period comparison.
   - tasks in period.
8. Build weekly report panel:
   - KPIs.
   - top movers.
   - alerts by lifecycle state.
   - tasks completed.
   - source/freshness status.
9. Add UI export buttons.
10. Add tests for CSV and permission guards.

## Todo List

- [ ] CSV utility.
- [ ] Keywords export.
- [ ] Pages export.
- [ ] Source/freshness included in exports.
- [ ] Export row caps/truncation metadata included.
- [ ] Improved copy report snippet.
- [ ] Weekly report panel.
- [ ] Tests for export route scope.
- [ ] No email/Slack delivery scope added.

## Success Criteria

- [ ] SEO lead can export keyword/page data without manual GSC/GA4 export.
- [ ] Report snippet includes source and freshness.
- [ ] Weekly report view avoids unsupported causal claims.
- [ ] Export respects active project/workspace.
- [ ] Tests pass.

## Risk Assessment

- Risk: large CSV export overload. Mitigation: cap rows or stream later; MVP cap is acceptable with warning.
- Risk: reporting implies causation. Mitigation: use "selected range vs prior period", not "task caused result".
- Risk: duplicate query logic. Mitigation: extract shared query builders only if duplication becomes meaningful.

## Security Considerations

- Exports must require same project/workspace access as analytics APIs.
- Avoid leaking source metadata across workspaces.

## Next Steps

After in-app reporting works, review whether analytics + alert-to-task is strong enough before opening separate team ops work.
