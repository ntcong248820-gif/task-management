---
title: Better Auth Review — Phase 01 Auth + Workspace Foundation
date: 2026-05-10
type: review
scope: phase-01-auth-workspace.md vs Better Auth best practices
plan: plans/260510-1600-v2-greenfield-rebuild/phase-01-auth-workspace.md
---

# Review: Phase 01 — Auth + Workspace Foundation

## Overall Assessment

**Status: NEEDS CORRECTIONS before implementation**

Phase 01 plan is ~75% accurate. Architecture decisions (Better Auth + org plugin, shared `packages/auth-config`, Drizzle adapter) are sound. There are 2 critical bugs that would cause runtime failures, plus 3 important gaps that block the invite + password reset flows.

---

## ✅ What's Correct

| Item | Assessment |
|------|-----------|
| Better Auth choice | ✅ Correct — TypeScript-native, Drizzle adapter, org plugin |
| `toNextJsHandler(auth)` for API route | ✅ Exact match with docs |
| `drizzleAdapter(db, { provider: 'pg' })` | ✅ Correct pattern |
| `auth.api.getSession({ headers })` in Hono | ✅ Correct server-side session check |
| `session.session.activeOrganizationId` for workspaceId | ✅ Valid for org plugin |
| DB tables listed (user, session, account, verification, org, member, invitation) | ✅ All correct |
| Separate Google OAuth concern (login vs GSC/GA4) | ✅ Correct risk identification |
| `packages/auth-config/` shared package pattern | ✅ Best practice for monorepo |
| `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` env vars | ✅ Correct |

---

## ❌ Critical Issues (Runtime Failures)

### Issue 1 — Middleware Pattern Is Wrong

**Plan (Step 5):**
```ts
// middleware.ts
import { auth } from '@repo/auth-config';
export default auth.handler; // Better Auth middleware
export const config = { matcher: ['/dashboard/:path*'] };
```

`auth.handler` is **not** a valid Next.js middleware default export. `auth.handler` expects a `Request` object, not a Next.js `NextRequest` with middleware semantics. This would fail at runtime.

**Correct pattern (from Better Auth docs):**
```ts
// middleware.ts
import { auth } from '@repo/auth-config';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers
  });

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*']
};
```

---

### Issue 2 — Missing `organizationClient` Plugin in Auth Client

**Plan (Step 6):**
```ts
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient({ baseURL: process.env.NEXT_PUBLIC_APP_URL });
export const { signIn, signOut, signUp, useSession } = authClient;
```

Without `organizationClient` plugin, `authClient.organization.*` methods (create org, invite member, accept invite, set active org) **don't exist on the client**. The workspace selector and invite flow would break entirely.

**Correct pattern:**
```ts
import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient()]
});

// Destructuring is valid, signIn/signUp are objects with methods
export const { signIn, signOut, signUp, useSession } = authClient;
// Usage: signIn.email({...}), signIn.social({...}), signUp.email({...})
```

---

## ⚠️ Important Issues (Feature Blockers)

### Issue 3 — No Email Service Configured

Plan mentions "Password reset via email" and "Invite system (email-based)" but **doesn't configure any email provider**. Both features require email callbacks:

```ts
// packages/auth-config/src/index.ts
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    sendResetPasswordToken: async ({ user, url }) => {
      await sendEmail(user.email, 'Reset your password', url);
      // Needs: Resend / Nodemailer / SendGrid setup
    }
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, 'Verify your email', url);
    },
    sendOnSignUp: true,
  }
});
```

**Recommendation:** Add Resend (simplest for Next.js/Vercel) or Nodemailer. Add `RESEND_API_KEY` to env vars. Create `packages/auth-config/src/email.ts` helper.

---

### Issue 4 — `viewer` Role Needs Custom Configuration

Plan lists roles: `owner, admin, member, viewer`. Better Auth organization plugin **built-in roles are only: `owner`, `admin`, `member`**. `viewer` must be explicitly defined:

```ts
// packages/auth-config/src/index.ts
import { organization } from 'better-auth/plugins';

organization({
  allowUserToCreateOrganization: true,
  creatorRole: 'owner',
  roles: {
    viewer: {
      permissions: {
        organization: ['read'],
        member: ['read'],
        invitation: [],
      }
    }
  }
})
```

Without this, assigning `viewer` role would fail silently or error.

---

### Issue 5 — Google OAuth Redirect URI Not Addressed

