# Project Overview — SEO Impact OS (PDR)

> Product Definition & Requirements

## Problem Statement

SEO professionals struggle to prove that completed tasks caused traffic/ranking improvements. There's no tool that correlates task completion dates with GSC/GA4 metric changes.

## Solution

Internal SEO platform that:
1. Manages SEO tasks via Kanban board with time tracking
2. Syncs Google Search Console + GA4 data daily
3. Visualizes correlation between task completion and metric changes
4. Provides AI-based recommendations for declining keywords

## Target Users

Internal SEO team — 5–10 users. Single-tenant, no multi-tenancy required.

## Core Features

| Feature | Status | Notes |
|---------|--------|-------|
| Kanban board (To Do / In Progress / Done) | Done | @dnd-kit drag & drop |
| Time tracking (start/pause/stop) | Done | Zustand + localStorage |
| Multi-project support | Done | Project selector in header |
| GSC OAuth + daily sync | Done | 25K+ rows synced |
| GA4 OAuth + daily sync | Done | 3.6K+ rows synced |
| Correlation dashboard | Done | Traffic + task impact windows |
| Analytics dashboard (GSC + GA4) | Done | Date range filters |
| Rankings dashboard | Done | Keyword position tracking |
| URL Performance dashboard | Done | Declining URLs detection |
| Keyword Details page | Done | Position history + SERP |
| AI Diagnosis (rule-based) | Done | Recovery task creation |
| Token encryption | Planned | Phase 7 |
| Rate limiting | Planned | Phase 7 |
| Test coverage ≥ 80% | Planned | Phase 7 |

## Non-Goals (Removed from Scope)

- Ahrefs integration
- Backlinks monitoring
- Competitor analysis
- Multi-tenant SaaS

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 18, Tailwind CSS, shadcn/ui, Recharts, @dnd-kit, Zustand
- **Backend:** Hono, Node.js, node-cron
- **Database:** PostgreSQL 16, Drizzle ORM
- **Monorepo:** Turborepo, npm workspaces
- **Deployment:** Vercel (web), Render (api), PostgreSQL (hosted)

## Success Metrics

- Daily sync runs without failure
- Correlation chart loads in < 2s
- OAuth connect flow completes without errors
- All Kanban operations persist correctly
