# Phase 06: Analytics Intelligence — Completion Journal

**Date**: 2026-05-24 14:30
**Severity**: Medium
**Component**: Alerts, Digests, Anomaly Detection
**Status**: Resolved

## What Happened

Completed Phase 06 implementation — built anomaly detection engine, weekly digest aggregation, and alert UI. Core system now detects content decay, cross-source discrepancies, and ranking anomalies, then surfaces them to users via CRUD alerts with per-user read tracking.

## The Brutal Truth

Code review caught two security bugs that would have shipped to production. The fixes were straightforward but shouldn't have required review to catch — the team needs stricter default patterns for multi-workspace queries and alert filtering logic.

## Technical Details

**New Components:**
- `alert-engine.ts` — Z-score detection (day-of-week normalized, 8-week same-DoW history, MIN_DATA_POINTS=4), content decay (30% impression threshold), cross-source correlation
- `weekly-digest.ts` — GSC aggregation + keyword position deltas
- `alert-reads` join table — per-user read state without modifying shared alert rows
- Cron endpoints protected by `verifyCronSecret`

**Critical Bugs Fixed:**

1. **C1 - Cross-workspace data leak**: Weekly digest queries lacked workspace/project filtering. Queries pulled ALL projects' GSC data. Fixed by fetching workspace projectIds first, then `inArray(gscDataAggregated.projectId, projectIds) AND project_id IN (...)`.

2. **C2 - Unread filter ineffective**: `unreadOnly` applied in-memory after `LIMIT 500`, filtering happened after truncation. Pushed `isNull(alertReads.id)` into WHERE clause.

3. **H1 - No read-all LIMIT**: Read endpoint had no row cap. Added 500-row ceiling.

4. **H2 - Uncapped pagination**: `limit`/`offset` params uncapped. Added `Math.min/max` sanitization.

## Key Decisions

- **Join table for reads** — not a boolean on alerts — enables multi-user state without modifying shared rows
- **Pre-check dedup** in `insertAlert()` instead of DB unique index — Drizzle doesn't support expression-based constraints
- **Promise.allSettled** in alert engine — isolates detector failures
- **No date-fns** — pure JS in api-app to avoid dependency bloat

## Next Steps

- Monitor alert accuracy in staging (watch for false positives on Z-score threshold)
- Analytics dashboard needs digest card + alerts count display finalized
- Notify squad: multi-workspace queries now require explicit project filtering as default pattern

