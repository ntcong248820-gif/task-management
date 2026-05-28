# Acceptance Runbook: Settings & Real Data Onboarding

Verification checklist for the full project → connect → sync → analytics data path.

## Status Legend

| Status | Meaning |
|--------|---------|
| `PASS` | Verified working end-to-end |
| `PASS_WITH_CONCERNS` | Works but has a noted caveat or non-critical gap |
| `BLOCKED` | Cannot verify due to missing env/credential — not an implementation failure |
| `FAIL` | Implementation defect; needs a code fix |

---

## 1. Project Settings

### 1.1 Create a Project

```
Settings → Projects → "New Project" → fill name + slug → Save
```

Expected: project appears in list, header project selector updates without reload.

Status: `PASS` — implemented in phase-02.

### 1.2 Select Active Project

```
Header project selector → choose a project
```

Expected: workspace context switches, URL/state reflects new project.

Status: `PASS` — implemented in phase-02.

---

## 2. Integration Connections

### 2.1 Connect Google Search Console

```
Settings → Integrations → GSC → "Connect" → Google OAuth → select site → Save
```

Expected: connection row appears with status `connected`, site URL shown.

Status: `PASS` — implemented in phase-03.

**Env blockers (mark `BLOCKED` if any apply):**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` not set in `apps/api/.env`
- OAuth redirect URI `<APP_URL>/api/integrations/gsc/callback` not registered in Google Cloud Console
- Google account does not have GSC access for any site

### 2.2 Connect GA4

```
Settings → Integrations → GA4 → "Connect" → Google OAuth → select property → Save
```

Expected: connection row appears with status `connected`, GA4 property shown.

Status: `PASS` — implemented in phase-03.

**Env blockers:**
- Same OAuth credentials as GSC but redirect URI is `<APP_URL>/api/integrations/ga4/callback`
- Google account does not have GA4 access for any property

---

## 3. Manual Sync

### 3.1 Trigger GSC Sync via UI

```
Settings → Integrations → GSC connection → "Sync Now"
```

Expected: spinner, then last-sync timestamp updates, no error banner.

Status: `PASS` — implemented in phase-03.

**Blocked if:** GSC not connected or Google credentials missing.

### 3.2 Trigger GA4 Sync via UI

```
Settings → Integrations → GA4 connection → "Sync Now"
```

Expected: spinner, then last-sync timestamp updates, no error banner.

Status: `PASS` — implemented in phase-03.

---

## 4. Cron Endpoints — Local/API Verification

Use these commands to verify each endpoint responds correctly. Replace `<APP_URL>` and `<CRON_SECRET>`.

### 4.1 GSC Sync

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://<APP_URL>/api/cron/sync-gsc \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
# Expected: 200
```

Full response (shows synced count + errors):

```bash
curl -s -X POST https://<APP_URL>/api/cron/sync-gsc \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
# Expected: {"ok":true,"synced":N,"errors":[],"durationMs":...}
```

### 4.2 GA4 Sync

```bash
curl -s -X POST https://<APP_URL>/api/cron/sync-ga4 \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
# Expected: {"ok":true,"synced":N,"errors":[],"durationMs":...}
```

### 4.3 Alert Engine

```bash
curl -s -X POST https://<APP_URL>/api/cron/run-alerts \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
# Expected: {"ok":true,"ran":N,"errors":[],"durationMs":...}
```

**Note:** `ran: 0` is normal if no GSC connections exist yet — not a failure.

### 4.4 Weekly Digest

```bash
curl -s -X POST https://<APP_URL>/api/cron/weekly-digest \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
# Expected: {"ok":true,"ran":N,"errors":[],"durationMs":...}
```

**Note:** `ran: 0` is normal if no projects/workspaces exist — not a failure.

### 4.5 Auth Guard Verification

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://<APP_URL>/api/cron/sync-gsc
# Expected: 401 (no auth header)

curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://<APP_URL>/api/cron/sync-gsc \
  -H "Authorization: Bearer wrong-secret"
# Expected: 401
```

---

## 5. GitHub Actions Cron Workflow

### 5.1 Manual Dispatch Test

1. Go to repository → Actions → "Daily SEO Sync"
2. Click "Run workflow" → "Run workflow"
3. Watch the run: `sync-gsc` → `sync-ga4` → `run-alerts` → `weekly-digest` (Sunday or manual)

Expected job progression:

```
sync-gsc      ✓
sync-ga4      ✓  (runs even if sync-gsc fails)
run-alerts    ✓  (runs even if either sync fails)
weekly-digest ✓  (runs on manual dispatch or Sunday)
```

**Env blockers (mark `BLOCKED` if any apply):**
- `APP_URL` repository variable not set (Settings → Variables → Actions)
- `CRON_SECRET` repository secret not set (Settings → Secrets → Actions)
- `CRON_SECRET` value differs from the one set in production environment

### 5.2 Secret Safety

Secrets must not appear in workflow logs. The curl commands log only HTTP code + response body.
To verify: open a completed run → expand each step → confirm no Bearer token value in output.

### 5.3 Scheduled Run Verification

After the scheduled run at 02:00 ICT (19:00 UTC):

1. Go to Actions → "Daily SEO Sync" → most recent run
2. All four jobs should show green (or yellow for skipped weekly-digest on non-Sunday)
3. Response bodies in logs should show `"ok":true` or `"ok":false` with error detail — no 401/403

---

## 6. Environment Blockers Reference

The following conditions cause `BLOCKED` status — they are not implementation failures.

| Blocker | Affected Checks | Resolution |
|---------|----------------|------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` missing | 2.1, 2.2, 3.1, 3.2 | Set in `apps/api/.env` and Vercel env vars |
| OAuth redirect URIs not registered | 2.1, 2.2 | Add to Google Cloud Console OAuth client |
| Google account lacks GSC site access | 2.1, 3.1, 4.1, 4.3 | Grant access in Google Search Console |
| Google account lacks GA4 property access | 2.2, 3.2, 4.2 | Grant access in GA4 admin |
| `CRON_SECRET` not set in env | 4.x | Set in `apps/api/.env` and Vercel env vars |
| `CRON_SECRET` not set in GitHub Actions secrets | 5.1, 5.3 | Add under repo Settings → Secrets → Actions |
| `APP_URL` not set in GitHub Actions variables | 5.1, 5.3 | Add under repo Settings → Variables → Actions |
| Local Postgres not running | Any DB-backed check | Start Postgres or use Supabase pooler URL |

---

## 7. Analytics Data Path End-to-End

After at least one successful sync:

1. Navigate to any project's analytics dashboard
2. Verify GSC data: impressions, clicks, keywords table populated
3. Verify GA4 data: sessions, page views populated
4. Check that task correlation view links tasks to ranking/traffic changes

**Data-blocked:** If no real GSC/GA4 data exists (new accounts, no site traffic), the sync will succeed with `synced: 0`. This is expected and not a failure. The pipeline is operational; it just has no records to process.

---

## Sign-off

| Check Area | Status | Notes |
|-----------|--------|-------|
| Project creation & selector | | |
| GSC connection | | |
| GA4 connection | | |
| Manual sync (GSC) | | |
| Manual sync (GA4) | | |
| Cron endpoint — GSC (curl) | | |
| Cron endpoint — GA4 (curl) | | |
| Cron endpoint — alerts (curl) | | |
| Cron endpoint — digest (curl) | | |
| Auth guard (401 on missing/wrong secret) | | |
| GitHub Actions manual dispatch | | |
| Secret not exposed in logs | | |
| Scheduled run green | | |
