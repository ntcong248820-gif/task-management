# SEO Impact OS - Deployment Guide

## Overview

This guide will help you deploy your SEO Impact OS to production with:
- **Database**: Supabase (PostgreSQL)
- **Backend API**: Railway
- **Frontend**: Vercel
- **Cron Jobs**: Railway Cron (for daily sync)

---

## Phase 1: Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: `seo-impact-os`
   - **Database Password**: (generate strong password - SAVE THIS!)
   - **Region**: Choose closest to you
5. Click **"Create new project"**
6. Wait ~2 minutes for provisioning

### Step 2: Get Database Connection String

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **"URI"** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual password
6. **SAVE THIS** - you'll need it for deployment

### Step 3: Run Migrations

On your local machine:

```bash
# Update .env with Supabase connection string
echo "DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres" > packages/db/.env

# Run migrations
cd packages/db
npm run db:migrate

# Verify tables created
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres" -c "\dt"
```

You should see all tables: `projects`, `gsc_data`, `gsc_data_aggregated`, etc.

---

## Phase 2: Backend Deployment (Railway)

### Step 1: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up / Log in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Connect your GitHub account
6. Select your repository
7. Railway will auto-detect and deploy

### Step 2: Configure Environment Variables

In Railway dashboard:

1. Go to your project → **Variables** tab
2. Add these variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-api-url.railway.app/api/integrations/callback/gsc

# App Config
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
```

3. Click **"Deploy"**

### Step 3: Get Railway URL

1. After deployment, go to **Settings** → **Domains**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://your-api.railway.app`)
4. **SAVE THIS** - you'll need it for frontend

---

## Phase 3: Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up / Log in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: Leave empty (monorepo)
   - **Build Command**: `cd apps/web && npm run build`

6. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-api.railway.app
   ```

7. Click **"Deploy"**

### Step 2: Update OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://your-api.railway.app/api/integrations/callback/gsc
   https://your-api.railway.app/api/integrations/callback/ga4
   https://your-app.vercel.app/dashboard/integrations
   ```
5. Click **"Save"**

---

## Phase 4: Initial Data Backfill

After deployment, backfill historical data:

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"

# Backfill aggregated data (90 days)
npm run backfill-gsc-agg -- 31 2025-09-24 2025-12-24
npm run backfill-gsc-agg -- 32 2025-09-24 2025-12-24
npm run backfill-gsc-agg -- 33 2025-09-24 2025-12-24

# Backfill granular data (90 days, 1 day chunks)
npm run backfill-gsc -- 31 2025-09-24 2025-12-24 --chunk-days=1
npm run backfill-gsc -- 32 2025-09-24 2025-12-24 --chunk-days=1
npm run backfill-gsc -- 33 2025-09-24 2025-12-24 --chunk-days=1
```

**Note**: This will take ~2-3 hours. Run in background:
```bash
nohup bash -c "npm run backfill-gsc -- 31 2025-09-24 2025-12-24 --chunk-days=1" > backfill.log 2>&1 &
```

---

## Next Steps

1. ✅ Deploy database (Supabase)
2. ✅ Deploy backend (Railway)
3. ✅ Deploy frontend (Vercel)
4. ✅ Backfill historical data
5. 🔄 Monitor usage
6. 📊 Enjoy your production SEO dashboard!

**Happy deploying!** 🚀
