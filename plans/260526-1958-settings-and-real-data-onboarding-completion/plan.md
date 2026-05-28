---
title: "Settings & Real Data Onboarding Completion"
description: "Finish the post-v2 settings surfaces so a workspace can create projects, connect GSC/GA4, sync real data, and verify cron/data readiness."
status: pending
priority: P1
branch: "main"
tags: [settings, onboarding, projects, gsc, ga4, team, real-data]
blockedBy: []
blocks: []
created: "2026-05-26T12:58:40.866Z"
createdBy: "ck:plan"
source: skill
---

# Settings & Real Data Onboarding Completion

## Overview

V2 phases 01-07 are code-complete, but Settings still has placeholder pages for Projects, Team, and Integrations. This plan turns those placeholders into the real onboarding path: create/select a project, connect GSC/GA4, discover site/property choices, run manual sync, see sync errors, and verify scheduled real-data jobs.

Non-goals: no Better Auth Google social login, no email invite delivery unless an email provider is intentionally added, no analytics engine rewrite, no Ahrefs/backlinks/competitor scope, no fake/demo data.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Context & Contracts](./phase-01-context-contracts.md) | Complete |
| 2 | [Projects Settings](./phase-02-projects-settings.md) | Complete |
| 3 | [Integrations Onboarding](./phase-03-integrations-onboarding.md) | Complete |
| 4 | [Team Settings](./phase-04-team-settings.md) | Pending |
| 5 | [Cron & Real Data Verification](./phase-05-cron-real-data-verification.md) | Pending |
| 6 | [Docs Tests & Handoff](./phase-06-docs-tests-handoff.md) | Pending |

## Dependencies

- Upstream: `plans/260510-1600-v2-greenfield-rebuild/` delivered auth/workspace, schema, shell, task views, goals/sprints, analytics intelligence, and analytics dashboards.
- Related but not blocking: `plans/260426-1337-infra-restructuring/` owns historical GitHub Actions cron decisions; this plan only extends cron calls to already-existing alert/digest endpoints.

## Context Links

- Scout: `plans/reports/scout-260526-1958-settings-real-data-onboarding.md`
- Architecture: `docs/system-architecture.md`
- Code map: `docs/codebase-summary.md`
- Roadmap: `docs/project-roadmap.md`

## Success Criteria

- [ ] New workspace can create a project from Settings and the header selector updates without reload.
- [ ] Integrations settings can connect GSC and GA4 for the selected project.
- [ ] User can discover/select GSC site and GA4 property, then manually sync real data.
- [ ] Settings surfaces display connection state, last sync, sync status, and sync error.
- [ ] Team settings show current members/roles and enforce the internal-MVP invite boundary.
- [ ] Cron workflow calls real-data sync and analytics intelligence endpoints, with runbook evidence.
