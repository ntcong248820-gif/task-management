# SEO Impact OS - Master Project Plan

> **Last Updated:** 2025-12-23 22:30  
> **Current Phase:** Phase 6 Complete - Ready for Phase 7  
> **Overall Progress:** ~95% Complete (MVP Ready)  
> **Note:** Ahrefs, Backlinks, Competitors removed from scope

---

## 📊 **Project Overview**

**Goal:** Build a comprehensive SEO task management and analytics platform that correlates SEO tasks with traffic/ranking changes.

**Tech Stack:**
- Frontend: Next.js 15, React, TailwindCSS, shadcn/ui
- Backend: Hono API
- Database: PostgreSQL + Drizzle ORM
- Integrations: Google Search Console, Google Analytics 4, Ahrefs
- Runtime: Node.js (switched from Bun)

---

## ✅ **Phase 1: Foundation** (COMPLETED)

### **1.1 Monorepo Setup**
- [x] Setup Turborepo structure
- [x] Init Next.js 15 app (`apps/web`)
- [x] Init Hono API (`apps/api`)
- [x] Setup workspace configuration
- [x] Create root package.json

### **1.2 Database Setup**
- [x] Setup PostgreSQL local database
- [x] Install Drizzle ORM + drizzle-kit
- [x] Create schema: `projects.ts`
- [x] Create schema: `tasks.ts`
- [x] Create schema: `time_logs.ts`
- [x] Run first migration

### **1.3 UI Foundation**
- [x] Setup shadcn/ui components
- [x] Create base UI components (Button, Card, Dialog)
- [x] Create Dashboard layout with Sidebar
- [x] Create Header component with project selector
- [x] Setup TailwindCSS with custom colors

### **1.4 Core API**
- [x] Create Hono API routes: `/api/projects` (CRUD)
- [x] Create Hono API routes: `/api/tasks` (CRUD)
- [x] Create Hono API routes: `/api/time-logs` (CRUD)
- [x] Test API endpoints
- [x] Connect Next.js frontend with Hono backend

### **1.5 Kanban Board**
- [x] Build Kanban Board layout (3 columns)
- [x] Install `@dnd-kit/core` for drag & drop
- [x] Implement drag & drop logic
- [x] Create TaskCard component with timer button

### **1.6 Time Tracker**
- [x] Setup Zustand store for timer state
- [x] Implement Start/Pause/Stop timer logic
- [x] Persist timer state with localStorage
- [x] Create Sidebar Timer Widget
- [x] Test timer persist across page changes
- [x] Implement POST `/api/time-logs` on stop

### **1.7 Task Management**
- [x] Build Edit Task Dialog (reusable)
- [x] Add task filtering (by project, status, search)
- [x] Create TaskFilters component
- [x] Implement useTaskForm hook

### **1.8 Polish & Testing**
- [x] Test full Kanban flow
- [x] Add loading states (KanbanBoardSkeleton)
- [x] Add empty states (EmptyState component)
- [x] Code review Phase 1
- [x] Write README.md

**Phase 1 Status:** ✅ **100% Complete**

---

## 🔄 **Phase 2: GSC + GA4 Integration** (IN PROGRESS)

### **2.1 Google Cloud Setup**
- [x] Setup Google Cloud Project
- [x] Enable Search Console API
- [x] Enable Analytics Data API (GA4)
- [x] Create OAuth 2.0 credentials
- [x] Add redirect URIs
- [x] Create setup documentation

### **2.2 OAuth Flow Implementation**
- [x] Create OAuth configuration types
- [x] Implement OAuth token storage schema (`oauth_tokens`, `gsc_sites`, `ga4_properties`)
- [x] Create OAuth callback handlers (GSC + GA4)
- [x] Create authorization URL generator
- [x] Test OAuth flow end-to-end
- [x] Add token refresh logic ✅ (`apps/api/src/utils/token-refresh.ts`)
- [ ] Implement token encryption 🔐 (deferred to Phase 7)

### **2.3 Frontend Integration UI**
- [x] Create `/dashboard/integrations` page
- [x] Add connect buttons for GSC/GA4
- [x] Implement OAuth callback handling
- [x] Add connection status display
- [x] Add disconnect functionality
- [x] Show last sync timestamp
- [x] Show connected account email

### **2.4 GSC Data Fetching** ✅
- [x] Setup Google Search Console API client
- [x] Create types for GSC data
- [x] Create database schema: `gsc_data.ts` (page & query columns)
- [x] Implement search analytics fetcher (clicks, impressions, CTR, position)
- [x] Create sync endpoint: `POST /api/integrations/gsc/sync`
- [x] Test manual GSC sync (✅ 25,000 rows synced from topzone.vn)
- [ ] Add URL inspection methods
- [ ] Create sitemap utilities
- [x] Create cron job: `sync-gsc.ts` ✅ (2:00 AM daily)

