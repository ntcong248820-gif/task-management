---
phase: 5
title: "Cron & Real Data Verification"
status: complete
priority: P1
effort: "3h"
dependencies: [3]
---

# Phase 5: Cron & Real Data Verification

## Overview

Close the gap between implemented real-data jobs and operational verification: daily sync, alerts, weekly digest, and acceptance runbook.

## Requirements

- Functional: GitHub Actions cron triggers GSC sync, GA4 sync, alert engine, and weekly digest on intended schedules.
- Functional: manual `workflow_dispatch` can run the pipeline.
- Functional: runbook proves project -> connect -> sync -> analytics data path.
- Non-functional: preserve `CRON_SECRET` bearer auth; do not print secrets in logs.

## Architecture

Keep GitHub Actions as the trigger. The app remains the fan-out executor through existing `/api/cron/*` endpoints guarded by `verifyCronSecret`.

## Related Code Files

- Modify: `.github/workflows/cron-sync.yml`
- Read: `packages/api-app/src/routes/cron/index.ts`
- Read: `packages/api-app/src/routes/cron/sync-gsc.ts`
- Read: `packages/api-app/src/routes/cron/sync-ga4.ts`
- Read: `packages/api-app/src/routes/cron/run-alerts.ts`
- Read: `packages/api-app/src/routes/cron/weekly-digest.ts`
- Read: `packages/api-app/src/utils/verify-cron-secret.ts`
- Create: `docs/runbooks/settings-real-data-onboarding-acceptance.md`

## Implementation Steps

1. Extend `.github/workflows/cron-sync.yml`:
   - keep GSC sync first
   - run GA4 after GSC with independent failure handling if desired
   - run alert engine after data sync
   - run weekly digest only on weekly schedule or via a separate conditional job
2. Keep curl output useful but secret-safe.
3. Add acceptance runbook with statuses:
   - `PASS`
   - `PASS_WITH_CONCERNS`
   - `BLOCKED`
   - `FAIL`
4. Include manual verification commands for authenticated local/API checks where possible.
5. Document environment blockers separately:
   - missing Google OAuth credentials
   - missing `CRON_SECRET`
   - missing local Postgres
   - Google account lacks GSC/GA4 access
6. Verify no stale `vercel.json` cron path is being relied on for this workflow.

## Success Criteria

- [x] GitHub Actions workflow calls `/api/cron/sync-gsc`.
- [x] GitHub Actions workflow calls `/api/cron/sync-ga4`.
- [x] GitHub Actions workflow calls `/api/cron/run-alerts`.
- [x] Weekly digest endpoint is scheduled or clearly documented as manual/deferred.
- [x] Runbook exists and separates CLI-validated, browser-verified, and env-blocked checks.
- [x] Cron failures surface response bodies in Actions logs without exposing secrets.

## Risk Assessment

- Risk: alert/digest jobs may fail if no real GSC data exists. Mitigation: classify as data/env blocked, not implementation failure.
- Risk: long sync loops can exceed GitHub Actions/API limits as project count grows. Mitigation: note future queue/fan-out path; do not add queue now.
