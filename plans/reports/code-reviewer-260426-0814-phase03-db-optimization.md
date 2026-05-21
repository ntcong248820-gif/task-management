# Code Review: Phase 03 DB Optimization — Check Constraints
**Date:** 2026-04-26
**File:** `packages/db/src/schema/tasks.ts`

---

## Overall Assessment

The change is minimal, correctly scoped, and achieves its goal: DB-level enforcement of enum-like text columns. One **critical pre-existing bug** surfaced in the test suite that the constraint makes visible. Two informational issues noted.

---

## Critical Issues

### [BLOCKING] Test uses `'in-progress'` (hyphen), constraint enforces `'in_progress'` (underscore)

**File:** `apps/api/src/routes/__tests__/tasks.test.ts:38`

```ts
// BUG — will now fail with check constraint violation
const inProgressTask = await createTestTask(testProjectId, { status: 'in-progress' });
expect(inProgressTask.status).toBe('in-progress');
```

The check constraint `status IN ('todo', 'in_progress', 'done')` is correct — it matches the Zod schema, shared types (`packages/types/src/index.ts`), and all frontend components. The test was silently wrong before the constraint existed. With the constraint live in the DB, this test will now fail at runtime when run against the real DB.

**Fix:** Change both lines in the test to `'in_progress'`.

This is the only breaking item. Everything else in the codebase uses `'in_progress'` consistently.

---

## Informational (Non-Blocking)

### [INFO] Case sensitivity — constraint does not guard against `'TODO'`, `'In_Progress'`, etc.

PostgreSQL `IN (...)` comparison is case-sensitive for `text` columns. The constraint will reject `'TODO'` or `'In_Progress'`. This is the correct and intended behavior given the codebase uses lowercase everywhere. No action needed unless the API receives user-supplied raw strings without normalization (Zod `.toLowerCase()` not applied — but Zod enum validation at the API boundary already rejects non-matching cases before the DB is touched, so this is defense-in-depth, not a gap).

### [INFO] `priorityCheck` is a defensible addition despite `priority` having a `.notNull()` default

The column is `NOT NULL` with default `'medium'`, so a NULL check is not needed (unlike `taskTypeCheck`). The constraint expression is correct as written: `priority IN ('low', 'medium', 'high')`. Keeping the check is worthwhile — it closes the direct-SQL attack vector (bypassing the API) and documents intent at the schema level. No change needed.

---

## Correctness Checklist

| Constraint | Expression | Nullable handling | Matches Zod | Matches TS types |
|---|---|---|---|---|
| `statusCheck` | `status IN ('todo', 'in_progress', 'done')` | Column is NOT NULL, no NULL guard needed | Yes | Yes |
| `taskTypeCheck` | `task_type IS NULL OR task_type IN (...)` | Correct — column is nullable | Yes | Yes |
| `priorityCheck` | `priority IN ('low', 'medium', 'high')` | Column is NOT NULL, no NULL guard needed | Yes | Yes |

All three expressions are syntactically correct for PostgreSQL. The Drizzle `sql\`...\`` template interpolation of `${table.column}` resolves to the quoted column name, not a string value — this is the correct pattern.

---

## Recommended Actions

1. **Fix test:** `apps/api/src/routes/__tests__/tasks.test.ts` lines 38–42 — change `'in-progress'` to `'in_progress'` (2 occurrences).

---

## Unresolved Questions

- Were the constraints applied with `NOT VALID` or validated against existing rows? If rows with `'in-progress'` exist in the production DB from before the constraint was applied, those rows would have caused the `ALTER TABLE ... ADD CONSTRAINT` to fail. Confirmation that the live DB had no such rows (or used `NOT VALID`) would be useful.
