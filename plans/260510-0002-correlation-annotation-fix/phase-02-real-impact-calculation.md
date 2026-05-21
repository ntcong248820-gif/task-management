# Phase 02 — Real Impact Calculation

**Status:** pending  
**Effort:** ~1.5h  
**Blocked by:** Phase 01 (needs `affectsWebsite` filter in place)

## Context

`correlation.ts:163`:
```ts
impact: Math.round(Math.random() * 15 + 5), // Mock impact %
```

The `RecentTasksTable` shows `+12%`, `+8%`... these are random. The tasks schema
already has `actualImpact: jsonb` and `expectedImpactStart/End: date` — never populated.

## Goal

Replace `Math.random()` with real before/after click comparison using GSC data.
Populate `actualImpact` on the task record when enough post-completion data exists.

## Impact Window by Task Type

```
technical → 14 days
content   → 30 days
links     → 60 days
planning  → N/A (excluded by affectsWebsite filter)
meeting   → N/A (excluded by affectsWebsite filter)
null/other → 14 days (safe default)
```

## Calculation Formula

```
before_period = [completedAt - window, completedAt - 1]
after_period  = [completedAt, completedAt + window - 1]

before_clicks = SUM(clicks) for project in before_period
after_clicks  = SUM(clicks) for project in after_period

impact = round((after_clicks - before_clicks) / before_clicks * 100, 1)
```

**Edge cases:**
- `before_clicks = 0` → return `null` (avoid divide-by-zero)
- `completedAt + window > today` → insufficient after data → return `null` (show "Pending")
- No GSC data at all → return `null`

## Related Files

**Modify:**
- `packages/api-app/src/routes/correlation.ts` — replace Math.random(), add impact helper

## Implementation Steps

### Step 1 — Impact Window Helper (top of `correlation.ts`)

```ts
const IMPACT_WINDOWS: Record<string, number> = {
  technical: 14,
  content: 30,
  links: 60,
};

function getImpactWindowDays(taskType: string | null): number {
  return IMPACT_WINDOWS[taskType ?? ''] ?? 14;
}
```

### Step 2 — `calculateTaskImpact()` Helper

Add after the window helper:

```ts
async function calculateTaskImpact(
  projectId: number,
  completedAt: Date,
  taskType: string | null
): Promise<number | null> {
  const windowDays = getImpactWindowDays(taskType);
  const today = new Date();

  // Not enough after-data yet
  const afterEnd = new Date(completedAt);
  afterEnd.setDate(afterEnd.getDate() + windowDays);
  if (afterEnd > today) return null;

  const beforeStart = new Date(completedAt);
  beforeStart.setDate(beforeStart.getDate() - windowDays);
  const completedStr = completedAt.toISOString().split('T')[0];
  const beforeStartStr = beforeStart.toISOString().split('T')[0];
  const afterEndStr = afterEnd.toISOString().split('T')[0];

  const [beforeResult, afterResult] = await Promise.all([
    db.select({ clicks: sql<number>`COALESCE(SUM(${gscData.clicks}), 0)` })
      .from(gscData)
      .where(and(
        eq(gscData.projectId, projectId),
        gte(gscData.date, beforeStartStr),
        lte(gscData.date, completedStr),
      )),
    db.select({ clicks: sql<number>`COALESCE(SUM(${gscData.clicks}), 0)` })
      .from(gscData)
      .where(and(
        eq(gscData.projectId, projectId),
        gte(gscData.date, completedStr),
        lte(gscData.date, afterEndStr),
      )),
  ]);

  const before = Number(beforeResult[0]?.clicks ?? 0);
  const after = Number(afterResult[0]?.clicks ?? 0);

  if (before === 0) return null;
  return Math.round((after - before) / before * 100 * 10) / 10;
}
```

### Step 3 — Replace Mock in `recentImpactTasks`

Replace the current `.map()` block (lines ~159-165):

```ts
// OLD:
recentImpactTasks: completedTasks.slice(0, 5).map(t => ({
  id: t.id,
  title: t.title,
  type: t.taskType || 'technical',
  date: t.completedAt?.toISOString().split('T')[0],
  impact: Math.round(Math.random() * 15 + 5), // <-- REMOVE THIS
})),

// NEW:
const recentImpactTasks = await Promise.all(
  completedTasks.slice(0, 5).map(async (t) => {
    const impact = t.completedAt
      ? await calculateTaskImpact(projectId, t.completedAt, t.taskType ?? null)
      : null;
    return {
      id: t.id,
      title: t.title,
      type: t.taskType || 'technical',
      date: t.completedAt?.toISOString().split('T')[0],
      impact,
    };
  })
);
```

### Step 4 — Update `RecentTasksTable.tsx` to Handle `null` Impact

In `apps/web/src/components/features/dashboard/RecentTasksTable.tsx`,
update the impact cell:

```tsx
// OLD:
<td className="px-4 py-3 text-right text-green-600 font-bold">+{task.impact}%</td>

// NEW:
<td className="px-4 py-3 text-right font-bold">
  {task.impact === null ? (
    <span className="text-muted-foreground text-xs">Pending</span>
  ) : (
    <span className={task.impact >= 0 ? 'text-green-600' : 'text-red-500'}>
      {task.impact >= 0 ? '+' : ''}{task.impact}%
    </span>
  )}
</td>
```

### Step 5 — Update TypeScript type

In `apps/web/src/app/dashboard/page.tsx`, update `RecentTask` interface:
```ts
interface RecentTask {
  id: number;
  title: string;
  type: string;
  date: string;
  impact: number | null;  // null = pending
}
```

## Todo

- [ ] Add `IMPACT_WINDOWS` and `getImpactWindowDays()` to `correlation.ts`
- [ ] Add `calculateTaskImpact()` async helper to `correlation.ts`
- [ ] Replace `Math.random()` with `await Promise.all(...)` block
- [ ] Update `RecentTask` interface in `dashboard/page.tsx` (`impact: number | null`)
- [ ] Update `RecentTasksTable.tsx` to render `null` as "Pending"
- [ ] Run `npm run type-check` — verify no errors
- [ ] Manual test: verify impact shows real numbers or "Pending" (not random)

## Success Criteria

- [ ] No `Math.random()` left in codebase (`grep -r "Math.random" packages/api-app`)
- [ ] Impact values are stable on repeated page loads (not random each time)
- [ ] Tasks completed < window days ago show "Pending"
- [ ] Tasks with 0 before-clicks show "Pending" (not divide-by-zero error)
- [ ] Negative impact renders in red (traffic dropped after task)

## Performance Note

At most 5 tasks × 2 queries each = 10 extra DB queries per correlation request.
Each is a simple SUM with index (`gsc_data_project_date_idx`). Acceptable.
