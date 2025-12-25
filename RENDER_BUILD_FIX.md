# 🔧 Render Build Fix - Deployment Guide

## ✅ Issue Fixed

**Problem**: Build failed with TypeScript monorepo errors
```
error TS6059: File is not under 'rootDir'
```

**Root Cause**: 
- `tsconfig.json` had strict `rootDir: "./src"` 
- Prevented importing from `packages/db` (outside rootDir)
- Test files caused additional build errors

**Solution Applied**:
1. ✅ Removed `rootDir` constraint from `tsconfig.json`
2. ✅ Excluded test files from compilation
3. ✅ Tested build locally - SUCCESS!
4. ✅ Committed and pushed to GitHub

**Commit**: `bd9ac44` - "fix: update tsconfig to support monorepo build"

---

## 🚀 Next Steps - Redeploy on Render

### **Option 1: Automatic Redeploy** ⭐ (Recommended)

Render should **automatically detect** the new commit and redeploy!

**Check**:
1. Go to Render Dashboard
2. Look for your service
3. Check "Events" tab
4. Should see "Deploy triggered by push to main"

**Wait**: ~2-3 minutes for build

---

### **Option 2: Manual Redeploy**

If auto-deploy doesn't trigger:

1. **Go to Render Dashboard**
2. **Find your service** (seo-impact-api or whatever you named it)
3. **Click "Manual Deploy"** button
4. **Select**: "Clear build cache & deploy"
5. **Wait**: ~2-3 minutes

---

## 📊 What to Expect

### **Build Process**:
```
1. Clone repo ✅
2. Install dependencies ✅
3. Run build command ✅ (should work now!)
4. Start server ✅
5. Health check ✅
```

### **Success Indicators**:
- ✅ Build logs show "Build succeeded"
- ✅ Service status: "Live"
- ✅ Health check passes
- ✅ URL accessible

---

## 🎯 After Successful Deploy

### **1. Get Your API URL**

Render will give you a URL like:
```
https://seo-impact-api.onrender.com
```

**Copy this URL!**

---

### **2. Add Missing Environment Variable**

**Go to**: Service → Environment

**Add**:
```bash
Key: GOOGLE_REDIRECT_URI
Value: https://YOUR-API-URL.onrender.com/api/integrations/gsc/callback
```

**Example**:
```bash
GOOGLE_REDIRECT_URI=https://seo-impact-api.onrender.com/api/integrations/gsc/callback
```

**Click "Save"** → Render will auto-redeploy

---

### **3. Test API**

```bash
# Test health endpoint
curl https://YOUR-API-URL.onrender.com/health

# Should return:
{
  "status": "ok",
  "message": "SEO Impact OS API is running",
  "timestamp": "2025-12-25T..."
}
```

---

### **4. Update Frontend (Vercel)**

**Go to**: Vercel Dashboard → Your Project → Settings → Environment Variables

**Update**:
```bash
NEXT_PUBLIC_API_URL=https://YOUR-API-URL.onrender.com
```

**Redeploy**: Deployments → Latest → Redeploy

---

### **5. Update Google OAuth**

**Go to**: Google Cloud Console → APIs & Services → Credentials

**Add to Authorized Redirect URIs**:
```
https://YOUR-API-URL.onrender.com/api/integrations/gsc/callback
```

**Save**

---

## 🐛 If Build Still Fails

### **Check Build Logs**

1. Go to Render Dashboard
2. Click on your service
3. Go to "Logs" tab
4. Look for error messages

### **Common Issues**:

#### **1. Missing Dependencies**
```
Error: Cannot find module 'xxx'
```

**Fix**: Check `package.json` has all dependencies

---

#### **2. Environment Variables**
```
Error: DATABASE_URL is not defined
```

**Fix**: Add missing env vars in Render dashboard

---

#### **3. Port Issues**
```
Error: Port 3001 is already in use
```

**Fix**: Render uses `PORT` env var automatically, should be fine

---

## 📋 Deployment Checklist

### **Pre-Deploy** ✅
- [x] Fixed tsconfig.json
- [x] Tested build locally
- [x] Committed and pushed to GitHub

### **Deploy** 
- [ ] Render auto-deploys (or manual deploy)
- [ ] Build succeeds
- [ ] Service goes "Live"
- [ ] Health check passes

### **Post-Deploy**
- [ ] Copy API URL
- [ ] Add `GOOGLE_REDIRECT_URI` env var
- [ ] Test API health endpoint
- [ ] Update Vercel `NEXT_PUBLIC_API_URL`
- [ ] Update Google OAuth redirect URIs
- [ ] Test full OAuth flow

---

## 🎉 Success Criteria

### **Backend (Render)**
- ✅ Build successful
- ✅ Service status: Live
- ✅ Health check: `/health` returns 200
- ✅ Database connection works
- ✅ OAuth endpoints accessible

### **Frontend (Vercel)**
- ✅ Can call backend API
- ✅ Dashboard loads
- ✅ OAuth flow works
- ✅ Data displays correctly

---

## 📚 Reference

### **Files Changed**:
- `apps/api/tsconfig.json` - Fixed monorepo build

### **Commits**:
- `bd9ac44` - Fix tsconfig for monorepo

### **Documentation**:
- `RENDER_DEPLOYMENT_GUIDE.md` - Full deployment guide
- `DEPLOYMENT_ARCHITECTURE.md` - Architecture overview

---

## 💡 Pro Tips

### **1. Monitor First Deploy**
Watch the build logs in real-time to catch any issues early

### **2. Test Incrementally**
1. First: Test health endpoint
2. Then: Test database endpoints
3. Finally: Test OAuth flow

### **3. Keep Logs**
Save build logs if successful - helpful for debugging later

### **4. Environment Variables**
Double-check all env vars are set correctly before testing

---

## 🚀 Quick Commands

```bash
# Test health endpoint
curl https://YOUR-API.onrender.com/health

# Test root endpoint
curl https://YOUR-API.onrender.com/

# Test with verbose output
curl -v https://YOUR-API.onrender.com/health
```

---

**Status**: ✅ Ready to redeploy!  
**Next Step**: Wait for Render auto-deploy or trigger manual deploy  
**Expected Time**: 2-3 minutes for successful build
