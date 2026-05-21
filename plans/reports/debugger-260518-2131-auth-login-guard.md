# Auth Login Guard Debug - Investigation Report

## Executive Summary

- **Issue:** Dashboard pages were accessible without login.
- **Impact:** Phase 01 auth protection incomplete; unauthenticated users could view dashboard UI.
- **Root cause:** Next did not register `apps/web/middleware.ts`; app uses `src/app`, so route protection never ran.
- **Status:** Resolved for dashboard page guard.
- **Fix:** Moved protection to `dashboard/layout.tsx` server boundary and extracted old client shell to `dashboard-shell.tsx`.

## Timeline

- 21:14 - Started local app at `http://localhost:3002`; `/dashboard` returned 500 on Node 25 due localStorage runtime issue.
- 21:18 - Re-ran web app with Node 20.20.2; `/dashboard` and `/dashboard/tasks` returned `200 OK` without session.
- 21:19 - Checked `.next/server/middleware-manifest.json`; `middleware` and `sortedMiddleware` were empty.
- 21:33 - Moved middleware under `src`; redirect worked, but Next warned `nodejs` middleware runtime requires canary-only `experimental.nodeMiddleware`.
- 21:35 - Replaced middleware approach with server-side `dashboard/layout.tsx` guard.
- 21:36 - Verified page/API smoke: dashboard routes redirect; API returns 401.
- 21:37 - Ran type-check, web tests, and build.

## Technical Analysis

### Findings

1. Dashboard routes were unprotected before fix.
   - `HEAD /dashboard` -> `200 OK`
   - `HEAD /dashboard/tasks` -> `200 OK`

2. Existing middleware was not active.
   - File existed at `apps/web/middleware.ts`.
   - Runtime manifest showed:
     ```json
     {
       "version": 3,
       "middleware": {},
       "functions": {},
       "sortedMiddleware": []
     }
     ```

3. Simple move to `apps/web/src/middleware.ts` made redirect work but exposed runtime incompatibility.
   - Next warning: `nodejs runtime support for middleware requires experimental.nodeMiddleware`.
   - Enabling `experimental.nodeMiddleware` failed because Next `15.3.9` allows it only on canary.

4. Final fix uses supported App Router server layout guard.
   - `apps/web/src/app/dashboard/layout.tsx` is now a server component.
   - It calls `auth.api.getSession({ headers: await headers() })`.
   - No session -> `redirect("/login?redirect=/dashboard")`.
   - Session without active workspace -> `redirect("/workspace")`.
   - Existing client UI moved to `apps/web/src/app/dashboard/dashboard-shell.tsx`.

## Evidence

### Before

```http
HEAD /dashboard
HTTP/1.1 200 OK

HEAD /dashboard/tasks
HTTP/1.1 200 OK
```

### After

```http
HEAD /dashboard
HTTP/1.1 307 Temporary Redirect
location: /login?redirect=/dashboard

HEAD /dashboard/tasks
HTTP/1.1 307 Temporary Redirect
location: /login?redirect=/dashboard

GET /api/projects
HTTP/1.1 401 Unauthorized
{"success":false,"error":"Unauthorized"}
```

### Validation Commands

```bash
npm --workspace @seo-impact-os/web run type-check
npm --workspace @seo-impact-os/web run test
npm --workspace @seo-impact-os/web run build
```

Results:
- Type-check: passed.
- Web tests: `5 passed`, `16 passed`.
- Build: passed; dashboard routes are dynamic server-rendered routes.

## Files Changed

- `apps/web/src/app/dashboard/layout.tsx`
- `apps/web/src/app/dashboard/dashboard-shell.tsx`
- `apps/web/middleware.ts` removed
- `apps/web/src/middleware.ts` removed after runtime test
- `plans/260510-1600-v2-greenfield-rebuild/phase-01-auth-workspace.md`
- `docs/project-changelog.md`

## Recommendations

### Immediate (P0)

- Keep dashboard protection in server layout for current Next `15.3.9`.
- Do not use Node middleware until project intentionally upgrades to a Next canary/stable version that supports it.

### Short-term (P1)

- Add a small route-protection smoke script or Playwright test for:
  - `/dashboard` -> `/login`
  - `/dashboard/tasks` -> `/login`
  - `/api/projects` -> `401`

### Long-term (P2)

- During Phase 03 UI Shell, preserve server layout guard when replacing dashboard shell.
- If exact post-login redirect path matters, improve layout redirect handling or add a lightweight Edge-compatible middleware that only preserves path and leaves session verification to layout/API.

## Unresolved Questions

- Full live auth flow still pending: signup -> email verify -> login -> workspace -> dashboard.
- Invite accept and password reset still require real email provider/env smoke.
