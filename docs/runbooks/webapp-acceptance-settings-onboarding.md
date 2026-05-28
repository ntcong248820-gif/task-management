# Webapp Acceptance Runbook — Settings & Real Data Onboarding

> Plan: `plans/260526-1958-settings-and-real-data-onboarding-completion/`
> Last updated: 2026-05-29
> Tester: _______________  Date: _______________

Runbook này hướng dẫn nghiệm thu **trực tiếp trên trình duyệt** (không dùng curl hay CI).
Mỗi bước ghi rõ URL, thao tác, expected result và ô điền kết quả.

---

## Legend

| Ký hiệu | Ý nghĩa |
|---------|---------|
| `PASS` | Hoạt động đúng như mô tả |
| `FAIL` | Lỗi implementation — cần fix code |
| `BLOCKED` | Không thể test do thiếu env/credential — không phải lỗi code |
| `SKIP` | Bỏ qua có lý do ghi rõ |

---

## Điều kiện tiên quyết

Trước khi bắt đầu, xác nhận:

| Điều kiện | Trạng thái |
|-----------|-----------|
| App đang chạy (`npm run dev` hoặc Vercel production URL) | ☐ |
| Có tài khoản đã signup và có workspace | ☐ |
| Google OAuth credentials đã cấu hình (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) | ☐ hoặc `BLOCKED` |
| Đã đăng nhập vào trình duyệt (không ở trạng thái logout) | ☐ |

**App URL đang dùng:** `________________________`

---

## Module 1 — Projects Settings

**URL:** `/dashboard/settings/projects`

### TC-P01: Trang hiển thị đúng

1. Truy cập `/dashboard/settings/projects`
2. Kiểm tra trang **không** hiển thị placeholder/coming soon

**Expected:** Thấy danh sách projects (hoặc empty state nếu chưa có), nút "New Project" ở góc phải.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-P02: Empty state khi chưa có project

1. Nếu workspace chưa có project, kiểm tra empty state

**Expected:** Hiện thông báo empty + nút "New Project" hoặc "Create your first project".

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-P03: Tạo project mới

1. Click **"New Project"**
2. Điền:
   - Name: `Test Project [tên của bạn]`
   - Domain: `example.com`
   - Description: `Test project for acceptance`
   - Color: chọn bất kỳ
   - Status: Active
3. Click **"Create project"**

**Expected:**
- Toast "Project created" xuất hiện, kèm hint "Next: connect a data source in Integrations."
- Project mới hiện trong danh sách
- **Header selector (góc trên trái) tự cập nhật** hiển thị project mới, không cần reload trang

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-P04: Validation khi tên rỗng

1. Click "New Project"
2. Để trống tên
3. Click "Create project"

**Expected:** Hiện lỗi "Project name is required" ngay dưới field Name, form không submit.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-P05: Validation tên quá 100 ký tự

1. Click "New Project"
2. Nhập 101 ký tự vào tên
3. Click "Create project"

**Expected:** Hiện lỗi "Name must be 100 characters or fewer".

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-P06: Edit project

1. Click icon Edit (bút chì) trên project vừa tạo
2. Đổi tên thành `[tên cũ] — edited`
3. Click "Save changes"

**Expected:** Toast "Project updated", tên mới hiện trong danh sách.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-P07: Header selector update sau edit

1. Sau TC-P06, kiểm tra header selector

**Expected:** Header selector hiển thị tên mới (không cần reload).

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-P08: Xóa project (cancel)

1. Click icon Delete (thùng rác) trên project
2. Trong dialog xác nhận, click **Cancel**

**Expected:** Dialog đóng, project vẫn còn trong danh sách.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-P09: Xóa project (confirm)

> ⚠️ Chỉ xóa test project — không xóa project đang dùng cho production data.

1. Tạo thêm một project phụ tên "DELETE ME"
2. Click Delete trên "DELETE ME"
3. Xác nhận trong dialog

**Expected:** Toast xóa thành công, project biến khỏi danh sách. Nếu project này đang được chọn trong header, header tự chuyển sang project khác.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-P10: Chọn project từ header selector

1. Nếu có ≥ 2 projects, mở header Project Selector
2. Chọn project khác

**Expected:** Workspace context chuyển sang project mới, URL/state reflect đúng.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

## Module 2 — Integrations Onboarding

**URL:** `/dashboard/settings/integrations`

