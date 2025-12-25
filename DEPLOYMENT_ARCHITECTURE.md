# 🏗️ Full Stack Deployment Architecture

## 📊 Deployment Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION STACK                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   FRONTEND       │      │   BACKEND API    │      │   DATABASE       │
│   (Next.js)      │─────▶│   (Hono)         │─────▶│   (PostgreSQL)   │
│                  │      │                  │      │                  │
│   Platform:      │      │   Platform:      │      │   Platform:      │
│   ✅ Vercel      │      │   ✅ Render      │      │   ✅ Supabase    │
│                  │      │                  │      │                  │
│   Status:        │      │   Status:        │      │   Status:        │
│   ✅ DEPLOYED    │      │   ✅ DEPLOYED    │      │   ✅ DEPLOYED    │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## ✅ Current Status

### 1. Frontend (Next.js) - **DEPLOYED** ✅
- **Platform**: Vercel
- **Status**: ✅ Deployed and working
- **URL**: `https://your-app.vercel.app`
- **Auto-deploy**: ✅ Enabled (on git push)
- **Environment Variables**: 
  - `NEXT_PUBLIC_API_URL` - ⚠️ Currently pointing to localhost or needs update
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - ⚠️ Needs to be set

### 2. Backend API (Hono) - **NOT DEPLOYED** ❌
- **Platform**: Railway (recommended) or alternatives
- **Status**: ❌ Not deployed yet
- **Current**: Running on `localhost:3001`
- **Needs**: 
  - Deploy to Railway/Render/Fly.io
  - Set environment variables
  - Update frontend `NEXT_PUBLIC_API_URL`

### 3. Database (PostgreSQL) - **NOT DEPLOYED** ❌
- **Platform**: Supabase (recommended) or alternatives
- **Status**: ❌ Not deployed yet
- **Current**: Running on local PostgreSQL
- **Needs**:
  - Create Supabase project
  - Run migrations
  - Update `DATABASE_URL` in backend

---

## 🎯 What You Need to Do Next

### **Priority 1: Deploy Database** 🗄️

**Recommended: Supabase (Free tier available)**

**Steps**:
1. Create Supabase account: https://supabase.com
2. Create new project
3. Get connection string
4. Run migrations
5. Verify tables created

