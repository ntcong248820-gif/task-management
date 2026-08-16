---
title: "Phase 3: Sync Health & Source Management"
date: 2026-08-16
summary: "Active-source constraints, honest sync health derivation, and source-switch confirmation shipped for GSC/GA4 integrations"
---

# Phase 3: Sync Health & Source Management

## What happened

Implemented Phase 3 of the SEO Impact OS data-trust roadmap: sync health and source management for GSC/GA4 connections.

- Migration `0009_integration_sync_health.sql` added `is_active`, `last_attempted_at`, `last_rows_synced`, `last_duration_ms` to `gsc_connections`/`ga4_connections`, with partial unique indexes enforcing exactly one active GSC source and one active GA4 source per `(workspace_id, project_id)`.
- Built `packages/api-app/src/utils/integration-health.ts`: pure `deriveHealthState()` (healthy/stale/needs_reconnect/error/syncing, with a 15-min stuck-syncing timeout that escalates to `error`) and `isInvalidGrantError()` for OAuth revocation detection.
- Added a source-change confirmation flow to `gsc.ts`/`ga4.ts` sync routes: switching GSC site or GA4 property requires an explicit `confirmSourceChange` flag; on confirmation, old provider analytics data is deleted scoped strictly to that project/provider, then the new source is activated.
- Cron jobs (`sync-gsc.ts`, `sync-ga4.ts`) and manual sync routes now write health fields on both success and failure paths.
- `/status` endpoint and web UI (`integration-card.tsx`, `use-integrations-settings.ts`) surface health badges, last attempt, rows synced, and the source-change confirmation dialog.
- Code review findings addressed: `gsc.ts` branch logic (stale/needs_reconnect/error/healthy), `index.ts` missing `lastAttemptedAt` wiring for the stuck-syncing check.

## Decision

Applying migration 0009 to production via the normal Node/tsx/drizzle-kit CLI path repeatedly failed with `PostgresError: (ENOTFOUND) tenant/user postgres.jtdeuxvwcwtqzjndhrlg not found` against the Supabase Session Mode Pooler, despite a correct `DATABASE_URL` and working DNS resolution. The identical connection string worked when run inside a vitest test process. Rather than keep debugging the CLI path, applied the migration as a throwaway vitest test (`db.execute(sql.raw(stmt))` per statement, split on `--> statement-breakpoint` markers) — vitest's process/module bootstrap was the only proven-working path in this repo's environment. Root cause of the CLI-vs-vitest discrepancy was not diagnosed, only worked around.

## Next steps

- 96/96 tests passing repo-wide, lint clean, type-check clean across all 8 packages.
- Full-plan sync-back completed: phase-03 marked `completed` (9/9 todo, 6/6 success criteria). Phase-01 backfilled with 2026-07-10 verification evidence (status stays "Pass w/ Concerns" — unrelated OAuth/region blockers carried forward). Phase-02 already correct. Phases 4-7 confirmed correctly pending, no work started.
- Open item: if the Node/tsx CLI-vs-vitest DNS discrepancy resurfaces on a future migration, worth actually diagnosing rather than re-working-around.
- Open item: no dedicated integration test simulates an OAuth-callback-level source-switch race; current coverage is unit-level (`deriveHealthState`/`isInvalidGrantError`) plus the DB-level partial unique index as the actual enforcement mechanism. Flag for Phase 4 if analytics dashboards start relying on active-source assumptions.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
