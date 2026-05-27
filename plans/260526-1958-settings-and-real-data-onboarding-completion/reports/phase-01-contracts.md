# Phase 01 — API Contracts Reference

Generated: 2026-05-27  
HEAD: f4508c7c45a8a8c8220b215f27d70dcaebcba320

---

## 1. Projects API

All routes scoped to `workspaceId` extracted from Better Auth `activeOrganizationId` via Hono middleware.

| Method | Path | Body / Query | Response |
|--------|------|--------------|----------|
| `GET` | `/api/projects` | — | `{ success, data: Project[], count }` |
| `GET` | `/api/projects/:id` | — | `{ success, data: Project }` |
| `POST` | `/api/projects` | `{ name, domain?, description?, color?, isActive }` | `{ success, data: Project, message }` 201 |
| `PUT` | `/api/projects/:id` | partial of above | `{ success, data: Project, message }` |
| `DELETE` | `/api/projects/:id` | — | `{ success, message }` |

**Schema source:** `packages/api-app/src/schemas/project-schema.ts`  
**Route file:** `packages/api-app/src/routes/projects.ts`  
**Shared type:** `packages/types/src/index.ts → Project`

---

## 2. Integrations API

### 2a. Status

| Method | Path | Query | Response |
|--------|------|-------|----------|
| `GET` | `/api/integrations/status` | `?projectId=<uuid>` | `{ success, data: { gsc: ConnectionStatus, ga4: ConnectionStatus } }` |

**ConnectionStatus shape:**
```ts
// connected
{ connected: true, lastSync: Date, scopes: [], email: string | null, syncStatus: SyncStatus, syncError: string | null }
// disconnected
{ connected: false }
```

### 2b. OAuth Authorize (returns URL for client redirect)

| Method | Path | Query | Response |
|--------|------|-------|----------|
| `GET` | `/api/integrations/gsc/authorize` | `?projectId=<uuid>` | `{ success, data: { authUrl, state } }` |
| `GET` | `/api/integrations/ga4/authorize` | `?projectId=<uuid>` | `{ success, data: { authUrl, state } }` |

**OAuth state** is HMAC-signed, bound to `{ integration, projectId, userId, workspaceId }` via `packages/api-app/src/utils/signed-oauth-state.ts`.

### 2c. OAuth Callbacks (server-to-server, no client call)

These are called by Google, not the frontend.

| Provider | Callback URI env var | Post-auth redirect (DECISION: updated) |
|----------|---------------------|----------------------------------------|
| GSC | `GOOGLE_GSC_REDIRECT_URI` | `/dashboard/settings/integrations?success=gsc_connected` |
| GA4 | `GOOGLE_GA4_REDIRECT_URI` | `/dashboard/settings/integrations?success=ga4_connected` |
| Both (error) | — | `/dashboard/settings/integrations?error=<message>` |

**Decision:** Redirect directly to `/dashboard/settings/integrations`. The old `/dashboard/integrations` is a shim that itself redirects there. Removing the double-hop keeps the URL in browser history clean.  
**Files changed:** `packages/api-app/src/routes/integrations/gsc.ts`, `packages/api-app/src/routes/integrations/ga4.ts`

### 2d. Site / Property Discovery

| Method | Path | Query | Response |
|--------|------|-------|----------|
| `GET` | `/api/integrations/gsc/sites` | `?projectId=<uuid>&save=true` | `{ success, data: { sites: [{ siteUrl, permissionLevel }], saved } }` |
| `GET` | `/api/integrations/ga4/properties` | `?projectId=<uuid>&save=true` | `{ success, data: { properties: [{ propertyId, propertyName }], saved } }` |

`save=true` upserts all discovered sites/properties into DB for the project.

### 2e. Manual Sync

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/integrations/gsc/sync` | `{ projectId, siteUrl?, days? }` | `{ success, message }` |
| `POST` | `/api/integrations/ga4/sync` | `{ projectId }` | `{ success, message }` |

### 2f. Disconnect

| Method | Path | Query | Response |
|--------|------|-------|----------|
| `DELETE` | `/api/integrations/:provider/disconnect` | `?projectId=<uuid>` | `{ success, message }` |

Provider is `gsc` or `ga4`.

---

## 3. Cron API

Auth: `Authorization: Bearer <CRON_SECRET>` (verified via `verifyCronSecret` middleware).

| Method | Path | Trigger |
|--------|------|---------|
| `POST` | `/api/cron/sync-gsc` | GitHub Actions daily |
| `POST` | `/api/cron/sync-ga4` | GitHub Actions daily (after sync-gsc) |
| `POST` | `/api/cron/run-alerts` | **Not yet in GitHub Actions** (route exists) |
| `POST` | `/api/cron/weekly-digest` | **Not yet in GitHub Actions** (route exists) |

Note: Phase 05 will wire `run-alerts` and `weekly-digest` into `.github/workflows/cron-sync.yml`.

---

## 4. Team / Auth

**Better Auth organization plugin** is configured in `packages/auth-config/src/index.ts` with roles from `packages/auth-config/src/permissions.ts`.

**Roles and capabilities:**

| Role | project | member | invitation | organization |
|------|---------|--------|-----------|-------------|
| owner | CRUD | CRUD | read/create/cancel | read/update/delete |
| admin | CRUD | CRUD | read/create/cancel | read/update |
| member | CRU | read | read | read |
| viewer | read | read | none | read |

**Client:** `apps/web/src/lib/auth-client.ts` — `authClient` with `organizationClient` plugin.

**Available Better Auth org methods (relevant):**
- `authClient.organization.getActiveMember()` — current user's role in active org
- `authClient.organization.listMembers()` — all members of active org
- `authClient.organization.updateMemberRole()` — change member role (owner/admin only)
- `authClient.organization.removeMember()` — remove member (owner/admin only)
- `authClient.organization.inviteMember()` — send invite (deferred: no email provider)

**Team boundary decision:** Settings Team page shows member list + roles. Invite UI is visible but disabled (no email provider). `inviteMember` call is NOT wired.

---

## 5. Frontend State

### Workspace & Project Store

- `apps/web/src/stores/use-workspace-store.ts` — `WorkspaceStore`: `{ workspaceId, workspaceName, projects[], projectsLoading, fetchProjects() }`
- `apps/web/src/stores/use-project-store.ts` — `{ selectedProjectId, setSelectedProjectId() }`

### Planned Hook Files (Phase 02-04)

| File | Purpose |
|------|---------|
| `apps/web/src/hooks/use-projects-settings.ts` | CRUD operations on projects, wraps `/api/projects` |
| `apps/web/src/hooks/use-integrations-settings.ts` | Status, authorize, sync, disconnect per project |
| `apps/web/src/hooks/use-team-settings.ts` | Member list, role visibility, Better Auth org methods |

---

## 6. Redirect Shims

| Path | Redirects to |
|------|-------------|
| `/dashboard/projects` | `/dashboard/settings/projects` |
| `/dashboard/integrations` | `/dashboard/settings/integrations` |

Shim files: `apps/web/src/app/dashboard/integrations/page.tsx`, `apps/web/src/app/dashboard/projects/page.tsx` — these **preserve** `?success=` and `?error=` query params because Next.js `redirect()` is a 307 that drops them. Frontend must read query params from `useSearchParams()` on the settings page, not rely on the shim to forward them.

---

## Unresolved Questions

None — all decisions locked above.