**Status:** ✅ **Complete** - Sync endpoint tested successfully with real data

**Phase 2 Status:** 🟢 **~90% Complete** (OAuth + UI + GSC data done, GA4 data + cron pending)

### **2.5 GA4 Data Fetching** ✅
- [x] Setup GA4 API client
- [x] Create types for GA4 data
- [x] Create database schema: `ga4_data.ts` (sessions, users, conversions, revenue)
- [x] Implement analytics data fetcher (sessions, conversions, engagement)
- [x] Create sync endpoint: `POST /api/integrations/ga4/sync`
- [x] Fix OAuth scopes (added `userinfo.email` + `openid`)
- [x] OAuth flow working ✅ (connected as ntcong.248820@gmail.com)
- [x] **Test manual GA4 sync** ✅ (3,635 rows synced from property 289356816)
- [ ] Add custom metrics support
- [x] Create cron job: `sync-ga4.ts` ✅ (2:30 AM daily)
- [ ] Add dimension queries
- [ ] Create report builders

**Status:** 🟢 **Complete** - OAuth, sync, token refresh all working

**Phase 2 Status:** 🟢 **~98% Complete** - Ready for Phase 3

---

## 📈 **Phase 3: Analytics Dashboard UI** (COMPLETED)

### **3.1 GSC Dashboard** ✅
- [x] Install Recharts library
- [x] Create `/dashboard/analytics` page
- [x] Build GSC metrics cards (Clicks, Impressions, CTR, Position)
- [x] Show percentage changes vs previous period
- [x] Build GSC traffic chart (Area Chart)
- [x] Add date range (last 30 days default)
- [x] Implement date filter logic

### **3.2 GA4 Dashboard** ✅
- [x] Build GA4 metrics cards (Sessions, Users, Conversions, Revenue)
- [x] Build GA4 chart (Line Chart: Sessions vs Conversions)
- [x] Build Traffic Sources table

### **3.3 Polish** ✅
- [x] Add loading skeletons for charts
- [x] Add error handling for API failures
- [x] Test with real GSC + GA4 data

**Verified Metrics (2025-12-21):**
- GSC: 271K clicks, 2M impressions, 47% CTR, position 3.0
- GA4: 2.7M sessions, 2.2M users, 123K conversions

> ✅ **Correlation Dashboard completed in Phase 3.5** with:
> - Layer Controls (GSC/Ahrefs/DR toggles)
> - ReferenceArea impact windows
> - Task markers linked to chart

**Phase 3 Status:** ✅ **100% Complete** (including Phase 3.5)

---

## ✅ **Phase 4: Complete UI Screens** (COMPLETED)

> **Note:** Backlinks and Competitors features removed from scope (no data source after Ahrefs removal).

### **4.1 Rankings Dashboard** ✅
- [x] Create `/dashboard/rankings` page
- [x] Build Top Movers section (queries with biggest position gains/losses from GSC)
- [x] Build keyword ranking chart (from GSC queries)
- [x] Build All Keywords table with search & filter
- [x] Build Position Distribution chart

### **4.2 URL Performance Dashboard** ✅
- [x] Create `/dashboard/urls` page
- [x] Build Declining URLs section (severity badges: -10%, -25%, -40%)
- [x] Build All URLs table with search & filters
- [x] Build URL detail view with traffic history

**Phase 4 Status:** ✅ **100% Complete**

---

## ✅ **Phase 5: Correlation Dashboard** (COMPLETED)

> ✅ **COMPLETED AS PHASE 3.5** (2025-12-21)
> Implemented Correlation Dashboard with Layer Controls, ReferenceArea Impact Windows, KPI Cards.
> All items below were completed or are no longer needed (Ahrefs removed).

### **5.1 Correlation Data Model** ✅
- [x] Create correlation API endpoint: `/api/correlation`
- [x] Calculate task impact windows (7-28 days after completion)
- [~] Create schema: `external_events.ts` (deferred - optional)

### **5.2 Correlation Chart** ✅
- [x] Build Correlation Chart component
- [x] Implement multi-layer rendering (GSC + Tasks)
- [x] Implement task markers with shaded impact windows
- [x] Build hover tooltip with task details

### **5.3 Filters & Analysis** ✅
- [x] Add toggle filters (show/hide layers)
- [x] Add date range selector
- [x] Build Recent High-Impact Tasks section

**Phase 5 Status:** ✅ **100% Complete**

---

### **6.5 AI Diagnosis** ✅
- [x] Build AI Diagnosis section (rule-based)
- [x] Detect content freshness issues
- [x] Add "Create Recovery Task" quick action

