---
title: Debugger Fix Sync Back
date: 2026-07-03
skill: ck:project-management
status: fixed-with-local-db-test-blocker
---

# Debugger Fix Sync Back

## Summary

Fixed P0/P1 code issues from debugger report that did not require external OAuth reconnect or DB provenance migration.

## Completed

| Area | Result |
|---|---|
| Region | DB-backed Next route segments pinned to `sin1` |
| Cron truth | Sync endpoints fail on business errors; workflow parses body errors |
| Alert freshness | Alert/digest jobs no longer run after failed upstream sync |
| Integration source | Status/API/UI show GSC site and GA4 property |
| Discovery writes | `save=true` bulk-save path disabled |
| Correlation validation | Invalid/reversed date ranges return 400 |
| Docs | Changelog, architecture note, journal updated |

## Validation

| Command | Result |
|---|---|
| `npm run type-check` | PASS |
| `npm run lint` | PASS |
| `npm --workspace @seo-impact-os/web run test` | PASS, 44/44 |
| `npm run build` | BLOCKED without required env; PASS with placeholder env |
| `npm run test` | PASS web; BLOCKED API task tests by local DB missing `tasks.target_url` |

## Not Fixed Yet

- Production `invalid_grant` needs real reconnect in app.
- Raw analytics provenance columns (`gsc_data.site_url`, `ga4_data.property_id`) need migration/backfill plan.
- Region improvement must be verified after deployment.

## Unresolved Questions

- Current production deploy SHA?
- Should each project support one active source per provider or multiple active resources?
- Should historical data reset or be partitioned when active source changes?
