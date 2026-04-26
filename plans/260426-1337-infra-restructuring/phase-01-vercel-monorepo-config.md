# Phase 01 — Vercel + Turborepo Monorepo Config

**Status:** complete | **Priority:** P1 | **Effort:** 1h
**Fixes:** #1, #12, #13, #16, #17

## Context Links
- [Plan overview](./plan.md)
- [Researcher 01: Vercel/Hono migration](./research/researcher-01-vercel-hono-migration.md)
- [Researcher 02: Build & env management](./research/researcher-02-build-env-management.md)

## Overview
Add `vercel.json`, fix `turbo.json` env declarations, remove `.turbo/**` from build outputs, decouple `test` from `^build`, fix stale `localhost:3000` references.

## Key Insights
- Vercel auto-detects Turborepo when `Root Directory` set to `apps/web/` in dashboard.
- `vercel.json` only needed for cron jobs + custom commands (not detection).
- `globalEnv` invalidates ALL task caches on change; prefer task-level `env` for app-specific vars.
- `.turbo/**` is internal cache, not a build artifact — including in `outputs` causes cache pollution recursion.

## Requirements
- Functional: Vercel build runs from `apps/web/` rootDir, picks up workspace deps via Turborepo.
- Non-functional: Build cache hit rate ≥80% on no-op rebuild; no `.turbo` in deploy artifact.

## Architecture
```
Vercel (Root Dir: apps/web/)
  └── reads ../../vercel.json (project root)
       ├── crons[] → Phase 03
       └── (rewrites/headers as needed)
  └── runs `turbo run build --filter=@seo-impact-os/web...`
       └── builds packages/db, packages/types, packages/integrations, packages/ui
       └── builds apps/web (Next.js)
```

## Related Code Files
**Create:**
- `vercel.json` (root) — project config + cron stub
- `apps/web/vercel.json` — optional, override install/build commands

**Modify:**
- `turbo.json` — restructure env, remove `.turbo/**` from outputs, decouple `test`
- `apps/web/src/app/layout.tsx` (if hardcoded port references exist — verify)
- Root `.env.example` (port 3000 → 3002 for web; document API_PORT change)

**Read for context:**
- `package.json` (root)
- `apps/web/package.json`
- `apps/web/next.config.js`

## Implementation Steps
1. **Verify Vercel project name availability** for `task-management.vercel.app` (manual step, dashboard).
2. **Create root `vercel.json`** with placeholder for crons (filled in Phase 03):
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "crons": []
   }
   ```
3. **Update `turbo.json`:**
   - Move `DATABASE_URL`, `NEXT_PUBLIC_API_URL` out of `globalEnv`
   - Add task-scoped `env` per-app:
     - `web#build`: `["NEXT_PUBLIC_API_URL", "DATABASE_URL", "ENCRYPTION_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_GSC_REDIRECT_URI", "GOOGLE_GA4_REDIRECT_URI", "FRONTEND_URL", "FRONTEND_URL_PREVIEW", "CRON_SECRET"]`
     - `api#build` (kept for dev): same minus FRONTEND_URL_PREVIEW
   - Keep `globalEnv: ["NODE_ENV"]` only
   - Remove `.turbo/**` from `build.outputs` (keep `.next/**`, `dist/**`)
   - Change `test.dependsOn` from `["^build"]` to `[]` (test on source, not built artifact)
4. **Configure Vercel dashboard** (manual):
   - Project Settings → General → Root Directory: `apps/web`
   - Build Command: leave default (Turborepo auto)
   - Install Command: leave default
   - Add env vars per Phase 04 list
5. **Fix stale config:**
   - Root `.env.example`: replace `localhost:3000` with `localhost:3002` for `NEXT_PUBLIC_API_URL` placeholder; document API_PORT defaults to 3001 only in dev.
6. **Local verify:** `npm run build` succeeds; `.turbo/` not in any `dist/` or `.next/`.

## Todo List
- [ ] Check Vercel name availability `task-management`
- [ ] Create root `vercel.json` (cron placeholder)
- [ ] Update `turbo.json` env + outputs + test deps
- [ ] Update Vercel dashboard rootDir = `apps/web`
- [ ] Fix `.env.example` port references
- [ ] Verify local `npm run build` clean

## Success Criteria
- `turbo run build --dry=json` shows correct env hash inputs per task
- Vercel preview deploy succeeds, builds workspace packages first
- Re-running `npm run build` with no changes = full cache hit (FULL TURBO)
- No `.turbo/` directory in `apps/web/.next/` or `packages/*/dist/`

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vercel rootDir misconfig breaks workspace resolution | M | H | Test on preview branch first; fallback `vercel.json` with explicit `cd ../..` install |
| Test detached from build hides type errors | L | M | Keep `type-check` task as separate gate in CI |
| Removing `.turbo/**` invalidates existing cache | H | L | One-time miss; subsequent builds normal |
| Vercel name taken | M | L | Fall back to `seo-impact-os` or `task-management-app` |

## Security Considerations
- No secrets in `vercel.json` (committed to git)
- Confirm `.env`, `.env.local` in `.gitignore` (already are)

## Next Steps
- **Blocks:** Phase 02 (needs working Vercel deploy of web app)
- **Parallel-safe with:** Phase 04 (no file overlap)
- **Follow-up:** Phase 03 fills `crons[]` array
