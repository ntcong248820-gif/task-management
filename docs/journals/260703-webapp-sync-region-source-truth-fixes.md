---
title: Webapp Sync Region Source Truth Fixes
date: 2026-07-03
type: fix-journal
---

# Webapp Sync Region Source Truth Fixes

## Context

Debugger report found slow API calls, green-but-empty cron sync, unclear GSC/GA4 source selection, weak integration source display, and missing API date validation.

## What Changed

- Pinned Next/Hono API, Better Auth API, and dashboard auth layout to Vercel `sin1`.
- Made GSC/GA4 cron routes fail when sync jobs return business errors.
- Made cron workflow parse JSON body and fail on `ok=false` or non-empty `errors`.
- Stopped alert/digest jobs from running after failed upstream sync.
- Added GSC site/permission and GA4 property metadata to integration status.
- Displayed selected source in integration cards after reload.
- Disabled `save=true` bulk-save discovery path; selected-resource sync remains the write path.
- Rejected invalid or reversed `/api/correlation/impact-window` date ranges.

## Validation

| Check | Result |
|---|---|
| `npm run type-check` | Pass |
| `npm run lint` | Pass |
| `npm --workspace @seo-impact-os/web run test` | Pass, 44/44 |
| `npm run build` | Pass with placeholder required env |
| `npm run test` | Blocked by local API test DB missing `tasks.target_url`; web tests pass |

## Decisions

- Treat sync job `errors` as failed cron, not soft success.
- Do not fake `lastSync` with connection creation time.
- Keep one explicit selected resource as source of truth until multi-resource provenance is designed.

## Next

- Reconnect GSC/GA4 in production to replace invalid refresh tokens.
- Redeploy and verify `x-vercel-id` no longer shows `sin1::iad1`.
- Migrate/local-sync test DB schema so root API tests can run clean.
