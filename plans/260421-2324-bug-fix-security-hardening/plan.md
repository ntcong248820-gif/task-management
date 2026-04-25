# Bug Fix & Security Hardening Plan

**Created:** 2026-04-21  
**Branch:** main  
**Review report:** [reviewer-260421-2324-codebase-bugs-and-security.md](../reports/reviewer-260421-2324-codebase-bugs-and-security.md)

## Overview

15 issues found across security, OAuth bugs, hardcoded values, and code quality.
4 phases ordered by risk — critical security first.

## Phases

| # | Phase | Status | Issues |
|---|-------|--------|--------|
| 1 | [Security Critical](./phase-01-security-critical.md) | ✅ Done | S1, S2, S3 |
| 2 | [OAuth Flow Fixes](./phase-02-oauth-flow-fixes.md) | ✅ Done | O1, O2, O3, O4 |
| 3 | [Remove Hardcoded Values](./phase-03-remove-hardcoded-values.md) | ✅ Done | H1, H2, H3 |
| 4 | [Error Handling & Code Quality](./phase-04-error-handling-quality.md) | 🔲 Todo | E1–E3, Q1–Q5 |

## Priority Order

1. **Phase 1 first** — token exposure is production risk right now
2. **Phase 2** — OAuth bugs cause silent failures for users
3. **Phase 3** — hardcoded values break multi-env deployments
4. **Phase 4** — quality/maintenance, can be done incrementally

## Key Dependencies

- Phase 1 (S1) requires `ENCRYPTION_KEY` env var set on Render — verify before deploying
- Phase 2 (O3) requires DB migration to add `last_synced_at` column
- Phase 3 (H2) requires a Zustand `project-store` or context to be read in all hooks
- Phase 4 (Q3) requires `.gitignore` update before deleting `.js` files
