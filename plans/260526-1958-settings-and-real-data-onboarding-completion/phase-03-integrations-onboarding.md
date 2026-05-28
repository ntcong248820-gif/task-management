---
phase: 3
title: "Integrations Onboarding"
status: completed
priority: P1
effort: "6h"
dependencies: [1, 2]
completedDate: "2026-05-28"
completionNotes: "Implemented use-integrations-settings hook with SWR status/authorize/discover/sync/disconnect; created dual-use IntegrationCard component for GSC and GA4; added OAuth callback handling with success/error messaging; fixed email→accountEmail field mapping; optimized resource discovery with batch queries to prevent N+1 issue."
---

# Phase 3: Integrations Onboarding

## Overview

Replace the Integrations settings placeholder with the real GSC/GA4 onboarding and manual sync workflow for the selected project.

## Requirements

- Functional: show selected project context and require project selection before connect.
- Functional: connect GSC and GA4 via existing authorize endpoints.
- Functional: show connected account email, site/property, last sync, sync status, and sync error.
- Functional: discover and save GSC sites / GA4 properties after connect.
- Functional: run manual sync for selected GSC site and GA4 property with a bounded day range.
- Non-functional: never expose tokens; do not store plain-text secrets client-side; use existing rate-limited endpoints.

## Architecture

The page uses SWR hooks for status/discovery and mutation helpers for authorize, sync, and disconnect. OAuth stays in Hono. The UI only obtains an `authUrl` and redirects the browser.

## Related Code Files

- Modify: `apps/web/src/app/dashboard/settings/integrations/page.tsx`
- Modify: `apps/web/src/app/dashboard/integrations/page.tsx`
- Modify: `packages/api-app/src/routes/integrations/gsc.ts`
- Modify: `packages/api-app/src/routes/integrations/ga4.ts`
- Create: `apps/web/src/hooks/use-integrations-settings.ts`
- Create: `apps/web/src/components/features/settings/integration-card.tsx`
- Create: `apps/web/src/components/features/settings/integration-resource-selector.tsx`
- Read: `packages/api-app/src/routes/integrations/index.ts`
- Read: `packages/db/src/schema/gsc-connections.ts`
- Read: `packages/db/src/schema/ga4-connections.ts`

## Implementation Steps

1. Build `use-integrations-settings.ts`:
   - status key: `/api/integrations/status?projectId=...`
   - authorize helpers for GSC/GA4
   - discovery helpers for sites/properties
   - sync helpers with `days`
   - disconnect helper
2. Normalize OAuth callback landing:
   - direct callback redirect to `/dashboard/settings/integrations?success=...`
   - or preserve query params in `/dashboard/integrations` redirect shim.
3. Build two integration cards:
   - GSC card: connect, account, site, permission, status, discover sites, sync, disconnect.
   - GA4 card: connect, account, property, status, discover properties, sync, disconnect.
4. Add day range control for manual sync: 7, 30, 90, 180, 365.
5. After successful manual sync, mutate:
   - integration status
   - analytics overview hooks if mounted later
6. Add toast handling for `success` and `error` query params, then clean URL state.
7. Verify user cannot connect/sync without a selected project.

## Success Criteria

- [x] User can click Connect GSC and reach Google OAuth with signed state.
- [x] User returns to settings and sees GSC connected state.
- [x] User can discover/select/save GSC site and run manual GSC sync.
- [x] User can click Connect GA4 and reach Google OAuth with signed state.
- [x] User returns to settings and sees GA4 connected state.
- [x] User can discover/select/save GA4 property and run manual GA4 sync.
- [x] Errors show actionable messages without leaking token details.

## Risk Assessment

- Risk: current callbacks point at `/dashboard/integrations`, while visible nav uses `/dashboard/settings/integrations`. Mitigation: preserve query params or change callbacks.
- Risk: current callback auto-selects first GSC site/property. Mitigation: UI discovery step must allow user to choose the right resource after connect.
- Risk: sync catch paths return generic failure but may leave connection `syncing`. Mitigation: implementation should update failed connection status to `error` when feasible.
