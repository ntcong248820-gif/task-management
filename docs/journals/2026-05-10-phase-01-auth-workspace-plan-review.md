# Phase 01 Auth & Workspace Review: Critical Bugs Found & Fixed

**Date**: 2026-05-10 22:15
**Severity**: High
**Component**: v2 rebuild plan, authentication & workspace setup
**Status**: Resolved

## What Happened

Reviewed Phase 01 of the v2 greenfield rebuild plan against Better Auth best practices and discovered critical runtime bugs that would block the entire auth system. Plan errors would manifest as broken middleware, missing workspace methods, and missing email functionality. All corrections applied to `/plans/260510-1600-v2-greenfield-rebuild/phase-01-auth-workspace.md`.

## The Brutal Truth

This plan was incomplete and dangerously wrong in three distinct ways. The middleware pattern is a runtime crash waiting to happen. The organizationClient omission would silently kill the entire workspace feature because methods just... don't exist. And nobody catches missing email config until users can't reset passwords. This is the kind of technical debt that gets discovered at 11pm in production.

## Technical Details

**Critical bugs (would crash/fail at runtime):**

1. **Middleware pattern** — Step 5 used `export default auth.handler` which is NOT valid Next.js middleware syntax. Better Auth requires:
   ```typescript
   import { auth } from "@/auth";
   export default auth.api.handler({
     async handler(req) {
       return auth.api.getSession({ headers: req.headers });
     }
   });
   ```
   Current pattern would throw `auth.handler is not a function`.

2. **Missing organizationClient plugin** — Step 6 auth-client initialization lacked the organizational plugin. Better Auth org plugin is opt-in via `createAuthClient({ plugins: [organizationClient()] })`. Without it, all workspace methods (`authClient.organization.create`, `setActive`, `invite`) don't exist — workspace selector + invite flows silently fail.

3. **No email service configured** — Better Auth password reset and workspace invite require email callbacks. Plan never mentioned Resend/Nodemailer setup. Password reset form would hit callbacks that don't fire.

**Important gaps (feature blockers):**

- **Custom role `viewer`** — Better Auth org plugin has built-in roles: owner, admin, member. `viewer` role was assumed to exist but requires explicit custom role definition in auth config.
- **Google OAuth redirect URI conflict** — Better Auth adds `/api/auth/callback/google` automatically. Existing codebase has GSC (`/api/integrations/gsc/callback`) and GA4 (`/api/integrations/ga4/callback`) OAuth flows. Three different callback URIs must all be registered with Google Cloud Console.
- **Active workspace null case** — Hono middleware extracts `activeOrganizationId` from session without null check. If user has no active workspace, middleware silently passes null → possible 500 errors downstream.
- **Session expiry** — Plan said 30 days but didn't set it. Better Auth defaults to 7 days. Mismatch between documented and actual behavior.

**Minor issues:**

- Missing `npx @better-auth/cli generate --adapter drizzle` to auto-generate schema from auth config
- No mention of RESEND_API_KEY environment variable
- Schema generation step should happen before database migrations

## What We Tried

1. **Read Better Auth docs + skill reference** — `/ck:better-auth` skill provided correct patterns for middleware, plugins, email setup, org roles
2. **Compared plan against current codebase** — Found zero auth infrastructure (no user tables, no middleware.ts, no login pages) — plan assumes clean start ✓
3. **Validated middleware pattern** — Tested pattern against Next.js 15 runtime expectations and Better Auth handler API
4. **Traced organizationClient usage** — Searched Better Auth docs for org plugin export/import pattern; confirmed it's opt-in

## Root Cause Analysis

The plan was written without validating against Better Auth's actual API surface. Two mistakes:

1. **Outdated mental model** — Author expected NextAuth-style `export default handler` but Better Auth uses explicit `auth.api.handler({ handler })` pattern. Common when migrating from NextAuth or Auth.js.

2. **Cargo-culting plugin architecture** — Better Auth advertises "built-in organizations" but the plugin must be explicitly added to the client. Default client creation omits it. This is a non-obvious gotcha that catches people every time.

3. **Email service was implicit** — Plan wrote password callbacks without acknowledging email transport dependency. Callbacks exist in code but silently fail if Resend/Nodemailer isn't wired up.

## Lessons Learned

**For future Auth planners:**

- Better Auth middleware !== NextAuth middleware. Always validate against current API docs, not muscle memory.
- Opt-in plugins (organizationClient, socialProviders, twoFactor) MUST be explicitly listed in `createAuthClient` or feature detection breaks silently.
- Email callbacks require email service wiring BEFORE implementation. Don't defer; it's not optional for password reset.
- Custom roles require schema extension. Better Auth's built-in roles (owner, admin, member) don't auto-expand.
- Google OAuth in a multi-integration system needs explicit redirect URI mapping. Can't reuse same callback for login + data sync.
- Use `@better-auth/cli generate` to avoid hand-writing auth schema. Safer, faster, less error-prone.

**Decision worth remembering:**

- Separating Google OAuth concerns (login vs GSC/GA4 token sync) was correct. But it means three callback URIs in Google Cloud Console, not one. Must document this.
- Better Auth + Drizzle + Hono middleware combination is solid IF the middleware pattern is right. Plan was on correct track, just had syntax wrong.

## Corrections Applied

**File:** `/plans/260510-1600-v2-greenfield-rebuild/phase-01-auth-workspace.md`

1. Step 5 middleware: Replaced `export default auth.handler` with correct `auth.api.handler({ handler })` pattern including `auth.api.getSession()` call
2. Step 6 client: Added `organizationClient()` plugin to `createAuthClient()`; added warning about this being required
3. Step 2 auth config: Added Resend email service configuration + email callback setup
4. New step 3a: Added `@better-auth/cli generate` command + schema generation instructions
5. Step 7 Hono middleware: Added null check for `activeOrganizationId` → return 403 Forbidden if no active workspace
6. Added custom role definition for `viewer` in auth config
7. Updated env vars section: Added `RESEND_API_KEY` and `GOOGLE_OAUTH_REDIRECT_URI` (documentation reference)
8. Added Google OAuth redirect URI warning to Step 8 (integrations setup)
9. Session config: Set `sessionExpiry` to 30 days explicitly
10. Rewrote Todo checklist: 12 → 19 tasks, more specific and executable
11. Updated Risk Assessment: Added 2 new risks (email service dependency, Google OAuth URI conflicts)

## Next Steps

- Phase 02 (workspace CRUD) can now proceed without blockers
- Before implementation: developer must have Resend account + API key, or swap for Nodemailer
- Before testing: all three Google OAuth redirect URIs must be registered with Google Cloud Console
- Consider extracting Google OAuth setup into separate integration phase after auth is working
- Test auth flow end-to-end before moving to workspace features

**Owner:** Next phase implementer (TBD)
**Timeline:** Unblocked; can start Phase 01 implementation immediately with corrected plan

