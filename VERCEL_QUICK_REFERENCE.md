# 🚀 Vercel Deployment Quick Reference

## ✅ Issue Fixed
**Problem**: `useSearchParams() should be wrapped in a suspense boundary`  
**Status**: ✅ FIXED in commit `992d91c`  
**Solution**: Split `ProjectContext` to wrap `useSearchParams()` in Suspense

---

## 📋 Pre-Deployment Checklist

### 1. Vercel Project Settings
- [ ] **Root Directory**: Set to `apps/web`
- [ ] **Build Command**: `npm run build` (auto-detected)
- [ ] **Output Directory**: `.next` (auto-detected)

### 2. Environment Variables (CRITICAL ⚠️)
Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Google OAuth Setup
After deployment, add to Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs:
```
https://your-vercel-url.vercel.app/api/auth/callback/google
```

---

## 🔍 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Build fails with "useSearchParams" error | Already fixed | ✅ Fixed in latest commit |
| "Failed to fetch" errors | Wrong API URL | Check `NEXT_PUBLIC_API_URL` env var |
| OAuth callback fails | Redirect URI not whitelisted | Add Vercel URL to Google OAuth |
| Module not found | Wrong root directory | Set root to `apps/web` |
| Env vars not working | Not set or wrong name | Must start with `NEXT_PUBLIC_` |

---

## 🎯 Deployment Steps

1. **Push to GitHub** ✅ (Already done)
2. **Import to Vercel**
   - Go to vercel.com/new
   - Import `ntcong248820-gif/task-management`
3. **Configure Settings**
   - Root Directory: `apps/web`
   - Add environment variables
4. **Deploy**
   - Click "Deploy"
   - Wait 1-3 minutes
5. **Update Google OAuth**
   - Add Vercel URL to redirect URIs
6. **Test**
   - Visit deployment URL
   - Test login and dashboard

---

## 📊 What to Monitor

After deployment:
- ✅ Homepage loads
- ✅ Authentication works
- ✅ Dashboard pages accessible
- ✅ API calls successful
- ✅ No console errors

---

## 📚 Full Documentation

- **Setup Guide**: `VERCEL_PROJECT_SETUP.md`
- **Risk Assessment**: `VERCEL_DEPLOYMENT_CHECKLIST.md`
- **General Deployment**: `DEPLOYMENT.md`

---

**Ready to Deploy**: ✅ YES  
**Last Build Test**: ✅ PASSED (local)  
**Critical Issues**: ✅ NONE
