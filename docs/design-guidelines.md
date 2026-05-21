# Design Guidelines

## Design System

Built on **shadcn/ui** (Radix UI primitives) + **Tailwind CSS**.

## Color Palette

| Token | Usage |
|-------|-------|
| `background` | Page background (dark gray) |
| `card` | Card/panel backgrounds |
| `primary` | Primary actions, active states |
| `muted` | Secondary text, labels |
| `border` | Borders, dividers |
| `destructive` | Delete, error states |

Use Tailwind's `bg-background`, `text-foreground`, `border-border` — never hardcode hex values.

## Typography

- Headings: `text-xl font-semibold` / `text-2xl font-bold`
- Body: `text-sm text-muted-foreground`
- Labels: `text-xs uppercase tracking-wide text-muted-foreground`
- All type uses the CSS variable font stack (Inter or system-ui)

## Component Hierarchy

| Level | Examples | Rule |
|-------|----------|------|
| Atoms | `Button`, `Badge`, `Input` | shadcn/ui only — no custom |
| Molecules | `FormField`, `SearchBar`, `StatCard` | Combine atoms |
| Organisms | `TaskCard`, `TimerWidget`, `KanbanColumn` | Feature logic |
| Templates | `DashboardLayout`, `KanbanBoard` | Page structure |

## Layout

- **Sidebar** fixed on left — `w-64`, dark background
- **Main content** takes remaining width with `p-6` padding
- **Header** `h-16` with project selector + user info
- Responsive: sidebar collapses on mobile (lg: breakpoint)

## Dashboard Charts (Recharts)

- Use `AreaChart` for time-series metrics (GSC clicks, GA4 sessions)
- Use `LineChart` for keyword position trends
- Use `BarChart` for distribution data
- Always add `ResponsiveContainer` wrapper
- Tooltips: dark background, white text, custom `ContentStyle`
- Task markers rendered as vertical `ReferenceLine` elements

## Kanban Board

- 3 columns: To Do | In Progress | Done
- Cards use `dnd-kit` for drag & drop
- Card shows: title, project tag, timer button, status badge
- Drop targets highlight on drag-over

## Status Badges

| Status | Color |
|--------|-------|
| `todo` | gray |
| `in_progress` | blue |
| `done` | green |
| `blocked` | red |

## Loading States

Use skeleton components (`KanbanBoardSkeleton`, chart skeleton) — never show blank/empty screens while loading.

## Empty States

Use `EmptyState` component with icon + description + CTA button.

## Forms

- All forms use controlled components with `useTaskForm` hook pattern
- Validation errors shown inline below the field
- Submit button disabled during loading
- Dialog-based forms — no inline forms in lists
