# SEO Impact OS - Tech Stack Documentation

> **Version:** 1.0 (Internal Tool - Optimized)  
> **Last Updated:** December 2024  
> **Target:** Internal use by SEO team (5-10 users)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Tech Stack Overview](#tech-stack-overview)
3. [Architecture Diagram](#architecture-diagram)
4. [Core Technologies](#core-technologies)
5. [API Integrations](#api-integrations)
6. [Database Schema](#database-schema)
7. [Monorepo Structure](#monorepo-structure)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Cost Analysis](#cost-analysis)
10. [Performance Considerations](#performance-considerations)

---

## Executive Summary

### Purpose
**SEO Impact OS** is an internal tool designed to solve the core pain point of SEO professionals:

> **"How do I prove that the tasks I completed actually impacted traffic/ranking growth?"**

### Scope Adjustment
- **Original Plan:** Multi-tenant SaaS for 100+ agencies
- **Updated Plan:** Internal tool for single team (5-10 users)
- **Impact:** 40% less complexity, $90/month cost savings, 3 weeks faster development

### Key Features
1. ✅ **Correlation Dashboard:** Visual correlation between completed tasks and traffic metrics
2. ✅ **Task Management:** Kanban board with integrated time tracking
3. ✅ **Multi-channel Analytics:** GSC + GA4 data in one place
4. ✅ **Keyword Rankings:** Track position changes from GSC data
5. ✅ **URL Performance:** Traffic decline detection and analysis

---

## Tech Stack Overview

### Core Stack

```yaml
Runtime: Node.js (LTS)
Package Manager: Bun 1.x
Frontend: Next.js 15 (App Router)
Backend: Hono (Lightweight edge framework)
Database: PostgreSQL 16
ORM: Drizzle ORM
Monorepo: Turborepo
Auth: None (Internal use - localhost)
```

### Rating Matrix

| Component | Choice | Score | Justification |
|-----------|--------|-------|---------------|
| **Runtime** | Node.js | 10/10 | Mature, stable, huge ecosystem |
| **Package Manager** | Bun | 9/10 | 3x faster than npm, safe for internal use |
| **Frontend** | Next.js | 10/10 | SSR for dashboards, App Router modern |
| **Backend** | Hono | 9/10 | Lightweight, TypeScript-first, fast |
| **Database** | PostgreSQL | 10/10 | Time-series data, JSONB, robust |
| **ORM** | Drizzle | 9/10 | Type-safe, performant, great DX |
| **Monorepo** | Turborepo | 9/10 | Share types across packages |

**Overall:** 9.4/10 - Excellent for internal dashboards

---

## Architecture Diagram

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Dashboard   │  │   Kanban     │  │  Rankings    │ │
│  │   (SSR)      │  │  (Client)    │  │   (SSR)      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │     URLs     │  │ Correlation  │  │  Analytics   │ │
│  │   (SSR)      │  │   (SSR)      │  │   (SSR)      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/Fetch
┌────────────────────────▼────────────────────────────────┐
│                  BACKEND API (Hono)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ /api/tasks   │  │ /api/metrics │  │/api/correlat │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ /api/gsc     │  │ /api/ga4     │  │ /api/export  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ SQL Queries (Drizzle)
┌────────────────────────▼────────────────────────────────┐
│               DATABASE (PostgreSQL)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   projects   │  │    tasks     │  │  gsc_data    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  ga4_data    │  │ integrations │  │  time_logs   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              EXTERNAL APIs (Integrations)                │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  Google GSC  │  │  Google GA4  │                    │
│  │   (Free)     │  │   (Free)     │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   CRON JOBS (Daily)                      │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  Sync GSC    │  │  Sync GA4    │                    │
│  │  (2:00 AM)   │  │  (2:30 AM)   │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌─────────────┐
│ User Action │
│ (Frontend)  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Next.js Server  │ ◄─── SSR for dashboard pages
│   Component     │
└──────┬──────────┘
       │ fetch()
       ▼
┌─────────────────┐
│  Hono API       │
│  /api/metrics   │
└──────┬──────────┘
       │ Drizzle Query
       ▼
┌─────────────────┐
│  PostgreSQL     │
│  (gsc_data)     │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ JSON Response   │
│ to Frontend     │
└─────────────────┘
```

---

## Core Technologies

### 1. Next.js 15 (Frontend)

**Why Next.js?**
- Server-Side Rendering (SSR) for data-heavy dashboards
- App Router for modern routing
- Server Components reduce client JS bundle
- Built-in API routes (not used - we use Hono instead)

**Configuration:**

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  // Proxy API calls to Hono backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

**Key Features Used:**
- ✅ App Router (`app/` directory)
- ✅ Server Components (for data fetching)
- ✅ Client Components (for interactive Kanban)
- ✅ Streaming with Suspense
- ✅ Incremental Static Regeneration (ISR)

---

### 2. Hono (Backend API)

**Why Hono?**
- Lightweight (23KB gzipped)
- TypeScript-first with great DX
- 2-3x faster than Express
- Edge-ready (Cloudflare Workers, Vercel Edge)

**Example Route:**

```typescript
// apps/api/src/routes/metrics.ts
import { Hono } from 'hono';
import { db } from '@repo/db';
import { gscData } from '@repo/db/schema';
import { desc, eq } from 'drizzle-orm';

const app = new Hono();

app.get('/api/metrics', async (c) => {
  const projectId = c.req.query('projectId');
  
  const metrics = await db
    .select({
      date: gscData.date,
      clicks: gscData.clicks,
      impressions: gscData.impressions,
    })
    .from(gscData)
    .where(eq(gscData.projectId, Number(projectId)))
    .orderBy(desc(gscData.date))
    .limit(90);
  
  return c.json(metrics);
});

export default app;
```

**Middleware Stack:**

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

// Routes
import metricsRoutes from './routes/metrics';
import tasksRoutes from './routes/tasks';
import correlationRoutes from './routes/correlation';

app.route('/api', metricsRoutes);
app.route('/api', tasksRoutes);
app.route('/api', correlationRoutes);

export default app;
```

---

### 3. PostgreSQL + Drizzle ORM

**Why PostgreSQL?**
- Time-series data optimization
- JSONB for flexible schema
- Full-text search built-in
- MVCC for concurrent writes
- Array types support

**Why Drizzle?**
- Type-safe queries (autocomplete)
- SQL-like syntax (easy to learn)
- Lightweight (no runtime overhead)
- Great migration tool

**Example Query:**

```typescript
// Type-safe query with joins
const correlationData = await db
  .select({
    date: gscData.date,
    clicks: sql<number>`sum(${gscData.clicks})`.as('total_clicks'),
    tasks: sql<number>`count(distinct ${tasks.id})`.as('tasks_completed'),
  })
  .from(gscData)
  .leftJoin(tasks, 
    and(
      eq(gscData.projectId, tasks.projectId),
      gte(gscData.date, tasks.expectedImpactStart),
      lte(gscData.date, tasks.expectedImpactEnd)
    )
  )
  .where(eq(gscData.projectId, projectId))
  .groupBy(gscData.date)
  .orderBy(gscData.date);
```

---

### 4. Turborepo (Monorepo)

**Why Turborepo?**
- Incremental builds (only rebuild what changed)
- Remote caching (share builds across team)
- Parallel execution
- Task pipelines

**Configuration:**

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "outputs": []
    }
  }
}
```

**Benefits:**

```bash
# Before Turborepo (serial)
cd apps/web && npm run build    # 2min
cd apps/api && npm run build    # 1min
Total: 3min

# After Turborepo (parallel)
turbo run build                 # 2min (parallel)
Total: 2min (33% faster)
```

---

## API Integrations

### Integration Matrix

| API | Purpose | Cost | Quota | Priority | Auth Method |
|-----|---------|------|-------|----------|-------------|
| **Google Search Console** | Clicks, Impressions, CTR, Position | Free | 2,000 queries/day | ✅ Must | OAuth 2.0 |
| **Google Analytics 4** | Sessions, Conversions, Revenue | Free | 10M events/month | ✅ Must | OAuth 2.0 |
| **PageSpeed Insights** | Core Web Vitals, Performance | Free | 25,000 queries/day | ⚠️ Nice | None |
| **OpenAI GPT-4** | AI Insights Generation | ~$5/mo | Pay per token | ⚠️ Future | API Key |

**Total Cost:** $0 (GSC + GA4 are free)

---

### 1. Google Search Console API

**Implementation:**

```typescript
// packages/integrations/src/gsc/client.ts
import { google } from 'googleapis';

export class GSCClient {
  private searchconsole;
  
  constructor(credentials: string) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    auth.setCredentials(JSON.parse(credentials));
    this.searchconsole = google.searchconsole({ 
      version: 'v1', 
      auth 
    });
  }
  
  async fetchData(siteUrl: string, startDate: string, endDate: string) {
    const response = await this.searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 25000,
      },
    });
    
    return response.data.rows?.map(row => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  }
}
```

**OAuth Flow:**

```
1. User clicks "Connect GSC"
   ↓
2. Redirect to Google OAuth consent
   ↓
3. User authorizes app
   ↓
4. Google redirects back with code
   ↓
5. Exchange code for refresh_token
   ↓
6. Store encrypted refresh_token in DB
   ↓
7. Use refresh_token for daily syncs
```

**Cron Job:**

```typescript
// apps/api/src/jobs/sync-gsc.ts
import { CronJob } from 'cron';
import { GSCClient } from '@repo/integrations/gsc';
import { db } from '@repo/db';
import { gscConnections, gscData } from '@repo/db/schema';

export const gscSyncJob = new CronJob('0 2 * * *', async () => {
  console.log('🔄 Starting GSC sync...');
  
  const connections = await db.select().from(gscConnections);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  for (const conn of connections) {
    try {
      const client = new GSCClient(conn.refreshToken);
      const data = await client.fetchData(conn.siteUrl, dateStr, dateStr);
      
      // Insert into database
      await db.insert(gscData).values(
        data.map(row => ({
          projectId: conn.projectId,
          siteUrl: conn.siteUrl,
          date: row.date,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        }))
      );
      
      console.log(`✅ Synced ${conn.siteUrl}: ${data.length} rows`);
    } catch (error) {
      console.error(`❌ Error syncing ${conn.siteUrl}:`, error);
    }
  }
});
```

---

### 2. Google Analytics 4 API

**Implementation:**

```typescript
// packages/integrations/src/ga4/client.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export class GA4Client {
  private analyticsData;
  
  constructor(credentials: string) {
    this.analyticsData = new BetaAnalyticsDataClient({
      credentials: JSON.parse(credentials),
    });
  }
  
  async runReport(
    propertyId: string, 
    startDate: string, 
    endDate: string
  ) {
    const [response] = await this.analyticsData.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'date' },
        { name: 'sessionDefaultChannelGroup' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'conversions' },
        { name: 'totalRevenue' },
      ],
    });
    
    return response.rows?.map(row => ({
      date: row.dimensionValues[0].value,
      channelGroup: row.dimensionValues[1].value,
      sessions: Number(row.metricValues[0].value),
      conversions: Number(row.metricValues[1].value),
      revenue: Number(row.metricValues[2].value),
    }));
  }
}
```

**Key Metrics:**

```typescript
// Available GA4 metrics
const GA4_METRICS = {
  // Traffic
  sessions: 'Total sessions',
  activeUsers: 'Active users (28 days)',
  newUsers: 'New users',
  
  // Engagement
  averageSessionDuration: 'Avg session duration',
  bounceRate: 'Bounce rate',
  engagementRate: 'Engagement rate',
  
  // Conversions
  conversions: 'Total conversions',
  totalRevenue: 'Total revenue',
  
  // Events
  eventCount: 'Total events',
  customEvents: 'Custom event counts',
};
```

---

## Database Schema

### Schema Overview

```
┌─────────────────┐
│    projects     │ (Client projects: Tiki, GearVN, etc)
└────────┬────────┘
         │ 1:N
         │
