# Database Connection Troubleshooting Guide

## Current Error: "Tenant or user not found"

This error occurs when using Supabase's connection pooler (port 6543) with certain drivers. The solution is to use **direct connection (port 5432)** instead.

---

## ✅ Solution: Switch to Direct Connection

### Step 1: Get Direct Connection String from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Project Settings** (⚙️ icon in sidebar)
4. Go to **Database** tab
5. Scroll to **Connection String** section
6. Find **URI** (NOT "Connection Pooling URI")
7. Click **Copy** - this is your direct connection string

**The URL should look like:**
```
postgresql://postgres.jtdeuxvwcwtqzjndhrlg:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Notice: Port is 5432** (not 6543)

---

### Step 2: Encode Your Password

If your password contains special characters (like `@`, `#`, `!`), you MUST URL-encode them:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `#` | `%23` |
| `!` | `%21` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |

**Example:**
- Original password: `Thanhcong2002@`
- Encoded password: `Thanhcong2002%40`

**Use the helper script:**
```bash
npx tsx scripts/encode-db-url.ts
```

This will prompt you for your credentials and generate a properly encoded URL.

---

### Step 3: Update DATABASE_URL on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your **Backend service**
3. Click **Environment** tab
4. Find `DATABASE_URL` variable
5. Click **Edit** (pencil icon)
6. Paste the new connection string with:
   - **Port 5432** (direct connection)
   - **URL-encoded password**
7. Click **Save Changes**

**Render will automatically redeploy when you save.**

---

### Step 4: Verify Connection

After Render finishes deploying (~2-3 minutes):

1. **Test debug endpoint:**
   ```bash
   curl https://your-api.onrender.com/debug/db
   ```

   **Expected response:**
   ```json
   {
     "success": true,
     "message": "Database connection successful",
     "result": [...]
   }
   ```

2. **Check Render logs:**
   - Should see: `✅ Database connected! Found X project(s)`
   - Should NOT see: `❌ Database connection FAILED!`

3. **Test API endpoints:**
   ```bash
   curl https://your-api.onrender.com/api/projects
   ```

   Should return your projects array (may be empty initially, but no errors).

---

## Common Issues

### Issue 1: Still getting "Tenant or user not found"

**Check:**
- [ ] Is port **5432** in your DATABASE_URL? (not 6543)
- [ ] Is password properly URL-encoded?
- [ ] Did you copy the correct connection string from Supabase?
- [ ] Did Render finish redeploying after you updated the env var?

**Test encoding:**
```bash
npx tsx scripts/encode-db-url.ts
```

### Issue 2: "password authentication failed"

**Cause:** Password encoding issue or wrong credentials

**Fix:**
1. Go to Supabase → Database → Reset Database Password
2. Set a NEW password (avoid special characters initially)
3. Copy the new connection string
4. Update on Render
5. Redeploy

### Issue 3: "SSL connection required"

**Cause:** Missing SSL configuration (but should auto-detect for supabase.com)

**Fix:** Connection code automatically enables SSL for Supabase domains. If this still happens, check that your URL contains `supabase.com`.

### Issue 4: Connection timeout

**Cause:** Firewall or network issue

**Fix:**
- Supabase allows all IPs by default
- Render's IPs should work automatically
- Check Supabase Dashboard → Settings → API → "Allowed IP addresses"

---

## Connection Type Comparison

| Feature | Direct Connection (5432) | Connection Pooler (6543) |
|---------|--------------------------|---------------------------|
| **Reliability** | ✅ Very reliable | ⚠️ Has auth issues |
| **Setup** | ✅ Simple | ⚠️ Complex |
| **Concurrent Connections** | ~60 max | Unlimited |
| **Prepared Statements** | ✅ Supported | ❌ Not supported |
| **Best For** | Most apps | High-traffic apps |

**Recommendation:** Use Direct Connection (5432) unless you have >50 concurrent users.

---

## Testing Connection Locally

To test your connection string locally before deploying:

```bash
# Set the DATABASE_URL temporarily
export DATABASE_URL="postgresql://postgres.xxx:encoded_password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Run database push to test
cd packages/db
npm run db:push
```

If successful, you'll see:
```
✓ Pushed schema successfully
```

---

## Quick Reference

**Current working configuration:**
- Port: **5432** (direct)
- SSL: **Enabled** (auto for supabase.com)
- Prepared statements: **Enabled** (no restrictions on direct connection)
- Casing: **snake_case** conversion enabled

**Environment variables needed:**
```bash
# Backend (Render)
DATABASE_URL=postgresql://user:encoded_pass@host:5432/postgres
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback/google

# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
```

---

## Need Help?

If you're still having issues after following this guide:

1. Check Render logs for specific error messages
2. Test `/debug/db` endpoint and save the full response
3. Verify all environment variables are set correctly
4. Try resetting your Supabase database password
