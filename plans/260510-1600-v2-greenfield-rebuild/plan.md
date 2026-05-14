---
title: "SEO Impact OS — v2.0 Greenfield Rebuild"
description: "Redesign app từ single-user Kanban+Dashboard thành SEO Operating System: multi-user, proactive analytics intelligence, advanced task management"
status: in-progress
priority: P0
effort: ~80h
branch: main
tags: [v2, greenfield, refactor, auth, multi-user, analytics, task-management]
created: 2026-05-10
research:
  - plans/260510-0002-correlation-annotation-fix/reports/researcher-260510-1600-seo-analytics-platforms.md
  - plans/reports/researcher-260510-1600-task-management-systems.md
supersedes:
  - plans/260510-0002-correlation-annotation-fix (cancelled — scope superseded)
  - plans/260509-2212-analytics-metrics-accuracy-fix (cancelled — schema reset)
---

# SEO Impact OS v2.0 — Master Plan

## Vision

Từ một **Kanban board + passive dashboards** → một **SEO Operating System** chủ động:

> *"Công cụ duy nhất giúp team SEO không chỉ biết website đang như thế nào, mà biết phải làm gì tiếp theo và liệu những gì họ đã làm có thật sự có hiệu quả không."*

## Core Pillars

### 1. Proactive Analytics Intelligence
Không phải dashboard thụ động — app phải **chủ động thông báo** khi có sự thay đổi quan trọng.
- Cross-source anomaly alerts (GSC + GA4 kết hợp)
- Content decay detection (trang đang mất impressions)
- Scheduled digests (email/in-app weekly, monthly)
- Rule-based recommendations ("Trang này CTR thấp bất thường, nên optimize title")
- Deep-dive analytics (per URL, per keyword, segment comparison)

### 2. Advanced Task Management
Không chỉ là Kanban — là hệ thống quản lý công việc có mục tiêu.
- Multi-view: Board (Kanban), Timeline (Gantt), Table (Spreadsheet), Calendar
- Goal hierarchy: Workspace Goal → Sprint/Campaign → Task
- Recurring task templates (weekly audits, monthly reviews)
- Team workload visualization
- Task-to-metric linking (annotations trên analytics chart)

### 3. Multi-User / Team
Hiện tại single-user, không có auth. V2 cần workspace + team.
- Better Auth (email/password + Google OAuth)
- Workspace concept (team chia sẻ cùng data)
- Roles: Owner, Admin, Member, Viewer
- Invite system (email-based)
- Team reporting: workload, progress, standup summaries

## What We Keep (from v1)

| Component | Keep | Reason |
|-----------|------|--------|
| Turborepo + Next.js + Hono monorepo | ✅ | Infrastructure solid |
| Drizzle ORM + PostgreSQL | ✅ | Schema redesign, same ORM |
| GSC OAuth flow logic | ✅ | Restructure for multi-user |
| GA4 OAuth flow logic | ✅ | Restructure for multi-user |
| GSC/GA4 sync jobs (cron) | ✅ | Keep, adapt to new schema |
| Token encryption (AES-256-GCM) | ✅ | Security stays |
| Rate limiting middleware | ✅ | Keep |
| GitHub Actions cron infrastructure | ✅ | Keep |

## What We Reset (from v1)

| Component | Reset | Reason |
|-----------|-------|--------|
| All frontend pages | ✅ | Full UI redesign |
| Task/Project schema | ✅ | Rebuild for multi-user + goals |
| API route structure | ✅ | Redesign around new data model |
| Single-user assumptions | ✅ | Replace with workspace/auth |
| Correlation dashboard | ✅ | Rebuild as part of Analytics v2 |
| Time-logs schema | ✅ | Integrate into task v2 |

## Phases

