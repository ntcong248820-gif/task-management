# Brainstorm: Correlation Impact Fix & Annotation System

**Date:** 2026-05-10  
**Status:** Approved → Plan phase

## Problem Statement

App mục tiêu "chứng minh công việc có hiệu quả" nhưng feature cốt lõi đang fake:

```typescript
// correlation.ts:163
impact: Math.round(Math.random() * 15 + 5), // Mock impact %
```

Impact scores trong "Recent High-Impact Tasks" là **random numbers**, không phải tính toán thực.

## Root Cause Analysis

1. Schema đã có `actualImpact`, `expectedImpactStart`, `expectedImpactEnd` nhưng **không được populate**
2. Correlation chart chỉ overlay tasks lên timeline, không có statistical calculation
3. Không có cách phân biệt "impact task" (thay đổi website) vs "non-impact task" (planning, họp)

## Design Decision: "Annotation-First Correlation"

**Core insight:** Proof không cần complex calculation. Đủ nếu:
1. Chart hiển thị annotations tại đúng thời điểm task hoàn thành
2. User nhìn vào chart, thấy traffic thay đổi sau annotation → tự kết luận
3. Before/after % hỗ trợ thêm (secondary metric, không phải primary proof)

**Rejected:** Per-task URL/keyword targeting — quá granular, tốn effort nhập task.  
**Accepted:** URL-level filter on chart → filter chart theo URL, annotations vẫn hiện → indirect attribution.

## 3 Improvements Agreed

### 1. Task Classification — `affectsWebsite` flag

- Thêm `affectsWebsite: boolean` vào tasks schema
- Default: `true` cho `technical|content|links`, `false` cho `planning|meeting`
- Chỉ `affectsWebsite = true` → hiện annotation trên correlation chart
- UI: checkbox khi tạo/edit task ("Ảnh hưởng đến website?")

### 2. Real Impact Calculation — Xóa Math.random()

Replace `Math.random()` bằng before/after calculation:
- **Window theo task type:** technical=7d, content=30d, links=60d
- **Formula:** `(clicks_after - clicks_before) / clicks_before * 100`
- **Timing:** Tính khi query (không cần cron), compare period [completedAt - window, completedAt] vs [completedAt, completedAt + window]
- **Write to DB:** Populate `actualImpact` field sau khi có đủ data (>= window days sau completion)

### 3. URL-Level Filter in Correlation Chart

- Add URL search/filter dropdown trong correlation chart header
- Khi filter: query GSC data by `url` field cho URL đó
- Annotations (task markers) vẫn hiện trên chart filtered
- Use case: "Tao làm gì cho URL /blog/post này và nó có tăng traffic không?"

## Impact Assessment

| Item | Effort | Impact |
|------|--------|--------|
| affectsWebsite flag | Low (schema + UI) | High (clean chart) |
| Real impact calc | Medium (query logic) | Critical (removes fake data) |
| URL filter | Medium (frontend + API) | High (core use case) |

## Success Criteria

- [ ] Không còn `Math.random()` trong codebase
- [ ] Impact % trong RecentTasksTable là số thực từ DB
- [ ] Chart chỉ hiện annotations cho tasks `affectsWebsite = true`
- [ ] Có thể filter correlation chart theo URL cụ thể
- [ ] `actualImpact` field được populate với dữ liệu thực

## Unresolved Questions

- Impact window nên configurable per-task hay hardcode theo task type? (Tạm thời: hardcode theo type, configurable sau)
- Khi task complete < window days trước → impact chưa đủ data → hiển thị "Pending" hay ẩn?
