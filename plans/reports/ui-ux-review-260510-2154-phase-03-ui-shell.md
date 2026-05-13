---
title: "UI/UX Review — Phase 03: UI Shell Redesign"
date: 2026-05-10
type: review
reviewer: ui-ux-pro-max
subject: plans/260510-1600-v2-greenfield-rebuild/phase-03-ui-shell.md
stack: Next.js 15 App Router, shadcn/ui, Tailwind CSS, Zustand
---

# UI/UX Review: Phase 03 — UI Shell Redesign

## Verdict

**APPROVED WITH REVISIONS** — Cấu trúc tổng thể đúng hướng (route groups, sidebar, workspace-first). Nhưng có **4 blocking gaps** và **6 medium gaps** cần address trước khi implement để tránh phải refactor giữa chừng.

---

## What the Plan Gets Right ✅

| Area | Assessment |
|------|-----------|
| Route groups `(auth)` / `(app)` | Correct Next.js 15 App Router pattern — layout isolation |
| Fixed left sidebar | Correct per `adaptive-navigation` rule: ≥1024px → sidebar preferred |
| Workspace-first mental model | Aligns with SaaS best practice (workspace selector as entry) |
| Zustand for client state | Correct — no server state here, pure UI context |
| shadcn/ui primitives base | Correct — no reinventing atoms |
| Notification bell in header | Correct placement per `proactive alerts` principle |
| Sidebar nav hierarchy (grouped sections) | Correct — primary nav (Overview/Tasks/Goals/Analytics) vs secondary (Settings) |
| Delete old dashboard routes | Correct — clean reset avoids v1 technical debt leaking in |

---

## Blocking Gaps (Must Fix Before Implementation) 🚨

### 1. No Auth Middleware Specified

**Problem:** The plan defines `(auth)/` and `(app)/` route groups but doesn't define how redirects work.
Without `middleware.ts`, an unauthenticated user can directly access `/dashboard` and an authenticated user stays on `/login`.

**Required addition:**
```
apps/web/src/middleware.ts  ← missing from plan entirely
```
```ts
// Logic needed:
// - No session → redirect to /login
// - Has session but no workspace → redirect to /workspace/select  
// - Has session + workspace → allow through to (app)
// - On /login or /signup with active session → redirect to /dashboard
```

**Impact:** Without this, `(auth)` route group is cosmetic, not functional.

---

### 2. Tasks View Routes — Wrong UX Pattern

**Problem:** Plan routes task views as separate pages:
```
/dashboard/tasks/          ← Board
/dashboard/tasks/timeline  ← Timeline
/dashboard/tasks/table     ← Table
/dashboard/tasks/calendar  ← Calendar
```

This causes **full page navigation** on every view switch → layout re-renders, scroll position lost, sidebar flicker. SaaS tools (Linear, ClickUp, Notion) keep view switching within the same page.

**Correct pattern:** Single route with URL search param:
```
/dashboard/tasks?view=board    ← default
/dashboard/tasks?view=timeline
/dashboard/tasks?view=table
/dashboard/tasks?view=calendar
```
```tsx
// apps/web/src/app/(app)/dashboard/tasks/page.tsx
const view = searchParams.get('view') ?? 'board'
// Render <BoardView /> | <TimelineView /> | <TableView /> | <CalendarView />
```

**Benefits:**
- No full page reload on view switch → instant feel
- Shareable/bookmarkable URLs
- View tabs stay above the task list (not in sidebar)
- Sidebar only shows `Tasks` as single nav item (not 4 sub-items)

**Sidebar impact:** Remove Board/Timeline/Table/Calendar sub-items from sidebar. Replace with tab bar inside the Tasks page itself.

---

### 3. Mobile Navigation — No Concrete Plan

**Problem:** Plan says "Responsive: sidebar collapses on mobile" in Success Criteria but **no mobile nav component is specified**.