> **Điều kiện:** Google OAuth credentials phải được cấu hình. Nếu không, mark `BLOCKED` cho TC-I01 đến TC-I08.

### TC-I00: Trang hiển thị đúng + project context

1. Truy cập `/dashboard/settings/integrations`
2. Đảm bảo có project được chọn trong header

**Expected:**
- Trang hiện 2 card: Google Search Console và Google Analytics 4
- Hiện tên project đang chọn
- Nếu chưa có project: hiện thông báo "Chọn project trước"

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-I01: Connect Google Search Console

1. Trên GSC card, click **"Connect"**

**Expected:** Trình duyệt redirect sang Google OAuth consent screen với đúng scopes cho Search Console.

**Kết quả:** `___________` (hoặc `BLOCKED` nếu thiếu credentials)  
**Ghi chú:** `_______________________________________________`

---

### TC-I02: OAuth callback GSC — success

1. Sau khi authorize trên Google, trình duyệt redirect về app
2. URL phải chứa `?success=...` hoặc tương đương

**Expected:**
- Toast hiện "GSC connected" hoặc tương tự
- GSC card cập nhật: hiện email tài khoản Google, trạng thái "Connected"
- Không còn nút "Connect", thay bằng "Disconnect"

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-I03: Discover GSC sites

1. Trên GSC card (sau khi connected), click **"Discover sites"** hoặc tương đương
2. Chờ danh sách sites load

**Expected:** Hiện danh sách GSC sites mà tài khoản Google có quyền truy cập. Có thể chọn site.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-I04: Chọn và lưu GSC site

1. Chọn site phù hợp từ danh sách
2. Click **Save** hoặc **"Use this site"**

**Expected:** Card cập nhật: hiện siteUrl đã chọn, trạng thái sync status, last sync.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-I05: Manual sync GSC

1. Trên GSC card, click **"Sync Now"**

**Expected:**
- Spinner/loading hiện trong khi sync
- Sau khi xong: "Last sync" timestamp cập nhật
- Nếu sync thành công: không có error banner
- Nếu sync lỗi: hiện error message cụ thể (không phải generic error)

**Kết quả:** `___________`  
**Ghi chú (số rows synced nếu hiện):** `_______________`

---

### TC-I06: Connect Google Analytics 4

1. Trên GA4 card, click **"Connect"**

**Expected:** Redirect sang Google OAuth với đúng scopes cho Analytics.

> **Lưu ý:** Redirect URI cho GA4 phải khác GSC (`/api/integrations/ga4/callback` vs `/api/integrations/gsc/callback`).

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-I07: Discover và chọn GA4 property

1. Sau khi GA4 connected, discover properties
2. Chọn property đúng

**Expected:** Danh sách hiện propertyId + tên property. Card lưu property đã chọn.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-I08: Manual sync GA4

1. Trên GA4 card, click **"Sync Now"**

**Expected:** Last sync timestamp cập nhật, không error nếu property hợp lệ.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-I09: Disconnect — cancel

1. Trên GSC card, click **"Disconnect"**
2. Trong dialog xác nhận, click Cancel

**Expected:** Dialog đóng, connection vẫn còn.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-I10: Error state hiển thị

1. Nếu sync thất bại (do Google API lỗi hoặc không có data), kiểm tra error display

**Expected:** Hiện sync error message cụ thể trên card (không blank, không crash).

**Kết quả:** `___________` (hoặc `SKIP` nếu không trigger được error)  
**Ghi chú:** `_______________________________________________`

---

## Module 3 — Team Settings

**URL:** `/dashboard/settings/team`

### TC-T01: Trang hiển thị đúng

1. Truy cập `/dashboard/settings/team`

**Expected:**
- Trang không còn placeholder
- Hiện danh sách members của workspace hiện tại
- Mỗi member: avatar/initial, name, email, role badge

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-T02: Role permissions summary

1. Kiểm tra bảng "Permission Summary" hoặc role guide trên trang

**Expected:** Hiện rõ quyền của từng role: owner, admin, member, viewer — khớp với `packages/auth-config/src/permissions.ts`.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-T03: Role management (owner/admin)

> Chỉ test nếu đang đăng nhập với role `owner` hoặc `admin`.

1. Tìm một member có role `member` hoặc `viewer`
2. Thay đổi role của họ (ví dụ: member → admin)

**Expected:**
- Loading state trong khi update
- Role badge cập nhật sau khi thành công
- Toast hoặc success indication

