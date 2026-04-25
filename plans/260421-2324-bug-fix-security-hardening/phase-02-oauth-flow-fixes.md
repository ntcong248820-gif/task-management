# Phase 2 — OAuth Flow Fixes

**Priority:** P1 — Silent failures affecting users  
**Status:** ✅ Done  
**Issues:** O1 (token refresh URI), O2 (client constructor URI), O3 (lastSync field), O4 (UI feedback)

## Context Links
- Review report: [reviewer-260421-2324-codebase-bugs-and-security.md](../reports/reviewer-260421-2324-codebase-bugs-and-security.md)
- GSC route: `apps/api/src/routes/integrations/gsc.ts`
- GA4 route: `apps/api/src/routes/integrations/ga4.ts`
- Token refresh: `apps/api/src/utils/token-refresh.ts`
- Integrations status: `apps/api/src/routes/integrations/index.ts`
- Integrations page: `apps/web/src/app/dashboard/integrations/page.tsx`
- Schema: `packages/db/src/schema/integrations.ts`

---

## O1 — Fix `token-refresh.ts` Using Generic Redirect URI

### Key Insight
`refreshOAuthTokens()` passes `process.env.GOOGLE_REDIRECT_URI` to `google.auth.OAuth2`. The redirect URI is **not needed** for token refresh (only for initial code exchange). Passing the wrong one wastes an env lookup and will silently break if `GOOGLE_REDIRECT_URI` is unset.

### Implementation Steps
1. In `apps/api/src/utils/token-refresh.ts:32` — remove redirect URI from OAuth2 constructor:
```ts
// Before
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!   // ← remove this
);
// After
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!
);
```

### Todo
- [x] Remove redirect URI param from `google.auth.OAuth2` in `token-refresh.ts`

---

## O2 — Fix `GSCClient` and `GA4Client` Constructor Using Generic Redirect URI

### Key Insight
Both inline client classes in `gsc.ts` and `ga4.ts` use `process.env.GOOGLE_REDIRECT_URI!` in their constructors. These clients are only used for data fetching (after auth), so they don't need any redirect URI. Use provider-specific URI or remove entirely.

### Related Files
- `apps/api/src/routes/integrations/gsc.ts:16`
- `apps/api/src/routes/integrations/ga4.ts:16`

### Implementation Steps
1. In `GSCClient` constructor (`gsc.ts:14-20`) — remove redirect URI:
```ts
this.oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!
  // no redirect URI needed for data fetching
);
```
2. Same fix in `GA4Client` constructor (`ga4.ts:14-20`)

### Todo
- [x] Remove redirect URI from `GSCClient` constructor in `gsc.ts`
- [x] Remove redirect URI from `GA4Client` constructor in `ga4.ts`

---

## O3 — Fix `lastSync` Showing `createdAt` Instead of Actual Sync Time

### Key Insight
`/api/integrations/status` returns `lastSync: integrations.gsc.createdAt` — this is when the OAuth token row was created, not when data was last synced. Users see a misleading "Last synced: Jan 7" even if sync failed or hasn't run.

### Architecture
- Add `lastSyncedAt` column to `oauth_tokens` table
- Update it on every successful sync in `gsc.ts /sync` and `ga4.ts /sync`
- Return it in status endpoint

### Related Files
- **Modify:** `packages/db/src/schema/integrations.ts` — add `lastSyncedAt` column
- **Modify:** `apps/api/src/routes/integrations/gsc.ts` — update `lastSyncedAt` after sync
- **Modify:** `apps/api/src/routes/integrations/ga4.ts` — update `lastSyncedAt` after sync
- **Modify:** `apps/api/src/routes/integrations/index.ts` — return `lastSyncedAt` in status
- **Run:** `npm run db:push` after schema change

### Implementation Steps
1. Add column to schema (`integrations.ts`):
```ts
lastSyncedAt: timestamp('last_synced_at'),
```

2. At end of `/sync` success in `gsc.ts` and `ga4.ts`:
```ts
await db.update(oauthTokens)
  .set({ lastSyncedAt: new Date() })
  .where(and(eq(oauthTokens.projectId, projectId), eq(oauthTokens.provider, 'google_search_console')));
```

3. In `integrations/index.ts` status response:
```ts
lastSync: integrations.gsc.lastSyncedAt ?? integrations.gsc.createdAt,
```

4. Run `npm run db:push`

### Todo
- [x] Add `lastSyncedAt` column to `integrations.ts` schema
- [x] Update `gsc.ts /sync` to set `lastSyncedAt` on success
- [x] Update `ga4.ts /sync` to set `lastSyncedAt` on success
- [x] Update `integrations/index.ts` to return `lastSyncedAt`
- [x] `npm run db:push` required in production before deploy (local env lacks prod DB credentials)

---

## O4 — Add UI Toast on OAuth Success/Error

### Key Insight
OAuth callback result (success/error) is only logged to `console.log`. Users who connect GSC/GA4 see no visual confirmation.

### Related Files
- **Modify:** `apps/web/src/app/dashboard/integrations/page.tsx:57-65`

### Implementation Steps
1. Import toast from shadcn/ui (already installed):
```ts
import { useToast } from '@/hooks/use-toast';
```

2. Replace `console.log` blocks with toast calls:
```ts
const { toast } = useToast();
// ...
if (success === 'gsc_connected') {
  toast({ title: 'Google Search Console connected', variant: 'default' });
} else if (success === 'ga4_connected') {
  toast({ title: 'Google Analytics 4 connected', variant: 'default' });
} else if (error) {
  toast({ title: 'Connection failed', description: error, variant: 'destructive' });
}
```

### Todo
- [x] Add dismissable alert state to integrations page (used inline state instead of shadcn toast)
- [x] Replace `console.log` success/error with alert banner notifications
- [x] Whitelist error codes against known values (not raw URL)

### Success Criteria
- Connecting GSC/GA4 shows green toast
- OAuth error shows red toast with error code
- `/api/integrations/status` returns correct last sync time after sync