Plan says "Google provider reuses `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`" but doesn't mention that the Better Auth callback URI must be **added to Google Cloud Console**:

```
https://{your-domain}/api/auth/callback/google
```

Existing URIs in Google Console:
- `/api/integrations/gsc/callback`  
- `/api/integrations/ga4/callback`

Better Auth adds a **third** URI. Forgetting this → OAuth login flow fails with `redirect_uri_mismatch`.

**Action:** Add `{BETTER_AUTH_URL}/api/auth/callback/google` to Google Cloud Console authorized redirect URIs before testing.

---

## Minor Issues

### Issue 6 — Schema Generation Step Missing

Plan's "Step 1: Install Better Auth" jumps straight to implementation. Should include:
```bash
cd packages/auth-config
npx @better-auth/cli generate --adapter drizzle --output ../db/src/schema/auth.ts
```
This auto-generates the Drizzle schema for all Better Auth tables + organization plugin. Without it, the DB tables in `packages/db/src/index.ts` need to be written manually (error-prone).

### Issue 7 — `activeOrganizationId` Null Case Not Handled

When user logs in but hasn't selected a workspace, `session.session.activeOrganizationId` is `null`. The Hono middleware in Step 10 would set `workspaceId = null`, causing all multi-tenant queries to fail silently.

Need to handle:
```ts
const session = await auth.api.getSession({ headers: c.req.raw.headers });
if (!session) return c.json({ error: 'Unauthorized' }, 401);
if (!session.session.activeOrganizationId) {
  return c.json({ error: 'No workspace selected' }, 403);
}
c.set('userId', session.user.id);
c.set('workspaceId', session.session.activeOrganizationId);
```

### Issue 8 — Session Expiry Mismatch

Plan says "30-day session expiry" but doesn't configure it. Better Auth default is 7 days. Add explicitly:
```ts
betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // Refresh every 24h
  }
})
```

---

## Corrected Implementation Checklist

Replace current Todo list with:

```
- [ ] Install `better-auth` in apps/web + packages/auth-config
- [ ] Create packages/auth-config/package.json (proper exports)
- [ ] Create packages/auth-config/src/index.ts — Better Auth config
      ✓ emailAndPassword with sendResetPasswordToken
      ✓ emailVerification with sendVerificationEmail
      ✓ Google social provider
      ✓ organization plugin with viewer custom role
      ✓ session 30-day expiry
- [ ] Create packages/auth-config/src/email.ts — Resend/Nodemailer helper
- [ ] Run `npx @better-auth/cli generate --adapter drizzle` to auto-generate schema
- [ ] Add generated auth tables to packages/db/src/index.ts exports
- [ ] Create apps/web/src/app/api/auth/[...all]/route.ts — toNextJsHandler
- [ ] Create apps/web/src/lib/auth-client.ts — createAuthClient + organizationClient plugin
- [ ] Fix middleware.ts — use auth.api.getSession(), NOT auth.handler
- [ ] Create login/signup/workspace-selector pages
- [ ] Fix Hono API middleware — handle null activeOrganizationId (→ 403)
- [ ] Add BETTER_AUTH_SECRET + BETTER_AUTH_URL + RESEND_API_KEY to .env
- [ ] Add /api/auth/callback/google to Google Cloud Console redirect URIs
- [ ] Run npm run db:push to create auth tables
- [ ] Test: signup → email verify → login → workspace create → dashboard
- [ ] Test: invite flow, password reset flow
```

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| ❌ Critical | 2 | Middleware pattern, missing org client plugin |
| ⚠️ Important | 3 | Email service, viewer role, Google OAuth URI |
| Minor | 3 | Schema generation, null workspace guard, session expiry |

**Estimated correction effort:** ~1–2h additional design work before implementation starts.

---

## Unresolved Questions

1. **Email provider choice**: Resend vs Nodemailer vs SendGrid? Resend recommended for Vercel serverless.
2. **Email verification in prod**: `requireEmailVerification: true` blocks login until email verified — acceptable UX for internal tool?
3. **Workspace auto-create on signup**: Should Phase 01 auto-create a workspace when user signs up, or let them create later? Phase plan mentions workspace selector but not auto-create logic.
4. **Supabase connection mode**: Current `DATABASE_URL` uses port 6543 (pgBouncer). Should Better Auth use a separate direct connection (port 5432) for safety with session writes? Worth testing.