**Kết quả:** `___________` (hoặc `SKIP` nếu chỉ có 1 member)  
**Ghi chú:** `_______________________________________________`

---

### TC-T04: Role management bị block với member/viewer

> Chỉ test nếu có thể login bằng account có role `member`.

1. Đăng nhập với account role `member`
2. Truy cập `/dashboard/settings/team`

**Expected:** Role select dropdown bị disabled hoặc không hiển thị. Không có nút Remove.

**Kết quả:** `___________` (hoặc `SKIP`)  
**Ghi chú:** `_______________________________________________`

---

### TC-T05: Last-owner guard — không xóa được owner cuối

1. Đảm bảo chỉ có 1 owner trong workspace
2. Tìm nút Remove/Xóa trên owner đó

**Expected:** Nút Remove bị ẩn hoặc disabled cho owner duy nhất.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-T06: Invite UI — deferred state

1. Kiểm tra phần Invite Member

**Expected:**
- Hiện UI rõ rằng tính năng invite chưa hoạt động (deferred)
- Có thông báo giải thích lý do (no email provider)
- Không có form invite hoạt động

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

## Module 4 — Analytics Data Path (End-to-End)

> **Điều kiện:** Ít nhất 1 GSC sync thành công.

**URL:** `/dashboard/analytics`

### TC-A01: Analytics overview có data sau sync

1. Sau khi GSC sync xong, truy cập `/dashboard/analytics`

**Expected:**
- KPI cards hiện impressions, clicks, position (không phải all zero)
- Traffic trend chart có data points
- Keywords section có ít nhất một keyword

**Kết quả:** `___________` (hoặc `BLOCKED` nếu account mới/không có data)  
**Ghi chú:** `_______________________________________________`

---

### TC-A02: Keywords deep-dive

1. Truy cập `/dashboard/analytics/keywords`
2. Kiểm tra table

**Expected:** Table có data từ GSC sync, search/filter hoạt động.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-A03: Pages deep-dive

1. Truy cập `/dashboard/analytics/pages`

**Expected:** Table có URLs từ GSC, decay status hiển thị (🟢🟡🔴).

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

## Module 5 — Alert & Digest Integration

### TC-AD01: Notification bell hiển thị

1. Kiểm tra icon chuông trên header

**Expected:** Bell icon hiện, polling mỗi 30s cho unread count.

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

### TC-AD02: Alerts page

1. Truy cập `/dashboard/analytics/alerts`

**Expected:**
- Trang hiển thị danh sách alerts (có thể empty nếu cron chưa chạy)
- Filter: severity, type, unread hoạt động
- "Mark all read" button visible

**Kết quả:** `___________`  
**Ghi chú:** `_______________________________________________`

---

## Tổng kết nghiệm thu

### Kết quả theo module

| Module | Số TC | PASS | FAIL | BLOCKED | SKIP |
|--------|-------|------|------|---------|------|
| M1: Projects Settings | 10 | | | | |
| M2: Integrations Onboarding | 10 | | | | |
| M3: Team Settings | 6 | | | | |
| M4: Analytics Data Path | 3 | | | | |
| M5: Alert & Digest | 2 | | | | |
| **Tổng** | **31** | | | | |

---

### Verdict tổng thể

| Trạng thái | Điều kiện |
|------------|-----------|
| **PASS** | 0 FAIL, BLOCKED có giải thích hợp lý |
| **PASS_WITH_CONCERNS** | 0 FAIL nhưng có concern cần ghi nhận |
| **FAIL** | Có ≥ 1 TC với kết quả FAIL |
| **BLOCKED** | Không thể test do thiếu env quan trọng |

**Verdict:** `___________`

---

### Issues phát hiện

| TC | Mô tả issue | Severity | Assigned to |
|----|-------------|----------|-------------|
| | | | |
| | | | |

---

### Blockers ghi nhận

| Blocker | TC bị ảnh hưởng |
|---------|----------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` thiếu | TC-I01 → TC-I08 |
| OAuth redirect URI chưa đăng ký trong Google Cloud Console | TC-I01, TC-I06 |
| Google account không có GSC site | TC-I03 → TC-I05, TC-A01 → TC-A03 |
| Google account không có GA4 property | TC-I07, TC-I08 |

---

### Sign-off

| | |
|-|-|
| **Tester** | |
| **Date** | |
| **App version / commit** | |
| **Environment** | ☐ Local dev  ☐ Vercel preview  ☐ Vercel production |