### **6.6 Keyword Detail Page** ✅
- [x] Create `/dashboard/keywords/[keyword]/page.tsx`
- [x] Build position history chart
- [x] Build SERP Competitors table (shown ranking pages instead)

**Phase 6 Status:** ✅ **100% Complete** (Core + Advanced features done)

---

### **7.4 Export Features**
- [ ] Build Export to CSV feature (tasks, metrics)
- [ ] Build Export Chart to PNG feature
- [ ] Build PDF report generation (optional)

### **7.5 Documentation**
- [ ] Write comprehensive README.md
- [ ] Document API endpoints
- [ ] Write setup guide (PostgreSQL, Node.js, env vars)
- [ ] Create demo video or screenshots
- [ ] Write user guide
- [ ] Document cron jobs setup

### **7.6 Final Deployment**
- [ ] Fix remaining bugs
- [ ] Final code review
- [ ] Deploy to localhost
- [ ] Demo to team 🎉

**Phase 7 Status:** ⚪ **0% Complete**

---

## 📝 **Overall Assessment**

### **✅ Strengths:**
1. **Solid Foundation** - Phase 1 well-executed with modular architecture
2. **OAuth Working** - Phase 2 OAuth flow tested and functional
3. **Good Documentation** - Comprehensive setup guides and walkthroughs
4. **Realistic Scope** - Phases are well-defined and achievable

### **⚠️ Concerns:**
1. **Ambitious Timeline** - Original timeline (18/12/2024 - 11/03/2025) may be tight
2. **API Quota Limits** - Need to carefully manage GSC, GA4, Ahrefs quotas
3. **Correlation Complexity** - Phase 5 correlation analysis is technically challenging
4. **Token Encryption Pending** - Security should be addressed before production

### **💡 Recommendations:**
1. **Focus on MVP** - Complete Phases 2-3 first (GSC/GA4 data + basic dashboard)
2. **Defer Advanced Features** - Phases 5-6 (Correlation, AI Diagnosis) can be v2.0
3. **Prioritize Security** - Add token encryption before moving to Phase 3
4. **Test Incrementally** - Don't wait until Phase 7 to test

---

## 🎯 **Next Immediate Steps**

### **Priority 1: Complete Phase 2 Data Fetching**
1. Create `gsc_data.ts` schema
2. Implement GSC data fetch logic
3. Create `ga4_data.ts` schema
4. Implement GA4 data fetch logic
5. Test manual sync

### **Priority 2: Build Basic Analytics Dashboard (Phase 3)**
1. Install Recharts
2. Create `/dashboard/analytics` page
3. Build GSC metrics cards
4. Build GA4 metrics cards
5. Test with real data

### **Priority 3: Security & Polish**
1. Implement token encryption
2. Add token refresh logic
3. Add disconnect functionality
4. Improve error handling

---

## 📊 **Progress Summary** (Updated 2025-12-22)

| Phase | Status | Progress | Priority |
|-------|--------|----------|----------|
| Phase 1: Foundation | ✅ Complete | 100% | - |
| Phase 2: GSC + GA4 Integration | ✅ Complete | 98% | - |
| Phase 3: Analytics Dashboard | ✅ Complete | 100% | - |
| Phase 4: UI Screens (Rankings/URLs) | ✅ Complete | 100% | - |
| Phase 5: Correlation Dashboard | ✅ Complete | 100% | - |
| Phase 6: Advanced Features | ✅ Complete | 100% | - |
| Phase 7: Task Intelligence | ⚪ Not Started | 0% | **NEXT FOCUS** |
| Phase 8: Polish & Optimization | ⚪ Not Started | 0% | - |

**Overall Project Progress:** ~95% Complete (MVP Ready) -> Moving to Advanced (v2.0)

### 🎯 **Next Steps Options:**

**Option A: Production Ready (Recommended)**
1. Phase 7.1: Testing - Add more unit tests for API utils
2. Phase 7.3: Performance - Add database indexes
3. Deploy to Vercel/Railway

**Option B: Feature Enhancement**
1. Phase 6.4: Dedicated URL detail page (`/dashboard/urls/[url]`)
2. Phase 6.6: Keyword detail page (`/dashboard/keywords/[keyword]`)
3. Phase 6.5: AI Diagnosis (rule-based recommendations)

---

## ✅ **MVP Features Complete:**

- ✅ Task Management (Kanban + Timer)
- ✅ GSC Integration (real data sync)
- ✅ GA4 Integration (real data sync)
- ✅ Correlation Dashboard (tasks vs traffic)
- ✅ Rankings Dashboard (keywords from GSC)
- ✅ URL Performance Dashboard (pages from GSC)
- ✅ Analytics Dashboard (GSC + GA4 combined)
