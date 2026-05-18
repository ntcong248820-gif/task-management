---
phase: 3
title: "UI Shell Redesign"
status: pending
priority: P1
effort: "~7-8h"
dependencies: [1, 2]
---

# Phase 03: UI Shell Redesign

## Overview

Redesign toàn bộ layout, navigation, và shell của app. Tạo nền tảng UI mà tất cả
các phase sau sẽ build vào. Giữ shadcn/ui + Tailwind CSS, redesign composition.

> **Reviewed:** Applied fixes từ UI/UX review — see `plans/reports/ui-ux-review-260510-2154-phase-03-ui-shell.md`
> Effort tăng từ ~6h → ~7-8h (dashboard guard reuse + mobile testing).
> Phase 01 auth was simplified on 2026-05-18: email/password-only, no Google login, no email verification/reset/invite email.

## Design Principles

- **Workspace-first**: Workspace selector là điểm vào chính
- **Project context**: Hầu hết views cần chọn project (website) đang xem
- **Sidebar navigation**: Primary nav là sidebar cố định (left), không phải top nav
- **Proactive alerts**: Alert/notification icon trong header luôn visible
- **Clean density**: Thoáng hơn v1, ít noise hơn — Data-Dense + Minimalism style
- **No emojis as icons**: Dùng Lucide SVG icons, không dùng emoji làm UI elements
- **Mobile-first responsive**: Sidebar ẩn trên mobile, thay bằng Sheet overlay

## New Navigation Structure

```
┌─────────────────────────────────────────────┐
│ [Logo] SEO Impact OS  [Workspace ▾]  [🔔][👤]│  ← Header
├──────────┬──────────────────────────────────┤
│ Sidebar  │                                  │
│          │  Main Content Area               │
│ Overview │                                  │
│ ─────    │                                  │
│ ▾ Tasks  │  (single nav item — view         │
│   [tabs inside Tasks page: Board/Timeline/  │
│    Table/Calendar via ?view= param]         │
│ ─────    │                                  │
│ Goals    │                                  │
│ Sprints  │                                  │
│ ─────    │                                  │
│ ▾ Analytics                                 │
│   Overview│                                 │
│   Keywords│                                 │
│   Pages  │                                  │
│   Alerts │                                  │
│ ─────    │                                  │
│ ▾ Settings                                  │
│   Projects│                                 │
│   Team   │                                  │
│   Integr.│                                  │
└──────────┴──────────────────────────────────┘
```

**Note:** Tasks KHÔNG có sub-items trong sidebar. View switching (Board/Timeline/Table/Calendar)
xảy ra bên trong `/dashboard/tasks?view=board|timeline|table|calendar` via tab bar trong page.

## Route Structure (New)

```
apps/web/src/app/
├── (auth)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── layout.tsx          ← No sidebar
├── (app)/
│   ├── layout.tsx           ← With sidebar + header
│   ├── workspace/
│   │   └── page.tsx         ← Workspace selector/create (reuse or move current Phase 01 page)
│   └── dashboard/
│       ├── page.tsx         ← Overview/Home
│       ├── tasks/
│       │   └── page.tsx     ← Single page: ?view=board|timeline|table|calendar
│       ├── goals/page.tsx
│       ├── sprints/page.tsx
│       ├── analytics/
│       │   ├── page.tsx     ← Overview
│       │   ├── keywords/page.tsx
│       │   ├── pages/page.tsx
│       │   └── alerts/page.tsx
│       └── settings/
│           ├── projects/page.tsx
│           ├── team/page.tsx
│           └── integrations/page.tsx

apps/web/src/app/dashboard/layout.tsx   ← Auth redirect guard (consumed from Phase 01 output)
```

**Tasks view routing:** `?view=board` (default) | `?view=timeline` | `?view=table` | `?view=calendar`
```tsx
// Phase 03 scaffold only — Phase 04 implements actual view components
const view = searchParams.get('view') ?? 'board'
```

## Auth Guard (Phase 01 Output)

> Dashboard server layout guard là **Phase 01 deliverable** — Phase 01 already includes it in scope.
> Phase 03 consumes `useSession()` from `apps/web/src/lib/auth-client.ts`.

Redirect logic (defined in Phase 01):
```ts
// No session → /login
// Session + no active workspace → /workspace
// Session + workspace → allow through
// On /login with session → /dashboard
```

## Z-Index Scale

Define in `apps/web/src/styles/globals.css` or Tailwind config:

