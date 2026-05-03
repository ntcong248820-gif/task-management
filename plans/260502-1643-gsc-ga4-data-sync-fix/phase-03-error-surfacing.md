---
phase: "03"
title: "Error Surfacing + last_synced_at Fix"
status: completed
priority: P1
effort: 30min
---

# Phase 03 — Error Surfacing + last_synced_at Fix

## Context Links

- Debug report: [debugger-260502-1629-gsc-ga4-data-zero.md](../reports/debugger-260502-1629-gsc-ga4-data-zero.md)
- Plan: [plan.md](./plan.md)

## Overview

Two low-severity but important quality issues:
1. **Silent error masking**: cron jobs return `{ok:true}` even when inner loop catches errors and skips all projects
2. **last_synced_at never set**: confirm in both jobs (cron + manual sync) that `lastSyncedAt` is always updated after successful sync

## Implementation Steps

### Step 1 — Fix `sync-gsc.ts` — track per-project errors, always update `lastSyncedAt`

In `sync-gsc.ts`, restructure the per-connection loop to track success/failure per connection:

```typescript
export const runGSCSync = async () => {
    log.info('Starting daily GSC sync...');

    const result = { synced: 0, errors: [] as string[] };

    try {
        const connections = await db.select().from(oauthTokens)
            .where(eq(oauthTokens.provider, 'google_search_console'));

        log.info(`Found ${connections.length} GSC connections`);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        for (const connection of connections) {
            try {
                const validAccessToken = await getValidAccessToken(connection);
                const client = new GSCClient(validAccessToken, decryptTokenValue(connection.refreshToken));

                const siteUrl = await client.getOrDiscoverSiteUrl(connection.projectId);
                if (!siteUrl) {
                    result.errors.push(`project ${connection.projectId}: no siteUrl`);
                    continue;
                }

                const data = await client.fetchAllSearchAnalytics({ siteUrl, startDate: dateStr, endDate: dateStr });
                if (data.length === 0) {
                    result.errors.push(`project ${connection.projectId}: no data for ${dateStr}`);
                    continue;
                }

                // Insert to gsc_data + gsc_data_aggregated (Phase 01 fixes)
                // ... batch inserts ...

                // Always update lastSyncedAt on success
                await db.update(oauthTokens)
                    .set({ lastSyncedAt: new Date() })
                    .where(eq(oauthTokens.id, connection.id));

                result.synced++;
            } catch (error: any) {
                result.errors.push(`project ${connection.projectId}: ${error.message}`);
                log.error(`Error syncing project ${connection.projectId}:`, error);
            }
        }

        log.info(`GSC sync done. synced=${result.synced} errors=${result.errors.length}`);
    } catch (error) {
        log.error('Error in GSC sync job:', error);
    }

    return result;
};
```

### Step 2 — Same pattern for `sync-ga4.ts`

Apply identical restructuring to `runGA4Sync()` — track per-connection success, update `lastSyncedAt` on success, push to errors array on failure.

### Step 3 — Update cron route handlers to return result

In `packages/api-app/src/routes/cron/sync-gsc.ts`, change:
```typescript
// Before:
return c.json({ ok: true, durationMs: Date.now() - start });

// After:
const result = await runGSCSync();
return c.json({ ok: true, durationMs: Date.now() - start, synced: result.synced, errors: result.errors });
```

Same for `sync-ga4.ts`.

### Step 4 — Ensure manual sync also updates `lastSyncedAt` on partial failure

In `gsc.ts` manual sync (line ~542-546) and `ga4.ts` manual sync, `lastSyncedAt` is already updated. Confirm the update happens inside the try block before the `return c.json({ success: true })` — move it to execute even on partial success (data length > 0 check should still gate the insert but not gate the timestamp update).

## Todo List

- [ ] Refactor `runGSCSync()` to track `synced`/`errors` + always set `lastSyncedAt` on success
- [ ] Same refactor for `runGA4Sync()`
- [ ] Update `routes/cron/sync-gsc.ts` to return result counts
- [ ] Update `routes/cron/sync-ga4.ts` to return result counts
- [ ] Verify manual sync `lastSyncedAt` update logic in `gsc.ts` and `ga4.ts`
- [ ] Run `npm run type-check` — zero errors
- [ ] Run `npm run lint` — zero errors

## Success Criteria

- `last_synced_at` in `oauth_tokens` updated after every successful sync (cron or manual)
- GitHub Actions log shows `synced: N, errors: [...]` after each cron run
- Silent failures no longer hidden behind `ok:true`
