---
title: "Infrastructure Restructuring"
description: "Migrate Hono API into Next.js, consolidate to single Vercel deployment, fix 20 infra issues"
status: in-progress
priority: P1
effort: 8h
branch: main
tags: [infrastructure, vercel, turborepo, deployment]
created: 2026-04-26
---

# Infrastructure Restructuring

## Goal
Eliminate Render cold starts, consolidate to single Vercel deployment, fix 20 audited infra issues, enable real cron jobs, centralize env vars.

## Target Architecture
- `apps/web/` → Next.js 15 + Hono via `app/api/[[...route]]/route.ts` (single Vercel project)
- `apps/api/` → kept as **dev-only local server** (deletion deferred — see Phase 5 risk)
- Vercel Cron replaces `node-cron`
- Env vars: per-app `.env`, secrets only in Vercel dashboard

## Phases

| # | Phase | Status | Effort | Fixes |
|---|-------|--------|--------|-------|
| 01 | [Vercel + Turborepo monorepo config](./phase-01-vercel-monorepo-config.md) | pending | 1h | #1, #12, #13, #16, #17 |
| 02 | [Hono into Next.js Route Handlers](./phase-02-hono-into-nextjs.md) | complete | 3h | #3, #7, #14, #18, #19 |
| 03 | [Vercel Cron migration](./phase-03-cron-migration.md) | complete | 1.5h | #2 |
| 04 | [Env centralization + OAuth fixes](./phase-04-env-centralization.md) | complete | 1.5h | #4, #5, #8, #9, #17 |
| 05 | [Cleanup (Render, Docker, orphan dirs)](./phase-05-cleanup.md) | in-progress | 1h | #6, #10, #11, #15, #20 |

## Dependency Graph
```
01 (config) ──┐
              ├──> 02 (Hono migration) ──> 03 (Cron) ──> 05 (Cleanup)
04 (env) ─────┘                                    ↗
```
- 01 + 04 can run in parallel (no file overlap)
- 02 blocks 03 (cron handlers live inside catch-all router)
- 05 LAST (removes Render config — irreversible without phase 02 + 03 working)

## Cross-Cutting Concerns
- **OAuth redirect URIs** change Render → Vercel. Google OAuth Console must be updated **before** DNS cutover (Phase 02 deploy).
- **Cron 60s limit**: Phase 03 must validate GSC/GA4 sync timing. Multi-project loops likely exceed limit → need per-project endpoints or queueing.
- **Preview deploys**: Same-origin (no CORS) since web + API now share Vercel project. Phase 04 simplifies CORS accordingly.
- **Cutover strategy**: keep Render running until Vercel API verified; flip `NEXT_PUBLIC_API_URL` to empty (relative) to switch.

## Rollback Strategy (per phase)
- 01: revert `vercel.json` + `turbo.json` commit; redeploy
- 02: keep Render running until Vercel `/api/health` returns 200; revert by flipping `NEXT_PUBLIC_API_URL` back to Render URL
- 03: cron handlers no-op if `CRON_SECRET` mismatch → can disable per-job in `vercel.json`
- 04: env changes are additive; old vars stay valid during transition
- 05: irreversible deletions deferred until two-week soak period passes

## Success Criteria (Plan-Level)
- [ ] `https://task-management.vercel.app/api/health` returns 200 with no cold start delay (<500ms p95)
- [ ] All `/api/*` routes work from web frontend (no CORS errors)
- [ ] Daily cron `/api/cron/sync-gsc` fires at 02:00 ICT (logs visible in Vercel dashboard)
- [ ] Render service can be paused with no traffic loss
- [ ] All 20 audit issues marked closed

## Unresolved Questions
1. Vercel project name `task-management` available? Check before Phase 01 Step 5.
2. DB host (Neon/Supabase/Render) — verify before Phase 02 deploy to confirm connection pooler available.

## Validation Log

### Session 1 — 2026-04-26
**Trigger:** Initial plan creation validation interview.
**Questions asked:** 5

#### Questions & Answers

1. **[Architecture]** New `@repo/api-app` package vs. inline in `apps/web`?
   - Options: @repo/api-app | Move into apps/web | Delete apps/api entirely
   - **Answer:** @repo/api-app (approved)
   - **Rationale:** Clean workspace boundary. Both `apps/web` (prod) and `apps/api` (local dev) import shared Hono app.

2. **[DB Platform]** Database host — affects serverless connection pooling requirement.
   - Options: Neon | Supabase | Render/bare Postgres | Unknown
   - **Answer:** Unknown — needs verification
   - **Rationale:** Serverless Vercel opens a new DB connection per invocation. Without pooler, connection exhaustion under load. Phase 02 must add verification step.

3. **[Vercel Plan]** Current Vercel plan.
   - Options: Hobby | Pro | None
   - **Answer:** Hobby (free)
   - **Rationale:** CRITICAL — Hobby plan = 10s cron execution limit, max 2 crons. Vercel Cron is unusable for GSC/GA4 sync. Phase 03 must switch to GitHub Actions.

4. **[Cron Strategy]** Replacement for node-cron given Hobby plan constraint.
   - Options: Upgrade to Pro | GitHub Actions | Keep Render for cron
   - **Answer:** GitHub Actions (free). Concern: future multi-user scale.
   - **Custom input:** "Chạy trên Github Action rất ổn, nhưng sẽ ra sao nếu sau này tao mở rộng ứng dụng vào tạo tài khoản cho nhiều người cùng truy cập"
   - **Rationale:** GitHub Actions as cron trigger is fine at any user count. The API handler handles fan-out logic (QStash/Inngest when scale demands). Trigger stays the same regardless of user count.

5. **[Scope]** Keep `apps/api/` after migration?
   - Options: Keep for local dev | Delete
   - **Answer:** Keep — use for local dev hot-reload
   - **Rationale:** Confirms @repo/api-app approach (both apps/ import from packages/). apps/api stays as dev-only standalone server.

#### Confirmed Decisions
- `@repo/api-app` package: approved
- `apps/api`: retained for local dev
- Cron: GitHub Actions (NOT Vercel Cron) — Phase 03 rewritten entirely
- DB pooling: verification step added to Phase 02
- Scaling path: when multi-user, add fan-out in API handler (not cron trigger)

#### Action Items
- [ ] Phase 03: Rewrite to use GitHub Actions `.github/workflows/cron-sync.yml` instead of `vercel.json` crons
- [ ] Phase 02: Add DB connection pooler verification step before deploy
- [ ] Phase 03: Note scaling path comment (fan-out in handler when user count grows)

#### Impact on Phases
- Phase 03: Complete rewrite — GitHub Actions replaces Vercel Cron. No `vercel.json` crons section needed. `CRON_SECRET` in GitHub Secrets.
- Phase 02: Add step — verify DB host supports connection pooling (Neon/Supabase preferred); if bare Postgres, config `max: 1` or add pgbouncer layer.
