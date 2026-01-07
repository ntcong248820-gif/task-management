# Vercel Deployment Checklist & Risk Assessment

## ✅ Issues Fixed

### 1. **useSearchParams() Suspense Boundary Error** (FIXED)
- **Problem**: Next.js 15 requires `useSearchParams()` to be wrapped in a Suspense boundary
- **Location**: `apps/web/src/contexts/ProjectContext.tsx`
- **Solution**: Split `ProjectProvider` into two components:
  - `ProjectInitializer`: Handles URL params with `useSearchParams()`, wrapped in Suspense
  - `ProjectProvider`: Main context provider without direct `useSearchParams()` usage
- **Status**: ✅ Fixed and tested locally

---

## 🔍 Deployment Risk Assessment

### **HIGH PRIORITY** ⚠️

#### 1. Environment Variables
**Risk**: Missing or incorrect environment variables will cause runtime errors

**Required Variables for Web App**:
```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

**Action Items**:
- [ ] Verify all environment variables are set in Vercel dashboard
- [ ] Ensure `NEXT_PUBLIC_API_URL` points to the correct API endpoint
- [ ] Double-check Google OAuth credentials are correct
- [ ] Test OAuth callback URLs match Vercel deployment URLs

#### 2. API Endpoint Configuration
**Risk**: Frontend cannot connect to backend API

**Checklist**:
- [ ] API is deployed and accessible
- [ ] CORS is configured to allow requests from Vercel domain
- [ ] API health endpoint is responding
- [ ] Database connection is working

#### 3. TypeScript Build Errors in API
**Risk**: Current API has TypeScript errors that may prevent full build

**Current Errors**:
- `rootDir` configuration issues in `apps/api/tsconfig.json`
- Multiple schema import errors

**Action Items**:
- [ ] Fix TypeScript configuration in API
- [ ] Ensure monorepo structure is correctly configured
- [ ] Test API build separately before deploying

---

### **MEDIUM PRIORITY** ⚡

#### 4. Static Generation vs Server-Side Rendering
**Risk**: Some pages may fail during static generation if they require runtime data

**Current Setup**:
- Most pages are static (○)
- Some pages are dynamic (ƒ): `/api/auth/callback/google`, `/dashboard/keywords/[keyword]`

**Action Items**:
- [ ] Verify dynamic routes work correctly
- [ ] Test authentication flow end-to-end
- [ ] Ensure keyword detail pages load properly

#### 5. Database Connection
**Risk**: Database may not be accessible from Vercel

**Checklist**:
- [ ] Database allows connections from Vercel IPs
- [ ] Connection string is correct in environment variables
- [ ] Connection pool settings are appropriate for serverless
- [ ] Database migrations are up to date

#### 6. OAuth Redirect URIs
**Risk**: Google OAuth will fail if redirect URIs don't match

**Required Redirect URIs**:
```
https://your-vercel-domain.vercel.app/api/auth/callback/google
https://your-custom-domain.com/api/auth/callback/google (if using custom domain)
```

**Action Items**:
- [ ] Add Vercel deployment URL to Google OAuth allowed redirect URIs
- [ ] Test OAuth flow after deployment
- [ ] Update redirect URIs if using custom domain

---

### **LOW PRIORITY** 📋

#### 7. Build Cache
**Risk**: Stale cache may cause unexpected behavior

**Action Items**:
- [ ] Clear Vercel build cache if issues persist
- [ ] Monitor build times for cache effectiveness

#### 8. Node.js Version
**Risk**: Version mismatch may cause compatibility issues

**Recommendation**:
- Specify Node.js version in `package.json`:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### 9. Dependencies Warnings
**Current Warnings**:
- `rimraf@3.0.2` deprecated
- `inflight@1.0.6` deprecated
- `glob@7.2.3` deprecated
- `eslint@8.57.1` no longer supported

**Action Items** (Non-blocking):
- [ ] Update deprecated dependencies when time permits
- [ ] Test thoroughly after updates

---

## 🚀 Pre-Deployment Checklist

### Before Each Deployment:
1. [ ] Run `npm run build` locally and ensure it succeeds
2. [ ] Test critical user flows locally
3. [ ] Verify environment variables are set
4. [ ] Check API is running and accessible
5. [ ] Review recent code changes for potential issues

### After Deployment:
1. [ ] Verify homepage loads
2. [ ] Test authentication flow
3. [ ] Check dashboard pages load correctly
4. [ ] Verify API calls are working
5. [ ] Test analytics data fetching
6. [ ] Check browser console for errors
7. [ ] Monitor Vercel logs for runtime errors

---

## 🔧 Troubleshooting Common Issues

### Build Fails with "useSearchParams" Error
- **Solution**: Already fixed in commit `992d91c`
- **Verification**: Check that `ProjectContext.tsx` has `ProjectInitializer` wrapped in Suspense

### "Failed to fetch" Errors
- **Cause**: CORS or incorrect API URL
- **Solution**: 
  1. Verify `NEXT_PUBLIC_API_URL` environment variable
  2. Check API CORS configuration
  3. Ensure API is deployed and running

### OAuth Callback Fails
- **Cause**: Redirect URI mismatch
- **Solution**: 
  1. Add Vercel URL to Google OAuth allowed redirect URIs
  2. Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is correct
  3. Check callback route is accessible

### Database Connection Errors
- **Cause**: Database not accessible from Vercel
- **Solution**:
  1. Whitelist Vercel IPs in database firewall
  2. Verify connection string is correct
  3. Check database is running

---

## 📊 Monitoring & Alerts

### Key Metrics to Monitor:
1. **Build Success Rate**: Should be 100%
2. **Page Load Time**: Should be < 3s
3. **API Response Time**: Should be < 500ms
4. **Error Rate**: Should be < 1%

### Recommended Tools:
- Vercel Analytics (built-in)
- Sentry for error tracking
- Google Analytics for user behavior
- Uptime monitoring (e.g., UptimeRobot)

---

## 🎯 Next Steps

1. **Immediate**: Monitor first deployment after fix
2. **Short-term**: Fix TypeScript errors in API
3. **Medium-term**: Update deprecated dependencies
4. **Long-term**: Set up comprehensive monitoring and alerting

---

## 📝 Notes

- **Last Updated**: 2025-12-25
- **Last Successful Build**: Local build passed after Suspense fix
- **Deployment Status**: Ready for deployment
- **Critical Issues**: None (all blocking issues resolved)
