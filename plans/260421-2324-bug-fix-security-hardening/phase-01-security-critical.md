# Phase 1 — Security Critical

**Priority:** P0 — Fix before next production deploy  
**Status:** ✅ Done  
**Issues:** S1 (token encryption), S2 (debug endpoint), S3 (rate limiting)

## Context Links
- Review report: [reviewer-260421-2324-codebase-bugs-and-security.md](../reports/reviewer-260421-2324-codebase-bugs-and-security.md)
- Schema: `packages/db/src/schema/integrations.ts`
- API entry: `apps/api/src/index.ts`
- Token utils: `apps/api/src/utils/token-refresh.ts`

## S1 — Encrypt OAuth Tokens at Rest

### Key Insight
`accessToken` and `refreshToken` are stored as plain `text` in DB. Anyone with DB access can steal live Google OAuth tokens.

### Architecture
- Use Node.js `crypto` — AES-256-GCM (authenticated encryption)
- Single `ENCRYPTION_KEY` env var (32-byte hex = 64 chars)
- Encrypt on write, decrypt on read — transparent to route handlers
- Key already referenced in `.env.production.example`

### Related Files
- **Create:** `apps/api/src/utils/crypto-tokens.ts` — encrypt/decrypt helpers
- **Modify:** `apps/api/src/routes/integrations/gsc.ts` — encrypt before INSERT/UPDATE
- **Modify:** `apps/api/src/routes/integrations/ga4.ts` — encrypt before INSERT/UPDATE
- **Modify:** `apps/api/src/utils/token-refresh.ts` — decrypt after SELECT

### Implementation Steps

1. Create `apps/api/src/utils/crypto-tokens.ts`:
```ts
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(encrypted: string): string {
  const [ivHex, tagHex, ciphertextHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

export function isEncrypted(value: string): boolean {
  return value.split(':').length === 3;
}
```

2. In `gsc.ts` and `ga4.ts` — wrap tokens before DB write:
```ts
import { encryptToken } from '../../utils/crypto-tokens';
// On INSERT/UPDATE:
accessToken: encryptToken(tokens.access_token),
refreshToken: encryptToken(tokens.refresh_token),
```

3. In `token-refresh.ts` — decrypt after SELECT:
```ts
import { decryptToken, isEncrypted } from './crypto-tokens';
// Before using tokenRecord.accessToken:
const accessToken = isEncrypted(tokenRecord.accessToken)
  ? decryptToken(tokenRecord.accessToken)
  : tokenRecord.accessToken; // backward-compat for unencrypted rows
```

4. Run one-time migration script to encrypt existing tokens:
- Create `scripts/migrate-encrypt-tokens.ts`
- SELECT all rows, encrypt, UPDATE

### Todo
- [x] Create `apps/api/src/utils/crypto-tokens.ts`
- [x] Update `gsc.ts` callback — encrypt on INSERT/UPDATE
- [x] Update `ga4.ts` callback — encrypt on INSERT/UPDATE
- [x] Update `token-refresh.ts` — decrypt before use (with backward-compat)
- [x] Create `scripts/migrate-encrypt-tokens.ts`
- [x] Verify `ENCRYPTION_KEY` set in Render env vars
- [x] Test: connect GSC, check DB row is encrypted, verify sync still works

### Success Criteria
- DB rows show `iv:tag:ciphertext` format in accessToken/refreshToken columns
- GSC/GA4 sync still succeeds after encryption
- Token refresh works correctly

---

## S2 — Remove `/debug/db` Endpoint

### Key Insight
`GET /debug/db` in `apps/api/src/index.ts:46-95` exposes DB URL fragment and SQL results in production JSON. Zero reason to keep it live.

### Related Files
- **Modify:** `apps/api/src/index.ts` — delete the `/debug/db` route block

### Implementation Steps
1. Delete lines 46–95 in `apps/api/src/index.ts` (the entire `app.get('/debug/db', ...)` block)
2. Keep the `/health` endpoint (it's safe — returns no sensitive data)

### Todo
- [x] Remove `app.get('/debug/db', ...)` block from `apps/api/src/index.ts`

### Success Criteria
- `GET /debug/db` returns 404

---

## S3 — Add Rate Limiting

### Key Insight
No rate limiting on any route. Sync endpoints (`/api/integrations/gsc/sync`) can be spammed, triggering Google API quota exhaustion.

### Architecture
- Use `@hono/rate-limiter` — official Hono package
- Apply only to sensitive routes: sync endpoints + OAuth authorize
- Simple in-memory store is sufficient for single-instance Render deploy

### Related Files
- **Modify:** `apps/api/src/index.ts` — add rate limiter middleware
- **Install:** `@hono/rate-limiter` in `apps/api/package.json`

### Implementation Steps
1. `cd apps/api && npm install @hono/rate-limiter`
2. In `apps/api/src/index.ts`:
```ts
import { rateLimiter } from '@hono/rate-limiter';

// Apply to sync + auth routes only
app.use('/api/integrations/*/sync', rateLimiter({ windowMs: 60_000, limit: 5 }));
app.use('/api/integrations/*/authorize', rateLimiter({ windowMs: 60_000, limit: 10 }));
```

### Todo
- [x] Install `hono-rate-limiter` (correct npm package)
- [x] Add rate limiter to sync + authorize routes in `index.ts` with IP spoofing protection

### Success Criteria
- 6th sync request within 1 minute returns 429
