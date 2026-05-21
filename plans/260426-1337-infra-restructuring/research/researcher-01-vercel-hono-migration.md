# Vercel + Hono Infrastructure Migration Research

**Date:** 2026-04-26 | **Topics:** 4 | **Sources:** 4 official docs

---

## 1. Hono inside Next.js 15 Route Handlers

**Status:** ✅ Fully supported via `hono/vercel` adapter

**Setup:**
- File: `apps/web/app/api/[[...route]]/route.ts`
- Catch-all segment `[[...route]]` routes all `/api/*` to Hono
- Use `hono/vercel` adapter, NOT the generic handler

**Code:**
```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono().basePath('/api')
app.get('/hello', c => c.json({ message: 'Hello' }))

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

**Key Points:**
- Re-export all HTTP methods individually (GET, POST, etc.)
- `basePath('/api')` is optional but recommended for clarity
- Works with Next.js 15 App Router (native support)

**Trade-off:** Removes standalone API server, simplifies deployment to single Vercel project.

---

## 2. Vercel Monorepo Config for Turborepo

**Status:** ✅ Auto-detected, custom config optional

**Dashboard config:**
- `Root Directory`: Point to `apps/web/` in Vercel UI
- Framework detection: Automatic (Next.js recognized)
- `buildCommand`: Auto-detected, override in `vercel.json` if needed

**Custom vercel.json (in `apps/web/`):**
```json
{
  "buildCommand": "cd ../.. && npm run build",
  "installCommand": "cd ../.. && npm install"
}
```

**Turborepo-specific:**
- Root `turbo.json` handles task orchestration
- Vercel respects Turborepo's caching (faster builds)
- No separate `vercel.json` at root needed (Vercel auto-detects Turborepo)

**Trade-off:** Custom `vercel.json` adds config overhead but enables monorepo-aware builds across workspaces.

---

## 3. Vercel Cron Jobs

**Status:** ✅ Production-ready, replaces `node-cron`

**How it works:**
- Defined in `vercel.json` at project root
- Vercel invokes your route handler via HTTP GET with `Authorization` header
- Only runs on production, not preview deployments

**Config in vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-rankings",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Route handler security:**
```typescript
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Run task
  return new Response('OK')
}
```

**Limitations:**
- Max 60s execution per invocation
- No redirects followed (3xx = job ends)
- Production-only (preview deployments skip cron)
- CRON_SECRET: use random 16+ char string

**Trade-off:** Eliminates `node-cron` dependency but requires production-only mindset for testing.

---

## 4. CORS in Next.js Route Handlers

**Status:** ⚠️ Conditional — same project = optional, preview deployments = required

**Same Vercel project (API + frontend):**
- CORS NOT required if served from same origin (e.g., `myapp.vercel.app/api`)
- Requests from `https://myapp.vercel.app` to `https://myapp.vercel.app/api` = same-origin, no CORS headers needed

**Preview deployments (CRITICAL issue):**
- Each merge generates new preview URL (e.g., `pr-123.myapp.vercel.app`)
- Frontend and API on different preview subdomains = CORS required
- Cannot whitelist specific preview URLs (they're dynamic)

**Solution for preview support:**
```typescript
export async function GET(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigins = [
    'https://myapp.vercel.app',
    process.env.NEXT_PUBLIC_API_URL,
  ]
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  
  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  
  return new Response('OK', { headers })
}
```

**Important:** Always export OPTIONS handler for preflight:
```typescript
export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: {...} })
}
```

**Trade-off:** Adding dynamic CORS adds 10 lines per endpoint but enables preview deploys to work.

---

## Unresolved Questions

1. **Preview deployment auth:** Can we use `NEXT_PUBLIC_API_URL` in preview to point both frontend + API to same URL? (Avoids CORS, needs testing)
2. **Cron task queuing:** If cron job takes >60s, do we need async queue (Bull, Neon job scheduler)? No research done on task queuing solutions.
3. **Migration cutover:** Timeline for moving existing `node-cron` tasks to Vercel cron? Risk of duplicate task runs during migration?

---

## Sources

- [Hono Next.js Documentation](https://hono.dev/docs/getting-started/nextjs)
- [Vercel Turborepo Deployment](https://vercel.com/docs/monorepos/turborepo)
- [Vercel Cron Jobs Quickstart](https://vercel.com/docs/cron-jobs/quickstart)
- [Next.js Route Handlers CORS Guide](https://vercel.com/kb/guide/how-to-enable-cors)