┌────────▼────────┐
│     tasks       │ (SEO tasks with time tracking)
└────────┬────────┘
         │ 1:N
         │
┌────────▼────────┐
│   time_logs     │ (Time tracking entries)
└─────────────────┘

┌─────────────────┐
│   gsc_data      │ (Google Search Console metrics - with page & query)
└────────┬────────┘
         │
┌────────▼────────┐
│  ga4_data       │ (Google Analytics 4 metrics)
└────────┬────────┘
         │
┌────────▼────────┐
│url_performance_ │ (Period-over-period URL comparisons)
│   snapshots     │ (Traffic decline detection)
└─────────────────┘

┌─────────────────┐
│ external_events │ (Algorithm updates, competitor news)
└─────────────────┘
```

---

### Core Tables

#### 1. Projects

```typescript
// packages/db/schema/projects.ts
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  client: text('client'),
  domain: text('domain'),
  status: text('status').default('active'), // 'active' | 'archived'
  description: text('description'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Example Data:**

```sql
INSERT INTO projects (name, client, domain) VALUES
  ('Tiki.vn SEO', 'Tiki Vietnam', 'tiki.vn'),
  ('GearVN Technical SEO', 'GearVN', 'gearvn.com'),
  ('AVAKids Content Strategy', 'AVAKids', 'avakids.com');
```

---

#### 2. Tasks

```typescript
// packages/db/schema/tasks.ts
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  
  // Task details
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull(), // 'todo' | 'in_progress' | 'done'
  taskType: text('task_type'), // 'technical' | 'content' | 'links'
  priority: text('priority').default('medium'), // 'low' | 'medium' | 'high'
  
  // Assignment
  assignedTo: text('assigned_to'), // "Peter", "Minh" (no FK)
  
  // Time tracking
  timeSpent: integer('time_spent').default(0), // seconds
  estimatedTime: integer('estimated_time'), // seconds
  
  // Impact tracking
  completedAt: timestamp('completed_at'),
  expectedImpactStart: date('expected_impact_start'),
  expectedImpactEnd: date('expected_impact_end'),
  actualImpact: jsonb('actual_impact'), // { traffic_increase: 15%, ranking_improvement: 5 }
  
  // Metadata
  tags: text('tags').array(), // ['schema', 'h1-fix', 'urgent']
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
  statusIdx: index('tasks_status_idx').on(table.status),
  completedAtIdx: index('tasks_completed_at_idx').on(table.completedAt),
}));
```

**Example Data:**

```sql
INSERT INTO tasks (project_id, title, task_type, status, assigned_to) VALUES
  (1, 'Fix broken H1 tags on 127 product pages', 'technical', 'done', 'Peter'),
  (1, 'Create schema markup for reviews', 'technical', 'in_progress', 'Minh'),
  (2, 'Write 5 cornerstone articles on gaming laptops', 'content', 'todo', 'Peter');
```

---

#### 3. Time Logs

```typescript
// packages/db/schema/time-logs.ts
export const timeLogs = pgTable('time_logs', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id')
    .references(() => tasks.id)
    .notNull(),
  
  // Time tracking
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  duration: integer('duration'), // seconds (computed on stop)
  
  // Notes
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  taskIdIdx: index('time_logs_task_id_idx').on(table.taskId),
}));
```

---

### Analytics Tables

#### 4. GSC Data

```typescript
// packages/db/schema/gsc-data.ts
export const gscData = pgTable('gsc_data', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  
  // GSC metrics
  date: date('date').notNull(),
  siteUrl: text('site_url'),
  clicks: integer('clicks').notNull(),
  impressions: integer('impressions').notNull(),
  ctr: real('ctr'),
  position: real('position'),
  
  // URL & Keyword level data (IMPORTANT for drill-down)
  page: text('page'),      // ← URL-level analysis
  query: text('query'),    // ← Keyword-level analysis
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  projectDateIdx: index('gsc_data_project_date_idx').on(
    table.projectId, 
    table.date
  ),
  dateIdx: index('gsc_data_date_idx').on(table.date),
  // NEW: Indexes for URL/Keyword analysis
  projectPageIdx: index('gsc_data_project_page_idx').on(
    table.projectId,
    table.page
  ),
  projectQueryIdx: index('gsc_data_project_query_idx').on(
    table.projectId,
    table.query
  ),
}));
```

**Data Collection Strategy:**

1. **Aggregated data** (no page/query): Daily totals for project overview
2. **Page-level data** (with page dimension): Top 100 pages per day
3. **Query-level data** (with page + query): Top 1000 queries per top page

This approach balances data granularity with GSC API quota limits (2,000 queries/day).

---

#### 5. GA4 Data

```typescript
// packages/db/schema/ga4-data.ts
export const ga4Data = pgTable('ga4_data', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  
  // GA4 metrics
  date: date('date').notNull(),
  propertyId: text('property_id'),
  channelGroup: text('channel_group'), // 'Organic Search', 'Direct', etc
  
  sessions: integer('sessions'),
  activeUsers: integer('active_users'),
  newUsers: integer('new_users'),
  conversions: real('conversions'),
  revenue: real('revenue'),
  engagementRate: real('engagement_rate'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  projectDateChannelIdx: index('ga4_data_project_date_channel_idx').on(
    table.projectId,
    table.date,
    table.channelGroup
  ),
}));
```

---

### Supporting Tables

#### 10. External Events

```typescript
// packages/db/schema/external-events.ts
export const externalEvents = pgTable('external_events', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id),
  
  date: date('date').notNull(),
  eventType: text('event_type').notNull(), // 'algorithm_update' | 'competitor_action' | 'news'
  title: text('title').notNull(),
  description: text('description'),
  source: text('source'), // 'manual' | 'auto'
  
  metadata: jsonb('metadata'), // Flexible data
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  projectDateIdx: index('external_events_project_date_idx').on(
    table.projectId,
    table.date
  ),
}));
```

**Example Data:**

```sql
INSERT INTO external_events (date, event_type, title, source) VALUES
  ('2024-12-01', 'algorithm_update', 'Google Core Update December', 'auto'),
  ('2024-12-05', 'competitor_action', 'Competitor launched new category', 'manual');
```

---

#### 11. URL Performance Snapshots (NEW)

```typescript
// packages/db/schema/url-performance-snapshots.ts
export const urlPerformanceSnapshots = pgTable('url_performance_snapshots', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  
  url: text('url').notNull(),
  snapshotDate: date('snapshot_date').notNull(),
  periodDays: integer('period_days').default(14), // Compare last 14 days
  
  // Current period (last 14 days)
  currentClicks: integer('current_clicks'),
  currentImpressions: integer('current_impressions'),
  currentCTR: real('current_ctr'),
  currentPosition: real('current_position'),
  
  // Previous period (14 days before that)
  previousClicks: integer('previous_clicks'),
  previousImpressions: integer('previous_impressions'),
  previousCTR: real('previous_ctr'),
  previousPosition: real('previous_position'),
  
  // Calculated changes
  clicksChange: real('clicks_change'), // %
  impressionsChange: real('impressions_change'), // %
  ctrChange: real('ctr_change'), // absolute %
  positionChange: real('position_change'), // positions
  
  // Alert flags
  isDecline: boolean('is_decline').default(false),
  declineSeverity: text('decline_severity'), // 'minor' | 'moderate' | 'severe'
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  projectUrlDateIdx: index('url_perf_snap_project_url_date_idx').on(
    table.projectId,
    table.url,
    table.snapshotDate
  ),
  isDeclineIdx: index('url_perf_snap_is_decline_idx').on(
    table.projectId,
    table.isDecline
  ),
}));
```

**Purpose:** Store period-over-period comparisons for traffic decline detection

**Example Data:**

```sql
INSERT INTO url_performance_snapshots (
  project_id, url, snapshot_date, period_days,
  current_clicks, previous_clicks, clicks_change,
  is_decline, decline_severity
) VALUES
  (1, '/gaming-laptop-2023', '2024-12-16', 14, 1234, 2244, -45.0, true, 'severe'),
  (1, '/laptop-buying-guide', '2024-12-16', 14, 3456, 4800, -28.0, true, 'moderate');
```

---

## Monorepo Structure

### Directory Tree

```
seo-impact-os/
├── apps/
│   ├── web/                          # Next.js Frontend
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── page.tsx              # Homepage
│   │   │   ├── (auth)/               # Auth routes (unused for now)
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   └── dashboard/            # Main app
│   │   │       ├── layout.tsx        # Dashboard layout with sidebar
│   │   │       ├── page.tsx          # Overview/correlation chart
│   │   │       ├── tasks/            # Kanban board
│   │   │       │   ├── page.tsx
│   │   │       │   └── components/
│   │   │       │       ├── KanbanBoard.tsx
│   │   │       │       ├── TaskCard.tsx
│   │   │       │       └── TimeTracker.tsx
│   │   │       ├── analytics/        # GSC + GA4 charts
│   │   │       │   └── page.tsx
│   │   │       ├── rankings/         # Ahrefs keyword rankings
│   │   │       │   └── page.tsx
│   │   │       ├── backlinks/        # Ahrefs backlink monitor
│   │   │       │   └── page.tsx
│   │   │       ├── competitors/      # Competitor tracking
│   │   │       │   └── page.tsx
│   │   │       ├── urls/             # NEW: URL Performance Analysis
│   │   │       │   ├── page.tsx      # URL list with decline detection
│   │   │       │   └── [url]/        # URL detail drill-down
│   │   │       │       └── page.tsx
│   │   │       ├── keywords/         # NEW: Keyword Analysis
│   │   │       │   └── [keyword]/    # Keyword detail page
│   │   │       │       └── page.tsx
│   │   │       └── projects/         # Project management
│   │   │           ├── page.tsx
│   │   │           └── [id]/
│   │   │               └── page.tsx
│   │   ├── components/               # Shared components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── ui/                   # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── utils.ts
│   │   │   └── api-client.ts         # Fetch wrapper for Hono API
│   │   ├── public/
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   └── api/                          # Hono Backend
│       ├── src/
│       │   ├── index.ts              # Main entry point
│       │   ├── routes/
│       │   │   ├── tasks.ts          # CRUD tasks
│       │   │   ├── projects.ts       # CRUD projects
│       │   │   ├── metrics.ts        # Get GSC/GA4/Ahrefs data
│       │   │   ├── correlation.ts    # Task-traffic correlation
│       │   │   ├── export.ts         # Export to PDF/CSV
│       │   │   ├── url-analysis.ts   # NEW: URL/Keyword drill-down
│       │   │   └── integrations/
│       │   │       ├── gsc.ts        # GSC OAuth + data fetch
│       │   │       ├── ga4.ts        # GA4 OAuth + data fetch
│       │   │       └── ahrefs.ts     # Ahrefs API calls
│       │   ├── jobs/                 # Cron jobs
│       │   │   ├── sync-gsc.ts
│       │   │   ├── sync-ga4.ts
│       │   │   ├── sync-ahrefs.ts
│       │   │   └── detect-traffic-declines.ts  # NEW: Daily decline detection
│       │   ├── lib/
│       │   │   ├── cache.ts          # In-memory cache
│       │   │   └── utils.ts
│       │   └── types/
│       │       └── api.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── db/                           # Drizzle ORM + Schema
│   │   ├── drizzle.config.ts
│   │   ├── schema/
│   │   │   ├── index.ts              # Export all schemas
│   │   │   ├── projects.ts
│   │   │   ├── tasks.ts
│   │   │   ├── time-logs.ts
│   │   │   ├── gsc-data.ts
│   │   │   ├── ga4-data.ts
│   │   │   ├── ahrefs-site-metrics.ts
│   │   │   ├── ahrefs-keyword-rankings.ts
│   │   │   ├── ahrefs-backlinks.ts
│   │   │   ├── ahrefs-competitors.ts
│   │   │   ├── external-events.ts
│   │   │   └── url-performance-snapshots.ts  # NEW: Traffic decline detection
│   │   ├── queries/                  # NEW: Reusable query functions
│   │   │   ├── url-performance.ts    # URL-level queries
│   │   │   └── traffic-decline.ts    # Decline detection logic
│   │   ├── migrations/               # SQL migrations
│   │   │   ├── 0000_initial.sql
│   │   │   └── meta/
│   │   ├── index.ts                  # Export db instance
│   │   └── package.json
│   │
│   ├── ui/                           # Shared React Components
│   │   ├── components/
│   │   │   ├── charts/               # Recharts components
│   │   │   │   ├── CorrelationChart.tsx
│   │   │   │   ├── KeywordRankingChart.tsx
│   │   │   │   ├── BacklinkChart.tsx
│   │   │   │   └── TrafficSourceChart.tsx
│   │   │   ├── kanban/               # Drag & drop
│   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   └── TaskCard.tsx
│   │   │   └── ui/                   # shadcn/ui
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── dialog.tsx
│   │   │       └── ...
│   │   ├── hooks/                    # Custom hooks
│   │   │   ├── use-toast.ts
│   │   │   └── use-timer.ts
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   └── package.json
│   │
│   ├── types/                        # Shared TypeScript Types
│   │   ├── api.ts                    # API request/response types
│   │   ├── task.ts
│   │   ├── project.ts
│   │   ├── metrics.ts
│   │   └── package.json
│   │
│   └── integrations/                 # API Clients
│       ├── src/
│       │   ├── gsc/
│       │   │   ├── client.ts
│       │   │   └── types.ts
│       │   ├── ga4/
│       │   │   ├── client.ts
│       │   │   └── types.ts
│       │   └── ahrefs/
│       │       ├── client.ts
│       │       ├── rate-limiter.ts
│       │       └── types.ts
│       └── package.json
│
├── package.json                      # Root workspace config
├── turbo.json                        # Turborepo pipeline
├── tsconfig.json                     # Base TypeScript config
├── .gitignore
├── .env.example
├── README.md
└── bun.lockb
```

### Package Dependencies

```json
// Root package.json
{
  "name": "seo-impact-os",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "db:generate": "cd packages/db && drizzle-kit generate",
    "db:migrate": "cd packages/db && drizzle-kit migrate",
    "db:push": "cd packages/db && drizzle-kit push",
    "db:studio": "cd packages/db && drizzle-kit studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

```json
// apps/web/package.json
{
  "name": "@seo-impact-os/web",
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@repo/ui": "workspace:*",
    "@repo/types": "workspace:*",
    "recharts": "^2.10.0",
    "@dnd-kit/core": "^6.1.0",
    "zustand": "^4.4.0",
    "lucide-react": "^0.300.0"
  }
}
```

```json
// apps/api/package.json
{
  "name": "@seo-impact-os/api",
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.8.0",
    "@repo/db": "workspace:*",
    "@repo/integrations": "workspace:*",
    "@repo/types": "workspace:*",
    "googleapis": "^130.0.0",
    "@google-analytics/data": "^4.3.0",
    "cron": "^3.1.0",
    "node-cache": "^5.1.0"
  }
}
```

```json
// packages/db/package.json
{
  "name": "@repo/db",
  "dependencies": {
    "drizzle-orm": "^0.33.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.24.0"
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goals:**
- ✅ Setup monorepo structure
- ✅ Configure database
- ✅ Implement core schemas
- ✅ Basic API routes

**Tasks:**

```bash
# Week 1: Setup
□ Initialize Turborepo monorepo
□ Setup Next.js app (apps/web)
□ Setup Hono API (apps/api)
□ Configure PostgreSQL locally
□ Setup Drizzle ORM + migrations
□ Create base schemas (projects, tasks)
□ Setup shadcn/ui components

# Week 2: Core Features
□ Implement project CRUD API
□ Implement task CRUD API
□ Build basic dashboard layout
□ Create task Kanban board
□ Implement time tracker (Zustand)
□ Test time tracker persistence
```

**Deliverables:**
- Working Kanban board with drag & drop
- Time tracker that persists across page changes
- Basic project/task management

---

### Phase 2: GSC + GA4 Integration (Week 3)

**Goals:**
- ✅ Connect Google Search Console
- ✅ Connect Google Analytics 4
- ✅ Daily data sync

**Tasks:**

```bash
# GSC Integration
□ Setup Google OAuth 2.0 (client ID/secret)
□ Implement OAuth flow (authorize + callback)
□ Create GSCClient class
□ Store encrypted refresh_token
□ Build GSC data sync job (cron)
□ Create gsc_data schema
□ Test manual sync

# GA4 Integration
□ Setup GA4 OAuth 2.0
□ Implement GA4Client class
□ Build GA4 data sync job
□ Create ga4_data schema
□ Test data fetching

# UI
□ Build GSC metrics chart (clicks, impressions)
□ Build GA4 sessions chart
□ Add date range picker
□ Show sync status indicator
```

**Deliverables:**
- GSC data syncing daily
- GA4 data syncing daily
- Dashboard showing traffic trends

---

### Phase 3: Ahrefs Integration (Week 4)

**Goals:**
- ✅ Connect Ahrefs API
- ✅ Sync rankings, backlinks, site metrics
- ✅ Build new dashboards

**Tasks:**

```bash
# Ahrefs Setup
□ Store Ahrefs API key in env
□ Create AhrefsClient class
□ Implement rate limiter
□ Create Ahrefs schemas (4 tables)
□ Build sync job for site metrics
□ Build sync job for keyword rankings
□ Build sync job for backlinks

# UI - Rankings Dashboard
□ Create /dashboard/rankings page
□ Build keyword ranking chart (line chart)
□ Show top gainers/losers table
□ Add keyword filter

# UI - Backlinks Dashboard
□ Create /dashboard/backlinks page
□ Build backlink timeline chart
□ Show new backlinks table (with DR)
□ Add domain filter

# UI - Competitors Dashboard
□ Create /dashboard/competitors page
□ Build share of voice pie chart
□ Show competitor metrics table
```

**Deliverables:**
- Ahrefs data syncing daily
- 3 new dashboards (Rankings, Backlinks, Competitors)
- Full visibility into SEO metrics

---

### Phase 4: Correlation Analysis (Week 5)

**Goals:**
- ✅ Build correlation dashboard
- ✅ Statistical analysis
- ✅ Impact window visualization

**Tasks:**

```bash
# Backend
□ Create correlation API endpoint
□ Implement SQL query joining tasks + gsc_data
□ Calculate task impact windows
□ Add external events to timeline
□ Compute correlation coefficient (optional)

# Frontend
□ Build enhanced correlation chart
  - Traffic line (GSC)
  - Ahrefs traffic line (overlay)
  - Domain Rating line (secondary axis)
  - Task markers (with impact windows)
  - External events markers
□ Implement hover tooltips
□ Add toggle filters (show/hide layers)
□ Export chart as PNG

# Analysis Features
□ Top 10 most impactful tasks
□ Correlation strength indicator
□ Traffic attribution by task type
```

**Deliverables:**
- Visual correlation between tasks and traffic
- Data-driven insights on task effectiveness

---

### Phase 5: URL & Keyword Analysis (Week 6) **NEW**

**Goals:**
- ✅ URL-level performance tracking
- ✅ Keyword drill-down analysis
- ✅ Traffic decline detection
- ✅ Automated alerts

**Tasks:**

```bash
# Database
□ Create url_performance_snapshots table
□ Add indexes to gsc_data (page, query)
□ Create queries/url-performance.ts
□ Create queries/traffic-decline.ts

# Backend API
□ Build URL analysis API routes
  - /api/url-analysis/list (all URLs)
  - /api/url-analysis/:url (detail)
  - /api/url-analysis/declining (alerts)
  - /api/url-analysis/detect-declines (run analysis)
□ Update GSC sync to fetch page/query dimensions
□ Create decline detection cron job (runs at 4 AM)

# Frontend
□ Build URL Performance dashboard
  - URL list table with metrics
  - Declining URLs section (with severity)
  - Period-over-period comparison
□ Create URL detail page (drill-down)
  - Traffic trend chart
  - Keywords table for this URL
  - Period comparison metrics
  - AI diagnosis section (optional)
□ Create Keyword detail page
  - Position history chart
  - Performance metrics
  - SERP competitors table
□ Add URL/Keywords links to sidebar navigation

# Testing
□ Test with real GSC data (page + query dimensions)
□ Verify decline detection accuracy
□ Test URL drill-down flow
```

**Deliverables:**
- Complete URL-level analysis dashboard
- Automatic traffic decline detection
- Keyword performance tracking
- Period-over-period comparison (14 days default)

---

### Phase 6: Polish & Testing (Week 7)

**Goals:**
- ✅ Bug fixes
- ✅ Performance optimization
- ✅ Export features
- ✅ Documentation

**Tasks:**

```bash
# Bug Fixes
□ Test all CRUD operations
□ Fix timer edge cases
□ Handle API errors gracefully
□ Add loading states
□ Add empty states

# Performance
□ Implement caching (node-cache)
□ Optimize SQL queries (EXPLAIN ANALYZE)
□ Add database indexes
□ Lazy load charts
□ Code splitting (Next.js dynamic imports)

# Export Features
□ Export correlation chart to PNG
□ Export tasks to CSV
□ Export metrics to CSV
□ Generate PDF report (optional)

# Documentation
□ Write README.md
□ Document API endpoints
□ Write setup guide
□ Create demo video
```

**Deliverables:**
- Production-ready internal tool
- Complete documentation
- Demo ready for team

---

### Timeline Summary

```
Week 1-2: Foundation (Monorepo + Core Features)
Week 3:   GSC + GA4 Integration
Week 4:   Ahrefs Integration
Week 5:   Correlation Analysis
Week 6:   URL & Keyword Analysis (NEW)
Week 7:   Polish & Testing

Total: 7 weeks (was 6 weeks before URL analysis features)
Additional time: 1 week for URL/Keyword drill-down capabilities
```

---

## Cost Analysis

### Development Cost

**Time Investment:**

| Phase | Duration | Effort (hours/week) | Total Hours |
|-------|----------|---------------------|-------------|
| Foundation | 2 weeks | 20 hours | 40 hours |
| GSC + GA4 | 1 week | 20 hours | 20 hours |
| Ahrefs | 1 week | 20 hours | 20 hours |
| Correlation | 1 week | 15 hours | 15 hours |
| Polish | 1 week | 15 hours | 15 hours |
| **TOTAL** | **6 weeks** | | **110 hours** |

**At $50/hour:** $5,500 development cost (one-time)

---

### Infrastructure Cost

#### Before (SaaS Multi-tenant)

| Service | Purpose | Monthly Cost |
|---------|---------|--------------|
| Vercel Pro | Hosting | $20 |
| Neon Scale | Database | $20 |
| Clerk | Authentication | $25 |
| CloudFlare CDN | Static assets | $10 |
| Sentry | Error monitoring | $15 |
| **TOTAL** | | **$90/month** |

#### After (Internal Tool)

| Service | Purpose | Monthly Cost |
|---------|---------|--------------|
| Localhost | Hosting | **$0** |
| PostgreSQL (local) | Database | **$0** |
| Auth | None needed | **$0** |
| CDN | None needed | **$0** |
| Monitoring | Console logs | **$0** |
| **TOTAL** | | **$0/month** |

**Savings:** $90/month = **$1,080/year**

---

### API Cost

| API | Monthly Cost | Quota | Notes |
|-----|--------------|-------|-------|
| Google Search Console | $0 | 2,000 queries/day | Free tier |
| Google Analytics 4 | $0 | 10M events/month | Free tier |
| Ahrefs | $199 | 10,000 rows/month | Already paid |
| **TOTAL** | **$0 incremental** | | Ahrefs cost already sunk |

**No incremental API costs!**

---

### Total Cost of Ownership (1 Year)

```
Development: $5,500 (one-time)
Infrastructure: $0/month × 12 = $0
APIs: $0/month × 12 = $0

Total Year 1: $5,500
Total Year 2+: $0/year

ROI: Time saved from manual reporting >> $5,500
```

**Payback Period:** ~2-3 months (assuming 20 hours/month saved on reporting)

---

## Performance Considerations

### Internal Tool Optimizations

**Simplified Requirements:**

| Concern | SaaS (100+ users) | Internal (10 users) | Impact |
|---------|-------------------|---------------------|--------|
| **Concurrent Users** | 100+ | 10 max | ✅ No load balancing needed |
| **Database Connections** | Connection pooling | 5 connections | ✅ Simple config |
| **Caching** | Redis cluster | In-memory (node-cache) | ✅ No Redis needed |
| **Rate Limiting** | Per-user quotas | Global limit | ✅ Simple implementation |
| **CDN** | CloudFlare | Localhost | ✅ No CDN needed |
| **Authentication** | OAuth + JWT | None | ✅ No auth overhead |

---

### Caching Strategy

```typescript
// Simple in-memory cache for internal use
import NodeCache from 'node-cache';

const cache = new NodeCache({ 
  stdTTL: 600, // 10 minutes
  checkperiod: 120, // Check for expired keys every 2min
});

// Example: Cache GSC metrics
app.get('/api/metrics/gsc', async (c) => {
  const projectId = c.req.query('projectId');
  const cacheKey = `gsc_metrics_${projectId}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }
  
  // Fetch from database
  const metrics = await db
    .select()
    .from(gscData)
    .where(eq(gscData.projectId, Number(projectId)))
    .orderBy(desc(gscData.date))
    .limit(90);
  
  // Cache for 10 minutes
  cache.set(cacheKey, metrics);
  
  return c.json(metrics);
});
```

---

### Database Optimization

**Indexes:**

```sql
-- Core indexes for fast queries
CREATE INDEX idx_gsc_data_project_date ON gsc_data(project_id, date DESC);
CREATE INDEX idx_ga4_data_project_date ON ga4_data(project_id, date DESC);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_time_logs_task_id ON time_logs(task_id);

