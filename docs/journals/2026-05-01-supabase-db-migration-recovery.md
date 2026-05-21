# Supabase DB Paused for 90+ Days — Full Migration to New Project

**Date**: 2026-05-01 11:30
**Severity**: Critical
**Component**: PostgreSQL Database (Supabase), Database Schema
**Status**: Resolved

## What Happened

After fixing OAuth config, user could initiate Google OAuth flow but the backend returned HTTP 500 on integration status endpoints. Investigation revealed the Supabase PostgreSQL database had been paused for over 90 days (since June 24, 2024). Supabase free tier pauses inactive projects after 7 days; projects paused longer than 30 days cannot be restored through the dashboard. Creating a new Supabase project became the only viable option. Full database migration required: recreating all tables, indexes, and schema from scratch, then seeding initial data. Additionally, discovered a schema bug where `last_synced_at` column in `oauth_tokens` table was not being created by `db:push`.

## The Brutal Truth

This is organizational bankruptcy. The project went dormant for 9 months and nobody noticed the database was paused until the entire system broke. The free tier auto-pause is Supabase's policy (reasonable for cost control), but it exposed a critical lack of operational awareness: no monitoring, no alerts, no understanding of what would break if the database disappeared. The real horror: the app looked "mostly working" (homepage cached, static assets served) while the database was completely inaccessible. Finding this required actually trying to query the database—something that only happened when OAuth flow started hitting the API layer. The migration itself was straightforward (drizzle-kit handled schema recreation), but the manual column addition (`ALTER TABLE oauth_tokens ADD COLUMN...`) revealed either a bug in drizzle-kit or a misunderstanding of how the schema file maps to actual database tables. Either way, this kind of schema/database mismatch should never reach production.

## Technical Details

### Symptom
Browser console errors when attempting to connect GSC/GA4:
```
Failed to connect Google Search Console. Check console for details.
```

Server logs show:
```
/api/integrations/status → HTTP 500
Error: Failed to get integration status
```

### Root Cause: Database Paused
Attempted to connect from local development machine:
```bash
$ psql postgresql://postgres.jtdeuxvwcwtqzjndhrlg:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
psql: error: FATAL:  tenant/user postgres.jtdeuxvwcwtqzjndhrlg not found
```

Old Supabase project ref: `jtdeuxvwcwtqzjndhrlg`
- Last activity: June 24, 2024
- Paused since: ~July 1, 2024
- Current date: May 1, 2026
- **Duration paused: 304 days (over 10 months)**

Supabase policy: Projects inactive for 7+ days are paused. Projects paused for 30+ days cannot be restored via dashboard. This project exceeded both thresholds.

### Recovery Path: New Supabase Project
Since restoration wasn't possible, created completely new Supabase project:

**Old project:**
- Ref: `jtdeuxvwcwtqzjndhrlg`
- Connection string: `postgresql://postgres.jtdeuxvwcwtqzjndhrlg:...@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

**New project:**
- Ref: `hipvuijrwcmdoeirtswf`
- Connection string: `postgresql://postgres.hipvuijrwcmdoeirtswf:...@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres`
- Region: `ap-southeast-1` (Singapore, closer to target users)

### Schema Recreation
Updated local `.env` and Vercel environment variables with new `DATABASE_URL`. Ran schema push:

```bash
npm run db:push -- --force
```

Expected: All 9 tables created (projects, oauth_tokens, gsc_data, ga4_data, etc.) with indexes and constraints
Result: 8 tables created, 1 column missing from `oauth_tokens`

