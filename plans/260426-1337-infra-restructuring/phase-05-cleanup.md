# Phase 05 — Cleanup (Render, Docker, Orphans)

**Status:** in-progress | **Priority:** P2 | **Effort:** 1h
**Fixes:** #6, #10, #11, #15, #20

## Context Links
- [Plan overview](./plan.md)
- [Phase 02: Hono in Next.js](./phase-02-hono-into-nextjs.md) (verified live ✓)
- [Phase 03: Cron migration](./phase-03-cron-migration.md) (verified ✓)
- [Phase 04: Env centralization](./phase-04-env-centralization.md) (verified ✓)

## Overview
Remove obsolete Render config, fix Dockerfile (kept for local containerized testing only), patch `.dockerignore`, archive `interface-visual/`, complete `clean` script. Execute cleanup tasks immediately — 14-day soak is only for cron validation, not for deletion gate.

## Key Insights
- Render already suspended → no rollback possible anyway. 14-day soak only gates cron validation, not deletion.
- `interface-visual/` is orphaned (not in workspace), package.json may collide with `@repo/ui`. Confirm not referenced anywhere before removal.
- Dockerfile currently builds API only — needed only if team wants reproducible local env. Otherwise delete.
- `.dockerignore` missing `.git` causes huge context (every commit history copied to build).
- `clean` script doesn't remove `.next/`, `dist/`, `.turbo/`, `tsconfig.tsbuildinfo`.

## Requirements
- Functional: nothing depends on Render. Local dev still works for both `apps/api` (standalone Hono) and `apps/web` (Hono inside Next.js). Clean script removes all build artifacts.
- Non-functional: repo root cleaner; no orphaned code.

## Architecture (post-cleanup)
```
Production:  Vercel (apps/web with Hono mounted) + Postgres
Local dev:   `npm run dev` → both apps/web AND apps/api start (developer can use either /api endpoint)
Render:      DELETED
Docker:      DELETED (or kept minimal for local containerized testing only — decision in step 7)
```

## Related Code Files
**Delete (after soak period):**
- `render.yaml`
- `Dockerfile` (root) — pending decision in step 7
- `interface-visual/` — pending grep verification

**Modify:**
- `Dockerfile` (if kept) — fix deps stage to copy `packages/types/`, `packages/ui/`, `packages/integrations/`; replace `COPY . .` with explicit paths
- `.dockerignore` — add `.git`, `apps/web/.next`, `docs`, `plans`, `interface-visual`
- `package.json` (root) — `clean` script: `rimraf '**/.next' '**/dist' '**/.turbo' '**/tsconfig.tsbuildinfo' && turbo run clean && rm -rf node_modules`
- Documentation: `docs/deployment-guide.md`, `docs/system-architecture.md` (note Vercel-only)

**Read for context:**
- `interface-visual/package.json` (verify name + check for active references)
- `setup-all-projects.sh` (may reference deleted paths)

## Implementation Steps
1. **Pre-flight check (HARD GATE)**:
   - Vercel `/api/health` green for 14 days
   - At least 1 successful Vercel Cron run for both GSC + GA4 (check logs)
   - No active Render incidents in last 7 days
   - Stakeholder sign-off