-- Ahrefs indexes
CREATE INDEX idx_ahrefs_site_metrics_project_date 
  ON ahrefs_site_metrics(project_id, date DESC);
CREATE INDEX idx_ahrefs_keyword_rankings_project_keyword_date 
  ON ahrefs_keyword_rankings(project_id, keyword, date DESC);
```

**Query Optimization:**

```typescript
// Bad: N+1 query
for (const task of tasks) {
  const timeLogs = await db
    .select()
    .from(timeLogs)
    .where(eq(timeLogs.taskId, task.id));
  task.timeLogs = timeLogs;
}

// Good: Single query with join
const tasksWithLogs = await db
  .select()
  .from(tasks)
  .leftJoin(timeLogs, eq(tasks.id, timeLogs.taskId))
  .where(eq(tasks.projectId, projectId));
```

---

### Frontend Performance

**Code Splitting:**

```typescript
// Lazy load heavy charts
import dynamic from 'next/dynamic';

const CorrelationChart = dynamic(
  () => import('@repo/ui/components/charts/CorrelationChart'),
  { 
    ssr: false, // Don't SSR charts (they're interactive)
    loading: () => <ChartSkeleton />,
  }
);
```

**Virtual Scrolling:**

```typescript
// For large task lists (100+ tasks)
import { useVirtualizer } from '@tanstack/react-virtual';

