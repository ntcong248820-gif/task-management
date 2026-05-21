# GitHub Actions Cron Sync Debugging

**Date**: 2026-05-01 09:30
**Severity**: High
**Component**: GitHub Actions Workflow, Cron Sync Endpoint
**Status**: Resolved

## What Happened

Cron job failing immediately with `curl: (6) Could not resolve host: api`. Every sync attempt in GitHub Actions exited with this DNS error. The workflow would not progress past the first curl request to `https:///api/cron/sync-gsc`. Investigation revealed a cascade of three distinct failures, each blocking the next.

## The Brutal Truth

This was entirely a configuration management failure. Not a code problem. Not a network problem. Just basic environment variable setup done wrong twice in a row—once by misunderstanding where to put secrets in GitHub, once by not understanding how re-runs work. The most infuriating part: the error message itself (`Could not resolve host: api`) was a big red flag that something was obviously malformed in the URL, but we got distracted by a false diagnosis that "APP_URL was set incorrectly." It wasn't set at all. We wasted 20 minutes following bad advice instead of looking at the actual curl string. The re-run trap is cruel—you fix the code, push it, then GitHub Actions happily re-runs the OLD workflow from the old commit, making you think your fix didn't work.

## Technical Details

### First Error: DNS Resolution Failure
```
curl: (6) Could not resolve host: api
```
URL being generated: `https:///api/cron/sync-gsc` (triple slash, no domain)

Root cause: APP_URL environment variable was empty string. The GitHub Secret `APP_URL` existed but had no value assigned. Workflow was using `${{ secrets.APP_URL }}` which resolved to empty, creating malformed URL.

### Second Problem: Secrets in Wrong Location
User added both `APP_URL` and `CRON_SECRET` to GitHub **Environment Secrets** under "Production – task-management-web" environment. But the workflow file had NO `environment:` key in the jobs:

```yaml
jobs:
  sync-gsc:
    runs-on: ubuntu-latest
    # ❌ Missing: environment: production
    steps:
      - name: Sync GSC
        run: curl ...
```

Result: Environment secrets were never injected. The workflow couldn't access the values even though they existed in the dashboard. Confusing error—no clear indication that environment secrets require explicit environment declaration.

### Third Problem: Re-run Cache Trap
After moving secrets to Repository-level, user clicked "Re-run" on the failed job in Actions tab. GitHub Actions re-runs use the workflow YAML from the ORIGINAL commit that triggered the run, not from HEAD. User had pushed the fixed workflow to main, but re-running the old job still used the old (broken) workflow file. This created the illusion that the fix didn't work.

### Fourth Problem: App URL Type Mismatch
After fixing re-run trap, new error emerged: `curl: (22) The requested URL returned error: 404`. URL now resolved correctly to `https://task-management-web-zeta.vercel.app/api/cron/sync-gsc`, but Vercel was returning infrastructure 404, not an app 404. The deployment itself was blocked.

## What We Tried

1. **First attempt**: Added APP_URL and CRON_SECRET to GitHub Environment Secrets (specific to Production environment)
   - Failed: Environment secrets require `environment:` declaration in workflow
   - Wasted: 15 minutes debugging "why aren't these secrets available"

2. **Second attempt**: Moved to Repository Secrets, kept using `${{ secrets.APP_URL }}`
   - Partially worked: Secrets now injected, but APP_URL is public info (domain name), doesn't belong in Secrets
   - Issue: Adding secrets to repo just to have them as variables is bad practice

3. **Third attempt**: Moved APP_URL to Repository Variables, CRON_SECRET to Repository Secrets
   - Updated workflow to use `${{ vars.APP_URL }}` (Variables syntax)
   - Fixed: DNS error gone, curl could now resolve domain
   - New blocker: Vercel returning 404 (infrastructure level, not app-level)

4. **Fourth attempt**: Re-ran failed job after fixing workflow
   - Failed: GitHub re-runs old workflow from original commit, not current HEAD
   - Solution: Triggered fresh "Run workflow" from Actions tab instead

## Root Cause Analysis

### Core Problem: Environment Configuration Layering
GitHub Actions has THREE levels of secret/variable storage, each with different injection rules:
- Repository Variables (auto-injected to all workflows)
- Repository Secrets (auto-injected, but interpolated differently)
- Environment Secrets (require explicit `environment:` in job)

User conflated these levels, adding "public" values (app URLs) to Secrets and "secret" values (CRON_SECRET) to wrong environment scope. Root cause: lack of clarity about what each storage tier is for.

### Secondary Problem: Re-run Semantics
GitHub's "Re-run" button is deceptive. It doesn't mean "re-run with current code"—it means "re-run with the exact same inputs." The workflow YAML comes from the commit that triggered the original run, not from HEAD. This is documented but counterintuitive.

### Tertiary Problem: Early Diagnosis Confidence
When DNS error appeared, AI suggested "APP_URL is set incorrectly." This sounded plausible enough that we didn't dig deeper into the actual value (empty string). Better approach: immediately interpolate the secret in a debug step to see what you're actually passing to curl.

## Lessons Learned

1. **Secrets vs Variables**: Public values (domain names, API paths) belong in Repository Variables, not Secrets. Secrets should only contain authentication tokens/keys.

2. **Debug Before Guessing**: When a URL is malformed (triple slash), dump the actual URL in a debug step before trying anything else. Don't trust assumptions.

3. **Re-run Trap**: After fixing workflow code, don't use "Re-run"—trigger a fresh workflow run so you're testing the actual current code, not a cached execution plan.

4. **GitHub Docs Are Specific**: Environment secrets require explicit job context. Worth a quick check rather than troubleshooting for 20 minutes.

5. **Cascade Failures Obscure Root Cause**: Because cron job failed at DNS, we never saw the Vercel 404 error until later. If just one thing had been right from the start, we'd have surfaced the real blocker (Next.js security vulnerability blocking deployment) much faster.

## Next Steps

1. ✓ Moved APP_URL to Repository Variables
2. ✓ Moved CRON_SECRET to Repository Secrets (repo-level)
3. ✓ Updated workflow YAML to use `${{ vars.APP_URL }}`
4. ✓ Triggered fresh workflow run instead of re-running
5. ⏳ Resolve underlying 404 from Vercel (separate issue—Next.js security block)

**Owner**: DevOps/CI Configuration
**Timeline**: Immediate (waiting on Vercel deployment unblock)
