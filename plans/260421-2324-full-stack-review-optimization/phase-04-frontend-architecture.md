# Phase 4 — Frontend Architecture

**Priority:** P1 | **Effort:** ~4h | **Status:** ✅ Done  
**Depends on:** Phase 2 (backend pagination shape), Phase 3 (DB exports)

## Context Links
- Plan: [plan.md](./plan.md)
- Research: [researcher-02-frontend-architecture.md](./research/researcher-02-frontend-architecture.md)
- Bug fix Phase 3: [../260421-2324-bug-fix-security-hardening/phase-03-remove-hardcoded-values.md]
- Web app: `apps/web/src/`

## Overview

Replace manual `useEffect`+`fetch` pattern with SWR, create a proper `useProjectStore`, remove all hardcoded `projectId = 1` defaults, add shared API client, and fix missing UI feedback patterns.

## Key Insights

- Every dashboard page re-fetches on mount with no caching — navigating back/forth hits API each time
- No `useProjectStore` — project selection is `localStorage.getItem('selectedProjectId')` scattered across 7+ components
- 5 data hooks default `projectId = 1` — silently loads wrong project data in production
- No shared API client — raw `fetch(getApiUrl(...))` repeated in every hook (~8 hooks, ~5 components)
- No error boundaries — uncaught render errors crash entire dashboard
- `dashboard/page.tsx` defines its own `API_BASE` instead of using `lib/config.ts`
- OAuth callback success/error not shown to user (only `console.log`)

## Requirements

- SWR installed and used for all data hooks
- `useProjectStore` (Zustand + persist) is single source of truth for selected project
- No hook defaults `projectId = 1`
- Shared `api-client.ts` used by all hooks
- Error boundaries on main dashboard routes
- Toast on OAuth success/error
- `dashboard/page.tsx` uses `getApiUrl` not own `API_BASE`

## Architecture

### SWR Data Fetching Pattern

```ts
// apps/web/src/lib/api-client.ts
export const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json().then(d => d.data);
  });

// In any hook:
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';

export function useAnalyticsData(projectId: number) {
  return useSWR(
    projectId ? getApiUrl(`/api/analytics?projectId=${projectId}`) : null,
    fetcher
  );
}
```

Key benefits:
- `null` key → skips fetch (handles missing projectId cleanly)
- Automatic caching per URL key
- Deduplication of concurrent requests
- Background revalidation on window focus

### Project Store

```ts
// apps/web/src/stores/use-project-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectStore {
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
    }),
    { name: 'selected-project' }
  )
);
```

### Shared API Client

```ts
// apps/web/src/lib/api-client.ts
import { getApiUrl } from './config';

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
};

export const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(getApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return json.data;
};
```

### Error Boundary

```tsx
// apps/web/src/components/error-boundary.tsx
'use client';
import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback ?? <p>Something went wrong.</p>;
    return this.props.children;
  }
}
```

## Related Code Files

**Install:**
- `swr` in `apps/web/package.json`

**Create:**
- `apps/web/src/lib/api-client.ts` — shared fetcher + apiPost
- `apps/web/src/stores/use-project-store.ts` — Zustand project store
- `apps/web/src/components/error-boundary.tsx` — error boundary component

**Modify (hooks — replace useEffect with SWR):**
- `apps/web/src/hooks/useAnalyticsData.ts`
- `apps/web/src/hooks/useRankingsData.ts`
- `apps/web/src/hooks/useURLsData.ts`
- `apps/web/src/hooks/useDiagnosisData.ts`
- `apps/web/src/hooks/useKeywordDetailData.ts`

**Modify (remove projectId defaults, use store):**
- All 5 hooks above — remove `= 1` default
- All dashboard pages that call these hooks — pass `selectedProjectId` from store

**Modify (misc fixes):**
- `apps/web/src/app/dashboard/page.tsx` — remove `API_BASE`, use `getApiUrl`
- `apps/web/src/app/dashboard/integrations/page.tsx` — add toast on OAuth success/error (covered in bug fix plan Phase 2)

**Wrap with ErrorBoundary:**
- `apps/web/src/app/dashboard/layout.tsx` or per-page

## Implementation Steps

1. `cd apps/web && npm install swr`
2. Create `apps/web/src/lib/api-client.ts`
3. Create `apps/web/src/stores/use-project-store.ts`
4. Refactor all 5 data hooks to use SWR + api-client
5. Remove `projectId = 1` defaults from all hook signatures
6. Update dashboard pages to read `selectedProjectId` from `useProjectStore`
7. Fix `dashboard/page.tsx` — remove own `API_BASE` constant
8. Create `apps/web/src/components/error-boundary.tsx`
9. Wrap dashboard routes with `<ErrorBoundary>`
10. Migrate project selection from `localStorage.getItem` to store in all components
11. Run `npm run type-check` and `npm run lint`

## Todo

- [x] Install `swr`
- [x] Create `apps/web/src/lib/api-client.ts`
- [x] Create `apps/web/src/stores/use-project-store.ts`
- [x] Refactor `useAnalyticsData` → SWR
- [x] Refactor `useRankingsData` → SWR
- [x] Refactor `useURLsData` → SWR
- [x] Refactor `useDiagnosisData` → SWR
- [x] Refactor `useKeywordDetailData` → SWR
- [x] Remove `= 1` default from all 5 hooks
- [x] Update dashboard pages to pass `selectedProjectId` from store
- [x] Remove duplicate `API_BASE` from `dashboard/page.tsx`
- [x] Create `error-boundary.tsx`
- [x] Wrap dashboard layout with `ErrorBoundary`
- [x] Run type-check + lint

## Success Criteria

- Navigate away and back to analytics page — no new network request fired (SWR cache hit)
- Selecting a project updates all dashboard pages without page refresh
- Hook signatures have no `= 1` defaults
- No raw `localStorage.getItem('selectedProjectId')` calls in component code
- Uncaught render error shows fallback UI, not blank page

## Risk Assessment

- SWR caching may serve stale data after sync — add `mutate()` call after sync triggers
- Project store `persist` uses localStorage key `selected-project` — conflicts with existing `selectedProjectId` key; migrate carefully
- Error boundary wrapping must not mask intentional throws (e.g. Next.js redirect)

## Security Considerations

- `api-client.ts` centralized — easier to add auth headers when authentication is added later
