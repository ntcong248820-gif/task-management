# Phase 01 — Task Classification

**Status:** pending  
**Effort:** ~1.5h  
**Priority:** P1 (blocks Phase 02 `affectsWebsite` filter)

## Context

- `tasks schema`: has `taskType TEXT` (technical|content|links) — no `affectsWebsite`
- `TaskDialog.tsx`: UI missing `taskType` selector entirely
- `useTaskForm.ts`: no `taskType` or `affectsWebsite` in form state
- `task-schema.ts`: Zod schema has `taskType` but UI never sends it
- `correlation.ts`: includes ALL done tasks as annotations regardless of type

## Goal

1. Add `affectsWebsite boolean default true` to tasks DB schema
2. Extend `taskType` to include `planning` and `meeting` (non-impact types)
3. Auto-set `affectsWebsite=false` for `planning|meeting` types
4. Surface `taskType` and `affectsWebsite` in TaskDialog UI
5. Filter correlation annotations to only `affectsWebsite=true` tasks

## Related Files

**Modify:**
- `packages/db/src/schema/tasks.ts` — add field + extend check constraint
- `packages/api-app/src/schemas/task-schema.ts` — extend Zod enum
- `packages/api-app/src/routes/tasks.ts` — handle `affectsWebsite` in create/update
- `packages/api-app/src/routes/correlation.ts` — filter tasks by `affectsWebsite=true`
- `apps/web/src/hooks/useTaskForm.ts` — add `taskType` + `affectsWebsite` to form state
- `apps/web/src/components/TaskDialog.tsx` — add taskType Select + affectsWebsite Switch

## Implementation Steps

### Step 1 — DB Schema (`packages/db/src/schema/tasks.ts`)

Add `affectsWebsite` field after `taskType`:
```ts
affectsWebsite: boolean('affects_website').notNull().default(true),
```

Extend check constraint:
```ts
taskTypeCheck: check(
  'tasks_task_type_check',
  sql`${table.taskType} IS NULL OR ${table.taskType} IN ('technical', 'content', 'links', 'planning', 'meeting')`
),
```

### Step 2 — Zod Schema (`packages/api-app/src/schemas/task-schema.ts`)

```ts
taskType: z.enum(['technical', 'content', 'links', 'planning', 'meeting']).nullable().optional(),
affectsWebsite: z.boolean().optional().default(true),
```

### Step 3 — Tasks Route (`packages/api-app/src/routes/tasks.ts`)

In create handler, add:
```ts
affectsWebsite: body.affectsWebsite ?? true,
```

In the `NewTask` object. Same for update handler.

### Step 4 — DB Migration

```bash
npm run db:push
```

This adds the `affects_website` column (default true) and updates the check constraint.
Existing rows automatically get `affects_website = true` (correct — all existing tasks
were website-related).

### Step 5 — Correlation Filter (`packages/api-app/src/routes/correlation.ts`)

In the `completedTasks` query, add filter:
```ts
eq(tasks.affectsWebsite, true),
```

This means `planning|meeting` tasks are silently excluded from chart annotations.

### Step 6 — `useTaskForm.ts`

Add to `TaskFormData` interface:
```ts
taskType: string;        // '' | 'technical' | 'content' | 'links' | 'planning' | 'meeting'
affectsWebsite: boolean;
```

Add to initial state:
```ts
taskType: '',
affectsWebsite: true,
```

In pre-fill (edit mode):
```ts
taskType: task.taskType || '',
affectsWebsite: task.affectsWebsite ?? true,
```

Auto-derive `affectsWebsite` when `taskType` changes:
```ts
const NON_IMPACT_TYPES = ['planning', 'meeting'];
// In updateField for taskType:
if (field === 'taskType') {
  const isImpact = !NON_IMPACT_TYPES.includes(value as string);
  setFormData(prev => ({ ...prev, taskType: value, affectsWebsite: isImpact }));
  return;
}
```

Add `taskType` and `affectsWebsite` to `requestBody` in `handleSubmit`.

### Step 7 — `TaskDialog.tsx`

Add Task Type Select before Status/Priority row:
```tsx
<div className="grid gap-2">
  <Label htmlFor="taskType">Task Type</Label>
  <Select value={formData.taskType} onValueChange={(v) => updateField('taskType', v as any)}>
    <SelectTrigger id="taskType">
      <SelectValue placeholder="Select type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="technical">Technical</SelectItem>
      <SelectItem value="content">Content</SelectItem>
      <SelectItem value="links">Links</SelectItem>
      <SelectItem value="planning">Planning</SelectItem>
      <SelectItem value="meeting">Meeting</SelectItem>
    </SelectContent>
  </Select>
</div>
```

Show `affectsWebsite` as read-only badge (auto-derived, no manual toggle needed):
```tsx
{formData.taskType && (
  <p className="text-xs text-muted-foreground">
    {formData.affectsWebsite
      ? '✓ Will appear as annotation on correlation chart'
      : '○ Will not appear on correlation chart (non-website task)'}
  </p>
)}
```

## Todo

- [ ] Add `affectsWebsite` field to `packages/db/src/schema/tasks.ts`
- [ ] Extend `taskTypeCheck` constraint to include `planning|meeting`
- [ ] Update Zod schema in `task-schema.ts`
- [ ] Handle `affectsWebsite` in `tasks.ts` create/update routes
- [ ] Run `npm run db:push` to apply migration
- [ ] Add `eq(tasks.affectsWebsite, true)` filter in `correlation.ts`
- [ ] Add `taskType` + `affectsWebsite` to `useTaskForm.ts` state and submit body
- [ ] Add taskType Select + auto-derived badge in `TaskDialog.tsx`
- [ ] Run `npm run type-check` and verify no errors

## Success Criteria

- [ ] DB column `affects_website` exists with default `true`
- [ ] TaskDialog shows Task Type selector with all 5 types
- [ ] Selecting `planning` or `meeting` auto-sets `affectsWebsite=false`
- [ ] Correlation chart only includes tasks where `affectsWebsite=true`
- [ ] `npm run type-check` passes

## Risk

- DB migration adds NOT NULL column with default → safe, no existing data breaks
- Existing tasks get `affectsWebsite=true` (correct default for all existing SEO tasks)
