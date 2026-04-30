# SEO Impact OS

> Comprehensive SEO task management and analytics platform that correlates SEO tasks with traffic and ranking changes.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=flat&logo=hono&logoColor=white)

---

## 🎯 Project Status

**Current Phase:** Phase 7 - Testing, Performance & Production Deployment  
**Overall Progress:** 95% Complete (MVP Ready)  
**Last Updated:** December 23, 2025

### ✅ Completed Phases (1-6)
- ✅ Phase 1: Foundation (Kanban, Time Tracking, Task Management)
- ✅ Phase 2: Google Search Console & GA4 Integration
- ✅ Phase 3: Analytics Dashboard UI
- ✅ Phase 4: Rankings & URL Performance Dashboards
- ✅ Phase 5: Correlation Dashboard
- ✅ Phase 6: Advanced Features (Keyword Details, AI Diagnosis)

### 🚀 Current Phase: Phase 7
**Focus:** Production readiness, testing, security, and deployment

📚 **Phase 7 Documentation:**
- [Implementation Plan](./docs/phase7/implementation-plan.md) - Complete 4-week roadmap
- [Quick Start Guide](./docs/phase7/quick-start.md) - Get started immediately
- [Testing Setup](./docs/phase7/testing-setup.md) - Comprehensive testing guide
- [Security Guide](./docs/phase7/security-guide.md) - Security hardening steps

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Development](#-development)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Phase 7 Next Steps](#-phase-7-next-steps)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 📊 Analytics & Integrations
- ✅ **Google Search Console Integration** - OAuth 2.0 flow, automated daily sync
- ✅ **Google Analytics 4 Integration** - Sessions, users, conversions, revenue tracking
- ✅ **Real Data Sync** - 25,000+ GSC rows, 3,600+ GA4 rows synced
- ✅ **Automated Cron Jobs** - Daily sync at 2:00 AM (GSC) and 2:30 AM (GA4)

### 📈 Dashboards
- ✅ **Correlation Dashboard** - Visualize task impact on traffic with shaded impact windows
- ✅ **Analytics Dashboard** - GSC + GA4 metrics with date range filtering
- ✅ **Rankings Dashboard** - Keyword position tracking, top movers, position distribution
- ✅ **URL Performance** - Declining URLs detection, traffic history
- ✅ **Keyword Details** - Position history, SERP competitors, AI diagnosis

### 🎯 Task Management
- ✅ **Kanban Board** - Drag & drop tasks between columns (To Do, In Progress, Done)
- ✅ **Time Tracking** - Start/pause/resume/stop timer with persistence
- ✅ **Task Correlation** - Link tasks to traffic changes with impact windows (7-28 days)
- ✅ **Project Management** - Multi-project support with filtering

### 🤖 AI Features
- ✅ **AI Diagnosis** - Rule-based recommendations for declining keywords
- ✅ **Content Freshness Detection** - Identify outdated content
- ✅ **Quick Actions** - Create recovery tasks from recommendations

### 📊 Data Visualization
- ✅ **Recharts Integration** - Area charts, line charts, bar charts
- ✅ **Multi-layer Charts** - Toggle GSC/GA4/Tasks layers
- ✅ **Interactive Tooltips** - Detailed metrics on hover
- ✅ **Date Range Filters** - 7D, 30D, 90D views

---

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (Radix UI primitives)
- **Charts:** Recharts
- **Drag & Drop:** @dnd-kit
- **State Management:** Zustand
- **Date Handling:** date-fns

### Backend
- **Framework:** Hono (lightweight web framework)
- **Runtime:** Node.js (switched from Bun for compatibility)
- **Database:** PostgreSQL 16
- **ORM:** Drizzle ORM
- **Cron Jobs:** node-cron

### Integrations
- **Google Search Console API** - Search analytics data
- **Google Analytics 4 API** - Traffic and conversion data
- **OAuth 2.0** - Google authentication flow

### Monorepo
- **Build System:** Turborepo
- **Package Manager:** npm
- **Workspaces:** apps/api, apps/web, packages/db, packages/types

---

## 📦 Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **PostgreSQL** >= 14
- **Google Cloud Project** (for GSC & GA4 integration)

---

## 🚀 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd task-management
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup PostgreSQL Database
```bash
# Create database
createdb task_management

# Or using psql
psql postgres
CREATE DATABASE task_management;
\q
```

### 4. Configure Environment Variables

**Root `.env`:**
```bash
DATABASE_URL="postgresql://localhost:5432/task_management"
```

**Backend (`apps/api/.env`):**
```bash
DATABASE_URL="postgresql://localhost:5432/task_management"
API_PORT=3001
NODE_ENV=development

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3002/dashboard/integrations"

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY="your-64-character-hex-string"
```

**Frontend (`apps/web/.env.local`):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Setup Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Google Search Console API
   - Google Analytics Data API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3002/dashboard/integrations`
5. Copy Client ID and Client Secret to `.env`

### 6. Run Database Migrations
```bash
npm run db:push
```

### 7. (Optional) Open Database Studio
```bash
npm run db:studio
```

---

## 💻 Development

### Start All Services
```bash
npm run dev
```

This starts:
- **Web + API (Hono mounted in Next.js):** http://localhost:3002
- **Dev API wrapper (optional):** http://localhost:3001

> **Note:** The Hono API runs inside Next.js in production (`/api/*`). `apps/api` is a dev-only thin wrapper — you do not need to start it separately.

### Access the Application
- **App:** http://localhost:3002
- **API:** http://localhost:3002/api
- **Database Studio:** Run `npm run db:studio` (opens on http://localhost:4983)

---

## 📁 Project Structure

```
seo-impact-os/
├── apps/
│   ├── api/                        # Dev-only thin wrapper (port 3001)
│   │   └── src/index.ts            # Imports packages/api-app and serves it
│   └── web/                        # Next.js 15 + Hono (Vercel, port 3002)
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/[[...route]]/ # Hono catch-all (production API)
│       │   │   └── dashboard/        # Dashboard pages
│       │   ├── components/           # React components
│       │   ├── hooks/                # Custom hooks
│       │   └── stores/               # Zustand stores
│       └── package.json
├── packages/
│   ├── api-app/                    # Shared Hono app (imported by web + api)
│   │   └── src/
│   │       ├── routes/             # API routes
│   │       ├── jobs/               # Cron jobs (sync-gsc, sync-ga4)
│   │       └── utils/              # Utilities
│   ├── db/                         # Drizzle ORM schema + migrations
│   └── types/                      # Shared TypeScript types
├── docs/                           # Project documentation
├── plans/                          # Implementation plans + agent reports
└── README.md
```

---

## 🔌 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Tasks
- `GET /api/tasks` - List all tasks (with filters)
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Time Logs
- `GET /api/time-logs` - List time logs
- `POST /api/time-logs` - Create time log
- `DELETE /api/time-logs/:id` - Delete time log

#### Analytics
- `GET /api/analytics` - Get GSC + GA4 combined metrics
  - Query params: `projectId`, `startDate`, `endDate`

#### Correlation
- `GET /api/correlation` - Get task-traffic correlation data
  - Query params: `projectId`, `startDate`, `endDate`

#### Rankings
- `GET /api/rankings` - Get keyword rankings from GSC
  - Query params: `projectId`, `startDate`, `endDate`

#### URLs
- `GET /api/urls` - Get URL performance from GSC
  - Query params: `projectId`, `startDate`, `endDate`

#### Keywords
- `GET /api/keywords/:keyword` - Get keyword details
  - Query params: `projectId`

#### Diagnosis
- `GET /api/diagnosis/:keyword` - Get AI diagnosis for keyword
  - Query params: `projectId`

#### Integrations
- `GET /api/integrations/gsc/auth` - Start GSC OAuth flow
- `GET /api/integrations/gsc/callback` - GSC OAuth callback
- `POST /api/integrations/gsc/sync` - Manual GSC sync
- `GET /api/integrations/ga4/auth` - Start GA4 OAuth flow
- `GET /api/integrations/ga4/callback` - GA4 OAuth callback
- `POST /api/integrations/ga4/sync` - Manual GA4 sync

---

## 🚀 Phase 7 Next Steps

### Week 1: Testing & Security (Current)
1. **Setup Testing Infrastructure**
   - Install dependencies: `cd apps/api && npm install --save-dev supertest @types/supertest`
   - Create vitest configs
   - Write first tests

2. **Implement Security**
   - Generate encryption key
   - Encrypt OAuth tokens
   - Add rate limiting
   - Implement request validation

📚 **See detailed guides:**
- [Quick Start](./PHASE7_QUICK_START.md) - Start here!
- [Testing Setup](./PHASE7_WEEK1_TESTING_SETUP.md)
- [Security Guide](./PHASE7_SECURITY_GUIDE.md)

### Week 2: Integration Tests & Performance
- Write integration tests for OAuth flows
- Add database indexes
- Implement pagination
- Optimize queries

### Week 3: Documentation & Export
- Complete API documentation (Swagger)
- Write user guides
- Implement CSV export
- Add chart export

### Week 4: Deployment
- Deploy to Vercel/Railway
- Setup monitoring (Sentry, UptimeRobot)
- Configure cron jobs
- Production verification

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL
pg_isready

# Restart PostgreSQL
brew services restart postgresql  # macOS
sudo systemctl restart postgresql # Linux
```

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

### OAuth Issues
```bash
# Check environment variables
cd apps/api
cat .env | grep GOOGLE

# Verify redirect URI matches Google Cloud Console
# Should be: http://localhost:3002/dashboard/integrations
```

### Cron Jobs Not Running
```bash
# Check cron job logs
cd apps/api
npm run dev

# Look for "Cron jobs initialized" message
# GSC sync: 2:00 AM daily
# GA4 sync: 2:30 AM daily
```

### Test Failures
```bash
# Clear test cache
rm -rf apps/api/coverage apps/web/coverage

# Run tests with verbose output
cd apps/api
npm run test -- --reporter=verbose
```

---

## 📝 Scripts

```bash
# Development
npm run dev          # Start all services (API + Web)
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run type-check   # TypeScript type checking
npm run test         # Run all tests

# Database
npm run db:generate  # Generate migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio

# Testing
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage report

# API (from apps/api)
cd apps/api
npm run dev          # Start API server
npm run build        # Build API
npm run test         # Run API tests

# Web (from apps/web)
cd apps/web
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run frontend tests
```

---

## 📚 Additional Documentation

📂 **[Full Documentation](./docs/README.md)** - All documentation organized by category

- [Master Project Plan](./docs/project/master-plan.md) - Complete project overview
- [Tech Stack Details](./docs/project/tech-stack.md) - Detailed technology documentation
- [Visual Features](./docs/project/visual-features.md) - UI/UX documentation
- [Deployment Guide](./docs/deployment/overview.md) - Deployment instructions
- [Troubleshooting](./docs/troubleshooting/) - Common issues and fixes

---

## 🎯 Current Status

**Phase 7 is ready to begin!** 🚀

The application is 95% complete with all core features working:
- ✅ Task management with Kanban board
- ✅ Google Search Console integration (25K+ rows synced)
- ✅ Google Analytics 4 integration (3.6K+ rows synced)
- ✅ Correlation dashboard with task impact visualization
- ✅ Rankings, URLs, and Keyword dashboards
- ✅ AI diagnosis and recommendations

**Next steps:** Follow the [Phase 7 Quick Start Guide](./docs/phase7/quick-start.md) to prepare for production deployment.

---

**Built with ❤️ for SEO professionals**  
**Last Updated:** January 6, 2026