```
z-sidebar   = z-40   // Fixed sidebar
z-header    = z-50   // Sticky header
z-dropdown  = z-60   // Popover/Select dropdowns (workspace, project, user menu)
z-sheet     = z-70   // Mobile sidebar sheet
z-modal     = z-80   // Dialogs (Phases 04+)
z-toast     = z-90   // Toast notifications
```

## Components to Create

**Layout:**
- `apps/web/src/components/layout/sidebar.tsx` — Main sidebar (uses nav-group + nav-item)
- `apps/web/src/components/layout/header.tsx` — Top header (no DateRangePicker — moved to per-page)
- `apps/web/src/components/layout/nav-group.tsx` — Collapsible sidebar section (shadcn Collapsible)
- `apps/web/src/components/layout/nav-item.tsx` — Individual nav link atom
- `apps/web/src/components/layout/workspace-selector.tsx` — Workspace dropdown
- `apps/web/src/components/layout/project-selector.tsx` — Project selector (reads from store, not fetch)
- `apps/web/src/components/layout/notification-bell.tsx` — Alert count + dropdown
- `apps/web/src/components/layout/user-menu.tsx` — Avatar + user dropdown (uses session from auth-client)
- `apps/web/src/components/layout/mobile-sidebar-sheet.tsx` — Sheet overlay for mobile nav
- `apps/web/src/components/layout/sidebar-trigger.tsx` — Hamburger button (visible on mobile only)

**Shared UI:**
- `apps/web/src/components/ui/empty-state.tsx` — Reusable empty states
- `apps/web/src/components/ui/page-header.tsx` — Consistent page header component
- `apps/web/src/components/ui/loading-skeleton.tsx` — Skeleton loaders

**Note:** `data-badge.tsx` removed — use shadcn `Badge` primitive directly (DRY).

## Overview/Home Page

Thay Correlation Dashboard làm homepage → **Proactive Overview** (Lucide icons only, no emoji):

```
┌──────────────────────────┬────────────────────────────┐
│ [AlertCircle] 2 Alerts   │ [TrendingUp] This Week      │
│ Traffic drop...          │ Tasks: 8 done               │
│ Page decaying...         │ Time: 12h                   │
└──────────────────────────┴────────────────────────────┘

[Active Alerts — placeholder]   [Traffic Trend — 30d placeholder]

[Recent Tasks — placeholder]    [Goal Progress — placeholder]
```

Phase 03 renders **placeholder content** only — real data populated in Phases 04/06.

## Stores

```ts
// apps/web/src/stores/use-workspace-store.ts (NEW)
{
  workspaceId: string | null
  workspaceName: string
  projects: Project[]          // centralized — project-selector reads from here
  projectsLoading: boolean
  setWorkspace: (id: string, name: string) => void
  fetchProjects: () => Promise<void>
}

// apps/web/src/stores/use-project-store.ts (keep, adapt)
{ selectedProjectId: string | null, setSelectedProjectId: (id: string) => void }

// apps/web/src/stores/use-alert-store.ts (NEW)
// Shape designed for Phase 06 compatibility (fetchAlerts → stub for now)
{
  alerts: Alert[]
  unreadCount: number
  lastFetchedAt: Date | null
  markRead: (id: string) => void
  markAllRead: () => void
  fetchAlerts: () => Promise<void>  // stub: returns [] until Phase 06
}
```

**Session:** `useSession()` from `apps/web/src/lib/auth-client.ts` (Phase 01 output).
`user-menu.tsx` reads `session.user.name`, `session.user.email` directly — no separate auth store needed.

## DateRangePicker

**Decision:** Move from global header → per-page analytics toolbar (Option B).
- Analytics pages (overview, keywords, pages) implement their own date context
- Goals/Tasks/Settings do NOT need global date range
- Phase 03 header: `[Logo][Workspace ▾][Project ▾][🔔][👤]` — no DateRangePicker

## Related Code Files

**Delete:**
- `apps/web/src/app/dashboard/` (entire folder — rebuild as `(app)/dashboard/`)
- `apps/web/src/components/features/` (entire folder — rebuild in Phase 04+)
- `apps/web/src/components/KanbanBoard.tsx`
- `apps/web/src/components/TaskDialog.tsx`
- `apps/web/src/components/TaskFilters.tsx`
- `apps/web/src/components/Header.tsx` (rebuild as layout/header.tsx)
- `apps/web/src/components/Sidebar.tsx` (rebuild as layout/sidebar.tsx)
- `apps/web/src/stores/useTimerStore.ts` (rebuild in Phase 04)

**Create:**
- New route structure above
- All layout components above
- `apps/web/src/stores/use-workspace-store.ts`
- `apps/web/src/stores/use-alert-store.ts`

