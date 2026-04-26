# Code Standards

## Principles

- **YAGNI** — don't build what isn't needed
- **KISS** — simplest solution that works
- **DRY** — no duplicated logic
- **File limit** — max 200 LOC per file; split into modules beyond that

## File Naming

- **kebab-case** for all JS/TS files: `task-card.tsx`, `sync-gsc.ts`
- **PascalCase** for React components only (the component name, not filename)
- Long descriptive names are preferred over short cryptic ones

## Directory Conventions

```
apps/api/src/
  index.ts        # Local dev server only (imports @repo/api-app)

apps/web/src/
  app/
    api/[[...route]]/route.ts  # Hono handler for /api/* routes
    dashboard/    # Next.js App Router pages
  components/
    ui/           # shadcn/ui base components
    forms/        # Form components
    layouts/      # Layout components
    features/     # Feature-specific (tasks/, analytics/, etc.)
  hooks/          # Custom React hooks
  stores/         # Zustand stores
  types/          # Frontend-only types

packages/api-app/src/
  app.ts          # Hono application instance (exported to web + api)
  index.ts        # Exports app + sync jobs
  routes/         # Hono route handlers (one file per resource)
  schemas/        # Zod validation schemas
  jobs/           # Cron jobs (sync-gsc.ts, sync-ga4.ts, etc.)
  utils/          # Pure utility functions (crypto, logger, token-refresh)

packages/db/src/schema/  # Drizzle schema (one file per table)
packages/types/          # Shared types between apps
packages/integrations/   # Google OAuth clients + utilities
packages/ui/            # UI component library (shadcn components, custom)
```

## TypeScript

- Strict mode enabled — no `any` unless absolutely necessary
- Prefer `interface` for object shapes, `type` for unions/aliases
- All API responses must be typed via `packages/types`
- Use `OAuth2Client` from `@googleapis/oauth2` for typed Google API clients (GA4Client, GSCClient)
- No unused variables, no unused imports
- Use ES module imports only — no `require()` calls in TypeScript files

## Shared Types

Import canonical types from `packages/types/src/index.ts`:

```typescript
import { ApiResponse, PaginatedResponse, Task, Project } from '@seo/types';
```

Never duplicate domain types in `apps/api/src/types/` or `apps/web/src/types/`.

## React / Next.js (`apps/web`)

- Use App Router (`app/` directory) — no Pages Router
- Server Components by default; add `"use client"` only when needed
- Custom hooks for business logic — no logic in component bodies
- Zustand for global state — no prop drilling
- No `console.log` in production code
- **API Route Handler:** `apps/web/src/app/api/[[...route]]/route.ts` mounts the Hono app with `runtime='nodejs'`
  - All API logic is in `packages/api-app`, not in Next.js route handlers
  - No duplicate validation, auth, or business logic in Next.js

## API (Hono) — `packages/api-app`

The Hono application is centralized in `packages/api-app` and exported to both `apps/web` (production) and `apps/api` (local dev).

**Architecture:**
- Entry point: `packages/api-app/src/app.ts` — instantiates Hono app with basePath `/api`
- Export point: `packages/api-app/src/index.ts` — exports `app` + sync job functions
- Production: Mounted via `apps/web/src/app/api/[[...route]]/route.ts` using `hono/vercel`
- Local dev: Served standalone via `apps/api/src/index.ts` on port 3001

**Route & Schema Organization:**
- Each resource gets its own route file in `packages/api-app/src/routes/`
- Use Zod for request validation: define schemas in `packages/api-app/src/schemas/`
- Apply validation via `zValidator` middleware in routes
- Invalid requests return 400 with structured Zod validation errors
- Return consistent JSON: `{ data, error, message }`
- Wrap DB calls in try/catch; return 500 on unexpected errors

**Jobs & Cron:**
- Sync jobs in `packages/api-app/src/jobs/` (sync-gsc.ts, sync-ga4.ts)
- Export job functions from `packages/api-app/src/index.ts`
- Only run when explicitly started: in production via Vercel cron, in local dev if `ENABLE_CRON=true`

## Database (Drizzle)

- One schema file per table in `packages/db/src/schema/`
- Use `drizzle-kit push` for dev; migrations for production
- Index columns used in WHERE/ORDER BY clauses
- Never store plain-text OAuth tokens — encrypt before saving
- **Enum-like text columns use check constraints** (enforced at DB level):
  - `tasks.status`: `'todo'`, `'in_progress'`, `'done'`
  - `tasks.taskType`: `'technical'`, `'content'`, `'links'` (nullable)
  - `tasks.priority`: `'low'`, `'medium'`, `'high'`
  - Invalid values rejected by database, never reaching application

## Security

### Token Encryption
- All OAuth tokens (GSC, GA4) are encrypted with AES-256-GCM before DB storage
- Use `encryptToken()` when writing tokens; `decryptTokenValue()` when reading
- See `src/utils/crypto-tokens.ts` for encryption utilities
- Requires `ENCRYPTION_KEY` env var (32-byte hex, 64 chars)
- Backward-compatible: `decryptTokenValue()` passes through unencrypted legacy data

### Rate Limiting
- OAuth sync endpoints (`/api/integrations/*/sync`) — 5 req/min per IP
- OAuth authorize endpoints (`/api/integrations/*/authorize`) — 10 req/min per IP
- Client IP extracted from `x-forwarded-for` header (last segment for Render deployments)
- Implemented via `hono-rate-limiter` middleware in `src/index.ts`

### Error Handling
- Never log or expose decrypted tokens in error messages
- Catch crypto errors at token refresh boundaries
- Return generic error messages to clients; log detailed errors server-side
- try/catch at all external boundaries (DB, Google APIs, OAuth)
- Never expose stack traces in API responses

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- No `.env` files committed
- Lint + type-check must pass before push
- No `--no-verify` bypasses