On mobile (< lg), a fixed `w-64` sidebar takes up the full screen. The plan doesn't define:
- What replaces the sidebar on mobile
- How the hamburger trigger works
- Whether it's a Sheet (overlay) or bottom nav

**Required addition to component list:**
```
apps/web/src/components/layout/mobile-sidebar-sheet.tsx  ← Sheet component
apps/web/src/components/layout/sidebar-trigger.tsx       ← Hamburger button for header
```

**Recommended pattern (shadcn/ui Sheet):**
```tsx
// Mobile: Sheet overlay from left
// Desktop: Fixed sidebar
// Breakpoint: hidden lg:flex for sidebar, flex lg:hidden for trigger
```

**Rule violated:** `adaptive-navigation` — large screens prefer sidebar, small screens need alternative.

---

### 4. Emoji Icons in Overview/Home Page Design

**Problem:** Plan's home page wireframe uses emoji as icons:
```
│ 🔴 2 Alerts     │ 📈 This Week  │
```

**Rule violated:** `no-emoji-icons` — use SVG icons (Lucide), not emojis as structural UI elements. Emojis are font-dependent, render inconsistently across OS, and can't be styled with Tailwind tokens.

**Fix:** Replace with Lucide icons:
```
🔴 → <AlertCircle className="h-4 w-4 text-destructive" />
📈 → <TrendingUp className="h-4 w-4 text-primary" />
```

This is a **blocking gap** because it's in a wireframe that developers will implement literally.

---

## Medium Gaps (Should Fix Before Implementation) ⚠️

### 5. `use-workspace-store` Too Thin

**Current plan:**
```ts
{ workspaceId, workspaceName, setWorkspace }
```

**Missing:** The Project Selector in the header needs a `projects[]` list. v1's `Header.tsx` fetches projects in a `useEffect` directly — this is a known anti-pattern (every page re-fetches on mount).

**Recommended store shape:**
```ts
// use-workspace-store.ts
{
  workspaceId: string | null
  workspaceName: string
  projects: Project[]          // ← add
  projectsLoading: boolean     // ← add
  setWorkspace: (id, name) => void
  fetchProjects: () => Promise<void>  // ← add
}
```

Centralizing projects in the workspace store means `project-selector.tsx` reads from store, not fetches independently.

---

### 6. `use-alert-store` Missing Data Strategy

**Current plan:**
```ts
{ alerts, unreadCount, markRead }
```

**Missing:** How do alerts get populated? No polling strategy, no API endpoint reference, no `fetchAlerts()` method. The notification bell will always show 0 without this.

**Recommended additions:**
```ts
{
  alerts: Alert[]
  unreadCount: number
  lastFetchedAt: Date | null   // ← for debounce
  markRead: (id: string) => void
  markAllRead: () => void
  fetchAlerts: () => Promise<void>  // ← polling entry point
}
```

Phase 03 only needs placeholder (0 alerts, no real data) but the store shape should be defined correctly now to avoid breaking changes in Phase 06 (Analytics Intelligence).

---

### 7. Missing `nav-group.tsx` — Collapsible Sidebar Groups

**Problem:** The sidebar has grouped sections (Tasks with 4 sub-items, Analytics with 4 sub-items, Settings with 3 sub-items). The plan lists `sidebar.tsx` as a single component but doesn't define how collapsible groups work.

At 240px wide, 13 nav items without grouping = visual overload. Groups should be collapsible.

**Add to component list:**
```
apps/web/src/components/layout/nav-group.tsx  ← collapsible group wrapper
```
```tsx
// Pattern: accordion-style or always-expanded depending on space
// Active child = parent stays open
// Use shadcn Collapsible primitive
```

---

### 8. No Z-Index Scale Defined

**Problem:** Phase 03 introduces 4+ overlapping UI layers:
- Notification bell dropdown
- Workspace selector dropdown  
- User menu dropdown
- Mobile sidebar sheet
- Future: modals, toasts

