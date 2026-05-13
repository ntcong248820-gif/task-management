---
title: Phase 01 Auth Workspace Scout
date: 2026-05-12
type: scout
plan: plans/260510-1600-v2-greenfield-rebuild/phase-01-auth-workspace.md
---

# Scout Report

## Relevant Files

- `package.json` - npm workspaces already include `packages/*`; root scripts use Turbo.
- `turbo.json` - web/API build env allowlists need auth envs.
- `tsconfig.json` - root `@repo/*` aliases need `@repo/auth-config`.
- `packages/db/src/index.ts` - Drizzle client imports schema barrel and exports each schema file.
- `packages/db/src/schema/index.ts` - schema barrel for Drizzle.
- `packages/api-app/src/app.ts` - Hono middleware and route registration surface.
- `packages/api-app/src/routes/*` - current business API routes trust request IDs and are public.
- `apps/web/src/app/api/[[...route]]/route.ts` - Hono catch-all API route on Node runtime.
- `apps/web/src/app/dashboard/layout.tsx` - client dashboard shell; cannot enforce secure auth alone.
- `apps/web/src/components/ui/*` - shadcn/Radix primitives for auth forms.

## Patterns

- Shared packages use `@repo/*`; app package uses `@seo-impact-os/web`.
- DB schemas use `pgTable`, snake_case columns, camelCase TS fields, and explicit exports.
- Hono app registers global middleware, then route groups with `app.route`.
- Cron routes are protected inside their own router by `CRON_SECRET`.
- Auth pages should live in `apps/web/src/app/(auth)/...` outside the dashboard shell.
- Better Auth docs confirm: use `organizationClient`, Drizzle adapter package, `npx auth@latest generate`, and Node runtime for full Next.js middleware session checks.

## Risks

- New API auth middleware must not protect `/api/auth/*`, `/api/health`, cron, or Google OAuth callbacks.
- Generic Hono middleware must not consume JSON bodies before zod validators.
- Existing list routes return all data when no project filter exists; Phase 01 can authenticate, but Phase 02 must add workspace-owned schema to prevent horizontal access.
- Better Auth generated IDs are strings while current app tables use integer IDs; keep auth schema isolated until Phase 02 schema redesign.
- Missing `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, or `RESEND_API_KEY` should not break tests, but real email flows need Resend configured.

## Unresolved Questions

- None for Phase 01. Workspace-to-project ownership is deferred to Phase 02 schema redesign.