function TaskList({ tasks }) {
  const parentRef = React.useRef();
  
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Task card height
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <TaskCard key={virtualRow.index} task={tasks[virtualRow.index]} />
        ))}
      </div>
    </div>
  );
}
```

---

## Appendix

### A. Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/seo_impact_os"

# Google APIs
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Ahrefs
AHREFS_API_KEY="your-ahrefs-api-key"

# Optional: OpenAI (for AI insights)
OPENAI_API_KEY="sk-..."

# Server
API_PORT=3001
WEB_PORT=3002
NODE_ENV=development
```

---

### B. Scripts

```json
// package.json scripts
{
  "scripts": {
    // Development
    "dev": "turbo run dev",
    "dev:web": "cd apps/web && bun run dev",
    "dev:api": "cd apps/api && bun run dev",
    
    // Build
    "build": "turbo run build",
    "build:web": "cd apps/web && bun run build",
    "build:api": "cd apps/api && bun run build",
    
    // Database
    "db:generate": "cd packages/db && drizzle-kit generate",
    "db:migrate": "cd packages/db && drizzle-kit migrate",
    "db:push": "cd packages/db && drizzle-kit push",
    "db:studio": "cd packages/db && drizzle-kit studio",
    "db:seed": "cd packages/db && bun run seed.ts",
    
    // Cron Jobs
    "jobs:sync": "cd apps/api && bun run src/jobs/index.ts",
    
    // Type Checking
    "type-check": "turbo run type-check",
    
    // Linting
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint -- --fix"
  }
}
```

