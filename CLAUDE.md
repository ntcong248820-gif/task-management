# CLAUDE.md — SEO Impact OS

> AI coding assistant instructions for this project.

## Project Overview

**SEO Impact OS** — Internal SEO task management + analytics platform.
Correlates SEO tasks with Google Search Console & GA4 traffic/ranking changes.

- **Stack:** Next.js 15, Hono, PostgreSQL, Drizzle ORM, Turborepo
- **Docs:** `./docs/` — read before implementing anything
- **Plans:** `./plans/` — implementation plans & agent reports

## Key Files to Read First

1. `./docs/system-architecture.md` — monorepo layout, service boundaries
2. `./docs/code-standards.md` — naming, structure, coding rules
3. `./docs/codebase-summary.md` — quick map of all modules
4. `./docs/project-roadmap.md` — current status and next steps

## Dev Commands

```bash
npm run dev          # Start all services (API :3001, Web :3002)
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run type-check   # TypeScript check
npm run test         # Run all tests
npm run db:push      # Push schema changes to DB
npm run db:studio    # Open Drizzle Studio
```

## Workspace Structure

```
apps/api/     → Dev-only thin wrapper (port 3001, imports from packages/api-app)
apps/web/     → Next.js 15 + Hono API in Vercel (port 3002)
packages/api-app/ → Shared Hono application (imported by web + api)
packages/db/  → Drizzle ORM schema + migrations
packages/types/ → Shared TypeScript types
```

## Coding Rules

- Follow YAGNI, KISS, DRY — no over-engineering
- Keep files under 200 LOC; split into modules if needed
- Use kebab-case for all file names
- No mock/fake data — implement real functionality
- Handle errors with try/catch at boundaries
- No `console.log` in production code
- Run lint + type-check before committing

## Environment Variables

| File | Purpose |
|------|---------|
| `.env` | Root DB URL |
| `apps/api/.env` | API secrets, Google OAuth, encryption key |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` |

## Google OAuth

Two separate OAuth flows — GSC and GA4 use **different redirect URIs**:
- GSC: `/api/integrations/gsc/callback`
- GA4: `/api/integrations/ga4/callback`

## Production Deployment

| Service | Platform | Status |
|---------|----------|--------|
| Frontend + API | Vercel (Next.js + Hono via `[[...route]]`) | Deployed |
| Database | PostgreSQL | Deployed |
| Cron | GitHub Actions (`.github/workflows/cron-sync.yml`) | Active |

See `./docs/deployment-guide.md` for full deployment steps.
