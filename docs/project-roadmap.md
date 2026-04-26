# Project Roadmap

> **Last Updated:** 2026-04-26
> **Overall Progress:** ~96% (MVP deployed, Phase 7 in progress)

## Phase Status

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 1 | Foundation (Kanban, Time Tracking, Task Mgmt) | Done | 100% |
| 2 | GSC + GA4 OAuth Integration | Done | 100% |
| 3 | Analytics Dashboard UI | Done | 100% |
| 4 | Rankings + URL Performance Dashboards | Done | 100% |
| 4b | Frontend Architecture (SWR, Zustand, Error Boundary) | Done | 100% |
| 5 | Correlation Dashboard | Done | 100% |
| 6 | Advanced Features (Keyword Details, AI Diagnosis) | Done | 100% |
| 7 | Testing, Security & Production Hardening | In Progress | ~20% |

## Phase 7 — Current Work

**Goal:** Production-ready with test coverage, security, and stable deployment.

### Week 1 — Testing & Security (Current)
- [x] Configure Vitest for api + web
- [x] Write unit tests for API routes (target: 30+ tests)
- [x] Implement OAuth token encryption (`ENCRYPTION_KEY`)
- [x] Add Zod request validation
- [x] Add rate limiting middleware
- [x] Frontend Architecture refactor (SWR caching, Zustand store, Error Boundary)

### Week 2 — Integration Tests + Performance
- [ ] E2E OAuth flow tests (GSC + GA4)
- [ ] Cron job integration tests
- [ ] DB indexes on `gsc_data`, `ga4_data`, `tasks`
- [ ] Pagination for large lists
- [ ] Query optimization with EXPLAIN ANALYZE

### Week 3 — Docs + Export
- [ ] Swagger/OpenAPI documentation
- [ ] CSV export for analytics data
- [ ] Chart export (PNG)
- [ ] User guide

### Week 4 — Production Verification
- [ ] Sentry error monitoring
- [ ] UptimeRobot for uptime monitoring
- [ ] Verify cron jobs run in production
- [ ] Load testing
- [ ] Final security audit

## Known Issues (as of 2026-04-20)

| Issue | Severity | Status |
|-------|----------|--------|
| Supabase pooler "Tenant not found" on port 6543 | High | Fixed (using direct port 5432) |
| CORS errors blocking Vercel → Render calls | High | Fixed (explicit CORS origin) |
| GSC + GA4 shared redirect URI collision | Medium | Fixed (separate URIs) |
| Dashboard using hardcoded localhost projectId | Medium | Fixed |
| OAuth token not encrypted at rest | Medium | Planned — Phase 7 Week 1 |

## Removed from Scope

- Ahrefs integration
- Backlinks monitoring
- Competitor analysis
- Multi-tenant SaaS features

## Future Considerations (Post-MVP)

- Slack/email notifications for traffic drops
- Custom correlation window per task
- Bulk task import from CSV
- Team collaboration features
