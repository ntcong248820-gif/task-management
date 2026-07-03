# Project Progress — 2026-07-03

## Snapshot

| Area | Status | Evidence |
|------|--------|----------|
| v2 Greenfield Rebuild | Complete | `plans/260510-1600-v2-greenfield-rebuild/plan.md`, 7/7 phases complete |
| Settings & Real Data Onboarding | Complete | `plans/260526-1958-settings-and-real-data-onboarding-completion/plan.md`, 6/6 phases complete |
| Web CLI validation | Pass at last recorded run | Type-check clean, lint 0 warnings, web tests 46/46, build pass with placeholder env |
| Root API integration tests | Blocked in local env | Requires local Postgres; documented as `ECONNREFUSED` |
| Production browser acceptance | Previously FAIL, then fixes committed | Runbook had Team Settings FAIL; commits `132f836`, `de9274b`, `1992ab8` fixed follow-up bugs |
| Google OAuth/real sync acceptance | Partially blocked | Google passkey/test-user restrictions block full GSC/GA4 data-path verification |

## Active Delivery State

| Plan | Plan Status | Checkbox Progress | Read |
|------|-------------|-------------------|------|
| v2 Greenfield Rebuild | completed | 212/217, 98% | Product feature set is complete; residual unchecked items are stale/deferred verification notes |
| Settings & Real Data Onboarding | completed | 33/33, 100% | Current onboarding/settings plan is fully closed |
| Legacy hardening backlog | mixed | not current v2 scope | Keep as production-hardening backlog, not current phase status |

## Delivered Capabilities

- Auth/workspace foundation: Better Auth email/password, workspace roles, dashboard/API guards.
- Task OS: multi-view tasks, DB-backed timer, templates, goals, sprints, workload.
- Analytics intelligence: alerts, content decay, cross-source checks, recommendations, weekly digest.
- Analytics dashboards v2: overview, keyword/page deep dives, honest correlation date windows.
- Settings onboarding: project CRUD, GSC/GA4 cards, team settings, sync status/error UI.
- Cron: GitHub Actions calls GSC sync, GA4 sync, alert engine, weekly digest with `CRON_SECRET`.

## Latest Important Fixes

- `132f836`: fixed Team Settings crash, integration status UI shape, wrong first-site/property auto-select.
- `de9274b`: fixed GA4 sync 500, duplicate connection rows, stuck `syncing` status, unordered status lookup.
- `1992ab8`: widened GA4 numeric columns to avoid overflow on real TGDD GA4 data.

## Risks / Blockers

| Risk | Status | Next Action |
|------|--------|-------------|
| Full Google OAuth acceptance | Blocked | Add/verify Google Cloud test users; use account that can pass passkey/device checks |
| Full real data sync proof | Needs rerun | Re-run GSC/GA4 sync after OAuth access is unblocked and latest fixes are deployed |
| Root tests | Env-blocked | Run with local Postgres or CI/prod DB test env |
| Worktree noise | Present | Many generated `graphify-out/` files and tsbuildinfo artifacts are dirty/untracked |

## Recommended Next Steps

1. Re-run webapp acceptance after commits `132f836`, `de9274b`, `1992ab8` are deployed.
2. Specifically retest Team Settings TC-T01 to TC-T06.
3. Unblock Google OAuth test user/passkey, then retest TC-I02 onward and analytics data path.
4. Clean or ignore generated `graphify-out/` and `*.tsbuildinfo` artifacts before any release commit.
5. Run root tests with Postgres if preparing a release.

## Unresolved Questions

- Are the three latest fix commits already deployed to the Vercel production URL?
- Which Google account should be the official OAuth acceptance tester?