---

### C. Backup Script

```bash
#!/bin/bash
# backup.sh

# Configuration
DB_NAME="seo_impact_os"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "✅ Backup completed: $BACKUP_FILE.gz"
```

**Setup cron:**

```bash
# Run backup daily at 1 AM
crontab -e

# Add this line:
0 1 * * * /path/to/seo-impact-os/backup.sh
```

---

### D. Deployment (Optional Future)

**If you want to deploy to a server later:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: seo_impact_os
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/seo_impact_os
      AHREFS_API_KEY: ${AHREFS_API_KEY}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
  
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

**Deploy:**

```bash
docker-compose up -d
```

---

## Conclusion

### Summary

**SEO Impact OS** is a highly optimized internal tool built with:
- ✅ Modern tech stack (Next.js + Hono + PostgreSQL + Drizzle)
- ✅ Zero infrastructure cost (localhost deployment)
- ✅ Comprehensive SEO data (GSC + GA4 + Ahrefs)
- ✅ Visual correlation analysis (tasks → traffic impact)
- ✅ 6-week development timeline

**Key Differentiators:**
1. **Correlation Dashboard:** Unique visual linking of tasks to traffic changes
2. **Time Tracking Integration:** Built into Kanban board (not separate tool)
3. **Multi-source Analytics:** GSC + GA4 + Ahrefs in one dashboard
4. **Zero Auth Overhead:** Simplified for internal use

**Next Steps:**
1. Review this tech stack document
2. Generate database schema files (Drizzle)
3. Start Phase 1 implementation
4. Regular check-ins during development

---

**Questions?** Contact: [Your Contact Info]

**Version History:**
- v1.0 (Dec 2024): Initial tech stack for internal tool
