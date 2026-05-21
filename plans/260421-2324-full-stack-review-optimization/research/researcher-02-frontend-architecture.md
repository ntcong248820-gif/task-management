---
title: Frontend & Architecture Analysis
date: 2026-04-25
---

# Frontend & Architecture Review

## Frontend — Next.js 15 + React 18

### Data Fetching Pattern

**Current:** All data fetching is manual `useEffect` + `useState` + raw `fetch`.

**Problems:**
- No caching — every navigation re-fetches from scratch
- No deduplication — same endpoint can fire multiple times on the same render
- No background refetch-on-focus
- Error handling inconsistent — some hooks swallow errors silently
- 5 hooks default `projectId = 1` — returns wrong data in production

**Recommendation:** Adopt **SWR** (simpler, smaller) or **TanStack Query** (more powerful).
- For this 5–10 user internal tool: SWR is sufficient — smaller bundle, simpler API
- Pattern: `const { data, error, isLoading } = useSWR(key, fetcher)`
- Automatic caching, deduplication, revalidation on focus

### State Management

**Current:** Only `useTimerStore` in Zustand. No global project store — project selection uses `localStorage.getItem('selectedProjectId')` scattered across components.

**Problems:**
- No single source of truth for selected project
- Components read localStorage directly (bypasses React re-render)
- 5 hooks default to `projectId = 1` (no real project store)

**Recommendation:**
- Create `useProjectStore` Zustand store with `persist` middleware
- All hooks read from store, not localStorage
- Remove all `projectId = 1` defaults

### Component Issues

- `tasks/page.tsx` uses `console.error` in catch — should use logger or silent failure
- `dashboard/page.tsx` defines own `API_BASE` constant — duplicates `lib/config.ts`
- No error boundary — uncaught errors crash entire page
- Integrations page: OAuth success/error logged to console, no toast shown to user

### Missing Patterns

- No shared API client — each component does raw `fetch(getApiUrl(...))` — repetitive, no consistent error handling
- No TypeScript types shared from API — frontend defines its own `Task`, `Project` interfaces separately from `packages/types`
- No loading skeletons on analytics, rankings, URL pages (only Kanban has them)

---

## Architecture

### Monorepo Structure

**Current:** `packages/types` exists but is barely used — API routes define their own response shapes inline, frontend redefines same interfaces locally.

**Problem:** Types drift. Frontend `Task` type may not match what API actually returns.

**Recommendation:**
- Move all shared interfaces to `packages/types`
- API routes: use types from `@repo/types` for response bodies
- Frontend: import from `@repo/types` instead of local `src/types/`

### API Contract

**No contract enforcement between API and frontend.** Options:
1. **OpenAPI + generated client** — Hono has `@hono/zod-openapi` for spec generation; then `openapi-ts` generates a typed client. Best long-term.
2. **Manually maintained types in `packages/types`** — simpler, sufficient for internal tool.

For 5–10 user internal tool: option 2 is sufficient. Option 1 is future enhancement.

### `interface-visual/` Directory

Orphaned standalone mini-app at project root. Not part of main app. Should be archived or moved to `assets/designs/`.

### Deployment

- Cron jobs only start in `NODE_ENV === 'production'` — can't test locally
- No health check for cron job status — no way to know if sync ran
- Render free tier sleeps after 15 min inactivity — daily cron at 2AM may miss if service is sleeping

---

## Unresolved Questions

1. Is `packages/types` intended to be the shared type source? Why do frontend and API define types separately?
2. Should SWR or TanStack Query be adopted? (SWR is recommended for simplicity)
3. Is Render on paid plan to prevent sleeping? If not, cron jobs will miss.
4. Is `interface-visual/` still actively used or can it be archived?