Without a defined z-index scale, these will conflict.

**Add to plan (or design-guidelines.md):**
```ts
// Suggested z-index tokens
z-sidebar    = z-40   // Fixed sidebar
z-header     = z-50   // Sticky header
z-dropdown   = z-60   // Popover/Select dropdowns
z-sheet      = z-70   // Mobile sidebar sheet
z-modal      = z-80   // Dialogs
z-toast      = z-90   // Toast notifications
```

**Rule:** `z-index-management` — define layered z-index scale.

---

### 9. Date Range Picker Not Addressed

**Problem:** v1 `Header.tsx` has a `DateRangePicker` in the center of the header. Phase 03's new header design (`[Logo][Workspace ▾][🔔][👤]`) doesn't mention it.

For analytics views, date range is critical context. Plan needs to decide:
- **Option A:** Keep in header globally (always visible)
- **Option B:** Move to per-page toolbar (Analytics pages only)
- **Option C:** Contextual — show in header only when on Analytics routes

**Recommendation:** Option B — move to per-page analytics toolbar. Not all pages need date range (Goals, Settings, Team don't).

---

### 10. No `use-auth-store` or Session State

**Problem:** Plan doesn't define where the current user object lives. The `user-menu.tsx` component needs user data (name, avatar, email). Without an auth store or server-side session passed to layout, the user menu will be empty/hardcoded.

**Phase 01 (Better Auth) handles auth itself, but Phase 03 needs to consume it.**

**Recommended:** Either `use-auth-store.ts` (client) or pass user from server layout via RSC → client context. The plan should state which approach.

---

## Component List — Revised

### Original Plan Components
```
✅ sidebar.tsx
✅ header.tsx
✅ workspace-selector.tsx
✅ project-selector.tsx
✅ notification-bell.tsx
✅ user-menu.tsx
✅ empty-state.tsx
✅ page-header.tsx
✅ data-badge.tsx        ← Note: may overlap with shadcn Badge; verify need
✅ loading-skeleton.tsx
```

### Add (Missing from Plan)
```
🆕 middleware.ts                           ← Auth redirect logic (BLOCKING)
🆕 layout/mobile-sidebar-sheet.tsx        ← Mobile sidebar (BLOCKING)
🆕 layout/sidebar-trigger.tsx             ← Hamburger button (BLOCKING)
🆕 layout/nav-group.tsx                   ← Collapsible sidebar groups
🆕 layout/nav-item.tsx                    ← Individual nav link (extract from sidebar)
```

### Route Architecture Change
```
❌ Remove:
  /dashboard/tasks/timeline/page.tsx
  /dashboard/tasks/table/page.tsx
  /dashboard/tasks/calendar/page.tsx

✅ Replace with:
  /dashboard/tasks/page.tsx  ← Single page, view via ?view= search param
```

---

## Design System Recommendations (ui-ux-pro-max)

**Product type:** Analytics Dashboard → **Data-Dense + Minimalism** style (correct for SEO SaaS)

| Token | Recommendation |
|-------|---------------|
| Primary | `#2563EB` (blue — trust, data) |
| Alert/CTA | `#F97316` (amber — actionable, urgent) |
| Background | `#F8FAFC` (off-white — clean density) |
| Text | `#1E293B` (slate-900 — high contrast) |
| Font | Inter (current) — keep, do not switch to Fira Code |

**Style:** Micro-interactions — small hover transitions (150ms), skeleton loaders, badge pulse for alerts. Aligns with plan's "Clean density" principle.

**Anti-patterns to avoid:**
- No emojis as icons (see Gap #4)
- No horizontal scroll on mobile
- No `cursor-default` on clickable elements
- No random z-index values

---

## Effort Estimate Assessment

**Plan says: ~6h**

| Task | Estimate |
|------|---------|
| Auth route groups + middleware | 1.5h |
| Layout components (sidebar, header, mobile) | 2h |
| Zustand stores (workspace, project, alert) | 0.5h |
| Overview/home placeholder page | 1h |
| Workspace select page | 0.5h |
| Type-check + lint pass | 0.5h |
| **Total (no bugs)** | **6h** |

**Verdict: 6h is achievable only if:**
1. Phase 01 (Better Auth) is fully complete and sessions work
2. The tasks view route issue is resolved upfront (not discovered mid-implementation)
3. Mobile sidebar is counted in this phase (not discovered missing at end)

**Revised realistic estimate: 7–8h** (with middleware debugging and mobile testing).

---

## Updated Phase-03 Todo (Revised)

```
- [ ] Create apps/web/src/middleware.ts (auth redirect logic)
- [ ] Delete old dashboard routes + components (as planned)
- [ ] Create (auth) route group + login/signup pages + layout
- [ ] Create (app) route group + layout with sidebar + header
- [ ] Build nav-group.tsx (collapsible sidebar section)
- [ ] Build nav-item.tsx (individual nav link atom)
- [ ] Build sidebar.tsx using nav-group + nav-item
- [ ] Build header.tsx (workspace selector + project selector + bell + user)
- [ ] Build workspace-selector.tsx dropdown
- [ ] Build project-selector.tsx dropdown
- [ ] Build notification-bell.tsx with unread badge
- [ ] Build user-menu.tsx with avatar + logout
- [ ] Build mobile-sidebar-sheet.tsx + sidebar-trigger.tsx
- [ ] Create workspace/select/page.tsx
- [ ] Create dashboard/overview page (placeholder, Lucide icons only — no emojis)
- [ ] Refactor tasks route to single page with ?view= search param
- [ ] Create use-workspace-store.ts (with projects[], fetchProjects())
- [ ] Adapt use-project-store.ts
- [ ] Create use-alert-store.ts (with fetchAlerts(), lastFetchedAt)
- [ ] Run npm run type-check
```

---

## Success Criteria (Revised)

```
- [ ] Unauthenticated → middleware redirects to /login (not 200 on /dashboard)
- [ ] Authenticated + no workspace → redirects to /workspace/select
- [ ] Login → workspace select → dashboard shell loads without flicker
- [ ] Sidebar shows all nav items with collapsible groups, active state works
- [ ] View switch (Board→Timeline) updates URL ?view= param, no full page reload
- [ ] Workspace selector shows user's workspaces from store
- [ ] Project selector reads from use-workspace-store (not independent fetch)
- [ ] Notification bell shows 0 (placeholder), badge hidden when 0
- [ ] User menu shows user name/email from session
- [ ] Mobile (375px): sidebar hidden, hamburger triggers sheet overlay
- [ ] Desktop (1024px+): sidebar fixed, hamburger hidden
- [ ] All routes accessible without 404
- [ ] No emojis used as icons anywhere in shell components
- [ ] npm run type-check passes
```

---

## Unresolved Questions

1. **Auth session access in Phase 03:** Better Auth session accessed via server component in `(app)/layout.tsx`, or via client hook? Phase 01 needs to define the consumption API before Phase 03 can implement `user-menu.tsx` correctly.

2. **Workspace auto-selection:** If user has exactly 1 workspace, should `/workspace/select` auto-redirect to dashboard? Plan doesn't specify. Recommendation: yes, skip select page if only 1 workspace.

3. **Sidebar width on desktop:** Plan says fixed sidebar but doesn't spec the collapsed/icon-only variant for power users who want more content width. Is an icon-only collapsed mode in scope for Phase 03 or deferred?

4. **Date range picker placement decision:** Header global vs per-page toolbar for analytics routes — needs decision before header.tsx implementation starts.

5. **Dark mode toggle:** v1 uses dark bg (`bg-card` dark). v2 plan says "clean density" which suggests light mode default. Is dark/light toggle in scope for Phase 03 shell?
