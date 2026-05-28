# Phase 02: Projects Settings — Real CRUD Replaces Placeholder

**Date:** 2026-05-27 14:30  
**Severity:** Medium (bug fix + feature)  
**Component:** Settings / Project Management  
**Status:** DONE (shipped + code review fixes applied)

---

## What Happened

Phase 02 delivered a fully functional project management UI at `/dashboard/settings/projects`, replacing hardcoded placeholder content with real workspace-scoped CRUD operations. Implementation covers create, read, update, deactivate/reactivate, and delete workflows with proper error handling and state synchronization.

Code review identified two critical bugs in error handling and client/server validation alignment. Both were fixed, re-tested, and verified before merge.

---

## The Brutal Truth

This phase felt deceptively simple — "just hook up existing API calls to a form" — but the devil was in error handling. We shipped validation mismatches and silent failures that would have frustrated users or caused cascading bugs in Phase 03.

The 6-hour actual effort vs. 4-hour estimate stung, but it's the right investment. Better to catch these in phase 2 than debug form validation nightmares across all settings pages in phase 5. The error-handling pattern we locked in here now becomes a template for phases 3-6.

---

## Technical Details

### Duplicate Domain Constraint Violation (CRITICAL)

**What went wrong:**  
Server validates database uniqueness: `projects_workspace_domain_unique` constraint. When duplicate domain submitted, PostgreSQL throws error code `23505` (integrity constraint violation). The Hono route was catching this but returning generic `"Failed to create project"` without explaining why.

Client-side, the form expected the error message to contain the word "duplicate" to show actionable feedback: `"Domain already in use in this workspace"`. Missing that signal meant the dialog just showed "something broke" with no guidance.

**Impact:** User creates project with domain `example.com`, it fails. They retry with same domain and get the same generic error — no indication it's a domain collision.

**Fix applied:**  
Modified `packages/api-app/src/routes/projects.ts` (POST and PUT handlers) to:
1. Catch PostgreSQL constraint violations via error code check
2. Return explicit message: `"Domain already used in this workspace"`
3. Hook error detection in `use-projects-settings.ts` to match message and surface proper form field error

**Files modified:**
- `packages/api-app/src/routes/projects.ts` (+12 LOC)
- `apps/web/src/hooks/use-projects-settings.ts` (error detection logic)

---

### Client/Server Domain Validation Mismatch (HIGH)

**What went wrong:**  
Client form had a strict FQDN regex: `/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/` rejecting inputs like `my-project` or `localhost`. Server schema accepted any non-empty string. Disconnect meant valid data entered locally would be rejected; if bypassed, server would accept it.

**Why this matters:** Inconsistent validation creates UX friction ("why does the form reject valid input?") and security debt (if client validation is bypassed, server must still validate — but discrepancy signals incomplete thinking).

**Fix applied:**  
Relaxed client regex to match server schema: any non-empty string. The constraint `projects_workspace_domain_unique` still prevents duplicates at the database layer. Removed the false sense of "strict domain naming" — a project identifier can be informal.

**Files modified:**
- `apps/web/src/components/features/settings/project-form-dialog.tsx` (-12 LOC, regex removed)

---

## Implementation Summary

| Artifact | Role | Lines | Status |
|----------|------|-------|--------|
| `use-projects-settings.ts` | Hook wrapping API mutations + error handling | 99 | ✅ New |
| `project-form-dialog.tsx` | Create/edit form with validation | 226 | ✅ New (fixed) |
| `project-settings-table.tsx` | Project list, actions, status indicators | 159 | ✅ New |
| `settings/projects/page.tsx` | Page composition + empty state | 86 | ✅ Modified |
| `packages/api-app/routes/projects.ts` | Error surfacing for constraint violations | +12 | ✅ Modified |

**Total implementation:** 570 LOC  
**Total bug fixes:** 12 LOC (net -12 in form component)

---

## Acceptance Criteria

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Create project from `/dashboard/settings/projects` | Dialog triggers POST, refetches store, selector updates without page reload |
| 2 | Header ProjectSelector reflects new project | SWR mutation + `useWorkspaceStore.fetchProjects()` verified in tester report |
| 3 | Edit updates all fields (name, domain, color, description, status) | PUT endpoint tested on all fields; database confirms updates |
| 4 | Delete removes project + handles selected project cleanup | Workspace store re-selection logic verified; stale selection prevented |
| 5 | Error messages are actionable | Duplicate domain now returns specific message (after fix) |

All 5/5 criteria **PASS**.

---

## Quality Gates

✅ **Type checking:** All 8 packages pass (0 errors)  
✅ **Linting:** 0 errors, 0 warnings  
✅ **Tests:** 26/26 passing (tester agent ran full suite)  
✅ **Code review:** PASS (after critical bug fixes applied and re-verified)  
✅ **No regressions:** Existing project selector, dashboard navigation, store state unchanged  

---

## Key Decisions

### Why Relax Client Validation Instead of Stricten Server

Options considered:
1. **Add server-side FQDN regex** — matches client, provides "proper" domain names
2. **Remove client regex** — trust server, simpler code, consistent

Chose #2 because:
- Server uniqueness constraint (`projects_workspace_domain_unique`) is the real guard
- Informal project identifiers (e.g., `v1-test`, `backup-site`) are valid for internal tools
- Every client-side rule is maintenance debt; let the database schema be source of truth
- Error messages (from server constraint) are clearer than regex rejection

This aligns with YAGNI: don't add validation rules you don't actually need.

---

## Unblocking Impact

**Phase 03 (Integrations Onboarding)** was blocked waiting for real project list. Now unblocked.

Phase 03 will surface GSC/GA4 connection UI scoped to selected project, leveraging the CRUD endpoints verified here.

---

## Risk Mitigation

| Risk | Mitigation | Status |
|------|-----------|--------|
| Duplicate domain crashes form | Specific error message surfaced to user field | ✅ Implemented |
| Cascading deletes lose data | Delete confirmation warns of impact; workspace store prevents stale selection | ✅ Verified |
| Selected project disappears after delete | Workspace store auto-reselects first active project; tests confirm | ✅ Verified |

---

## Effort Breakdown

| Phase | Actual | Notes |
|-------|--------|-------|
| Implementation | 4h | Hook + components + page |
| Testing | 1h | 26 tests via tester agent |
| Code review | 0.5h | Identified critical bugs |
| Bug fixes | 0.5h | Error handling + validation alignment |
| **Total** | **6h** | 4h estimate + 2h bug fixes |

Estimate overrun due to critical issues found during code review. Investment in correctness was correct.

---

## What's Next

1. **Merge Phase 02** — all gates passed
2. **Kick off Phase 03** — Integrations Onboarding now unblocked
3. **Monitor error patterns** — if duplicate domain errors increase, we have data to drive UX refinement (e.g., auto-suggest domain on conflict)

---

## Lessons Captured

**Error handling is not optional:** Silent constraint violations create invisible failures. Always map database errors to user-facing messages, or validation failures bubble up.

**Client/server validation drift is debt:** Inconsistent rules create UX friction and maintenance burden. Let the database schema be source of truth; make client validation optional guards, not required gates.

**Code review finds category 2 bugs:** The bugs fixed here were not caught by type checking or tests because they were logical, not syntactic. Dedicated review phase before merge is essential.

---

**Ready to merge.** ✅
