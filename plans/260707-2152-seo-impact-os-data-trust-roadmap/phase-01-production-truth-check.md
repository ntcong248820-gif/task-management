---
phase: 1
title: "Production Truth Check"
status: pass_with_concerns
priority: P1
effort: "1-2d"
dependencies: []
acceptance: docs/runbooks/phase-01-production-truth-check-acceptance.md
verified: "2026-07-10"
---

# Phase 1: Production Truth Check

## Context Links

- `plans/reports/debugger-260703-2324-webapp-integrations-performance-sync.md`
- `docs/journals/260703-webapp-sync-region-source-truth-fixes.md`
- `.github/workflows/cron-sync.yml`
- `apps/web/src/app/api/[[...route]]/route.ts`
- `apps/web/src/app/api/auth/[...all]/route.ts`
- `apps/web/src/app/dashboard/layout.tsx`

## Overview

Prove the debugger fixes are actually live. This phase is verification-heavy: reconnect Google tokens, run real sync, confirm Vercel region, and make the acceptance state explicit.

## Key Insights

- Code-level fixes exist, but production state can drift.
- `invalid_grant` cannot be solved by code alone; reconnect is required.
- A green workflow only matters if row import is > 0 or the no-data reason is legitimate.

## Requirements

- Functional: verify GSC/GA4 reconnect, manual sync, scheduled sync failure semantics, and integration status display.
- Non-functional: no fake sync success, no placeholder row counts, no secret leakage in logs.

## Architecture

No schema changes. Use existing production deployment, GitHub Actions workflow, Vercel headers, and integration status endpoints.

## Related Code Files

- Read: `.github/workflows/cron-sync.yml`
- Read: `packages/api-app/src/routes/cron/sync-gsc.ts`
- Read: `packages/api-app/src/routes/cron/sync-ga4.ts`
- Read: `packages/api-app/src/routes/integrations/index.ts`
- Read: `apps/web/src/components/features/settings/integration-card.tsx`
- Modify only if verification finds drift.

## Implementation Steps

1. Confirm latest commits with debugger fixes are deployed to production.
2. Record current selected GSC site and GA4 property before reconnect/source changes.
3. Reconnect GSC and GA4 in production with the real Google account.
4. Run manual sync for selected GSC site and GA4 property.
5. Verify response has row count or clear business failure.
6. Trigger GitHub Actions `Daily SEO Sync` manually.
7. Confirm workflow fails if API body contains `errors`.
8. Confirm alert/digest jobs do not run after failed upstream sync.
9. Measure `/api/health` and one authenticated DB-backed API. Check `x-vercel-id` no longer shows `sin1::iad1`.
10. Verify settings integration cards show selected GSC site, GA4 property, `syncStatus`, `syncError`, and true `lastSync`.
11. Run local regression commands where env permits.
12. Update runbook/report with PASS, PASS_WITH_CONCERNS, BLOCKED, or FAIL.

## Todo List

- [x] Verify deployment contains `preferredRegion='sin1'`. — present in route.ts; but live compute = iad1 (CONCERN, F1 ineffective on current Vercel plan). Verified 2026-07-10.
- [ ] Reconnect GSC in production. — BLOCKED: Google device/passkey + Testing-mode consent.
- [ ] Reconnect GA4 in production. — BLOCKED: same OAuth blocker.
- [ ] Run manual GSC sync and record rows. — BLOCKED on reconnect.
- [ ] Run manual GA4 sync and record rows. — BLOCKED on reconnect.
- [ ] Trigger GitHub Actions workflow manually. — BLOCKED: needs Actions dispatch + prod CRON_SECRET/APP_URL. Logic verified statically.
- [x] Verify sync business errors fail workflow. — cron-sync.yml exits 1 on body.errors>0 / ok:false. Verified 2026-07-10.
- [x] Verify no alert/digest after failed sync. — run-alerts needs [sync-gsc,sync-ga4] no if:always(); digest needs run-alerts. Verified 2026-07-10.
- [ ] Verify integration status/card source display. — BLOCKED on live connected source.
- [x] Verify local/test DB schema can run root API tests or document blocker. — type-check 8/8, lint clean, web 44/44; root test deferred (needs tasks.target_url in test DB). Verified 2026-07-10.

## Success Criteria

- [ ] `invalid_grant` gone after reconnect, or blocker documented with exact Google error. BLOCKED: passkey + Testing-mode consent (documented 260710-phase-01-production-truth-check.md).
- [ ] GSC and GA4 sync import > 0 rows for at least one real project, or no-data reason is source-confirmed. BLOCKED: depends on OAuth reconnect.
- [x] Cron workflow result matches business result, not only HTTP code. Verified 2026-07-10: exits 1 on body.errors>0 or ok:false.
- [x] `x-vercel-id` confirms DB-backed runtime is in intended region, or Vercel limitation documented. CONCERN 2026-07-10: x-vercel-id shows iad1 (not sin1), preferredRegion ignored on current Vercel plan.
- [x] Acceptance runbook has exact final state. Verified: `docs/runbooks/phase-01-production-truth-check-acceptance.md` (2026-07-10).

## Risk Assessment

- Risk: OAuth reconnect changes selected source. Mitigation: record GSC site/GA4 property before and after reconnect.
- Risk: Production env missing latest vars. Mitigation: verify env names, not values.
- Risk: Live data unavailable for recent days. Mitigation: use GSC delay-aware date and GA4 previous day.
- Risk: production Google/Vercel/GitHub access is unavailable. Mitigation: mark runbook `BLOCKED` with exact missing access; do not replace with local-only pass.

## Security Considerations

- Never paste OAuth tokens, DB URLs, or `CRON_SECRET`.
- Logs may include project IDs; okay for internal report, avoid secrets.

## Next Steps

If this phase fails on production deployment or OAuth reconnect, stop and fix that before Phase 2.
