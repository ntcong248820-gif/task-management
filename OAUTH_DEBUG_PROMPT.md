# 🚨 OAuth Integration Issue - Complete Debugging Prompt

**Date:** December 23, 2025  
**Project:** SEO Impact OS - Task Management System  
**Issue:** OAuth callback not updating connection status after authorization

---

## 📋 PROBLEM STATEMENT

### Current Behavior (ACTUAL):
1. User clicks "Connect Google Search Console" or "Connect Google Analytics 4"
2. Redirects to Google OAuth consent screen
3. User authorizes the application successfully
4. **Callback redirects to:** `http://localhost:3002/dashboard/integrations` (NO query parameters)
5. **Status badge:** Remains "Not Connected" (no change)
6. **Database:** No OAuth tokens are saved

### Expected Behavior (SHOULD BE):
1. After authorization, callback should redirect to: `http://localhost:3002/dashboard/integrations?success=gsc_connected` or `?success=ga4_connected`
2. Status badge should change from "Not Connected" to "Connected" (green)
3. Account email should be displayed
4. OAuth tokens should be saved in `oauth_tokens` table with `project_id = 27`

---

## 🏗️ SYSTEM ARCHITECTURE

### Tech Stack:
- **Frontend:** Next.js 15 (App Router) - Port 3002
- **Backend:** Hono API - Port 3001
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Monorepo:** Turborepo with npm workspaces

### OAuth Flow Architecture:
```
User clicks "Connect"
    ↓
Frontend: /dashboard/integrations
    → Calls: GET /api/integrations/gsc/authorize?projectId=27
    ↓
Backend generates OAuth URL with state parameter
    state = base64({ projectId: 27, integration: 'gsc', random: '...' })
    ↓
Redirect to Google OAuth consent screen
    ↓
User authorizes
    ↓
Google redirects to: GOOGLE_REDIRECT_URI with code & state
    ↓
OAuth callback handler processes:
    - Exchanges code for tokens
    - Saves tokens to database
    - Redirects to frontend with success/error message
    ↓
Frontend detects success parameter and updates UI
```

---

## 📁 KEY FILES & CURRENT STATE

### 1. Environment Configuration

**File:** `apps/api/.env`
```bash
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3002/api/auth/callback/google
DATABASE_URL=postgresql://localhost:5432/task_management
API_PORT=3001
```

**Issue:** `GOOGLE_REDIRECT_URI` points to frontend Next.js API route, not backend

### 2. Backend OAuth Callbacks

**File:** `apps/api/src/routes/integrations/gsc.ts`

**Key sections:**
```typescript
// OAuth scopes
scopes: [
    'https://www.googleapis.com/auth/webmasters.readonly',
]

// Callback handler (Lines 115-212)
app.get('/callback', async (c) => {
    const { code, state, error } = c.req.query();
    
    // Parse state to get projectId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const projectId = parseInt(stateData.projectId);
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Get user email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const accountEmail = userInfo.data.email;
    
    // Save or update tokens in database
    await db.insert(oauthTokens).values({
        projectId,
        provider: 'google_search_console',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        // ... other fields
    });
    
    // Redirect to frontend
    return c.redirect(`http://localhost:3002/dashboard/integrations?success=gsc_connected`);
});
```

**File:** `apps/api/src/routes/integrations/ga4.ts`

**Key sections:**
```typescript
// OAuth scopes
scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
]

