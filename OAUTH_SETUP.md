# OAuth Setup Guide for Production Deployment

## Problem
Getting `redirect_uri_mismatch` error when connecting GSC/GA4 to production app.

## Root Cause
Google OAuth Console has old redirect URIs (localhost) that don't match your production URLs.

---

## Solution: Update Google OAuth Console

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/apis/credentials
2. Select your project
3. Find your OAuth 2.0 Client ID

### Step 2: Add Production Redirect URIs

You need to add **both** frontend and backend callback URLs:

#### Frontend Callback (Vercel)
```
https://your-app.vercel.app/api/auth/callback/google
```

#### Backend Callbacks (Render)
```
https://your-api.onrender.com/api/integrations/gsc/callback
https://your-api.onrender.com/api/integrations/ga4/callback
```

### Step 3: Update Environment Variables

#### On Render (Backend)
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback/google
```

**IMPORTANT:** `GOOGLE_REDIRECT_URI` should point to **frontend callback**, not backend!
The frontend will then redirect to backend.

#### On Vercel (Frontend)
```bash
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
```

---

## OAuth Flow Explanation

```
User clicks "Connect GSC/GA4"
    ↓
Frontend redirects to Google OAuth
    ↓
Google redirects back to: https://your-app.vercel.app/api/auth/callback/google?code=xxx
    ↓
Frontend catches callback and redirects to backend:
https://your-api.onrender.com/api/integrations/gsc/callback?code=xxx
    ↓
Backend exchanges code for tokens and saves to DB
    ↓
Backend redirects back to: https://your-app.vercel.app/dashboard/integrations?success=true
```

---

## Checklist

- [ ] Add frontend callback URL to Google OAuth Console
- [ ] Add backend GSC callback URL to Google OAuth Console
- [ ] Add backend GA4 callback URL to Google OAuth Console
- [ ] Set `GOOGLE_REDIRECT_URI` on Render to frontend URL
- [ ] Set `NEXT_PUBLIC_API_URL` on Vercel to backend URL
- [ ] Redeploy both apps after env var changes
- [ ] Test GSC connection
- [ ] Test GA4 connection

---

## Example URLs (Replace with your actual domains)

```bash
# Frontend (Vercel)
FRONTEND_URL=https://seo-impact-os.vercel.app

# Backend (Render)
BACKEND_URL=https://seo-impact-api.onrender.com

# Google OAuth Redirect URIs to add:
https://seo-impact-os.vercel.app/api/auth/callback/google
https://seo-impact-api.onrender.com/api/integrations/gsc/callback
https://seo-impact-api.onrender.com/api/integrations/ga4/callback
```

---

## Testing

After setup, test the flow:

1. Go to `https://your-app.vercel.app/dashboard/integrations`
2. Click "Connect Google Search Console"
3. Authorize with Google
4. Should redirect back with success message
5. Check Render logs for token storage confirmation
6. Repeat for GA4

---

## Troubleshooting

### Still getting redirect_uri_mismatch?
- Check Google Console has exact URL (including https://)
- Verify no trailing slashes
- Check `GOOGLE_REDIRECT_URI` env var on Render
- Try in incognito mode to clear OAuth cache

### Tokens not saving?
- Check Render logs for database errors
- Verify `DATABASE_URL` is set correctly
- Test `/debug/db` endpoint should return success

### No data showing up?
- Tokens must be saved first (check database)
- Sync jobs only run in production mode
- May need to manually trigger first sync
