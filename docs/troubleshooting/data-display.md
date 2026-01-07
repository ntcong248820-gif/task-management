# 🔍 Data Display Issue - Root Cause Analysis

**Date:** December 23, 2025, 23:10  
**Issue:** GSC and GA4 data not displaying on charts and tables  
**Status:** ✅ ROOT CAUSE IDENTIFIED

---

## 📊 Investigation Summary

### What We Found

**Database Status:**
```
📊 Projects: 1 (ID: 27, Name: "Test Project", Domain: NULL → topzone.vn)
📈 GSC Data rows: 0 ❌
📊 GA4 Data rows: 0 ❌
```

**API Status:**
- ✅ All API endpoints working correctly
- ✅ Returns proper JSON structure
- ❌ All metrics = 0 (no data in database)

**Frontend Status:**
- ✅ Charts rendering correctly
- ✅ Tables rendering correctly
- ❌ Displaying zeros because no data exists

---

## 🎯 Root Cause

**The database has NO GSC or GA4 data.**

The 25,000+ GSC rows and 3,600+ GA4 rows mentioned in the project documentation **do not exist in the current database**. This could be because:

1. **Data was never synced** - Integrations were never connected
2. **Database was reset** - Data was cleared at some point
3. **Wrong database** - Connected to a different database instance

---

## ✅ Solution Implemented

### Step 1: Updated Project Domain ✅

```bash
# Ran script to update project domain
npx tsx src/scripts/update-project-domain.ts

# Result:
✅ Updated project 27:
   Name: Test Project
   Domain: topzone.vn
```

### Step 2: Next Actions Required

**You need to:**

1. **Connect Google Search Console**
   - Go to http://localhost:3002/dashboard/integrations
   - Click "Connect Google Search Console"
   - Authorize with your Google account (ntcong.248820@gmail.com)
   - Select property: sc-domain:topzone.vn

2. **Connect Google Analytics 4**
   - Click "Connect Google Analytics 4"
   - Authorize with your Google account
   - Select property: 289356816 (or your GA4 property ID)

3. **Run Manual Sync**
   - After connecting, click "Sync Now" for both GSC and GA4
   - Wait for sync to complete (may take 1-2 minutes)

4. **Verify Data**
   - Go to http://localhost:3002/dashboard/analytics
   - Check if charts now show data
   - Verify metrics are no longer zero

---

## 🔧 Scripts Created

### 1. check-database-data.ts
**Purpose:** Check if GSC and GA4 data exists in database

```bash
cd apps/api
npx tsx src/scripts/check-database-data.ts
```

**Output:**
- Lists all projects
- Shows GSC data count and sample
- Shows GA4 data count and sample
- Groups data by project ID

### 2. update-project-domain.ts
**Purpose:** Update project domain (required for integrations)

```bash
cd apps/api
npx tsx src/scripts/update-project-domain.ts
```

**What it does:**
- Updates project ID 27 with domain "topzone.vn"
- Required for GSC and GA4 to know which property to sync

---

## 📋 Verification Checklist

After connecting integrations and syncing:

- [ ] GSC integration shows "Connected" status
- [ ] GA4 integration shows "Connected" status
- [ ] Run check-database-data.ts script - should show rows > 0
- [ ] Analytics dashboard shows non-zero metrics
- [ ] Charts display actual data (not flat lines)
- [ ] Tables have data rows
- [ ] Rankings dashboard shows keywords
- [ ] URLs dashboard shows pages

---

## 🚨 Important Notes

### Why Charts Were Empty

The system was working **exactly as designed**:
- ✅ API correctly queried database
- ✅ Found no data (because database is empty)
- ✅ Returned zeros
- ✅ Frontend displayed zeros correctly

**This is NOT a bug** - it's the expected behavior when no data exists.

### Cron Jobs

The daily sync cron jobs (2:00 AM for GSC, 2:30 AM for GA4) will only run if:
1. Integrations are connected
2. OAuth tokens are valid
3. Project has a domain set

After you connect the integrations, data will sync automatically every day.

---

## 🎯 Expected Results After Fix

Once you connect GSC and GA4 and run manual sync:

**GSC Data:**
- ~25,000 rows (90 days of data)
- Clicks, Impressions, CTR, Position metrics
- Daily breakdown for charts
- Page and query level data

**GA4 Data:**
- ~3,600 rows (90 days of data)
- Sessions, Users, Conversions, Revenue metrics
- Daily breakdown for charts
- Traffic source breakdown

**Dashboards:**
- Analytics: All metrics showing real numbers
- Rankings: Keyword position tracking
- URLs: Page performance data
- Correlation: Task impact visualization

---

## 📝 Technical Details

### Database Schema
```sql
-- GSC Data Table
gsc_data (
  id, project_id, date, site_url,
  clicks, impressions, ctr, position,
  page, query
)

-- GA4 Data Table
ga4_data (
  id, project_id, date, property_id,
  sessions, users, conversions, revenue,
  source, medium
)
```

### API Endpoints
```
GET /api/analytics/gsc?projectId=27&startDate=2025-11-01&endDate=2025-12-23
GET /api/analytics/ga4?projectId=27&startDate=2025-11-01&endDate=2025-12-23
```

### Integration Flow
```
1. User clicks "Connect GSC" → OAuth flow
2. User authorizes → Receive tokens
3. Store tokens in oauth_tokens table
4. Manual sync or cron job runs
5. Fetch data from Google APIs
6. Insert into gsc_data/ga4_data tables
7. Frontend queries API → Display data
```

---

## ✅ Status

**Current Status:** Ready for integration connection

**Next Step:** Go to http://localhost:3002/dashboard/integrations and connect GSC + GA4

**ETA to see data:** 2-5 minutes after connecting and syncing

---

**Investigation completed:** December 23, 2025, 23:10  
**Scripts created:** 2 (check-database-data.ts, update-project-domain.ts)  
**Project domain updated:** ✅ topzone.vn  
**Ready for integration:** ✅ YES
