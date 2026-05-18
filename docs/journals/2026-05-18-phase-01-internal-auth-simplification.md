---
date: 2026-05-18
type: implementation-journal
plan: plans/260510-1600-v2-greenfield-rebuild/
phase: 01-auth-workspace
status: simplified-for-internal-mvp
---

# Journal: Phase 01 Internal Auth Simplification

## Context

The internal MVP does not need full public-app auth ceremony. The live smoke exposed two blockers: Resend was not configured for verification email, and Better Auth Google login required an extra Google Console redirect URI. Both were unnecessary for current internal testing.

## What Changed

- Simplified Better Auth to email/password only.
- Enabled auto sign-in on signup and disabled required email verification.
- Signup now stores pending workspace name and routes directly to `/workspace`.
- Removed the login page Google button.
- Removed the login page forgot-password link.
- Removed forgot-password and reset-password pages.
- Removed Resend email helper and `resend` package dependency.
- Removed Resend from production env validation and docs.
- Updated v2 plan/docs so Phase 01 no longer blocks on Google login, email verification, password reset, or invite email.

## Removed Or Deferred

- Removed Better Auth Google social login from the internal MVP.
- Removed signup email verification.
- Removed password reset email flow.
- Removed reset-password UI.
- Removed forgot-password UI.
- Removed invite email callback.
- Removed `RESEND_API_KEY` as a required env var.
- Deferred change-password/self-serve recovery until internal usage proves it is needed.
- Deferred email-based invite flow until an email provider is intentionally added.

## Decisions

- Keep Better Auth instead of migrating to Supabase Auth because the existing workspace/session architecture already depends on Better Auth.
- Keep workspace/organization plugin because later phases depend on `workspaceId`.
- Keep GSC/GA4 Google OAuth integrations separate; only app login Google OAuth was removed.
- Accept manual password reset as an internal MVP operational process.

## Impact

- Phase 03 remains unblocked because it only needs session, workspace context, and dashboard guard.
- Phase 04 assignee/team surfaces can start with the current workspace member set; richer invite flow can return later.
- Production auth smoke is now simpler: signup -> workspace -> dashboard, then logout/login -> dashboard.

## Next

- Run simplified auth smoke with a real database.
- Start Phase 03 UI shell after local validation passes.
- Add password recovery/change-password later only when there is a real internal user need.

## Unresolved Questions

- Should `/workspace` stay as the canonical route, or should Phase 03 move it to `/workspace/select`?
