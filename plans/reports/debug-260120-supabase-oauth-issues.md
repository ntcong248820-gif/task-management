# Fix Supabase Connection and OAuth Integration Issues

## Current Problems

### 1. Database Connection Error (CRITICAL)
- Error: "Tenant or user not found" from Supabase
- Status: FATAL - all database queries failing
- Logs show: Pooler detected, prepared statements disabled, but still fails
- Root cause: Port 6543 (connection pooler) is unreliable with Supabase

### 2. OAuth Integration Not Working
- GSC/GA4 connection status doesn't update to "Connected"
- After OAuth authorization, frontend returns but status unchanged
- Likely blocked by database connection failure (can't save tokens)

### 3. No Data Visualization
- Charts and tables empty
- Cannot fetch data due to database connection failure
- Sync jobs cannot run without valid database connection

## Root Cause Analysis

The "Tenant or user not found" error from Supabase pooler (port 6543) is a known issue. Despite disabling prepared statements, the pooler is still rejecting connections. This is a Supabase/PgBouncer limitation.

## Recommended Solution

### Option 1: Switch to Direct Connection (Port 5432) ⭐ RECOMMENDED
**Pros:**
- More reliable, no pooler issues
- Simpler configuration
- Better for moderate traffic apps
- No prepared statement restrictions

**Cons:**
- Limited to 60 concurrent connections (vs unlimited with pooler)
- Slightly higher latency for very high traffic

**Implementation:**
1. Update `DATABASE_URL` on Render to use port 5432
2. Ensure password is properly URL-encoded (`@` → `%40`)
3. Remove pooler detection logic (no longer needed)
4. Redeploy

### Option 2: Use Supabase Session Mode Pooler
**Pros:**
- Unlimited connections
- Lower latency at scale

**Cons:**
- More complex setup
- May require additional Supabase configuration
- Higher risk of similar auth issues

**Decision:** Go with **Option 1** (Direct Connection) for simplicity and reliability.

## Implementation Plan

### Step 1: Create Helper Script
- ✅ Created `scripts/encode-db-url.ts` to help generate properly encoded URLs
- User can run this locally to verify their URL encoding

### Step 2: Update Documentation
- Create `DATABASE_TROUBLESHOOTING.md` with:
  - How to get direct connection URL from Supabase
  - How to properly encode password
  - How to update Render environment variables
  - How to verify connection

### Step 3: Update Database Connection Code (Optional)
- Add better error messaging for common issues
- Add startup validation that fails fast if URL is invalid
- Log whether using pooler or direct connection

### Step 4: Fix OAuth Status Display
- Once database connection works, OAuth tokens will save properly
- May need to check frontend state management for connection status

## Critical Files

- `packages/db/src/index.ts` - Database connection configuration
- `apps/api/src/index.ts` - Startup connection test
- `apps/api/src/routes/integrations/gsc.ts` - GSC OAuth flow
- `apps/api/src/routes/integrations/ga4.ts` - GA4 OAuth flow

## User Action Required

**IMMEDIATE:**
1. Go to Supabase Dashboard → Project Settings → Database
2. Find "Connection String" (NOT "Connection Pooling")
3. Copy the direct connection string (port 5432)
4. Update `DATABASE_URL` on Render with this new URL
5. Ensure password is URL-encoded (use the helper script if needed)
6. Redeploy from Render dashboard

**AFTER DEPLOY:**
1. Test `/debug/db` endpoint - should return `success: true`
2. Try connecting GSC/GA4 from dashboard
3. Verify tokens are saved in database
4. Check if data starts syncing

## Open Questions for User

1. Do you want to stick with direct connection (port 5432), or would you prefer to troubleshoot the pooler (port 6543)?
2. Do you have the Supabase direct connection string handy?
3. Are you comfortable updating the Render environment variable yourself, or do you need step-by-step guidance?
