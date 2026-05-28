---
phase: 6
title: "Docs Tests & Handoff"
status: pending
priority: P1
effort: "3h"
dependencies: [2, 3, 4, 5]
---

# Phase 6: Docs Tests & Handoff

## Overview

Validate the completed settings/onboarding flow and sync project docs so the next reader knows what is code-complete, CLI-validated, browser-verified, and environment-blocked.

## Requirements

- Functional: add focused tests for hooks/components/routes touched by this plan.
- Functional: update roadmap, changelog, architecture/codebase summary, and a journal entry after implementation.
- Non-functional: do not overclaim live real-data verification if Google credentials or production cron evidence are unavailable.

## Architecture

Testing should follow existing repo patterns: web type-check/lint/build, focused web tests, and root tests only when local Postgres is available. Acceptance runbook covers browser and real Google OAuth verification.

## Related Code Files

- Modify: `docs/project-roadmap.md`
- Modify: `docs/codebase-summary.md`
- Modify: `docs/system-architecture.md`
- Modify: `docs/project-changelog.md`
- Create: `docs/journals/2026-05-26-settings-real-data-onboarding.md`
- Read/Run: `package.json`
- Read/Run: `apps/web/package.json`
- Optional Create: tests beside new hooks/components if current test structure supports it.

## Implementation Steps

1. Add focused tests where practical:
   - project form validation/mutation behavior
   - integration hook URL/body construction
   - query param success/error handling
   - team role rendering
2. Run validation:
   - `npm run type-check`
   - `npm run lint`
   - `npm --workspace @seo-impact-os/web run test`
   - `npm run build` with documented env handling
   - root `npm run test` only if local Postgres is available
3. Run or write browser acceptance for:
   - create project
   - connect GSC/GA4 or classify env blocker
   - manual sync and analytics data appearance
4. Update docs:
   - roadmap status
   - changelog
   - architecture OAuth/settings section
   - codebase summary settings section
   - journal with evidence and blockers
5. Prepare `/ck:cook` handoff summary with exact phase statuses.

## Success Criteria

- [ ] Type-check passes.
- [ ] Lint passes or any existing lint concern is documented honestly.
- [ ] Focused web tests pass.
- [ ] Build passes or env blockers are documented with exact missing vars.
- [ ] Acceptance runbook states `PASS`, `PASS_WITH_CONCERNS`, `BLOCKED`, or `FAIL`.
- [ ] Docs reflect real implementation status and no stale placeholder wording remains.

## Risk Assessment

- Risk: root tests require local Postgres and may be env-blocked. Mitigation: run what is CLI-verifiable and record DB blocker separately.
- Risk: docs can drift from implementation if updated before verification. Mitigation: docs update is last, after evidence.
