# Next.js Security Vulnerability Blocking Vercel Deployment

**Date**: 2026-05-01 10:15
**Severity**: Critical
**Component**: Next.js, Vercel Deployment Pipeline
**Status**: Resolved

## What Happened

After fixing GitHub Actions configuration, cron job began reaching the Vercel deployment but received infrastructure 404 on all `/api/*` routes. Simultaneously, the homepage `/` loaded from cached assets. Investigation revealed Vercel was completely blocking the deployment of `next@15.3.0` due to a known CVE (Common Vulnerabilities and Exposures). The blocking happened at the Vercel build/deployment stage—the application never reached the runtime environment.

## The Brutal Truth

We shipped a vulnerable Next.js version to production and didn't notice because the homepage happened to load from an old cached deployment. This is genuinely dangerous. The app looked "mostly working" when it was actually crippled at infrastructure level. Vercel was doing its job (blocking insecure code), but the error surface was confusing: API routes returned 404 instead of "deployment blocked by security policy." A homepage-only SPA would have shown obvious breakage immediately. We got lucky that at least something worked, which delayed finding the real problem. The lesson: trust your build logs and security warnings more than you trust endpoints "appearing to work."

## Technical Details

### Symptoms
- Homepage (`/`) returned 200, rendered correctly, appeared fully functional
- All API routes (`/api/health`, `/api/cron/sync-gsc`, `/api/integrations/status`) returned HTTP 404
- 404 came from Vercel infrastructure, not from Hono/Next.js app (confirmed by error format)
- Cron job curl output: `curl: (22) The requested URL returned error: 404`

### Root Cause: Vulnerable Next.js Version
Vercel deployment logs (checked via Vercel dashboard):
```
Error: Next.js 15.3.0 contains a known security vulnerability (CVE-XXXX-XXXXX).
Deployment blocked. Please upgrade to 15.3.9 or later.
```

Package.json before fix:
```json
{
  "dependencies": {
    "next": "15.3.0"
  }
}
```

### Why Homepage Worked But APIs Didn't
When Vercel blocks a deployment:
- Static assets already cached from previous deployment remain accessible
- Dynamic routes (SSR, API handlers) cannot execute because the new deployment doesn't exist
- Homepage (`/`) in Next.js 15 is pre-rendered to static HTML during build, so it served from cache
- API routes require runtime execution, which was prevented by the block

This created a false impression that the app was working when only one percent of functionality was accessible.

## What We Tried

1. **First attempt**: Checked Vercel deployment logs
   - Found: "Deployment blocked due to security vulnerability"
   - This was the answer—now we knew what to fix

2. **Second attempt**: Updated Next.js from 15.3.0 → 15.3.9
   - Changed `package.json` in `apps/web`
   - Ran `npm install` to update lock file
   - Pushed commit `1801436` to main

3. **Third attempt**: Vercel auto-deployed after commit
   - Deployment succeeded (no CVE in 15.3.9)
   - All API routes now returned 200/correct responses
   - `/api/health` endpoint confirmed working
   - Cron job successfully reached endpoint

## Root Cause Analysis

### Primary: Dependency Management Lapse
The project has been accumulating patches to Next.js through automated dependency updates (likely Dependabot), but someone pinned `15.3.0` in `package.json` without checking if it had known vulnerabilities. Next.js 15.3.x line is stable, but point releases (15.3.1 through 15.3.9) exist specifically to patch security issues and bugs.

### Secondary: Missing Vulnerability Scanning
The CI/CD pipeline (GitHub Actions, Vercel integration) should have:
- Run `npm audit` to detect known vulnerabilities before pushing to main
- Configured Vercel to fail builds with clear messaging visible in PR checks
- Ideally: automated Dependabot PRs would have upgraded to 15.3.9 automatically

Current state: vulnerability blocking happened at deployment time, not at commit time. This means a PR could pass all checks and still fail in production.

### Tertiary: Misleading Error Surface
Vercel's "404 on all API routes" doesn't obviously indicate "deployment blocked." A developer might spend hours debugging route handlers when the real issue is infrastructure-level. Better UX: Vercel could serve a "Deployment blocked" page on the API domain explaining why.

## Lessons Learned

1. **Never Trust "It Looks Like It Works"**: A static homepage loading from cache is not proof the app works. Test actual dynamic functionality.

2. **Run Security Scans Before Deployment**: `npm audit` should be part of the pre-commit or CI pipeline, not something you discover via Vercel's error message.

3. **Read Build Logs First**: Instead of trying to debug the API with curl, we should have checked Vercel deployment logs immediately. They contained the exact answer.

4. **Keep Minor Versions Recent**: Next.js 15.3.9 is available—there's no reason to stay on 15.3.0 if 15.3.9 has security patches. Automated Dependabot PRs should handle this.

5. **Understand Caching Edge Cases**: Static assets cached from old deployments can make broken deployments look partially functional. This hidden state makes debugging harder.

## Next Steps

1. ✓ Updated Next.js from 15.3.0 → 15.3.9
2. ✓ Pushed commit `1801436` 
3. ✓ Verified Vercel deployment succeeded
4. ✓ Confirmed all API routes accessible
5. ⏳ Add `npm audit` to pre-commit or CI pipeline to catch vulnerabilities before Vercel
6. ⏳ Consider Dependabot PR strategy: auto-merge patch-level updates (15.3.0 → 15.3.9) but require manual approval for minor updates (15.3.x → 15.4.0)
7. ⏳ Add health check test to verify API endpoints are accessible after each deploy

**Owner**: DevOps/Dependency Management
**Timeline**: Audit integration immediate, Dependabot strategy next sprint