2. **Pause Render service** (don't delete yet):
   - Render dashboard → service → Settings → Suspend
   - Wait 7 more days; if no issues reported, proceed
3. **Verify `interface-visual/` orphan status**:
   ```bash
   grep -r "interface-visual" --include="*.json" --include="*.ts" --include="*.tsx" --include="*.md" .
   grep -r "@interface-visual" .  # check if package name imported
   ```
   - If zero references: archive to git tag `archive/interface-visual` then `rm -rf`.
   - If references: defer to follow-up; out of scope.
4. **Update `.dockerignore`**:
   ```
   # Add:
   .git
   .github
   apps/web/.next
   docs
   plans
   interface-visual
   *.md
   ```
5. **Update root `clean` script** in `package.json`:
   - Add `rimraf` devDep: `npm install -D rimraf`
   - Replace: `"clean": "rimraf '**/.next' '**/dist' '**/.turbo' '**/tsconfig.tsbuildinfo' && turbo run clean && rm -rf node_modules"`
6. **Decision: keep or delete Dockerfile?**
   - **Delete** if no team member uses Docker for local dev (preferred — KISS).
   - **Keep + fix** if reproducible local container needed:
     - Add `COPY packages/types/package*.json ./packages/types/` and same for `ui` in deps stage
     - Replace `COPY . .` with explicit paths: `COPY apps/api ./apps/api && COPY packages ./packages && COPY tsconfig.json ./`
     - Drop EXPOSE/CMD or repoint to web (since API standalone is dev-only)
   - **Recommendation:** delete; document local dev = `npm run dev`.
7. **Delete Render config** (after soak):
   ```bash
   git rm render.yaml
   ```
   - Delete Render service in dashboard.
8. **Update docs**:
   - `docs/deployment-guide.md` — remove Render steps, add Vercel deploy section
   - `docs/system-architecture.md` — update diagram (single Vercel project)
   - `docs/codebase-summary.md` — update workspace map (`@repo/api-app` added)
   - `README.md` — update Quick Start (no need to start API separately)
9. **Smoke verify**: fresh clone → `npm install && npm run dev` → both URLs work; `npm run clean` removes all artifacts.

## Todo List

### Immediately doable (no blocking)
- [x] Render service suspended (2026-04-30)
- [ ] Grep verify `interface-visual/` zero references
- [ ] Archive + delete `interface-visual/`
- [ ] `git rm render.yaml`
- [ ] Update `.dockerignore` (add `.git` + bloat sources)
- [ ] Add `rimraf` + fix root `clean` script
- [ ] Decide: delete or fix Dockerfile (recommend: delete)
- [ ] Update `docs/deployment-guide.md`
- [ ] Update `docs/system-architecture.md`
- [ ] Update `docs/codebase-summary.md`
- [ ] Update root `README.md`
- [ ] Smoke verify fresh clone

### Waiting on (14-day soak — ~May 14)
- [ ] Vercel Cron runs verified for GSC + GA4
- [ ] Delete Render service in dashboard (manual)
- [ ] 14-day soak completion (cron validation only, not deletion gate)

## Success Criteria
- `render.yaml` not in repo
- Render service in dashboard = deleted (or suspended permanently)
- `.dockerignore` includes `.git`, `docs/`, `plans/`
- `npm run clean` removes ALL build artifacts (verify with `find . -name '.next' -o -name 'dist' -o -name '.turbo'` returns nothing)
- `interface-visual/` removed (or documented as kept)
- Docs reflect single-Vercel architecture
- Fresh clone + `npm install && npm run dev` works without manual setup

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `interface-visual/` actually used by hidden tooling | L | M | Grep step; archive git tag preserves recovery |
| Dockerfile deletion breaks someone's workflow | L | L | Announce in PR; offer revival via git history |
| `rimraf` glob too aggressive (deletes node_modules in packages) | M | M | Explicit globs only; test on dirty workspace first |
| Doc drift if not updated | H | M | Mandatory docs update in same PR |
| Cron not firing on Vercel (cold start/sleep) | M | L | Free tier = expected. Upgrade if needed for production. |

## Security Considerations
- Render env vars copied to Vercel (verify in Phase 04) — don't delete Render secrets before confirming Vercel has them
- After Render deletion, rotate `ENCRYPTION_KEY` and `CRON_SECRET` if Render had access logs (defense-in-depth)
- `interface-visual/` may contain old design comps with internal data — review before public archive

## Next Steps
- **Blocked by:** Phase 02+03+04 verified ✓. Only blocked for cron validation (~May 14).
- **Immediate:** All cleanup tasks (except cron verify + dashboard delete) can run now.
- **Final phase:** mark plan complete after success criteria met.
