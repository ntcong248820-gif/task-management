# Phase 05 Complete: Cron & Real Data Verification

**Date:** 2026-05-28 19:58
**Severity:** Medium
**Component:** GitHub Actions Cron, API Endpoints, Documentation
**Status:** DONE

## What Happened

Phase 05 of the settings/real-data onboarding plan completed. Extended cron workflow from 2 jobs (sync-gsc, sync-ga4) to 4 with proper error handling and verified acceptance runbook for E2E sign-off.

## Technical Details

### GitHub Actions Workflow Changes
- **Extended:** `.github/workflows/cron-sync.yml` — added `run-alerts` and `weekly-digest` jobs
- **run-alerts:** depends on both syncs, uses `if: always()` so it runs even if data syncs fail
- **weekly-digest:** depends on run-alerts, fires only on Sunday (shell `date -u +%u` check) or `workflow_dispatch`
- **Error visibility:** curl steps now capture response body + HTTP code separately, echo both, exit non-zero on HTTP ≥ 400 — failures visible without exposing Bearer secret

### Acceptance Runbook Created
- **File:** `docs/runbooks/settings-real-data-onboarding-acceptance.md`
- Sections: project creation, GSC/GA4 connection, manual sync, cron endpoint curl, GitHub Actions dispatch, secret safety, auth guard (401 on missing/wrong secret)
- End-to-end sign-off table for team validation

### Key Decisions
- **Weekly digest logic in shell:** `date +%u` (day of week) rather than separate cron schedule — keeps single workflow file, avoids schedule proliferation
- **`if: always()` on downstream jobs:** Analytics intelligence runs even if data syncs fail partially — resilience over strict dependencies
- **Vercel cron verification:** `vercel.json` has `crons: []` — confirmed no stale Vercel path is relied upon
- **Code quality:** All 8 packages lint + type-check clean

## Root Cause Analysis

This phase addressed workflow coverage gaps: phase 1-4 built the settings UI and fixed data sync bugs, but cron execution and alerts logic remained untested. Weekly digest was stubbed as a single curl with no branching logic or env validation.

## Lessons Learned

Shell conditionals in GitHub Actions workflows are cleaner than separate scheduled jobs — reduces YAML, keeps related logic together. Error masking in curl responses is dangerous; capturing body + code separately and checking exit codes prevents silent failures.

## Next Steps

- [ ] Phase 06: Docs, Tests & Handoff — final integration tests, docs updates, team sign-off
- **Owner:** Phase 06 implementation
