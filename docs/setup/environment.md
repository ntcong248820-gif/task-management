# Environment Variables Setup Guide

Complete reference for configuring environment variables across all deployment environments.

---

## 🌐 Production URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://task-management-app-theta-two.vercel.app |
| **Backend** | https://task-management-nwul.onrender.com |
| **Database** | Supabase (Session Mode Pooler on port 5432) |

---

## 📦 Backend Environment Variables (Render)

Set these in **Render Dashboard** → **Environment** tab:

```bash
# Database Connection (REQUIRED)
DATABASE_URL=postgresql://postgres.jtdeuxvwcwtqzjndhrlg:Thanhcong2002%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

# IMPORTANT Notes for DATABASE_URL:
# ✅ Use port 5432 (Session Mode Pooler - works with IPv4)
# ✅ URL-encode special characters: @ → %40, # → %23, ! → %21
# ❌ DO NOT use port 6543 (has "Tenant or user not found" errors)

# Google OAuth (REQUIRED)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# OAuth Redirect URI (CRITICAL!)
# This MUST point to FRONTEND callback, NOT backend!
GOOGLE_REDIRECT_URI=https://task-management-app-theta-two.vercel.app/api/auth/callback/google

# Server Configuration
NODE_ENV=production
PORT=3001  # Render will auto-assign, but good to set

# Optional APIs
AHREFS_API_KEY=your-ahrefs-api-key  # Optional
OPENAI_API_KEY=sk-...  # Optional for AI features
```

### ✅ Verification

After setting environment variables on Render:

1. **Check logs** during deployment:
   ```
   [DB] Connection type: Session Mode Pooler (5432)
   [DB] SSL: ENABLED
   [DB] Prepared statements: ENABLED
   ✅ Database connected!
   ```

2. **Test debug endpoint**:
   ```bash
   curl https://task-management-nwul.onrender.com/debug/db
   ```
   Should return: `{"success": true, ...}`

3. **Test API endpoints**:
   ```bash
   curl https://task-management-nwul.onrender.com/api/projects
   ```

---

## 🎨 Frontend Environment Variables (Vercel)

Set these in **Vercel Dashboard** → **Settings** → **Environment Variables**:

```bash
# API URL (REQUIRED)
NEXT_PUBLIC_API_URL=https://task-management-nwul.onrender.com

# Google OAuth Client ID (if using frontend OAuth)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### ✅ Verification

After deployment:

1. **Open browser console** on your app
2. **Check if API calls work**:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL)
   // Should show: https://task-management-nwul.onrender.com
   ```

3. **Test from UI**:
   - Go to Dashboard
   - Projects should load
   - No CORS errors in console

---

## 🔐 Google Cloud Console Setup

### OAuth 2.0 Client ID Configuration

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. **Add these Authorized redirect URIs**:

```
https://task-management-app-theta-two.vercel.app/api/auth/callback/google
https://task-management-nwul.onrender.com/api/integrations/gsc/callback
https://task-management-nwul.onrender.com/api/integrations/ga4/callback
```

4. **Remove old localhost URIs** (optional, but recommended for security)

### Enabled APIs

Make sure these are enabled:
- ✅ Google Search Console API
- ✅ Google Analytics Data API
- ✅ Google OAuth 2.0

---

## 🖥️ Local Development Environment

For local development, create `.env.local` in project root:

```bash
# Database (Local PostgreSQL)
DATABASE_URL=postgresql://kong.peterpan@localhost:5432/seo_impact_os

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# Local API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Server Ports
API_PORT=3001
WEB_PORT=3000
NODE_ENV=development
```

### Google OAuth for Local Development

Add this to Google Cloud Console redirect URIs:
```
http://localhost:3000/api/auth/callback/google
```

---

## 🔧 Environment Files Reference

| File | Purpose | Committed to Git? |
|------|---------|-------------------|
| `.env.example` | Template for development | ✅ Yes |
| `.env.production.example` | Template for production | ✅ Yes |
| `.env.local` | Your local development values | ❌ No (in .gitignore) |
| `.env` | Alternative local file | ❌ No (in .gitignore) |

---

## 📝 Common Issues & Solutions

### Issue 1: "Tenant or user not found" error

**Cause**: Using wrong port in DATABASE_URL

**Fix**: Make sure DATABASE_URL uses port `5432` (not `6543`)
```bash
# ✅ Correct
postgresql://user:pass@host:5432/postgres

# ❌ Wrong
postgresql://user:pass@host:6543/postgres
```

### Issue 2: OAuth redirect_uri_mismatch

**Cause**: Google Cloud Console doesn't have production URLs

**Fix**: Add ALL redirect URIs to Google Console:
- Frontend: `https://task-management-app-theta-two.vercel.app/api/auth/callback/google`
- Backend GSC: `https://task-management-nwul.onrender.com/api/integrations/gsc/callback`
- Backend GA4: `https://task-management-nwul.onrender.com/api/integrations/ga4/callback`

### Issue 3: "Failed to fetch" errors on frontend

**Cause**: `NEXT_PUBLIC_API_URL` not set or wrong

**Fix**:
1. Go to Vercel → Settings → Environment Variables
2. Set `NEXT_PUBLIC_API_URL=https://task-management-nwul.onrender.com`
3. Redeploy

### Issue 4: Password encoding issues

**Cause**: Special characters in password not URL-encoded

**Fix**: Use the helper script:
```bash
npx tsx scripts/encode-db-url.ts
```

Or manually encode:
- `@` → `%40`
- `#` → `%23`
- `!` → `%21`
- `$` → `%24`

---

## 🚀 Quick Setup Checklist

### Backend (Render)
- [ ] Set `DATABASE_URL` with port 5432
- [ ] Set `GOOGLE_CLIENT_ID`
- [ ] Set `GOOGLE_CLIENT_SECRET`
- [ ] Set `GOOGLE_REDIRECT_URI` (frontend URL!)
- [ ] Set `NODE_ENV=production`
- [ ] Deploy and verify logs show "Database connected!"

### Frontend (Vercel)
- [ ] Set `NEXT_PUBLIC_API_URL` (backend URL!)
- [ ] Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- [ ] Deploy and test API calls work

### Google Cloud Console
- [ ] Add all 3 redirect URIs
- [ ] Enable Search Console API
- [ ] Enable Analytics Data API

### Testing
- [ ] Test `/debug/db` returns success
- [ ] Test `/api/projects` returns data
- [ ] Test OAuth flow (GSC/GA4 connection)
- [ ] Verify data syncs after connecting

---

## 📚 Related Documentation

- [DATABASE_TROUBLESHOOTING.md](DATABASE_TROUBLESHOOTING.md) - Database connection issues
- [OAUTH_SETUP.md](OAUTH_SETUP.md) - OAuth configuration details
- [.env.production.example](.env.production.example) - Production environment template

---

## 🆘 Need Help?

If environment variables are still not working:

1. **Check Render logs** for specific error messages
2. **Check Vercel deployment logs** for build errors
3. **Verify all URLs** match exactly (no typos, trailing slashes)
4. **Test locally first** to isolate environment vs code issues
5. **Check browser console** for client-side errors
