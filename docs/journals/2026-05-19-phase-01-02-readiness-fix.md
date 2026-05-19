# Phase 01/02 Readiness Fix

**Date**: 2026-05-19 22:28 +07
**Severity**: High
**Component**: Auth + workspace flow, Phase 02 business schema, production readiness
**Status**: Resolved

## What Happened

We shipped Phase 01 auth simplification and Phase 02 v2 API code, but production was still sitting on the old v1 business schema. The deployed API expected workspace-scoped v2 tables, while prod still had the old `projects` / `tasks` shapes. That mismatch broke authenticated `projects` and `tasks` reads in production and made Phase 03 look ready when it was not.

The other bug was smaller but still dumb: workspace creation redirected to `/dashboard` even if `organization.setActive` failed. That meant users could land in a shell with no active workspace and no clear reason why.

## The Brutal Truth

This was schema drift, plain and simple. We had code that assumed the new world, and production was still in the old one. It was frustrating because auth looked fine, the app shell looked fine, and the failure only showed up once real authenticated traffic hit the business APIs. We were one bad redirect away from making the UX look flaky on top of the schema mess.

## Technical Details

- Production DB had v1 tables/columns, not the v2 workspace schema.
- Deployed API expected `workspace_id`-scoped reads for `projects` and `tasks`.
- Migration source was reconciled in `packages/db/migrations/0006_phase02_v2_schema_reconcile.sql`.
- Legacy v1 business tables were preserved as `*_legacy_v1_20260519` instead of dropped.
- `apps/web/src/app/(auth)/workspace/page.tsx` now blocks redirect if `authClient.organization.setActive(...)` fails.

## What We Tried

- Reconciled the migration source of truth instead of piling on another manual prod patch.
- Applied the full v2 schema to production.
- Kept the old v1 tables as backups so the rollback path was not destroyed.
- Fixed the workspace redirect guard so create/select flows only redirect after active org set succeeds.

## Root Cause Analysis

Root cause was release order without enough production verification. We had local schema and app changes, but production still carried the old business schema. The API and DB were no longer speaking the same contract. The redirect bug came from assuming `setActive` would succeed and redirecting anyway.

## Lessons Learned

- Schema changes need live prod verification before Phase readiness is claimed.
- Migration source of truth must be reconciled before code starts depending on it.
- Redirects must follow state changes only after the state change succeeds.
- Preserving legacy tables is better than pretending the old data never existed.

## Next Steps

- Keep Phase 03 moving only against the v2 schema now in production.
- Re-check any future schema work against the live DB, not just local migration output.
- Decide whether `*_legacy_v1_20260519` tables stay as archive or get dropped later after a safe retention window.

