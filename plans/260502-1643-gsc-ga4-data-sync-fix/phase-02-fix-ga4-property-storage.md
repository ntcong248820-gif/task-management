---
phase: "02"
title: "Fix GA4 Property Storage at OAuth + Sync"
status: completed
priority: P0
effort: 45min
completed: 2026-05-02
---

# Phase 02 — Fix GA4 Property Storage at OAuth + Sync

## Context Links

- Debug report: [debugger-260502-1629-gsc-ga4-data-zero.md](../reports/debugger-260502-1629-gsc-ga4-data-zero.md)
- Plan: [plan.md](./plan.md)

## Overview

Two bugs in GA4 sync path:
1. **Callback doesn't save property**: `ga4.ts` OAuth callback (`/callback`) stores tokens but never saves properties. `ga4_properties` stays empty (0 rows).
2. **Auto-discovery returns null on multiple properties**: `sync-ga4.ts:getOrDiscoverPropertyId()` gets null when multiple GA4 properties found → silently skips with `continue`.

Fix: save first discovered property during OAuth callback (user can manually select later if needed).

## Related Code Files

**Modify:**
- `packages/api-app/src/routes/integrations/ga4.ts` — callback + sync

**Read-only:**
- `packages/api-app/src/jobs/sync-ga4.ts` — reference for property discovery logic

## Implementation Steps

### Step 1 — Add `ga4Properties` to import in `ga4.ts`

```typescript
// Line 4 — before:
import { db, oauthTokens, ga4Data, eq, sql, and } from '@repo/db';

// After:
import { db, oauthTokens, ga4Data, ga4Properties, eq, sql, and } from '@repo/db';
```

### Step 2 — In `/callback`, save property after token save

After the token upsert block (lines ~241–253) that inserts/updates `oauthTokens`, add property discovery + save:

In `ga4.ts` after line ~253 (after the token insert/update block, before `log.info(\`GA4 connected successfully...\`)`):

```typescript
// Discover and save GA4 properties after OAuth connect
try {
    const oauth2Client = new google.auth.OAuth2(
        getOAuthConfig().clientId,
        getOAuthConfig().clientSecret,
        getOAuthConfig().redirectUri
    );
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
    });

    const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });
    const response = await analyticsadmin.properties.list();
    const properties = response.data.properties || [];

    for (const property of properties) {
        const propertyId = property.name?.split('/')[1] || '';
        if (!propertyId) continue;

        const existing = await db
            .select({ id: ga4Properties.id })
            .from(ga4Properties)
            .where(and(
                eq(ga4Properties.projectId, projectId),
                eq(ga4Properties.propertyId, propertyId)
            ))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(ga4Properties).values({
                projectId,
                propertyId,
                propertyName: property.displayName || null,
            });
            log.info(`Saved GA4 property ${propertyId} (${property.displayName}) for project ${projectId}`);
        }
    }

    if (properties.length === 0) {
        log.warn(`No GA4 properties found for account — user needs to add manually`);
    }
} catch (propError) {
    log.error('Failed to discover/save GA4 properties during callback:', propError);
    // Don't fail the OAuth flow — tokens are saved, property can be set later
}
```

### Step 3 — Fix `sync-ga4.ts` to save property if auto-discovery finds exactly one

In `packages/api-app/src/jobs/sync-ga4.ts`, `getOrDiscoverPropertyId()` returns `null` on multiple properties. Update it to save the first property when found AND return that ID (not null):

```typescript
async getOrDiscoverPropertyId(projectId: number): Promise<string | null> {
    // 1. Check DB for configured property
    const configuredProp = await db
        .select()
        .from(ga4Properties)
        .where(eq(ga4Properties.projectId, projectId))
        .limit(1);

    if (configuredProp.length > 0) {
        return configuredProp[0].propertyId;
    }

    // 2. If not found, discover from API and auto-save first property
    try {
        const admin = google.analyticsadmin({ version: 'v1beta', auth: this.oauth2Client });
        const response = await admin.accountSummaries.list();
        const summaries = response.data.accountSummaries || [];

        const allProperties: any[] = [];
        summaries.forEach((account: any) => {
            if (account.propertySummaries) allProperties.push(...account.propertySummaries);
        });

        if (allProperties.length === 0) {
            log.warn(`No properties found for project ${projectId}`);
            return null;
        }

        // Save all discovered properties to DB (user can pick later via /properties endpoint)
        for (const prop of allProperties) {
            const propertyId = prop.property?.split('/')[1];
            if (!propertyId) continue;

            const existing = await db
                .select({ id: ga4Properties.id })
                .from(ga4Properties)
                .where(and(
                    eq(ga4Properties.projectId, projectId),
                    eq(ga4Properties.propertyId, propertyId)
                ))
                .limit(1);

            if (existing.length === 0) {
                await db.insert(ga4Properties).values({
                    projectId,
                    propertyId,
                    propertyName: prop.displayName || null,
                });
                log.info(`Auto-saved GA4 property ${propertyId} (${prop.displayName}) for project ${projectId}`);
            }
        }

        // Return first property ID (use first as default)
        const firstPropertyId = allProperties[0].property?.split('/')[1];
        log.info(`Auto-discovered ${allProperties.length} GA4 properties for project ${projectId}. Using: ${firstPropertyId}`);
        return firstPropertyId || null;

    } catch (error) {
        log.error(`Error listing properties for project ${projectId}:`, error);
        return null;
    }
}
```

### Step 4 — Add missing imports to `sync-ga4.ts`

```typescript
// Top of file, line 4 — before:
import { db, oauthTokens, ga4Data, ga4Properties, eq, sql } from '@repo/db';

// After:
import { db, oauthTokens, ga4Data, ga4Properties, projects, eq, sql, and } from '@repo/db';
```

## Implementation Notes

### Step 1 — Add `ga4Properties` to import in `ga4.ts` ✅
Already present in imports.

### Step 2 — In `/callback`, save property after token save ✅
Added property discovery using `accountSummaries.list()` API (aligned with sync-ga4 approach).
Saves all discovered properties to `ga4_properties` table with duplicate check.
Non-blocking — errors logged but don't fail OAuth flow.

### Step 3 — Fix `sync-ga4.ts` to save property if auto-discovery finds multiple ✅
`getOrDiscoverPropertyId()` now:
- Saves ALL discovered properties to DB with `onConflictDoNothing`
- Returns first property ID as default (instead of null on multiple)
- Logs all discoveries for debugging

### Step 4 — Add missing imports to `sync-ga4.ts` ✅
Added `and` to imports (was missing for the duplicate-check query).

### Code Review Notes
- Fixed inconsistency: callback now uses `accountSummaries.list()` (same as sync-ga4) instead of `properties.list()`
- Both files handle empty properties array correctly
- Duplicate insert protection via `existing.length === 0` check

## Success Criteria

- `ga4_properties` has at least 1 row after GA4 OAuth callback completes
- `ga4_data` gets rows after next cron run
- `/api/integrations/ga4/properties?projectId=1&save=true` returns saved properties

## Risk

- Auto-saving first property (without user selection) means data might sync from wrong property if account has many. Mitigated: user can use `/properties` endpoint to select correct property after connect.
- API call in callback adds ~500ms latency to OAuth flow. Acceptable — happens once per connect.
