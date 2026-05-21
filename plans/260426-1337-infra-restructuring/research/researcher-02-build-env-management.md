# Infrastructure Migration Research: Build & Env Management
**Date:** 2026-04-26 | **Researcher:** Claude Code

---

## 1. Turborepo globalEnv Best Practices

**Finding:** `globalEnv` vs `env` scope affects cache invalidation across the monorepo.

- **globalEnv**: Propagates through entire dependency chain. Use for vars affecting all tasks (e.g., `NODE_ENV`).
- **env**: Task-specific scope. Use for vars only needed in one app. Achieves higher cache hit rates.
- **Cache invalidation**: When env var value changes, Turborepo auto-invalidates cache. Different values = different cache entries.
- **Anti-pattern**: Don't use root `.env` file. Instead, place `.env` in `apps/api/` and `apps/web/` where used.

**Pattern for your monorepo:**
```json
{
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "api#build": {
      "env": ["ENCRYPTION_KEY", "DATABASE_URL"]
    },
    "web#build": {
      "env": ["NEXT_PUBLIC_API_URL"]
    }
  }
}
```

---

## 2. Hono Production Build Strategy

**Recommendation:** Use **esbuild** for Hono API (not tsc).

| Approach | Speed | Bundle Size | Sourcemaps | Path Aliases | Verdict |
|----------|-------|------------|-----------|--------------|---------|
| `tsc` | Slow (baseline) | Native | ✓ | ✓ | Not for production |
| `esbuild` | 10-100x faster | Small | ✓ (need plugin) | ✓ | **Best for Hono** |
| `tsup` | esbuild speed | Optimized | ✓ | ✓ | Overkill for API |

**Best practice for Hono in production:**
```bash
# Separate concerns: type-check with tsgo, transpile with esbuild
tsgo --noEmit  # Type-check only (10x faster)
esbuild src/index.ts --bundle --outfile=dist/index.js --platform=node
```

**Why esbuild:** Hono is lightweight; you don't need Rollup complexity. esbuild handles CJS/ESM correctly, minifies, and starts instantly.

---

## 3. Env Var Management in Turborepo + Vercel

**Structure recommendation:**
```
.env                    # ❌ Don't use root .env
apps/api/.env           # API secrets, ENCRYPTION_KEY, DATABASE_URL
apps/web/.env.local     # NEXT_PUBLIC_API_URL only
```

**Vercel deployment:** Turborepo auto-checks env vars declared in `turbo.json` against Vercel's project-level scoped vars. **Action required:** In Vercel dashboard, set:
- **API project:** `DATABASE_URL`, `ENCRYPTION_KEY` (sensitive, use Vercel secrets)
- **Web project:** `NEXT_PUBLIC_API_URL` (public, safe in build)

**Cache safety:** Only declare env vars in `turbo.json` that actually change between builds. Per-package task-specific `env` keys (not `globalEnv`) prevent unnecessary cache misses.

---

## 4. Vercel Project Rename & URL Strategy

**Goal:** Get cleaner URL like `task-management.vercel.app`

**Process:**
1. Navigate to Project Settings → General
2. Click "Edit" next to project name
3. Enter new name → saves immediately, no downtime
4. New URL becomes `{newname}.vercel.app`

**Caveats:**
- ✓ Renaming works seamlessly; no workflow interruption
- ✓ Custom domain reassignment via Domains tab is instant
- ✗ If subdomain is taken by another Vercel account, you cannot reclaim it (domain remains locked to original owner)
- ✗ After deletion, `vercel.app` subdomain stays unavailable even after project removal

**Recommendation:** Check if `task-management.vercel.app` is available now. If yes, rename both API and Web projects to match namespace: `task-management-api.vercel.app` + `task-management-web.vercel.app`.

---

## Unresolved Questions

1. **Path alias handling in esbuild:** Does Hono's `tsconfig.paths` plugin work out-of-box with esbuild, or need custom alias mapping?
2. **Vercel env var inheritance:** Can API project inherit partial env from root `turbo.json` or must all vars be re-declared per-project in Vercel dashboard?
3. **Cache invalidation timing:** When does Turborepo re-hash after Vercel redeploys with new env var (is it automatic via CI, or manual turbo rebuild needed)?

---

## Sources
- [Turborepo Environment Variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- [Vercel Turborepo Deployment](https://vercel.com/docs/monorepos/turborepo)
- [tsup vs Rollup vs esbuild 2026](https://www.pkgpulse.com/blog/tsup-vs-rollup-vs-esbuild-2026)
- [Hono vs Encore.ts Framework Comparison](https://encore.dev/articles/hono-vs-encore)
- [Vercel Project Rename Guide](https://vercel.com/kb/guide/how-do-i-change-the-name-of-my-vercel-project)
