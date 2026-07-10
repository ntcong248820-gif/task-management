---
phase: 7
title: "Team Ops Expansion Gates"
status: pending
priority: P3
effort: "1-2d planning + optional implementation"
dependencies: [6]
---

# Phase 7: Team Ops Expansion Gates

## Context Links

- `plans/reports/brainstorm-260703-2324-seo-impact-os-product-gap-proposal.md`
- `plans/reports/brainstorm-260707-0022-seo-impact-os-roadmap-after-assessment.md`
- `docs/project-roadmap.md`
- `apps/web/src/app/dashboard/settings/team/page.tsx`
- `apps/web/src/hooks/use-team-settings.ts`
- `packages/auth-config/src/permissions.ts`

## Overview

Close this roadmap by recording what stays deferred after data trust/reporting: broad team operations and external SEO data sources. This phase prevents random feature creep and keeps current focus on analytics + task management.

## Key Insights

- Team settings exist, but invite email, comments/activity logs, and team notifications are deferred.
- Monitoring and uptime are still listed in hardening backlog.
- External SEO data sources are explicitly deferred. Do not choose rank tracker/SERP/backlink yet.
- Alert-to-task from Phase 5 is the only workflow expansion in this plan.

## Requirements

- Functional: document post-Phase-6 gates and update roadmap/backlog with explicit deferrals.
- Non-functional: no team-ops implementation and no external SEO integration inside this plan.

## Architecture

This is a decision/guardrail phase, not an implementation phase by default.

Allowed outputs:
- Add monitoring checklist/runbook.
- Add team-ops deferral note.
- Add external-data deferral note.
- Add integration readiness template for future providers without picking a provider.

## Related Code Files

- Read: `apps/web/src/app/dashboard/settings/team/page.tsx`
- Read: `apps/web/src/hooks/use-team-settings.ts`
- Read: `packages/auth-config/src/permissions.ts`
- Create: docs/runbooks or docs/decisions if decisions are approved.
- No source code implementation expected unless monitoring docs require small config references.

## Implementation Steps

1. Review Phase 1-6 completion metrics.
2. Record decision: broad team ops deferred until after Phase 6 and requires a separate plan.
3. Record decision: external SEO data sources deferred; no rank tracker/SERP/backlink selection now.
4. Add production monitoring plan:
   - Sentry or equivalent.
   - uptime check.
   - cron business-result alert.
5. Create external integration readiness checklist:
   - source identity.
   - sync health.
   - freshness.
   - provenance.
   - export/report metadata.
6. Update roadmap with next approved direction: analytics/task management first, team ops later, external SEO later.

## Todo List

- [ ] Review Phase 1-6 completion metrics.
- [ ] Record team ops deferred.
- [ ] Record external SEO data deferred.
- [ ] Define monitoring stack.
- [ ] Create external integration readiness checklist.
- [ ] Update roadmap with next approved direction.

## Success Criteria

- [ ] No external SEO integration starts in this plan.
- [ ] Team ops remains deferred beyond alert-to-task.
- [ ] Monitoring decision is explicit.
- [ ] Roadmap is updated with approved next milestone.

## Risk Assessment

- Risk: phase becomes vague backlog dumping. Mitigation: treat as gate with explicit yes/no decisions.
- Risk: overbuilding team features. Mitigation: only build what internal MVP needs.
- Risk: external integrations distract from analytics/task management. Mitigation: readiness checklist exists, provider choice deferred.

## Security Considerations

- Team permissions may affect source/report visibility. Any future permission granularity must be reviewed against `packages/auth-config`.

## Next Steps

After Phase 6, create a separate plan only if the next approved priority is team ops. External SEO data remains parked until analytics/task management is stable.
