# Memory Index

- [Global middleware auth pattern](feedback-global-auth-middleware.md) — workspaceId/userId set once in app.ts, not per-route; don't flag routes for "missing auth check" without checking app.ts first.
- [Alert-to-task idempotency gap](project-alert-task-race-condition.md) — create-task double-click guard is app-level only, no DB unique constraint on linkedTaskId; race window exists under concurrent requests.
