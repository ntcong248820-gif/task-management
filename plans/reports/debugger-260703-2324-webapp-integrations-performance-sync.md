---
title: Webapp Integrations, Performance, Sync Debugger Report
date: 2026-07-03
skill: ck:debug
status: investigated-no-code-change
---

# Webapp Integrations Performance Sync Debugger Report

## Executive Summary

- **Issue:** App load slow, auto sync not producing data, GSC/GA4 resource selection unclear, data source provenance missing.
- **Impact:** Dashboard can look "connected" while data is stale/empty; user cannot trust which GSC site or GA4 property powers analytics.
- **Root cause:** Multiple: Vercel API runs in `iad1` while DB is documented in `ap-southeast-1`; cron succeeds at workflow level but GSC/GA4 return `invalid_grant`; Integration status omits selected site/property; raw data tables do not store source resource.
- **Status:** Root causes identified. No code changed in this review.
- **Fix direction:** First stabilize data foundation, then UX/resource management.

## Timeline / Evidence

| Evidence | Result |
|---|---|
| `vercel.json` | Only `{ "crons": [] }`; no region config. |
| `apps/web/src/app/api/[[...route]]/route.ts` | Node runtime only; no `preferredRegion`. |
| HTTP timing from local machine | `/api/health` returns `x-vercel-id=sin1::iad1::...`, 338-562 ms. |
| Cached UI timing | `/login` cache HIT warm: 74-97 ms. Static/cache path not main bottleneck. |
| Supabase journal | Production DB documented as `aws-1-ap-southeast-1.pooler.supabase.com:6543`. |
| `packages/db/src/index.ts` | Port 6543 transaction pooler explicitly warns "known issues"; prepared statements disabled. |
| `gh run list --workflow "Daily SEO Sync"` | Last 10 scheduled runs completed success. |
| `gh run view 28618829222 --log` | GSC: `synced:0`, `invalid_grant`; GA4: `synced:0`, `invalid_grant`. |
| `gh run view 28546688982 --log` | Same `synced:0`, `invalid_grant` for both GSC and GA4. |

## Findings

### F1 - Performance: API region mismatch is confirmed

**Severity:** High
**Status:** Confirmed

The public request enters Vercel edge `sin1`, but the Node API function executes in `iad1`:

```text
/api/health -> x-vercel-id: sin1::iad1::...
/api/integrations/status -> x-vercel-id: sin1::iad1::...
```

DB was moved to Supabase Singapore (`aws-1-ap-southeast-1`). If API runs US East, every DB-backed request pays cross-region latency. This fits the slow authenticated dashboard symptom because protected app routes and API calls hit Better Auth + DB.

**Evidence files:**
- `apps/web/src/app/api/[[...route]]/route.ts`
- `apps/web/src/app/dashboard/layout.tsx`
- `vercel.json`
- `docs/journals/2026-05-23-phase-04-production-db-fixes.md`
- `packages/db/src/index.ts`

**Recommended fix:**
- Add `export const preferredRegion = 'sin1'` to Node route handlers that touch DB/API.
- Add same for dashboard layout/auth route if supported by the deployed Next/Vercel runtime.
- Re-measure `/api/health`, `/api/integrations/status`, authenticated dashboard APIs.
- Consider Supabase session pooler port 5432 if Vercel long-lived Node connections behave better than transaction pooler 6543.

### F2 - Auto sync runs, but business sync fails

**Severity:** Critical
**Status:** Confirmed

GitHub Actions runs daily and exits success, but GSC/GA4 business result is zero:

```json
{"ok":true,"durationMs":2645,"synced":0,"errors":["project ...: invalid_grant"]}
{"ok":true,"durationMs":707,"synced":0,"errors":["project ...: invalid_grant"]}
```

So "data chưa sync tự động" is true at business level, false at scheduler level.

Likely `invalid_grant` causes:
- Google refresh token revoked.
- User changed password/security settings.
- OAuth app/test-user status changed.
- Same Google account reconsented and old refresh token invalidated.
- OAuth client/redirect mismatch since token issuance.

**Workflow flaw:** `.github/workflows/cron-sync.yml` only fails when HTTP code >= 400. The endpoint returns 200 with `errors`, so Actions reports green while no data is synced.

**Recommended fix:**
- Reconnect GSC and GA4 from production with the real Google account.
- After reconnect, run manual sync for selected site/property.
- Change cron endpoint semantics or workflow parser:
  - fail job if `ok=false`
  - fail or warn if `errors.length > 0`
  - fail if `synced === 0` and connected projects > 0
- Add "Sync Health" UI: last attempt, last success, rows synced, resource, error.

### F3 - Integration resource selection is not a real configuration flow yet

**Severity:** High
**Status:** Confirmed

Current flow:
1. OAuth callback auto-picks GSC site or GA4 property.
2. UI later lets user discover resources and click one to sync.
3. Sync updates the connection's `siteUrl` or `propertyId`.