**Keep + Adapt:**
- `apps/web/src/components/ui/` (shadcn primitives — keep all)
- `apps/web/src/stores/use-project-store.ts` (adapt to string UUID IDs)
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/auth-client.ts` (Phase 01 creates this)

## Todo

- [ ] Install shadcn chart component: `npx shadcn@latest add chart` — adds `recharts` as shared dep for Phase 05 WorkloadChart and Phase 07 analytics dashboards
- [ ] Delete old dashboard routes + components (as listed above)
- [x] Reuse `(auth)` route group + layout delivered by Phase 01; adapt only if new shell needs it
- [ ] Create `(app)` route group + layout.tsx with sidebar + header
- [ ] Build `nav-item.tsx` — individual nav link with active state
- [ ] Build `nav-group.tsx` — collapsible section (shadcn Collapsible, active child = stays open)
- [ ] Build `sidebar.tsx` using nav-group + nav-item (Tasks = single item, no sub-items)
- [ ] Build `mobile-sidebar-sheet.tsx` — Sheet overlay (shadcn Sheet, open from left)
- [ ] Build `sidebar-trigger.tsx` — hamburger button (hidden on lg:, visible on mobile)
- [ ] Build `header.tsx` — workspace + project selectors + bell + user menu (no DateRangePicker)
- [ ] Build `workspace-selector.tsx` — dropdown, reads from use-workspace-store
- [ ] Build `project-selector.tsx` — dropdown, reads `projects[]` from use-workspace-store
- [ ] Build `notification-bell.tsx` — unread badge (hidden when count=0)
- [ ] Build `user-menu.tsx` — reads from useSession(), avatar + logout
- [ ] Reuse or move current `workspace/page.tsx` as the workspace selector/create route
- [ ] Create `dashboard/page.tsx` — overview (placeholder content, Lucide icons only)
- [ ] Create `dashboard/tasks/page.tsx` — stub with `?view=` search param scaffold
- [ ] Create remaining route stubs (goals, sprints, analytics/*, settings/*)
- [ ] Create `use-workspace-store.ts` (with projects[], fetchProjects())
- [ ] Adapt `use-project-store.ts` (string UUID IDs)
- [ ] Create `use-alert-store.ts` (stub fetchAlerts → empty array)
- [ ] Define z-index scale in globals.css or tailwind.config
- [ ] Run `npm run type-check`

## Success Criteria

- [ ] Unauthenticated → dashboard layout guard (Phase 01) redirects to /login (not 200 on /dashboard)
- [ ] Authenticated + no active workspace → redirects to /workspace
- [ ] Login → workspace select → dashboard shell loads without sidebar flicker
- [ ] Sidebar shows grouped nav items with collapsible sections, active state works
- [ ] Tasks nav item is a SINGLE item (no Board/Timeline/etc sub-items in sidebar)
- [ ] View switch (Board→Timeline) updates URL `?view=` param, no full page reload
- [ ] Workspace selector shows user's workspaces from use-workspace-store
- [ ] Project selector reads `projects[]` from use-workspace-store (NOT independent fetch)
- [ ] Notification bell shows 0 count, badge hidden when unreadCount = 0
- [ ] User menu shows user name/email from useSession()
- [ ] Mobile (375px): sidebar hidden, hamburger visible, triggers Sheet overlay
- [ ] Desktop (1024px+): sidebar fixed (w-64), hamburger hidden
- [ ] All routes accessible without 404
- [ ] No emojis used as icons anywhere in shell components
- [ ] `npm run type-check` passes

## Risk Assessment

- **Auth guard dependency**: Phase 03 shell is fully functional only after Phase 01 delivers `auth-client.ts` + dashboard layout guard. Phase 03 can scaffold routes/layout first, wire auth last.
- **Workspace auto-select**: If user has exactly 1 workspace, `/workspace` should auto-redirect. Implement this edge case in workspace selector page.
- **Store type alignment**: `use-workspace-store.ts` uses `Project` type from Phase 02 schema — implement store after Phase 02 exports types from `packages/types/`.

## Unresolved Questions

1. **Sidebar collapsed/icon-only variant**: Is an icon-only collapsed sidebar in scope for Phase 03 or deferred to later? Recommendation: defer — YAGNI until user requests.
2. **Dark mode toggle**: v1 uses dark bg. v2 "clean density" implies light default. Toggle in Phase 03 or Phase 07 polish?
3. **Workspace auto-select on single workspace**: Confirm: if 1 workspace → skip workspace page, go directly to dashboard?