// Callback handler - Similar to GSC (Lines 139-262)
// Also fetches user email and saves tokens
```

### 3. Frontend OAuth Callback Route

**File:** `apps/web/src/app/api/auth/callback/google/route.ts`

**Current implementation:**
```typescript
export async function GET(request: NextRequest) {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    // Decode state to get integration type
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const integration = stateData.integration || 'gsc';
    
    // Redirect to backend callback
    const backendCallbackUrl = new URL(
        `/api/integrations/${integration}/callback`, 
        'http://localhost:3001'
    );
    backendCallbackUrl.searchParams.set('code', code || '');
    backendCallbackUrl.searchParams.set('state', state || '');
    
    return NextResponse.redirect(backendCallbackUrl.toString());
}
```

**Issue:** This route receives the callback from Google, then redirects to backend. But something is failing in this chain.

### 4. Frontend Integration Page

**File:** `apps/web/src/app/dashboard/integrations/page.tsx`

**Key logic:**
```typescript
const checkConnectionStatus = async () => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    
    // Show success messages
    if (success === "gsc_connected") {
        console.log("✅ GSC connected successfully!");
    }
    
    // Fetch status from backend
    const projectId = localStorage.getItem('selectedProjectId') || '27';
    const response = await fetch(`/api/integrations/status?projectId=${projectId}`);
    const data = await response.json();
    
    // Update UI based on connection status
    if (data.data.gsc.connected) {
        updateIntegration("gsc", { status: "connected", data: data.data.gsc });
    }
}
```

### 5. Database Schema

**Table:** `oauth_tokens`
```sql
CREATE TABLE oauth_tokens (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    provider VARCHAR(255) NOT NULL,  -- 'google_search_console' or 'google_analytics'
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    token_type VARCHAR(50),
    scope TEXT,
    account_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Current state:** 
```bash
# When running: npx tsx src/scripts/check-tokens.ts
📊 Total tokens: 0
❌ NO TOKENS FOUND IN DATABASE!
```

**Only project in database:**
```
Project ID: 27
Name: Test Project
Domain: topzone.vn
```

---

## 🔍 DEBUGGING INFORMATION

### What We've Verified:

1. ✅ **Frontend sends correct projectId:**
   - State parameter contains: `{"projectId":"27","integration":"gsc","random":"..."}`
   - Browser subagent confirmed this by decoding the state

2. ✅ **Frontend code is updated:**
   - Console shows: `✅ GSC connected successfully!` when URL has success param
   - This proves new code is loaded

3. ✅ **Backend status API works:**
   - Returns: `{"success":true,"data":{"gsc":{"connected":false},"ga4":{"connected":false}}}`
   - API is functional, just returns disconnected status

4. ❌ **Backend callback is NOT saving tokens:**
   - Database check shows 0 tokens
   - This means either:
     - Callback is not being reached
     - Callback is failing silently
     - Exception is thrown but not logged

5. ❌ **URL redirect format is wrong:**
   - Expected: `?success=gsc_connected`
   - Actual: No query parameters at all OR `?gsc=success` (old format)

### Observations:

**When testing OAuth flow:**
- Google redirect URI: `http://localhost:3002/api/auth/callback/google?code=...&state=...`
- This hits the Next.js frontend route
- Frontend route should redirect to backend: `http://localhost:3001/api/integrations/gsc/callback?code=...&state=...`
- Backend should process and redirect to: `http://localhost:3002/dashboard/integrations?success=gsc_connected`
- **BUT:** Actually redirects to: `http://localhost:3002/dashboard/integrations` (no params!)

---

## 🚨 SUSPECTED ISSUES

### 1. OAuth Scope Problem (PREVIOUS ISSUE)

**Historical context:** GA4 failed before because OAuth scopes were insufficient.

**The issue was:**
```typescript
// GA4 code tries to fetch user email
const userInfo = await oauth2.userinfo.get();  // ❌ Failed!
const accountEmail = userInfo.data.email;

// But scopes only had:
scopes: ['https://www.googleapis.com/auth/analytics.readonly']  // No userinfo permission!

// Fix was to add:
scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',  // ← Added
    'openid',                                           // ← Added
]
```

**Current scopes:**

**GSC:**
- `https://www.googleapis.com/auth/webmasters.readonly` (only 1 scope)
- Does NOT include `userinfo.email` or `openid`
- But code tries to fetch user email!

**GA4:**
- `https://www.googleapis.com/auth/analytics.readonly`
- `https://www.googleapis.com/auth/userinfo.email`
- `openid`
- Should work ✅

**Question:** Is GSC failing because it's trying to fetch user email without the proper scopes?

### 2. Backend Hot Reload Issue

**Possible cause:** Backend code changes not being picked up by dev server

**Evidence:**
- Old callback code returned: `?gsc=success` (old format)
- New callback code should return: `?success=gsc_connected`
- If seeing old format, backend is running old code

**Dev server status:**
- Running for 13+ minutes
- No TypeScript compilation errors visible
- But unclear if hot reload worked for the callback routes

### 3. Frontend API Route Intercepting Flow

**The chain:**
```
Google → /api/auth/callback/google (Next.js)
         ↓ (NextResponse.redirect)
         Backend /api/integrations/gsc/callback
         ↓ (c.redirect)
         /dashboard/integrations?success=gsc_connected
```

**Potential issues:**
- Next.js redirect might not follow backend's subsequent redirect
- CORS issues between frontend (3002) and backend (3001)
- Backend redirect might return JSON instead of 302 redirect

### 4. Database Constraint Violation

**Potential issue:**
```typescript
await db.insert(oauthTokens).values({
    projectId,  // Is this an integer or string?
    provider: 'google_search_console',
    // ...
});
```

**Questions:**
- Is `projectId` being parsed correctly? (`parseInt(stateData.projectId)`)
- Does project 27 exist in `projects` table? (Yes, confirmed)
- Are there any foreign key constraints failing?
- Is the insert failing silently?

---

## 🎯 DEBUGGING TASKS

### Immediate Actions Needed:

1. **Check backend console logs during OAuth callback:**
   - Are there any errors when callback is hit?
   - Is the callback endpoint even being reached?
   - Add strategic `console.log()` statements

2. **Verify OAuth scopes for GSC:**
   - GSC callback tries to fetch user email
   - But scopes only include `webmasters.readonly`
   - Need to add `userinfo.email` and `openid` scopes?

3. **Test backend callback directly:**
   - Get a real auth code from Google
   - Call backend callback endpoint directly with curl/Postman
   - See if it saves tokens and redirects properly

4. **Check redirect chain:**
   - Use browser network tab to see all redirects
   - Verify each step in the chain:
     - Google → Frontend Next.js route (should see redirect)
     - Frontend → Backend callback (should see redirect)
     - Backend → Frontend dashboard (should see redirect with params)

5. **Database logs:**
   - Check PostgreSQL logs for any constraint violations
   - Verify INSERT statements are being executed

---

## 📝 CODE TO INVESTIGATE

### Priority 1: GSC OAuth Scopes

**File:** `apps/api/src/routes/integrations/gsc.ts` (Line 58-61)

```typescript
scopes: [
    'https://www.googleapis.com/auth/webmasters.readonly',
    // ❓ Should add these?
    // 'https://www.googleapis.com/auth/userinfo.email',
    // 'openid',
]
```

**And check if user email fetch fails:**
```typescript
// Line ~182-188
oauth2Client.setCredentials(tokens);
const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
const userInfo = await oauth2.userinfo.get();  // ❓ Does this throw an error?
const accountEmail = userInfo.data.email;
```

### Priority 2: Backend Callback Redirect

**File:** `apps/api/src/routes/integrations/gsc.ts` (Line ~209)

```typescript
// Is this redirect working?
return c.redirect(`http://localhost:3002/dashboard/integrations?success=gsc_connected`);

// Or does Hono c.redirect() not work as expected?
// Try alternative:
// return c.redirect('http://localhost:3002/dashboard/integrations?success=gsc_connected', 302);
```

### Priority 3: Frontend Callback Route

**File:** `apps/web/src/app/api/auth/callback/google/route.ts` (Line ~30-39)

```typescript
const backendCallbackUrl = new URL(
    `/api/integrations/${integration}/callback`, 
    'http://localhost:3001'
);
return NextResponse.redirect(backendCallbackUrl.toString());

// ❓ Does NextResponse.redirect() properly follow the backend's redirect?
// Or does it stop after the first redirect?
```

---

## 🔧 SUGGESTED FIXES TO TRY

### Fix 1: Add OAuth Scopes to GSC

```typescript
// apps/api/src/routes/integrations/gsc.ts
scopes: [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/userinfo.email',  // Add
    'openid',                                           // Add
]
```

### Fix 2: Add Error Handling in Callback

```typescript
app.get('/callback', async (c) => {
    try {
        // ... existing code ...
        
        console.log('[GSC Callback] Starting...');
        console.log('[GSC Callback] Code:', code?.substring(0, 20));
        console.log('[GSC Callback] State:', state?.substring(0, 50));
        
        // Parse state
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        console.log('[GSC Callback] Parsed projectId:', stateData.projectId);
        
        // Exchange tokens
        console.log('[GSC Callback] Exchanging code for tokens...');
        const { tokens } = await oauth2Client.getToken(code);
        console.log('[GSC Callback] Tokens received:', !!tokens.access_token);
        
        // Get user info
        console.log('[GSC Callback] Fetching user info...');
        const userInfo = await oauth2.userinfo.get();
        console.log('[GSC Callback] User email:', userInfo.data.email);
        
        // Save to database
        console.log('[GSC Callback] Saving to database...');
        await db.insert(oauthTokens).values({...});
        console.log('[GSC Callback] ✅ Saved successfully!');
        
        // Redirect
        console.log('[GSC Callback] Redirecting to frontend...');
        return c.redirect(`http://localhost:3002/dashboard/integrations?success=gsc_connected`);
        
    } catch (error) {
        console.error('[GSC Callback] ❌ ERROR:', error);
        console.error('[GSC Callback] Error stack:', error.stack);
        return c.redirect(`http://localhost:3002/dashboard/integrations?error=callback_failed`);
    }
});
```

### Fix 3: Simplify Redirect Chain (Alternative Approach)

Instead of Frontend → Backend → Frontend, make Google redirect directly to backend:

```bash
# In .env
GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/callback
```

Then create a unified callback at backend that handles both GSC and GA4:

```typescript
// apps/api/src/routes/integrations/index.ts
app.get('/callback', async (c) => {
    const { code, state } = c.req.query();
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const integration = stateData.integration; // 'gsc' or 'ga4'
    
    // Delegate to specific handler
    if (integration === 'gsc') {
        // Handle GSC
    } else if (integration === 'ga4') {
        // Handle GA4
    }
    
    // Redirect to frontend
    return c.redirect(`http://localhost:3002/dashboard/integrations?success=${integration}_connected`);
});
```

---

## 🧪 TESTING CHECKLIST

After applying fixes, verify:

- [ ] OAuth authorization completes successfully
- [ ] Callback URL includes query parameters: `?success=gsc_connected`
- [ ] Console logs show: `✅ GSC connected successfully!`
- [ ] Status badge changes to "Connected" (green)
- [ ] Account email is displayed
- [ ] Database contains tokens:
  ```bash
  npx tsx src/scripts/check-tokens.ts
  # Should show: Total tokens: 1 (for GSC) or 2 (for both)
  ```
- [ ] Backend status API returns `connected: true`
- [ ] No errors in browser console
- [ ] No errors in backend terminal logs

---

## 📚 ADDITIONAL CONTEXT

### Previous Related Issues:

1. **Hardcoded Project ID:** Backend callbacks had `projectId = 1` hardcoded instead of parsing from state
2. **OAuth Scope Missing:** GA4 needed `userinfo.email` and `openid` scopes
3. **Query Param Mismatch:** Frontend expected `?gsc=success`, backend returned `?success=gsc_connected`

All these have been fixed in recent changes.

### Current Project State:

- Only 1 project exists: ID 27, Name "Test Project", Domain "topzone.vn"
- 0 OAuth tokens in database
- 0 GSC data rows
- 0 GA4 data rows
- Dev server has been running for 13+ minutes
- Frontend has been hard refreshed multiple times

---

## 🎯 FINAL REQUEST

Please investigate and fix the OAuth callback flow so that:

1. After authorization, status badge changes to "Connected"
2. OAuth tokens are saved to database with correct `project_id = 27`
3. Callback redirects with proper success parameter: `?success=gsc_connected`
4. No errors occur during the entire OAuth flow

Focus especially on:
- OAuth scopes for GSC (might need `userinfo.email` and `openid`)
- Error handling in callbacks (are exceptions being swallowed?)
- Redirect chain (is each redirect working as expected?)
- Backend logs (what happens when callback is hit?)

If you need any additional information, please ask! The dev server is currently running and ready for testing.
