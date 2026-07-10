---
phase: 4
title: "Analytics Freshness UI"
status: pending
priority: P2
effort: "2d"
dependencies: [2, 3]
---

# Phase 4: Analytics Freshness UI

## Context Links

- `packages/api-app/src/routes/analytics.ts`
- `packages/api-app/src/routes/correlation.ts`
- `apps/web/src/hooks/use-analytics.ts`
- `apps/web/src/hooks/use-correlation.ts`
- `apps/web/src/app/dashboard/analytics/page.tsx`
- `apps/web/src/app/dashboard/analytics/keywords/page.tsx`
- `apps/web/src/app/dashboard/analytics/pages/page.tsx`
- `apps/web/src/components/features/analytics/*`

## Overview

Surface data source and freshness directly on analytics pages. Users should not have to visit Settings to understand whether charts are current and which source powers them.

## Key Insights

- Integration status now knows selected source; analytics pages do not render it consistently.
- Deep-dive analytics read raw tables, so Phase 2 provenance must be available.
- Legacy rows with unknown provenance must be excluded from user-facing analytics/reporting.

## Requirements

- Functional: every analytics view shows active source, last success, health, and excludes legacy/unprovenanced rows.
- Non-functional: no heavy extra query per chart; source metadata should be fetched once per page/project.

## Architecture

Add a lightweight analytics metadata contract:

```ts
{
  source: {
    gscSiteUrl?: string;
    ga4PropertyId?: string;
    ga4PropertyName?: string;
  },
  freshness: {
    gscLastSyncedAt?: string;
    ga4LastSyncedAt?: string;
    gscHealth: 'healthy' | 'stale' | 'needs_reconnect' | 'error' | 'syncing';
    ga4Health: 'healthy' | 'stale' | 'needs_reconnect' | 'error' | 'syncing';
  },
  provenance: {
    activeSourceOnly: boolean;
    excludedLegacyUnknownRows?: number;
  }
}
```

This can be embedded in `/api/analytics/overview` first and reused in hooks, or served by `/api/analytics/source-status`.

## Related Code Files

- Modify: `packages/api-app/src/routes/analytics.ts`
- Modify: `packages/api-app/src/routes/correlation.ts`
- Modify: `apps/web/src/hooks/use-analytics.ts`
- Modify: `apps/web/src/hooks/use-correlation.ts`
- Create: `apps/web/src/components/features/analytics/data-source-banner.tsx`
- Modify: analytics overview/keywords/pages components.
- Add focused web tests for banner rendering and warning states.

## Implementation Steps

1. Choose metadata delivery: embed in overview and create `source-status` for other pages, or create one shared endpoint.
2. Add server helper to load active GSC/GA4 connection health for project.
3. Add server helper to exclude legacy unknown rows for the selected date range.
4. Update overview response and hook types.
5. Update keywords/pages/correlation hooks to fetch source status.
6. Build `DataSourceBanner`:
   - healthy: concise source + last sync.
   - stale: warning with last success.
   - needs reconnect/error: red state with Settings link.
7. Add active-source filter defaults to analytics queries where provenance exists.
8. Add compact note only if useful: legacy unknown rows are excluded from this view.
9. Add tests for health rendering, source labels, and legacy exclusion.

## Todo List

- [ ] Analytics source/freshness API contract.
- [ ] Active-source helper.
- [ ] Legacy unknown rows excluded from analytics queries.
- [ ] `DataSourceBanner` component.
- [ ] Banner on overview, keywords, pages, correlation.
- [ ] Tests for healthy/stale/error/source states and legacy exclusion.

## Success Criteria

- [ ] Every analytics page shows source and last successful sync.
- [ ] Needs reconnect is visible before user trusts charts.
- [ ] Legacy unknown data is excluded from dashboards/reports/exports.
- [ ] No visible layout regression on mobile.
- [ ] Tests pass.

## Risk Assessment

- Risk: too much warning noise. Mitigation: one compact banner per page, not per card.
- Risk: extra DB reads on every chart. Mitigation: cache per project/request and reuse hook data.
- Risk: source/legacy filter changes chart numbers unexpectedly. Mitigation: label active-source-only data clearly and verify fresh sync in Phase 1-3.

## Security Considerations

- Source metadata is workspace-scoped. Reuse existing `requireProjectInWorkspace`.

## Next Steps

Phase 6 reporting must include this same metadata in exported artifacts.
