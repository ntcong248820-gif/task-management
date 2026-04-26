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
  routes/         # Hono route handlers (one file per resource)
  schemas/        # Zod validation schemas
  jobs/           # Cron jobs
  utils/          # Pure utility functions
  index.ts        # Entry point

apps/web/src/
  app/dashboard/  # Next.js App Router pages
  components/
    ui/           # shadcn/ui base components
    forms/        # Form components
    layouts/      # Layout components
    features/     # Feature-specific (tasks/, analytics/, etc.)
  hooks/          # Custom React hooks
  stores/         # Zustand stores
  types/          # Frontend-only types

packages/db/src/schema/  # Drizzle schema (one file per table)
packages/types/          # Shared types between apps
```

## TypeScript

- Strict mode enabled — no `any` unless absolutely necessary
- Prefer `interface` for object shapes, `type` for unions/aliases
- All API responses must be typed via `packages/types`
- No unused variables, no unused imports

## React / Next.js

- Use App Router (`app/` directory) — no Pages Router
- Server Components by default; add `"use client"` only when needed
- Custom hooks for business logic — no logic in component bodies
- Zustand for global state — no prop drilling
- No `console.log` in production code

## API (Hono)

- Each resource gets its own route file in `routes/`
- Use Zod for request validation: define schemas in `schemas/` directory, apply via `zValidator` middleware in routes
- Invalid requests return 400 with structured Zod validation errors
- Return consistent JSON: `{ data, error, message }`
- Wrap DB calls in try/catch; return 500 on unexpected errors
- Cron jobs go in `jobs/` — never inline in `index.ts`

## Database (Drizzle)

- One schema file per table in `packages/db/src/schema/`
- Use `drizzle-kit push` for dev; migrations for production
- Index columns used in WHERE/ORDER BY clauses
- Never store plain-text OAuth tokens — encrypt before saving

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
