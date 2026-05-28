---
phase: 4
title: "Team Settings"
status: complete
priority: P2
effort: "4h"
dependencies: [1]
---

# Phase 4: Team Settings

## Overview

Replace the Team settings placeholder with an internal-MVP team view: current members, roles, and clear invite boundary.

## Requirements

- Functional: list current workspace members with role and user identity.
- Functional: show owner/admin/member/viewer role meanings.
- Functional: allow role changes only if Better Auth client/server contracts are verified and permissions allow it.
- Functional: show invite email as deferred unless an email provider is intentionally added.
- Non-functional: never silently re-enable Resend/email verification/password reset/Google social login.

## Architecture

Use Better Auth organization plugin as source of truth for workspace members and roles. If client methods are insufficient or unstable, add a small Hono read-only team route backed by Better Auth schema tables and existing workspace guard.

## Related Code Files

- Modify: `apps/web/src/app/dashboard/settings/team/page.tsx`
- Read: `apps/web/src/lib/auth-client.ts`
- Read: `packages/auth-config/src/index.ts`
- Read: `packages/auth-config/src/permissions.ts`
- Read: `packages/db/src/schema/auth-schema.ts`
- Optional Create: `apps/web/src/hooks/use-team-settings.ts`
- Optional Create: `packages/api-app/src/routes/team.ts`
- Optional Modify: `packages/api-app/src/app.ts`

## Implementation Steps

1. Verify Better Auth organization client methods available in the installed package:
   - list members
   - update member role
   - remove member
   - invite member
2. Implement the smallest real Team Settings page:
   - member list
   - role badge
   - active workspace name
   - role permission summary
3. If role update is supported, add guarded owner/admin role updates.
4. Keep invite UI disabled/deferred with concise copy until email provider is added.
5. If Better Auth client cannot list members cleanly, add a read-only Hono `GET /api/team/members` route using existing workspace guard.
6. Add mutation loading/error states and avoid optimistic destructive member removal unless tested.

## Success Criteria

- [ ] Team page no longer shows placeholder state.
- [ ] Current workspace members and roles are visible.
- [ ] Role permission summary matches `packages/auth-config/src/permissions.ts`.
- [ ] Invite flow is either real and verified, or explicitly deferred in UI/docs.
- [ ] No deferred auth features are accidentally reintroduced.

## Risk Assessment

- Risk: Better Auth organization APIs may not match memory/docs. Mitigation: verify against installed package/types before coding.
- Risk: removing or demoting the last owner can lock workspace administration. Mitigation: guard last-owner changes.
