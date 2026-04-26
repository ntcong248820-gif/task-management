---
title: "Full-Stack Review & Optimization"
description: "Comprehensive review and optimization of backend, frontend, database, and architecture"
status: pending
priority: P1
effort: 16h
branch: main
tags: [backend, frontend, database, architecture, optimization, security]
created: 2026-04-25
---

# Full-Stack Review & Optimization

## Overview

Full codebase review covering backend (Hono), frontend (Next.js 15), database (PostgreSQL/Drizzle), and architecture (monorepo). 15 security issues already documented in `bug-fix-security-hardening` plan (Phase 1). This plan covers deeper architectural optimizations on top.

## Research

- [Backend & Database Analysis](./research/researcher-01-backend-database.md)
- [Frontend & Architecture Analysis](./research/researcher-02-frontend-architecture.md)
- [Security Bug Fix Plan](../260421-2324-bug-fix-security-hardening/plan.md) ← do this first

## Phases

| # | Phase | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | [Security & Critical Fixes](../260421-2324-bug-fix-security-hardening/plan.md) | P0 | 4h | ✅ Done |
| 2 | [Backend Optimization](./phase-02-backend-optimization.md) | P1 | 4h | ✅ Done |
| 3 | [Database Optimization](./phase-03-database-optimization.md) | P1 | 2h | ✅ Done |
| 4 | [Frontend Architecture](./phase-04-frontend-architecture.md) | P1 | 4h | 🔲 Todo |
| 5 | [Type Safety & Code Quality](./phase-05-type-safety-code-quality.md) | P2 | 2h | 🔲 Todo |

## Execution Order

```
Phase 1 (Security)  →  Phase 3 (DB)  →  Phase 2 (Backend)  →  Phase 4 (Frontend)  →  Phase 5 (Quality)
```

Phase 3 before Phase 2 because backend optimization depends on DB schema changes (lastSyncedAt, indexes).

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data fetching library | SWR | Simpler than TanStack Query; sufficient for 5-10 user internal tool |
| API contract | Shared types in `packages/types` | No code gen needed at this scale |
| Validation | Zod via `@hono/zod-validator` | Official Hono integration, type-safe |
| Token encryption | AES-256-GCM (Node.js crypto) | No extra deps, production standard |
| Pagination | **Skipped** | App has 5-10 users, data volume low; defer until needed |
| Project store | Centralized Zustand store | Fix root cause of projectId=1 bug across all pages |
| DB status constraint | Add check constraint | Clean data integrity; audit existing rows first |
| interface-visual/ | Archive to assets/designs/ | Keep for reference, declutter repo root |

## Validation Log

### Session 1 — 2026-04-25
**Trigger:** Initial plan validation before implementation
**Questions asked:** 7

#### Questions & Answers

1. **[Priority]** Plan có 5 nhóm việc, nên bắt đầu từ đâu trước?
   - Options: Security trước | Backend+DB song song | Frontend trước
   - **Answer:** Security trước (Recommended)
   - **Rationale:** Confirms execution order: Phase 1 → 3 → 2 → 4 → 5. Security is non-negotiable first.

2. **[Architecture]** Có muốn thêm SWR cho caching không?
   - Options: Có, thêm SWR | Giữ fetch thủ công
   - **Answer:** Có, thêm SWR (Recommended)
   - **Rationale:** Phase 4 proceeds with SWR adoption for all data hooks.

3. **[Scope]** Có muốn thêm pagination cho GET /api/tasks không?
   - Options: Làm ngay | Bỏ qua lúc này
   - **Answer:** Bỏ qua lúc này
   - **Rationale:** Remove pagination tasks from Phase 2 scope. App has 5-10 users, current volume manageable.

4. **[Architecture]** Có muốn tạo project store tập trung không?
   - Options: Có, tạo store tập trung | Chỉ fix hardcode ID=1
   - **Answer:** Có, tạo store tập trung (Recommended)
   - **Rationale:** Phase 4 creates `use-project-store.ts` as full Zustand store with persist.

5. **[Risk]** Có muốn thêm DB check constraint cho status/taskType không?
   - Options: Thêm ràng buộc | Giữ text tự do
   - **Answer:** Thêm ràng buộc (Recommended)
   - **Rationale:** Phase 3 adds constraints; must audit existing data before `db:push`.

6. **[Scope]** interface-visual/ folder xử lý thế nào?
   - Options: Archive vào assets/designs/ | Xóa luôn | Giữ nguyên
   - **Answer:** Archive vào assets/designs/ (Recommended)
   - **Rationale:** Add to Phase 3 or standalone task: move directory, update .gitignore.

7. **[Architecture]** Shared types (packages/types) — mức độ ưu tiên?
   - Options: Làm luôn trong Phase 5 | Làm sau / backlog
   - **Answer:** Làm luôn trong Phase 5 (Recommended)
   - **Rationale:** Phase 5 proceeds with full shared types consolidation.

#### Confirmed Decisions
- Execution order: Security → DB → Backend → Frontend → Quality
- SWR: adopted in Phase 4
- Pagination: deferred (out of scope)
- Project store: full Zustand store (not just fix hardcode)
- DB constraints: add for status + taskType, with pre-migration data audit
- interface-visual/: archive to assets/designs/
- Shared types: done in Phase 5

#### Action Items
- [ ] Remove pagination tasks from Phase 2 todo list
- [ ] Add data audit step before DB constraints in Phase 3
- [ ] Add interface-visual/ archiving task to Phase 3

#### Impact on Phases
- Phase 2: Remove pagination implementation (GET /api/tasks pagination skipped)
- Phase 3: Add step — audit existing task status values before applying check constraint; add interface-visual/ move task
- Phase 4: Confirmed — full `use-project-store.ts` + SWR for all hooks
