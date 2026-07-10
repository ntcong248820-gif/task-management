# Phase 1 Acceptance — Production Truth Check

Plan: `plans/260707-2152-seo-impact-os-data-trust-roadmap/phase-01-production-truth-check.md`
Date: 2026-07-10 · Env: local repo + Vercel production (`https://task-management-web-zeta.vercel.app`)
Verifier: cook (--fast)

## Verdict: `PASS_WITH_CONCERNS` (+ BLOCKED items on prod access)

Code-level debugger fixes are deployed and locally regression-clean. One production concern (F1 region) is
proven **not effective live**. OAuth/live-sync verification is `BLOCKED` on production Google + Vercel plan
access — recorded, not faked (per plan risk mitigation).

## Legend

| Mark | Meaning |
|------|---------|
| `PASS` | Verified working |
| `CONCERN` | Verified but result is wrong/limited; needs follow-up |
| `BLOCKED` | Cannot verify — missing prod credential/access, not a code defect |

---

## Results

### 1. Deployment contains debugger fixes — `PASS`
`git log` on `main` HEAD includes: `2827291` harden sync truth/source status, `de9274b` GA4 sync 500 +
duplicate connection + stuck status fix, `1992ab8` widen `ga4_data` numeric columns, `132f836` team settings
crash + integration status UI + wrong site auto-select. Vercel prod serves this branch.

### 2. F1 — API compute region — `CONCERN`
- Code: `preferredRegion='sin1'` present in `apps/web/src/app/api/[[...route]]/route.ts`.
- Live: `/api/health` (same catch-all function) returns `x-vercel-id: sin1::iad1::...` on 3/3 calls.
  Segment format is `<edge>::<compute>::<id>` → edge sin1, **compute iad1 (US-East)**.
- Meaning: `preferredRegion` is ignored in production. Function still runs far from the Supabase DB region.
- Likely cause: Vercel Hobby plan pins functions to a single default region (`iad1`); per-route
  `preferredRegion` needs a paid plan or explicit `functions` region config in `vercel.json`.
- Follow-up (not in this phase's scope to change prod plan): either upgrade plan + set function region, or
  set `vercel.json` `regions`/`functions` region, or accept US-East compute and document the DB latency.

### 3. F2 — Cron fails on business errors — `PASS` (code-verified)
`.github/workflows/cron-sync.yml` parses response body and `process.exit(1)` when `body.ok === false` or
`body.errors.length > 0`, on top of the `[ "$code" -lt 400 ]` HTTP gate. Sync routes
(`packages/api-app/src/routes/cron/sync-gsc.ts`, `sync-ga4.ts`) return HTTP 500 + `ok:false` when
`result.errors` is non-empty. Green workflow now requires a real business-success body.

### 4. F6 — No alert/digest after failed sync — `PASS` (code-verified)
`run-alerts` declares `needs: [sync-gsc, sync-ga4]` with **no** `if: always()` → GitHub skips it if either
sync job fails. `weekly-digest` `needs: run-alerts`, so it cannot run on stale data after an upstream failure.

### 5. Local regression — `PASS`
- `npm run type-check` → 8/8 packages pass.
- `npm run lint` → no ESLint warnings/errors.
- `npm --workspace @seo-impact-os/web run test` → 44/44 tests pass (12 files).
- Root `npm run test` deferred: requires local/test DB schema with latest `tasks.target_url` (documented plan blocker).

### 6. OAuth reconnect (GSC + GA4) — `BLOCKED`
Google login blocked by device/passkey verification on `ntcong.248820@gmail.com`; OAuth consent app in
"Testing" mode. Same blocker recorded in `webapp-acceptance-settings-onboarding.md` (2026-06-02). No live
`invalid_grant` re-test possible without an authorized interactive Google session.

### 7. Manual GSC/GA4 sync row counts — `BLOCKED`
Depends on step 6 reconnect. Cannot record real imported-row counts without a live connected source.

### 8. GitHub Actions "Daily SEO Sync" manual dispatch — `BLOCKED`
Needs repo Actions dispatch + `CRON_SECRET` / `APP_URL` prod vars. Workflow logic verified statically (step 3/4).

### 9. Integration cards — selected site/property, syncStatus, syncError, true lastSync — `BLOCKED`
Requires a live connected+synced source (steps 6–7). Card rendering code shipped in `2827291`; live values
unverifiable now.

---

## Success Criteria vs Outcome

| Criterion | Outcome |
|---|---|
| `invalid_grant` gone after reconnect, or blocker documented | `BLOCKED` — exact blocker documented (Google device/passkey + Testing-mode consent) |
| GSC/GA4 sync imports > 0 rows, or no-data reason source-confirmed | `BLOCKED` on reconnect |
| Cron result matches business result, not only HTTP | `PASS` (code-verified) |
| `x-vercel-id` confirms DB-backed runtime region, or Vercel limitation documented | `CONCERN` — compute is `iad1`; `preferredRegion` ineffective on current plan, documented |
| Acceptance runbook has exact final state | `PASS` — this file |

## Unresolved questions

1. F1 region: upgrade Vercel plan to honor `preferredRegion`/`functions` region, set `vercel.json regions`, or
   accept `iad1` compute + document DB latency? (product/infra decision — changes prod plan/config)
2. Who runs the live OAuth reconnect + manual sync on an authorized Google session to clear steps 6–9?