### Discovered Bug: Missing Column
After schema push, verified schema:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'oauth_tokens';
```

Actual columns:
- `id`, `user_id`, `provider`, `access_token`, `refresh_token`, `expires_at`, `scope`, `created_at`, `updated_at`

Missing column:
- `last_synced_at` (timestamp, should exist for tracking when sync last ran)

Schema definition in code (`packages/db/src/schema/oauth-tokens.ts`) was checked—column definition exists. But `db:push` did not create it. Either:
1. Bug in drizzle-kit where certain columns are skipped
2. Schema definition syntax issue
3. Timing/ordering issue in schema discovery

**Workaround**: Manually added column via SQL:
```sql
ALTER TABLE oauth_tokens 
ADD COLUMN IF NOT EXISTS last_synced_at timestamp DEFAULT CURRENT_TIMESTAMP;
```

### Seeding Initial Data
Created first project manually via Hono API (POST to `/api/projects`):
```json
{
  "name": "Thế Giới Di Động",
  "domain": "thegioididong.com"
}
```

Returned: `id: 1`

Set in browser localStorage:
```javascript
localStorage.setItem('selectedProjectId', '1')
```

### OAuth Connection Success
After seeding, OAuth flow completed successfully:
1. User clicks "Connect Google Search Console"
2. Frontend calls `/api/integrations/gsc/authorize` (now returns valid auth URL)
3. Popup redirects to Google OAuth consent screen
4. User grants permission
5. Google redirects to `/api/integrations/gsc/callback`
6. Backend creates `oauth_tokens` entry in database
7. Status endpoint (`/api/integrations/status`) returns connected providers

## What We Tried

1. **First attempt**: Checked if database was accessible
   - Tried: `psql` connection to old Supabase endpoint
   - Result: `FATAL: tenant/user not found`
   - Diagnosis: Database paused, not accessible

2. **Second attempt**: Tried to restore via Supabase dashboard
   - Clicked: "Restore" button in Supabase project settings
   - Result: "This project cannot be restored (paused >30 days)"
   - No other restore option available

3. **Third attempt**: Created new Supabase project
   - New project ref: `hipvuijrwcmdoeirtswf`
   - Updated `DATABASE_URL` locally and in Vercel environment variables
   - Ran `db:push --force` to create all tables

4. **Fourth attempt**: Verified schema creation
   - Discovered: `last_synced_at` column missing from `oauth_tokens`
   - Manually added via `ALTER TABLE` statement
   - Verified column exists: `\d oauth_tokens` in psql

5. **Fifth attempt**: Seeded initial data
   - Created project record with name and domain
   - Set `selectedProjectId` in localStorage
   - Tested OAuth flow end-to-end

## Root Cause Analysis

### Primary: Organizational Dormancy
Project went inactive 304 days ago. No monitoring, no alerts, no documentation about:
- "What happens if the database goes offline?"
- "How do we know when Supabase pauses a project?"
- "What's our recovery procedure?"

Supabase doesn't notify users before pausing (or we missed the notifications). The project simply disappeared from active use, and nobody checked status until OAuth tried to hit the database.

### Secondary: Database Accessibility Hidden by Caching
The app appeared functional because:
- Homepage (`/`) is static HTML, served from cache
- No database queries on homepage load
- OAuth and integrations pages require database queries

A database-first application (or a healthcheck on the homepage) would have surfaced this immediately. Caching is good for performance but bad for operational visibility.

### Tertiary: Schema Mismatch in db:push
The `last_synced_at` column was defined in the schema but not created by drizzle-kit. Root causes could be:
1. **Drizzle-kit bug**: Certain column types or configurations are skipped
2. **Schema syntax**: Column definition syntax issue in `packages/db/src/schema/oauth-tokens.ts`
3. **Timing**: `db:push` ran before the schema file was fully loaded or processed

This needs investigation to prevent future schema drift. The workaround (manual SQL) works but is fragile.

### Quaternary: Missing Post-Migration Validation
After creating new database, no automated validation ran:
- Verify all tables exist
- Verify all columns exist
- Verify indexes are created
- Verify foreign key constraints exist

Manual inspection caught the missing column, but a script would have caught this immediately and failed loudly.

## Lessons Learned

1. **Monitor Database State**: Set up alerts for:
   - Database connectivity failures
   - Unused free-tier services (Supabase sends emails before pausing, but they're easy to miss)
   - Schema drift (run regular schema validation)

2. **Document Operational Procedures**: Create runbooks for:
   - "Database offline recovery"
   - "Backup and restore procedures"
   - "What to do when a service pauses"

3. **Separate Concerns**: Don't rely on caching to hide database failures. Add:
   - `/api/health` endpoint that checks database connectivity
   - Frontend healthcheck that loads on every page
   - Alerts when health checks start failing

4. **Validate Schema After Migrations**: After `db:push`, run automated checks:
   ```sql
   -- Verify all expected tables exist
   SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- Verify column counts match expected schema
   SELECT table_name, COUNT(*) as column_count 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
   GROUP BY table_name;
   ```

5. **Investigate Tool Failures**: The missing column issue needs root cause analysis. Either drizzle-kit has a bug or our schema definition is wrong. Don't just work around it with manual SQL—fix the source.

6. **Seed Default Data Immediately**: After database creation, seed at least:
   - One default project (so localhost doesn't feel empty)
   - Admin user (if applicable)
   - Configuration records
   This prevents orphaned foreign key errors and makes testing easier.

7. **Free-Tier Gotchas**: Supabase free tier's auto-pause policy is reasonable for them but deadly for forgotten projects. Either:
   - Schedule a cron job that hits the API monthly (keeps project active)
   - Use paid tier (not paused for inactivity)
   - Document the 7-day inactivity timeout in team wiki

## Next Steps

1. ✓ Created new Supabase project (ref: `hipvuijrwcmdoeirtswf`)
2. ✓ Updated `DATABASE_URL` in local `.env` and Vercel environment variables
3. ✓ Ran `db:push --force` to recreate all tables
4. ✓ Manually added missing `last_synced_at` column to `oauth_tokens`
5. ✓ Seeded initial project data (Thế Giới Di Động)
6. ✓ Verified OAuth flow works end-to-end
7. ⏳ **URGENT**: Investigate why `last_synced_at` wasn't created by db:push—fix schema definition or drizzle-kit usage
8. ⏳ Add schema validation script that runs after `db:push` and fails if columns are missing
9. ⏳ Document operational procedures in `./docs/deployment-guide.md`: database recovery, backup strategy, monitoring
10. ⏳ Add `/api/health` endpoint that checks database connectivity; frontend should call it on load
11. ⏳ Set up Supabase event notifications or cron keep-alive to prevent future pauses

**Owner**: DevOps / Database Administration
**Timeline**: Schema investigation immediate, monitoring setup this week, documentation updates next sprint
