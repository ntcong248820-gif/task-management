# Phase 1: Token Encryption and Security Hardening

**Date**: 2026-04-25 14:30
**Severity**: Critical
**Component**: OAuth token storage, API security endpoints
**Status**: Resolved

## What Happened

Implemented P0 security hardening for token encryption and debug endpoint removal. Created AES-256-GCM encryption layer, applied it across all OAuth token flows, and removed a production data leak.

## The Brutal Truth

This felt overdue. The `/debug/db` endpoint had been sitting in production code since the initial API scaffold — it was dumping DB URL fragments and SQL error details directly into HTTP responses. Anyone who stumbled onto it got a window into our infrastructure. The OAuth tokens stored in our database were also plaintext, which meant a single DB breach would have given attackers direct access to GSC and GA4 credentials. We should have caught both of these during initial implementation.

## Technical Details

### AES-256-GCM Encryption (`apps/api/src/utils/crypto-tokens.ts`)

Created encryption utility with four exported functions:
- `encryptToken(plaintext: string, key: Buffer): string` — AES-256-GCM with 12-byte IV, 16-byte tag, outputs base64 `iv/tag/ciphertext`
- `decryptToken(encrypted: string, key: Buffer): string` — validates IV 24 chars, tag 32 chars before decrypting
- `isEncrypted(value: string): boolean` — checks if value has 3 colons and correct IV/tag lengths (hardened against false positives on 3-segment strings)
- `decryptTokenValue(value: string, key: Buffer): string` — no-op for plaintext (null/undefined checks), otherwise decrypts

Key hardening decisions:
- Lazy key loading to avoid storing key in memory longer than necessary
- 32-byte key validation with explicit error
- `Buffer.toString('utf8')` coercion on decryption output to handle edge cases where Node returns Buffer instead of string
- IV and tag length validation at decrypt time, not just isEncrypted time

### Token Flow Updates

**gsc.ts callback route** — encrypt on INSERT and UPDATE:
```typescript
// Before: raw token stored plaintext
// After: encryptToken(access_token, key)
```

**ga4.ts callback route** — same pattern

**token-refresh.ts** — decrypt before use, encrypt refreshed token before write-back:
```typescript
const accessToken = isEncrypted(cached.accessToken)
  ? decryptToken(cached.accessToken, key)
  : cached.accessToken;
// ... refresh logic ...
await db.update(oauthTokensTable)
  .set({ accessToken: encryptToken(newAccessToken, key), ... })
  .where(eq(oauthTokensTable.id, tokenId));
```

### Migration Script Bug Caught Pre-Production

The original migration script used JavaScript `===` for the WHERE clause:
```typescript
// BROKEN — produces .where(false) in Drizzle
.where(row.id === target.id)
```

This silently corrupts all rows because Drizzle ORM does not accept JavaScript `===` on a column object. The correct syntax is:
```typescript
.where(eq(row.id, target.id))
```

The code review caught this before any migration ran in production. If it had shipped, every row in `oauthTokens` would have been updated with encrypted tokens regardless of whether they were already encrypted, effectively double-encrypting all tokens and locking out every integration.

### Debug Endpoint Removal

Removed `/debug/db` endpoint from `apps/api/src/index.ts`. The endpoint was exposing:
- DB URL with credentials in error messages
- Raw SQL error messages from the database driver

### Rate Limiting

Installed `hono-rate-limiter` (note: NOT `@hono/rate-limiter` — that package does not exist on npm despite documentation references suggesting otherwise).

Applied limits:
- `/api/sync/*`: 5 requests per minute
- `/api/integrations/gsc/authorize`, `/api/integrations/ga4/authorize`: 10 requests per minute

IP spoofing protection: Extracts the last segment from `x-forwarded-for` header because Render (and most proxies) append the real client IP at the end after any forwarded chain.

## Root Cause Analysis

1. **Debug endpoint**: Scaffolded early and never audited before production deploy. No code review gate on production-safe endpoints.
2. **Token encryption**: plaintext storage was the fastest path to working OAuth during initial implementation. Security debt was accumulated deliberately with "we'll add this later" reasoning.
3. **Migration WHERE clause**: Developer assumed Drizzle column objects work with JavaScript `===` like plain objects. Drizzle requires its own `eq()` helper.

## Lessons Learned

- Migration scripts with Drizzle ORM require `eq()` from `drizzle-orm` — JavaScript `===` on a column object silently produces `.where(false)` which matches zero rows during development but would corrupt all rows in production
- Package names on npm can differ from what documentation suggests (`@hono/rate-limiter` vs `hono-rate-limiter`). Always verify package existence before installing.
- The `isEncrypted()` function had a subtle false-positive bug: it accepted any 3-segment string with correct IV/tag lengths, even if the ciphertext was garbage. The fix was to check that IV is exactly 24 base64 chars and tag is exactly 32 base64 chars.
- Buffer coercion (`Buffer.toString('utf8')`) is sometimes needed even when TypeScript types say `string` — Node can return Buffer at runtime.

## Next Steps

- [x] Migration script tested and verified safe to run
- [x] Rate limiting tested on staging
- [ ] Monitor production for double-encryption failures (symptom: all GSC/GA4 syncs failing with auth errors)
- [ ] Monitor rate limit effectiveness — adjust limits if needed based on usage patterns

## Tests

27/28 passing. One pre-existing FK constraint failure in `tasks.test.ts` due to PostgreSQL sequences not resetting between test files.
