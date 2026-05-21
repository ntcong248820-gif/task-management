# Google OAuth Failing Due to Wrong API URL in Production

**Date**: 2026-05-01 10:45
**Severity**: High
**Component**: Frontend OAuth Integration, API Configuration
**Status**: Resolved

## What Happened

After Vercel deployment was unblocked and all API endpoints became accessible, OAuth connections still failed silently. User clicked "Connect Google Search Console" on the Integrations page, a popup opened briefly, then closed with a browser console error: "Failed to connect Google Search Console. Check console for details." The root cause: frontend client was configured to call `http://localhost:3001` (hardcoded fallback) instead of using same-origin API calls in production. This caused two failures: immediate connection refused, plus mixed-content security block (HTTPS frontend requesting HTTP API).

## The Brutal Truth

This is an architectural assumption bug that almost shipped. The config fallback of `http://localhost:3001` was meant as a development convenience—"if the environment variable isn't set, use localhost." In production, the environment variable is intentionally empty (empty string evaluates to falsy, triggering the fallback). The "fix" wasn't to add the environment variable; it was to recognize that empty string is the correct production state and should NOT fall back to localhost. This kind of logic error is insidious because it works perfectly locally (dev always has `NEXT_PUBLIC_API_URL=http://localhost:3001`), so it never gets caught during development. The real lesson: test the actual production environment variable values locally, or at least think through what happens when they're empty.

## Technical Details

### Symptom
Browser console error on OAuth initiation:
```
Failed to connect Google Search Console. Check console for details.
```

Actual network error: `net::ERR_CONNECTION_REFUSED` on request to `http://localhost:3001/api/integrations/gsc/authorize`

Secondary error: `Mixed Content: The page at 'https://task-management-web-zeta.vercel.app' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://localhost:3001/api/integrations/gsc/authorize'. This request has been blocked; the content must be served over HTTPS.`

### Root Cause: Fallback Fallacy
File: `apps/web/src/lib/config.ts`
```typescript
export const apiUrl: string = 
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
```

In production environment (Vercel):
- `process.env.NEXT_PUBLIC_API_URL` is set to empty string (intentional for same-origin design)
- Empty string is falsy in JavaScript
- `|| 'http://localhost:3001'` evaluates to true
- All API calls target localhost instead of same-origin

In development environment (local machine):
- `apps/web/.env.local` explicitly sets `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Fallback never triggers
- Everything works, bug remains hidden

### Correct Production Behavior
When `NEXT_PUBLIC_API_URL` is empty string in production:
```typescript
// With the fix:
export const apiUrl: string = 
  process.env.NEXT_PUBLIC_API_URL || ''

const endpoint = apiUrl ? `${apiUrl}/api/integrations/gsc/authorize` 
                        : `/api/integrations/gsc/authorize`

// In production: endpoint = '/api/integrations/gsc/authorize' (relative URL)
// Browser resolves relative URL to same-origin: 'https://task-management-web-zeta.vercel.app/api/integrations/gsc/authorize'
// Result: HTTPS to HTTPS, same-origin, no mixed-content block
```

## What We Tried

1. **First attempt**: Checked browser console
   - Found error: "XMLHttpRequest endpoint 'http://localhost:3001'"
   - Confirmed: frontend was calling localhost from production

2. **Second attempt**: Assumed environment variable wasn't set in Vercel
   - Logged into Vercel dashboard
   - Checked environment variables
   - Found: `NEXT_PUBLIC_API_URL` was set to empty string (correct)
   - Realized: empty string is falsy, triggering fallback

3. **Third attempt**: Changed fallback from `'http://localhost:3001'` to `''`
   ```typescript
   // Before:
   process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
   
   // After:
   process.env.NEXT_PUBLIC_API_URL || ''
   ```
   - Updated `apps/web/src/lib/config.ts`
   - Verified dev environment unaffected: `apps/web/.env.local` still explicitly sets `NEXT_PUBLIC_API_URL=http://localhost:3001`
   - Pushed commit `087b52e`

4. **Fourth attempt**: Vercel auto-deployed after commit
   - Tested OAuth flow again
   - Success: popup remained open, received authorization URL, redirect to Google OAuth worked

## Root Cause Analysis

### Primary: Assumption About Falsy Values
Developer (or past decision) assumed "if `NEXT_PUBLIC_API_URL` isn't set, default to localhost." But "not set" (undefined) and "set to empty" (empty string) are different states:
- Undefined: variable doesn't exist in environment → should default to localhost
- Empty string: variable exists but intentionally empty → should use same-origin

The code didn't distinguish between these. Better approach: explicit conditional:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL !== undefined 
  ? process.env.NEXT_PUBLIC_API_URL 
  : (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001')
```

Or simpler: separate dev config from production logic.

### Secondary: Environment Variable Not Tested in Production Context
The fallback was never triggered locally because dev setup always provides `NEXT_PUBLIC_API_URL`. This code path was untested. Running the same Next.js build as production locally would have caught this immediately.

### Tertiary: Mixed-Content Security as Backup Defense
The browser's mixed-content security block prevented the real issue (calling localhost from production HTTPS) from succeeding, which is good. But the error message wasn't clear enough to immediately point to the API URL misconfiguration. Someone might spend an hour checking OAuth credentials when the issue is basic networking.

## Lessons Learned

1. **Empty String ≠ Undefined**: Don't use `|| fallback` when empty string is a valid intentional value. Use explicit conditionals.

2. **Test With Production Environment Variables**: Run `next build && next start` locally with production environment variables (empty API URL) to catch config bugs before deployment.

3. **Same-Origin Strategy Requires Discipline**: When the design is "API and frontend on same origin," don't let a localhost fallback sneak in. Make it explicit: "production uses relative URLs, dev uses localhost absolute URL."

4. **Mixed-Content Errors Indicate Configuration Problems**: When you see "mixed content blocked," the root cause is often a hardcoded URL in code. Check for localhost/HTTP in configuration files and fallbacks.

5. **Falsy Logic is Dangerous**: JavaScript's `||` operator is convenient but creates ambiguity. Empty string, zero, null, undefined all trigger the fallback. Be explicit about what you're checking.

## Next Steps

1. ✓ Changed fallback in `apps/web/src/lib/config.ts` from `'http://localhost:3001'` to `''`
2. ✓ Verified `apps/web/.env.local` still provides `NEXT_PUBLIC_API_URL=http://localhost:3001` for dev
3. ✓ Pushed commit `087b52e`
4. ✓ Verified OAuth flow works in production
5. ⏳ Add test: OAuth authorization flow from staging environment (catches similar config bugs)
6. ⏳ Add config validation: warn if API URL is hardcoded to localhost in production builds
7. ⏳ Document same-origin API design in `./docs/deployment-guide.md`

**Owner**: Frontend/Configuration
**Timeline**: Config validation immediate, OAuth test next sprint
