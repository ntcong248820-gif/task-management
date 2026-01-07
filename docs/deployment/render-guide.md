# 🚀 Deploy Backend API lên Render (FREE)

## 💰 Tại Sao Chọn Render?

### **Free Tier Tốt Nhất**
```
✅ 750 hours/tháng FREE (Railway chỉ ~500 hours)
✅ Unlimited bandwidth
✅ Automatic SSL
✅ Auto-deploy from GitHub
✅ Free PostgreSQL database (90 days, sau đó $7/month)
```

### **Nhược Điểm**
```
⚠️ Spin down sau 15 phút không dùng (cold start ~30s)
⚠️ Shared CPU (slower than paid tiers)
```

**Kết luận**: Hoàn hảo cho development & small projects!

---

## 📋 Deployment Guide

### **Bước 1: Tạo Render Account**

1. Vào https://render.com
2. Sign up với GitHub account
3. Authorize Render to access your repos

---

### **Bước 2: Deploy Backend API**

#### **Option A: Qua Dashboard (Dễ Nhất)** ⭐

1. **Create New Web Service**
   ```
   Dashboard → New + → Web Service
   ```

2. **Connect Repository**
   ```
   - Connect GitHub repository: ntcong248820-gif/task-management
   - Click "Connect"
   ```

3. **Configure Service**
   ```
   Name: seo-impact-api
   Region: Oregon (hoặc Singapore nếu gần Vietnam hơn)
   Branch: main
   Root Directory: apps/api
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Free
   ```

4. **Advanced Settings**
   ```
   Auto-Deploy: Yes
   Health Check Path: /api/health
   ```

5. **Click "Create Web Service"**

---

#### **Option B: Qua render.yaml (Tự Động)** ⭐⭐

File `render.yaml` đã được tạo ở root của repo.

1. **Push render.yaml lên GitHub**
   ```bash
   git add render.yaml
   git commit -m "chore: add Render deployment config"
   git push
   ```

2. **Create Blueprint**
   ```
   Dashboard → New + → Blueprint
   → Select your repo
   → Render auto-detects render.yaml
   → Click "Apply"
   ```

---

### **Bước 3: Set Environment Variables**

Sau khi service được tạo, add environment variables:

1. **Vào Service Dashboard**
   ```
   Your Service → Environment
   ```

2. **Add Variables** (Click "Add Environment Variable"):

   ```bash
   # Database (Supabase hoặc Render PostgreSQL)
   DATABASE_URL=postgresql://user:password@host:5432/database
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://your-api.onrender.com/api/integrations/callback/gsc
   
   # Frontend URL (Vercel)
   FRONTEND_URL=https://your-app.vercel.app
   
   # App Config
   NODE_ENV=production
   PORT=3001
   ```

3. **Click "Save Changes"**

Render sẽ tự động redeploy với env vars mới.

---

### **Bước 4: Get Deployment URL**

1. Sau khi deploy xong, copy URL:
   ```
   https://seo-impact-api.onrender.com
   ```

2. **Test API**:
   ```bash
   curl https://seo-impact-api.onrender.com/api/health
   ```

   Should return:
   ```json
   {"status":"ok","timestamp":"..."}
   ```

---

### **Bước 5: Update Frontend (Vercel)**

1. **Vào Vercel Dashboard**
   ```
   Your Project → Settings → Environment Variables
   ```

2. **Update `NEXT_PUBLIC_API_URL`**:
   ```
   NEXT_PUBLIC_API_URL=https://seo-impact-api.onrender.com
   ```

3. **Redeploy Frontend**:
   ```
   Deployments → Latest → Redeploy
   ```

---

### **Bước 6: Update Google OAuth**

1. **Vào Google Cloud Console**
   ```
   APIs & Services → Credentials → Your OAuth Client
   ```

2. **Add Authorized Redirect URIs**:
   ```
   https://seo-impact-api.onrender.com/api/integrations/callback/gsc
   https://seo-impact-api.onrender.com/api/integrations/callback/ga4
   ```

3. **Save**

---

## 🗄️ Database Options

### **Option 1: Render PostgreSQL** (Integrated)

**Free Tier**:
- ✅ Free for 90 days
- ⚠️ After 90 days: $7/month
- ✅ 1GB storage
- ✅ Auto-backups

**Setup**:
```
Dashboard → New + → PostgreSQL
→ Name: seo-impact-db
→ Plan: Free
→ Create Database
→ Copy Internal Database URL
→ Add to API env vars as DATABASE_URL
```

---

### **Option 2: Supabase** (Recommended) ⭐

**Free Tier**:
- ✅ FREE forever
- ✅ 500MB database
- ✅ 2GB bandwidth
- ✅ Auto-backups

**Setup**:
```
1. Go to supabase.com
2. Create new project
3. Copy connection string
4. Add to Render env vars
```

