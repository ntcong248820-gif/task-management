# Phase 04 — Env Centralization: Code Complete, Manual Tasks Remain

**Date:** 2026-04-27 09:42
**Severity:** High
**Component:** Infrastructure, OAuth, CORS
**Status:** Resolved (code); Blocked (manual steps)

## What Happened

Phase 04 env centralization completed all code tasks. OAuth redirect URIs renamed across the codebase, env validation added at startup, CORS fixed for Vercel preview deploys, and all `.env.example` files updated. Critical bug found and fixed: sync jobs were passing encrypted token ciphertext directly to Google OAuth—silent 401 failures during any token refresh.

## The Brutal Truth

This phase exposed a pre-existing token encryption bug that was silently breaking OAuth token refresh in the sync jobs. The bug wasn't caught earlier because sync jobs only fail when tokens expire, which doesn't happen in quick dev cycles. It would have surfaced in production during the first month when refresh tokens aged past their initial window.

## Technical Details

**Critical Bug (C1):** `sync-gsc.ts` and `sync-ga4.ts` decryption failure
- Code passed `connection.refreshToken` (AES-GCM ciphertext) directly to Google's refresh endpoint
- Google received hex-encoded encrypted bytes instead of actual refresh token
- Result: silent 401 on any token refresh; sync job silently fails
- **Fix:** Added `decryptTokenValue(connection.refreshToken)` before passing to Google

**ENCRYPTION_KEY validation:** Added hex format check
- Previous: length check only (`!== 64`)
- Problem: `"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"` (64 spaces) passes length but produces 0-length Buffer
- **Fix:** Regex validation `/^[0-9a-fA-F]{64}$/` — rejects non-hex, prevents silent crypto failures

**CORS comma-split fix:** `FRONTEND_URL_PREVIEW` now parsed as list
- Previous: used as single string; Vercel dynamic preview subdomains broke
- **Fix:** `.split(',').map(s => s.trim()).filter(Boolean)` — supports multiple comma-separated origins

**Security: Timing-safe comparison** in `verify-cron-secret.ts`
- Changed from `auth !== \`Bearer ${secret}\`` to `crypto.timingSafeEqual()`
- Prevents timing attacks on cron secret validation

## What We Tried

All code tasks completed without workaround. Env validator called at app boot before route registration—fails fast with named missing vars. OAuth URI rename required touching 6 files across both stale `apps/api` and active `packages/api-app` codebases (cleanup task in Phase 05).

## Root Cause Analysis

The token decryption bug existed because:
1. OAuth connection model stores refreshToken encrypted
2. Sync jobs assumed refreshToken property contained plaintext
3. No decrypt step before OAuth API call
4. No integration test that exercises token refresh (would have caught immediately)

ENCRYPTION_KEY validation gap: length-only check missed non-hex strings that produce broken crypto.

## Lessons Learned

- **Token encryption requires end-to-end testing:** Encrypt → store → retrieve → decrypt → use. Missing the last step silently until tokens age.
- **Crypto format validation must be strict:** Length checks alone miss entire categories of invalid input. Use regex for hex strings.
- **Timing-safe comparisons for secrets:** Even cron secret comparison needs `timingSafeEqual()`.
- **Duplicate codebases create hidden bugs:** Stale `apps/api` routes weren't touched; Phase 05 cleanup critical.

## Next Steps

**Blocked on:**
1. Add ENCRYPTION_KEY, GOOGLE_GSC_REDIRECT_URI, GOOGLE_GA4_REDIRECT_URI, CRON_SECRET, FRONTEND_URL, FRONTEND_URL_PREVIEW to Vercel dashboard
2. Register new redirect URIs in Google OAuth Console (`/api/integrations/gsc/callback`, `/api/integrations/ga4/callback` for Vercel production domain)

**Owner:** Manual deployment tasks — cannot proceed until Vercel dashboard updated and Google Console URIs registered. Coordinate with Phase 02 cutover timing.

**Timeline:** Phase 02 production deploy blocked on these manual steps. Complete before Vercel traffic flip.
