# Vercel Project Configuration Guide

## 🚀 Quick Setup

### 1. Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository: `ntcong248820-gif/task-management`
4. Vercel will automatically detect:
   - ✅ Turbo monorepo
   - ✅ Next.js framework
   - ✅ Node.js version from `package.json`

### 2. Configure Root Directory

**IMPORTANT**: Since this is a monorepo, you need to specify the web app directory:

```
Root Directory: apps/web
```

**How to set**:
1. In project settings, find "Root Directory"
2. Click "Edit"
3. Enter: `apps/web`
4. Click "Save"

### 3. Configure Build Settings

Vercel should auto-detect these, but verify:

```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

**Note**: Vercel will automatically run the build from the `apps/web` directory.

### 4. Environment Variables

Add these environment variables in Vercel Dashboard:

#### **Required Variables**:

```bash
# API Backend URL (replace with your actual API URL)
NEXT_PUBLIC_API_URL=https://your-api-domain.com

# Google OAuth Client ID (for frontend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

#### **How to Add**:
1. Go to Project Settings → Environment Variables
2. Add each variable:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_API_URL`)
   - **Value**: Variable value
   - **Environment**: Select "Production", "Preview", and "Development"
3. Click "Save"

#### **Optional Variables** (if needed):
```bash
# If you need to override Node environment
NODE_ENV=production
```

---

## 🔧 Advanced Configuration

### Custom Domain Setup

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed by Vercel
4. **IMPORTANT**: Update Google OAuth redirect URIs to include your custom domain

### Build & Development Settings

**Node.js Version**:
- Automatically detected from `package.json` engines field
- Current: `>=20.0.0`

**Framework Preset**:
- Next.js (auto-detected)

**Package Manager**:
- npm (auto-detected from `package-lock.json`)

---

## 🔐 Google OAuth Configuration

After deploying, you **MUST** update Google OAuth settings:

### 1. Get Your Vercel Deployment URL
```
https://your-project-name.vercel.app
```

### 2. Add to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: APIs & Services → Credentials
4. Click on your OAuth 2.0 Client ID
5. Add to "Authorized redirect URIs":
   ```
   https://your-project-name.vercel.app/api/auth/callback/google
   ```
6. If using custom domain, also add:
   ```
   https://your-custom-domain.com/api/auth/callback/google
   ```
7. Click "Save"

### 3. Update Environment Variables

Make sure `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel matches the Client ID from Google Cloud Console.

---

## 📊 Deployment Workflow

### Automatic Deployments

Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every push to other branches or pull requests

### Manual Deployment

1. Go to Deployments tab
2. Click "Redeploy" on any previous deployment
3. Or push a new commit to trigger deployment

### Deployment Hooks

To trigger deployment via API:
1. Go to Project Settings → Git
2. Create a Deploy Hook
3. Use the webhook URL to trigger deployments

---

## 🐛 Troubleshooting

### Build Fails with Module Not Found

**Cause**: Incorrect root directory or missing dependencies

**Solution**:
1. Verify Root Directory is set to `apps/web`
2. Check that all dependencies are in `package.json`
3. Clear build cache: Settings → General → Clear Build Cache

### Environment Variables Not Working

**Cause**: Variables not set or incorrect naming

**Solution**:
1. Verify variable names start with `NEXT_PUBLIC_` for client-side access
2. Redeploy after adding/changing environment variables
3. Check variable is set for correct environment (Production/Preview/Development)

### OAuth Callback Fails

**Cause**: Redirect URI not whitelisted in Google Cloud Console

**Solution**:
1. Add Vercel URL to Google OAuth allowed redirect URIs
2. Wait a few minutes for Google to propagate changes
3. Clear browser cache and try again

### API Calls Failing

**Cause**: Incorrect `NEXT_PUBLIC_API_URL` or CORS issues

**Solution**:
1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check API is deployed and accessible
3. Verify API CORS settings allow requests from Vercel domain
4. Check Vercel Function Logs for detailed errors

---

## 📈 Monitoring

### Vercel Analytics

Enable Vercel Analytics for free:
1. Go to Analytics tab
2. Click "Enable Analytics"
3. View real-time performance metrics

### Function Logs

View serverless function logs:
1. Go to Deployments
2. Click on a deployment
3. Click "Functions" tab
4. View logs for each function

### Real-time Logs

View real-time deployment logs:
1. During deployment, click "View Build Logs"
2. Monitor progress and catch errors early

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Visit deployment URL and verify homepage loads
- [ ] Test authentication flow (Google OAuth)
- [ ] Check dashboard pages load correctly
- [ ] Verify API calls are working
- [ ] Test analytics data fetching
- [ ] Check browser console for errors
- [ ] Monitor Vercel logs for runtime errors
- [ ] Set up custom domain (if applicable)
- [ ] Enable Vercel Analytics
- [ ] Configure deployment notifications (Slack/Discord)

---

## 🔄 Continuous Deployment

### Branch Protection

Recommended settings for `main` branch:
1. Require pull request reviews
2. Require status checks to pass (Vercel Preview)
3. Require branches to be up to date

### Preview Deployments

Every PR gets a unique preview URL:
- Test changes before merging
- Share with team for review
- Automatic cleanup after PR merge

---

## 📞 Support

If you encounter issues:

1. **Check Vercel Logs**: Most issues are visible in build/function logs
2. **Vercel Documentation**: https://vercel.com/docs
3. **Vercel Support**: https://vercel.com/support
4. **Community**: https://github.com/vercel/vercel/discussions

---

## 📝 Notes

- **Deployment Time**: Typically 1-3 minutes
- **Build Cache**: Enabled by default for faster builds
- **Serverless Functions**: Automatically created for API routes
- **Edge Network**: Global CDN for fast content delivery
- **SSL**: Automatic HTTPS for all deployments

---

**Last Updated**: 2025-12-25
**Vercel CLI Version**: 50.1.3
**Next.js Version**: 15.5.9
