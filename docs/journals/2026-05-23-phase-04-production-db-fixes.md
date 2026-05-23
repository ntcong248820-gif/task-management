# Phase 04 Production DB Fixes — task_creation unblocked

**Date**: 2026-05-23 15:46  
**Severity**: Critical (all task CRUD broken in production)  
**Component**: Database — `tasks` table, Drizzle migration tracking  
**Status**: Fixed & verified — task creation works in production

---

## What Happened

After the UUID regex fix (`adee55a`) deployed, `/api/tasks` continued returning 500. Root cause was a **missing `target_url` column** in the production Supabase DB (new project `hipvuijrwcmdoeirtswf`).

Drizzle ORM's `SELECT *` tries to read every column defined in the schema. Since `tasks.target_url` existed in schema (migration 0007) but not in the production DB, every tasks query threw a DB error → 500.

---

## Root Causes (chain)

1. **Migration 0007 never ran on new Supabase project.** When the DB was migrated from the old paused project (`jtdeuxvwcwtqzjndhrlg`) to the new one, the data + schema were transferred manually, but migration 0007 (`ALTER TABLE tasks ADD COLUMN target_url text`) was not part of that transfer.

2. **`packages/db/.env` still pointed to the old project.** Root `.env` was already updated, but `packages/db/.env` (which drizzle-kit reads directly) still had `jtdeuxvwcwtqzjndhrlg`. So `npm run db:migrate` was connecting to the old (paused) project and failing.

3. **Drizzle migration tracking table missing.** The new Supabase project had no `drizzle.__drizzle_migrations` table — Drizzle didn't know migrations 0000–0006 were already applied, so it tried to re-run from scratch (failing immediately on `CREATE TABLE projects` since the table already existed).

---

## Fixes Applied

### Fix 1 — Apply `target_url` column manually
Applied via Supabase SQL editor (Supabase MCP → `execute_sql`):
```sql
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "target_url" text;
```

### Fix 2 — Update `packages/db/.env`
Changed `DATABASE_URL` from old project to new:
```
# Before
DATABASE_URL=postgresql://postgres.jtdeuxvwcwtqzjndhrlg:...@...pooler.supabase.com:5432/postgres

# After
DATABASE_URL=postgresql://postgres.hipvuijrwcmdoeirtswf:...@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### Fix 3 — Bootstrap Drizzle migration tracking on new project
Created `drizzle` schema + `__drizzle_migrations` table, inserted records for all 8 applied migrations (0000–0007) with correct SHA-256 hashes and timestamps.

### Fix 4 — Add migration 0007 to `_journal.json`
`packages/db/migrations/meta/_journal.json` was missing the idx=7 entry for `0007_phase04_target_url`. Added it to keep Drizzle's local state in sync.

**Result:** `npm run db:migrate` exits `✓ migrations applied successfully!` — no pending migrations.

---

## Verification

- `drizzle.__drizzle_migrations` has 8 rows (0000–0007)
- `information_schema.columns WHERE table_name='tasks' AND column_name='target_url'` → `{data_type: "text"}`
- Vercel runtime logs: `/api/tasks` returning 200 after fix
- Task creation flow confirmed working in production

---

## Lessons Learned

1. **DB migration checklist when switching Supabase projects:** Must re-run (or stamp) all migrations on the new project. Schema transfer alone is not enough — Drizzle's tracking table must be bootstrapped separately.

2. **Multiple `.env` files = silent override.** `packages/db/.env` silently overrides the root `.env` for drizzle-kit commands. Both files must be updated when rotating DB credentials.

3. **`target_url` should have been in the migration manifest.** When a migration file (`0007_phase04_target_url.sql`) is created outside of `drizzle-kit generate`, it must also be manually added to `_journal.json` to keep the local state consistent.

---

## Phase 04 Sign-off

With all production bugs resolved and verified:
- Frontend: 100% verified (7/7 TCs passed)
- Backend: UUID regex fixed, `target_url` column live, migration tracking clean
- Local tooling: `npm run db:migrate` works against production

**Phase 04 is officially complete. Phase 05 is ready to start.**