| # | Phase | Key Deliverables | Effort | Status | Review |
|---|-------|-----------------|--------|--------|--------|
| 01 | [Auth + Workspace Foundation](./phase-01-auth-workspace.md) | Better Auth, workspace, roles, invite, middleware.ts | ~8h | ✅ Complete (implemented 2026-05-13) | ✅ Reviewed — `reports/better-auth-260510-1952-phase-01-review.md`; validation passed 2026-05-13 |
| 02 | [Data Schema Redesign](./phase-02-schema-redesign.md) | New DB schema: workspace, users, goals, tasks v2, GSC/GA4 adapted | ~8h | ✅ Complete (implemented 2026-05-14) | ✅ Reviewed — `reports/databases-260510-2117-phase-02-schema-review.md`; validation passed 2026-05-14 |
| 03 | [UI Shell Redesign](./phase-03-ui-shell.md) | New nav, layout, workspace selector, sidebar, mobile responsive | ~7-8h | pending | ✅ Reviewed — `reports/ui-ux-review-260510-2154-phase-03-ui-shell.md` (effort ~6h→~7-8h) |
| 04 | [Task Management v2](./phase-04-task-management-v2.md) | Multi-view (Board/Timeline/Table/Calendar via ?view= param), recurring templates, workload | ~20h | pending | ✅ Reviewed — `reports/review-260511-1941-phase-04-05-feasibility.md` (security fix, pagination, CSS Grid, timer design confirmed) |
| 05 | [Goals & Sprint Management](./phase-05-goals-sprints.md) | Goal hierarchy, sprint planning, goal-task linking | ~10h | pending | ✅ Reviewed — `reports/review-260511-1941-phase-04-05-feasibility.md` (project-scoped goals, standalone sprints OK, batch progress query) |
| 06 | [Analytics Intelligence](./phase-06-analytics-intelligence.md) | Anomaly alerts, content decay, scheduled digests, recommendations | ~16h | pending | ✅ Reviewed — 2026-05-11 (stddev guard, set-based SQL decay, alert polling) |
| 07 | [Analytics Dashboards v2](./phase-07-analytics-dashboards-v2.md) | Deep-dive per URL/keyword, correlation v2, cross-source insights | ~14h | pending | ✅ Reviewed — `reports/brainstorm-260511-2029-phase-06-07-review.md` |

> **Final Feasibility Review: 2026-05-11** — `/ck:predict` (CAUTION→GO) + `/ck:scenario` (34 edge cases, 5 Critical fixed).
> Estimated effort revised: ~83h → ~89-92h. All Critical items applied. Plan READY TO IMPLEMENT.

## Feature Proposals with Reasoning

### REMOVE from v1
| Feature | Reason to Remove |
|---------|-----------------|
| Basic Kanban (simple board only) | Replace với multi-view system |
| "Recent High-Impact Tasks" với Math.random() | Rebuild hoàn toàn trong Analytics v2 |
| Current Correlation Dashboard | Rebuild với real impact calc + URL filter |
| Analytics Dashboard (surface-level) | Rebuild với deep-dive capability |
| Rankings page (basic top 5) | Rebuild với full keyword management |
| URL Performance (basic) | Integrate vào Analytics Intelligence |
| AI Diagnosis (rule-based, deprecated UX) | Replace với Recommendations engine |

### NEW features in v2
| Feature | Pillar | Priority |
|---------|--------|----------|
| Multi-user auth + workspace | Multi-user | P0 |
| Invite system + roles | Multi-user | P0 |
| Board + Timeline + Table + Calendar views | Task Mgmt | P1 |
| Goal hierarchy (Goal → Sprint → Task) | Task Mgmt | P1 |
| Recurring task templates | Task Mgmt | P1 |
| Cross-source anomaly alerts | Analytics | P1 |
| Content decay detection | Analytics | P1 |
| Weekly/monthly digest (in-app) | Analytics | P2 |
| Deep-dive per URL analytics | Analytics | P1 |
| Deep-dive per keyword analytics | Analytics | P1 |
| Real before/after impact calculation | Analytics | P1 |
| Team workload visualization | Task Mgmt | P2 |
| Rule-based SEO recommendations | Analytics | P2 |
| Async standup / team reporting | Multi-user | P2 |

## Dependencies

- Phase 01 → All others (auth + middleware.ts required)
- Phase 02 → All others (schema + shared types required)
- Phase 03 → 04, 05, 06, 07 (UI shell required; consumes Phase 01 auth-client + Phase 02 types)
- Phase 04 → 05 (task system before goal linking)
- Phase 05 → 06, 07 (goal linking feeds analytics)
- Phase 06 → 07 (intelligence feeds dashboards)

**Key cross-phase contracts:**
- Phase 01 delivers: `auth-client.ts` (`useSession()`), `middleware.ts`, auth schema types
- Phase 02 delivers: `packages/types/` exports (`Project`, `Task`, `Alert`, etc.) used by Phase 03 stores
- Phase 03 delivers: `use-alert-store` shape (stub) — Phase 06 implements `fetchAlerts()` real logic
- Phase 03 delivers: tasks route `?view=` pattern — Phase 04 builds view components (not pages)

## Cross-Plan Actions

Plans bị supersede bởi v2 rebuild — đánh dấu cancelled:
- `260510-0002-correlation-annotation-fix` → cancelled (scope rebuild trong Phase 07)
- `260509-2212-analytics-metrics-accuracy-fix` → cancelled (schema reset trong Phase 02)
- `260426-1337-infra-restructuring` → review Phase 01, phần infra vẫn applicable
