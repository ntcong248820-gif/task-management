# Project Roadmap

> **Last Updated:** 2026-05-01
> **Overall Progress:** ~97% (MVP deployed, Phase 7 continued, Database migration to new Supabase project complete, GitHub Actions cron verified working)

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

### Week 1 — Testing & Security (Complete)
- [x] Configure Vitest for api + web
- [x] Write unit tests for API routes (target: 30+ tests)
- [x] Implement OAuth token encryption (`ENCRYPTION_KEY`)
- [x] Add Zod request validation
- [x] Add rate limiting middleware
- [x] Frontend Architecture refactor (SWR caching, Zustand store, Error Boundary)

### Session 2026-05-01 — Database Migration & Infrastructure
- [x] Migrate to new Supabase project (old project unrecoverable)
- [x] Update Database URL with new pooler connection (port 6543)
- [x] Set up GitHub Actions secrets (`CRON_SECRET`) and variables (`APP_URL`)
- [x] Verify GSC + GA4 cron endpoints return 200
- [x] Verify OAuth callbacks work in production
- [x] Update API URL config fallback (now empty string for same-origin in production)
- [x] Resolve `last_synced_at` schema discrepancy (manual ALTER TABLE)

### Week 2 — Integration Tests + Performance
- [ ] E2E OAuth flow tests (GSC + GA4)
- [ ] Cron job integration tests (verify synced count + error details in response)
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

## Known Issues (as of 2026-05-01)

| Issue | Severity | Status |
|-------|----------|--------|
| Old Supabase project (jtdeuxvwcwtqzjndhrlg) paused 304+ days | High | Resolved — migrated to new project (hipvuijrwcmdoeirtswf) |
| CORS errors blocking Vercel → Render calls | High | Fixed (explicit CORS origin) |
| GSC + GA4 shared redirect URI collision | Medium | Fixed (separate URIs) |
| Dashboard using hardcoded localhost projectId | Medium | Fixed |
| OAuth token not encrypted at rest | Medium | Fixed — Phase 7 Week 1 |
| `last_synced_at` column missing from schema migration | Medium | Fixed — manual ALTER TABLE (now in schema) |

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