**Better choice vì**:
- ✅ Free forever (không như Render 90 days)
- ✅ Có dashboard để manage data
- ✅ Built-in auth (nếu cần sau này)

---

### **Option 3: Neon** (Alternative)

**Free Tier**:
- ✅ FREE forever
- ✅ 3GB storage
- ✅ Serverless PostgreSQL

---

## ⚡ Performance Optimization

### **Cold Starts Problem**

Render free tier spin down sau 15 phút không dùng. First request sau đó sẽ chậm (~30s).

**Solutions**:

#### **1. Keep-Alive Ping** (Free)
Tạo cron job ping API mỗi 10 phút:

```bash
# Dùng cron-job.org (free)
1. Vào cron-job.org
2. Create job:
   URL: https://seo-impact-api.onrender.com/api/health
   Interval: Every 10 minutes
```

#### **2. Upgrade to Paid** ($7/month)
- No cold starts
- Always running
- Better performance

---

## 📊 Monitoring

### **Render Dashboard**

1. **Logs**:
   ```
   Service → Logs → View real-time logs
   ```

2. **Metrics**:
   ```
   Service → Metrics → CPU, Memory, Requests
   ```

3. **Events**:
   ```
   Service → Events → Deploy history
   ```

---

## 🔄 Auto-Deploy Workflow

Sau khi setup xong:

```bash
# Mỗi khi push code
git add .
git commit -m "feat: new feature"
git push

# Render tự động:
# 1. Detect push
# 2. Build code
# 3. Deploy
# 4. Health check
# ✅ Live in ~2-3 minutes!
```

---

## 🐛 Troubleshooting

### **Build Failed**

**Check**:
1. Root Directory = `apps/api`
2. Build Command = `npm install && npm run build`
3. Start Command = `npm start`

**Fix**:
```
Service → Settings → Build & Deploy
→ Update commands
→ Manual Deploy
```

---

### **Environment Variables Not Working**

**Check**:
1. All required env vars are set
2. No typos in variable names
3. Redeploy after adding vars

**Fix**:
```
Service → Environment
→ Verify all vars
→ Manual Deploy
```

---

### **Database Connection Failed**

**Check**:
1. DATABASE_URL is correct
2. Database is running
3. Firewall allows Render IPs

**Fix for Supabase**:
```
Supabase → Settings → Database
→ Connection Pooling → Enable
→ Use pooler connection string
```

---

### **Cold Start Too Slow**

**Solutions**:
1. Use keep-alive ping (free)
2. Upgrade to paid plan ($7/month)
3. Optimize app startup time

---

## 💡 Tips & Best Practices

### **1. Use Health Check**
```typescript
// apps/api/src/index.ts
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### **2. Enable Auto-Deploy**
```
Settings → Build & Deploy
→ Auto-Deploy: Yes
```

### **3. Set Up Notifications**
```
Settings → Notifications
→ Add email/Slack for deploy status
```

### **4. Monitor Logs**
```bash
# View logs in real-time
render logs -f seo-impact-api
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to GitHub
- [ ] `render.yaml` configured (optional)
- [ ] Health check endpoint exists
- [ ] Build & start scripts in package.json

### Deployment
- [ ] Render account created
- [ ] Web service created
- [ ] Root directory set to `apps/api`
- [ ] Build & start commands configured
- [ ] Environment variables added
- [ ] Service deployed successfully

### Post-Deployment
- [ ] API URL obtained
- [ ] Health check passes
- [ ] Frontend `NEXT_PUBLIC_API_URL` updated
- [ ] Google OAuth redirect URIs updated
- [ ] Test API endpoints
- [ ] Test OAuth flow
- [ ] Set up keep-alive ping (optional)

---

## 💰 Cost Comparison

| Scenario | Render | Railway | Vercel |
|----------|--------|---------|--------|
| **Development** | FREE (750h) | $5 credit | FREE |
| **Small Project** | FREE (with ping) | ~$7-10/month | FREE (limited) |
| **Production** | $7/month | ~$10-15/month | $20/month (Pro) |

**Winner**: Render cho development & small projects! 🏆

---

## 🚀 Quick Start Commands

```bash
# 1. Push render.yaml
git add render.yaml
git commit -m "chore: add Render config"
git push

# 2. Create service on Render dashboard
# (follow steps above)

# 3. Update frontend
# (update NEXT_PUBLIC_API_URL in Vercel)

# 4. Test
curl https://your-api.onrender.com/api/health

# ✅ Done!
```

---

## 📚 Resources

- **Render Docs**: https://render.com/docs
- **Render Node.js Guide**: https://render.com/docs/deploy-node-express-app
- **Render Free Tier**: https://render.com/docs/free
- **Supabase Setup**: https://supabase.com/docs

---

**Ready to Deploy?** 🚀

Follow the steps above and you'll have your backend running on Render in ~15 minutes!

**Total Cost**: $0/month (with free tiers) 💰