Problems:
- User cannot choose resource during OAuth callback.
- Auto-pick still has fallback to first site/property.
- If token is invalid, discover fails; user is stuck with unknown resource.
- `save=true` discovery path still exists and writes all discovered resources if used again later.

**Evidence files:**
- `packages/api-app/src/routes/integrations/gsc.ts`
- `packages/api-app/src/routes/integrations/ga4.ts`
- `apps/web/src/components/features/settings/integration-card.tsx`

**Recommended fix:**
- Split "Connect account" and "Select active resource" into separate states.
- After OAuth, show resource picker before first sync.
- Store explicit active resource selection.
- Remove or quarantine `save=true` bulk-save path.
- Add unique constraints for connection rows:
  - GSC: `(workspace_id, project_id, site_url)`
  - GA4: `(workspace_id, project_id, property_id)`

### F4 - UI does not show source site/property reliably

**Severity:** High
**Status:** Confirmed

`GET /api/integrations/status` returns:
- connected
- lastSync
- accountEmail
- syncStatus
- syncError

It does **not** return:
- GSC `siteUrl`
- GSC `permissionLevel`
- GA4 `propertyId`
- GA4 `propertyName`

The card only displays `selectedResource` prop, but the settings page never passes it. After reload, the app cannot show the source resource.

**Evidence files:**
- `packages/api-app/src/routes/integrations/index.ts`
- `apps/web/src/app/dashboard/settings/integrations/page.tsx`
- `apps/web/src/components/features/settings/integration-card.tsx`

**Recommended fix:**
- Extend status response with source metadata.
- Render source metadata always:
  - GSC: site URL + permission level.
  - GA4: property name + property ID.
- Add copyable "Data source" block and "Change resource" button.

### F5 - Analytics data rows are not fully provenance-safe

**Severity:** High
**Status:** Confirmed

Raw GSC data table `gsc_data` stores only `project_id`, not `site_url`. GA4 data stores only `project_id`, not `property_id`.

`gsc_data_aggregated` has `site_url`, but most deep-dive analytics read `gsc_data`. GA4 has no property column at all. If the active property/site changes, old and new data can mix under one project.

**Evidence files:**
- `packages/db/src/schema/gsc_data.ts`
- `packages/db/src/schema/gsc_data_aggregated.ts`
- `packages/db/src/schema/ga4_data.ts`
- `packages/api-app/src/routes/analytics.ts`

**Recommended fix:**
- Add `site_url` to `gsc_data`.
- Add `property_id` to `ga4_data`.
- Include resource dimensions in unique indexes/upserts.
- Add migration/backfill plan before changing analytics queries.
- Add dashboard filter: active resource vs all historical resources.

### F6 - Cron alert engine can run on stale data

**Severity:** Medium
**Status:** Confirmed by workflow behavior

`run-alerts` runs even when GSC/GA4 sync produced `errors`. Because sync endpoints return HTTP 200, the workflow proceeds.

**Recommended fix:**
- Alert engine should check data freshness before generating alerts.
- Workflow should pass sync result state into alert step.
- Alerts should label stale inputs.

### F7 - One Phase 07 hardening issue remains

**Severity:** Medium
**Status:** Confirmed

`/api/correlation/impact-window` still accepts invalid dates and `from > to` without server-side validation. UI blocks normal invalid usage, but API boundary should reject with 400.

**Evidence file:** `packages/api-app/src/routes/correlation.ts`

## Recommendations

### Immediate (P0)

- [ ] Reconnect GSC/GA4 in production to replace invalid refresh tokens.
- [ ] Run manual GSC/GA4 sync after reconnect; verify rows synced > 0.
- [ ] Add `preferredRegion='sin1'` to DB-backed Next route handlers; redeploy; re-measure API timings.
- [ ] Extend integration status API to expose `siteUrl`, `permissionLevel`, `propertyId`, `propertyName`.
- [ ] Update cron workflow to fail or warn on business errors, not only HTTP errors.

### Short-term (P1)

- [ ] Build explicit resource selection flow: connect account -> choose site/property -> sync.
- [ ] Add source provenance columns to raw data tables, with migration/backfill.
- [ ] Add Sync Health page/card in Settings.
- [ ] Add server-side validation to correlation date windows.
- [ ] Remove/quarantine `save=true` discover endpoint behavior.

### Long-term (P2)

- [ ] Add monitoring: Sentry, uptime check, cron business-result alert.
- [ ] Add data freshness checks before alert/digest generation.
- [ ] Add resource history and audit trail: who connected, who changed active resource, when data last changed source.
- [ ] Revisit Supabase pooler mode after region pinning.

## Unresolved Questions

- Are latest commits `132f836`, `de9274b`, `1992ab8` deployed to production?
- Does current Vercel plan support `preferredRegion='sin1'` for this app?
- Should the app support multiple active GSC sites/GA4 properties per project, or exactly one active source per provider?
- Should historical data be preserved when resource changes, or reset per source?
