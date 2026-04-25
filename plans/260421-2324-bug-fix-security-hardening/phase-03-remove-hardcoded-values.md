# Phase 3 — Remove Hardcoded Values

**Priority:** P1 — Breaks multi-env deployments  
**Status:** ✅ Done  
**Issues:** H1 (CORS Vercel URL), H2 (projectId = 1 defaults), H3 (API_BASE duplicate)

## Context Links
- Review report: [reviewer-260421-2324-codebase-bugs-and-security.md](../reports/reviewer-260421-2324-codebase-bugs-and-security.md)
- API entry: `apps/api/src/index.ts`
- Config: `apps/web/src/lib/config.ts`
- Dashboard page: `apps/web/src/app/dashboard/page.tsx`
- Hooks: `apps/web/src/hooks/`

---

## H1 — Remove Hardcoded Vercel URL from CORS

### Key Insight
`'https://task-management-app-theta-two.vercel.app'` is hardcoded in the CORS origin array. If the Vercel domain changes (e.g. custom domain, new deployment), CORS silently breaks.

### Related Files
- **Modify:** `apps/api/src/index.ts:25-34`

### Implementation Steps
Replace the origin array — use only env-driven values:
```ts
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    process.env.FRONTEND_URL,        // Production Vercel URL via env
    process.env.FRONTEND_URL_PREVIEW, // Optional: Vercel preview URLs
  ].filter(Boolean) as string[],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));
```

Add `FRONTEND_URL` to `.env.production.example` if not present.

### Todo
- [x] Remove hardcoded Vercel domain from CORS origin array in `index.ts`
- [x] Ensure `FRONTEND_URL` is set in Render environment variables
- [x] Add `FRONTEND_URL_PREVIEW` to `.env.production.example` as optional

---

## H2 — Remove `projectId = 1` Defaults from All Hooks

### Key Insight
5 hooks default to `projectId = 1`, which likely doesn't exist in production. Pages should pass the selected project ID explicitly from the shared store.

### Architecture
- `project-store.ts` (Zustand) already tracks selected project — confirm it exports `selectedProjectId`
- All dashboard pages should read from store and pass to hooks
- Hooks should require `projectId` as mandatory (no default)

### Related Files
- **Modify:** `apps/web/src/hooks/useAnalyticsData.ts:64`
- **Modify:** `apps/web/src/hooks/useURLsData.ts:91`
- **Modify:** `apps/web/src/hooks/useDiagnosisData.ts:33`
- **Modify:** `apps/web/src/hooks/useRankingsData.ts:92`
- **Modify:** `apps/web/src/hooks/useKeywordDetailData.ts:30`
- **Check:** `apps/web/src/stores/project-store.ts` — ensure `selectedProjectId` is exported

### Implementation Steps

1. Check `project-store.ts` — confirm it has `selectedProjectId`:
```ts
// Expected shape
interface ProjectStore {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
}
```

2. In each hook, remove the default value:
```ts
// Before
export function useAnalyticsData(projectId: number = 1)
// After
export function useAnalyticsData(projectId: number)
```

3. In each page component that calls the hook, read from store:
```ts
import { useProjectStore } from '@/stores/project-store';
const { selectedProjectId } = useProjectStore();
const projectId = selectedProjectId ? parseInt(selectedProjectId) : null;
// Pass to hook — skip fetch if null
```

4. In hooks — guard against null/undefined projectId:
```ts
if (!projectId) return; // skip fetch
```

### Todo
- [x] Audit `apps/web/src/stores/project-store.ts` — confirm `selectedProjectId` export
- [x] Remove `= 1` default from `useAnalyticsData`
- [x] Remove `= 1` default from `useURLsData`
- [x] Remove `= 1` default from `useDiagnosisData`
- [x] Remove `= 1` default from `useRankingsData`
- [x] Remove `= 1` default from `useKeywordDetailData`
- [x] Update calling pages to pass `selectedProjectId` from store

---

## H3 — Remove Duplicate `API_BASE` in `dashboard/page.tsx`

### Key Insight
`apps/web/src/app/dashboard/page.tsx:12` defines its own `API_BASE` constant, duplicating the logic already in `src/lib/config.ts`.

### Related Files
- **Modify:** `apps/web/src/app/dashboard/page.tsx`

### Implementation Steps
```ts
// Remove:
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Add import:
import { getApiUrl } from '@/lib/config';

// Replace usages:
// Before: `${API_BASE}/api/correlation?...`
// After:  getApiUrl(`/api/correlation?...`)
```

### Todo
- [x] Remove `API_BASE` const from `dashboard/page.tsx`
- [x] Import and use `getApiUrl` from `@/lib/config` instead

### Success Criteria
- No hardcoded Vercel domain anywhere in codebase (`grep -r 'task-management-app-theta-two'` returns nothing)
- No `projectId = 1` defaults in any hook signature
- No duplicate API base URL definitions in web app