**Alternatives**:
- Neon (https://neon.tech) - Free tier, serverless PostgreSQL
- Railway PostgreSQL - Integrated with Railway
- Render PostgreSQL - Free tier available

---

### **Priority 2: Deploy Backend API** 🚀

**Recommended: Railway (Free $5 credit/month)**

**Why Railway?**:
- ✅ Easy deployment from GitHub
- ✅ Auto-deploy on git push
- ✅ Built-in PostgreSQL option
- ✅ Free tier available
- ✅ Good for Hono/Node.js apps

**Steps**:
1. Create Railway account: https://railway.app
2. Deploy from GitHub repo
3. Set environment variables
4. Get deployment URL
5. Update frontend `NEXT_PUBLIC_API_URL`

**Alternatives**:
| Platform | Free Tier | Pros | Cons |
|----------|-----------|------|------|
| **Railway** | $5/month credit | Easy, auto-deploy | Credit-based |
| **Render** | 750 hours/month | Generous free tier | Slower cold starts |
| **Fly.io** | Limited free | Fast, global | More complex setup |
| **Vercel Functions** | Yes | Same platform as frontend | Not ideal for Hono |

---

### **Priority 3: Update Frontend Config** 🔧

After backend is deployed:

1. **Update Vercel Environment Variables**:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-api.railway.app
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   ```

2. **Redeploy Frontend**:
   - Vercel will auto-redeploy when you update env vars
   - Or manually redeploy from dashboard

3. **Update Google OAuth**:
   - Add Railway URL to authorized redirect URIs
   - Add Vercel URL to authorized redirect URIs

---

## 📋 Complete Deployment Checklist

### Phase 1: Database ✅
- [ ] Create Supabase/Neon account
- [ ] Create new PostgreSQL database
- [ ] Copy connection string
- [ ] Run migrations from local
- [ ] Verify all tables exist
- [ ] Test connection

### Phase 2: Backend API ✅
- [ ] Create Railway/Render account
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Set environment variables:
  - [ ] `DATABASE_URL`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_REDIRECT_URI`
  - [ ] `FRONTEND_URL`
  - [ ] `NODE_ENV=production`
- [ ] Deploy and get URL
- [ ] Test API endpoints

### Phase 3: Frontend Update ✅
- [ ] Update `NEXT_PUBLIC_API_URL` in Vercel
- [ ] Update `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel
- [ ] Redeploy frontend
- [ ] Test frontend-backend connection

### Phase 4: OAuth Configuration ✅
- [ ] Add backend URL to Google OAuth redirect URIs
- [ ] Add frontend URL to Google OAuth redirect URIs
- [ ] Test OAuth flow end-to-end

### Phase 5: Data Migration ✅
- [ ] Backfill GSC data (if needed)
- [ ] Backfill GA4 data (if needed)
- [ ] Verify data appears in dashboard

---

## 💰 Cost Estimation

### Free Tier (Recommended for Start)

| Service | Platform | Free Tier | Limits |
|---------|----------|-----------|--------|
| **Frontend** | Vercel | ✅ Free | 100GB bandwidth, unlimited deployments |
| **Backend** | Railway | ✅ $5 credit/month | ~500 hours runtime |
| **Database** | Supabase | ✅ Free | 500MB database, 2GB transfer |
| **Total** | - | **$0/month** | Good for development/small projects |

### Paid Tier (When You Scale)

| Service | Platform | Cost | When to Upgrade |
|---------|----------|------|-----------------|
| **Frontend** | Vercel Pro | $20/month | \u003e100GB bandwidth |
| **Backend** | Railway | ~$5-10/month | After free credit |
| **Database** | Supabase Pro | $25/month | \u003e500MB or need backups |
| **Total** | - | **~$50/month** | For production use |

---

## 🚀 Quick Start Guide

### Option A: Full Railway Stack (Easiest)

Deploy everything on Railway:
```bash
1. Database: Railway PostgreSQL
2. Backend: Railway Web Service
3. Frontend: Keep on Vercel
```

**Pros**: Single platform, easy management  
**Cons**: Uses more Railway credits

### Option B: Mixed Stack (Recommended)

Use best platform for each service:
```bash
1. Database: Supabase (free tier)
2. Backend: Railway (free tier)
3. Frontend: Vercel (free tier)
```

**Pros**: Maximize free tiers, better performance  
**Cons**: Multiple platforms to manage

---

## 📖 Detailed Guides

### For Database Setup:
- See: `DEPLOYMENT.md` - Phase 1

### For Backend Deployment:
- See: `DEPLOYMENT.md` - Phase 2

### For Frontend (Already Done):
- See: `VERCEL_PROJECT_SETUP.md`

---

## 🔧 Environment Variables Summary

### Backend API (Railway)
```bash
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-api.railway.app/api/integrations/callback/gsc
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
PORT=3001
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-api.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

### Database (Supabase)
```bash
# No env vars needed - just use connection string
```

---

## ⚠️ Important Notes

### 1. **Frontend is NOT Fully Functional Yet**
Even though frontend is deployed on Vercel, it **won't work** until:
- ✅ Backend API is deployed
- ✅ Database is deployed
- ✅ Environment variables are updated
- ✅ OAuth is configured

### 2. **Current Frontend Status**
```
Frontend deployed ✅
  ↓ API calls
Backend (localhost:3001) ❌ - Will fail!
  ↓
Database (localhost) ❌ - Not accessible!
```

### 3. **After Full Deployment**
```
Frontend (Vercel) ✅
  ↓ API calls
Backend (Railway) ✅
  ↓
Database (Supabase) ✅
```

---

## 🎯 Next Immediate Steps

1. **Read** `DEPLOYMENT.md` for detailed instructions
2. **Choose** your backend platform (Railway recommended)
3. **Choose** your database platform (Supabase recommended)
4. **Follow** Phase 1 (Database) → Phase 2 (Backend) → Phase 3 (Update Frontend)
5. **Test** the complete flow

---

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Deployment Guide**: See `DEPLOYMENT.md` in this repo

---

**Current Status**: Frontend deployed ✅, Backend & Database pending ❌  
**Next Step**: Deploy database (Supabase) → Deploy backend (Railway) → Connect everything  
**Estimated Time**: 30-60 minutes for complete setup
