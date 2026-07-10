# Phase 1 — Production Truth Check

Date: 2026-07-10 · Mode: cook --fast · Plan: `260707-2152-seo-impact-os-data-trust-roadmap/phase-01`

## What

Verify the debugger fixes (F1 region, F2 cron-truth, F6 alert cascade, F7 + regression) are actually live in
production — not just committed. Verification-heavy, no new feature code.

## Outcome: PASS_WITH_CONCERNS

Acceptance runbook: `docs/runbooks/phase-01-production-truth-check-acceptance.md`.

### Verified green

- Deployed commits on `main` carry all debugger fixes (`2827291`, `de9274b`, `1992ab8`, `132f836`).
- F2 cron truth: `cron-sync.yml` exits 1 on `body.errors.length > 0` / `ok:false`, on top of HTTP<400 gate.
  Sync routes return 500+`ok:false` on non-empty errors. Green ≠ HTTP 200 anymore.
- F6 cascade: `run-alerts` needs `[sync-gsc, sync-ga4]` with no `if: always()` → skipped on sync failure;
  `weekly-digest` needs `run-alerts`. No alert/digest on stale data.
- Local regression: type-check 8/8, lint clean, web tests 44/44.

### The honest concern — F1 not effective live

`preferredRegion='sin1'` sits in `route.ts`, but prod `/api/health` returns `x-vercel-id: sin1::iad1::...`
on 3/3 calls. Compute (2nd segment) is `iad1`, US-East — far from the Supabase DB region. `preferredRegion`
is being ignored, almost certainly because the current Vercel plan pins functions to one default region.
Code is correct; the platform isn't honoring it. This is a plan/config decision, not a code bug — flagged,
not silently "passed".

### Blocked, recorded not faked

OAuth reconnect (GSC+GA4), live sync row counts, GitHub Actions manual dispatch, and live integration-card
values are all `BLOCKED` on production Google access (device/passkey + Testing-mode consent on
`ntcong.248820@gmail.com`) and repo Actions/secret access. Per the plan's own risk mitigation: mark BLOCKED
with the exact missing access, do not substitute a local-only pass.

## Lesson

"Deployed" and "effective" are different claims. `preferredRegion` in source looked done; the `x-vercel-id`
compute segment proved it wasn't. Always read the live header, not the code, for region/runtime claims.

## Follow-ups

1. Decide F1: upgrade Vercel plan + set function region, set `vercel.json regions`, or accept `iad1` + document DB latency.
2. Run live OAuth reconnect on an authorized Google session to clear the BLOCKED integration checks.
