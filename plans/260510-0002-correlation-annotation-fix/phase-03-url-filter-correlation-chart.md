# Phase 03 — URL Filter on Correlation Chart

**Status:** pending  
**Effort:** ~2h  
**Dependencies:** Independent of Phase 02 (different code sections in `correlation.ts`)

## Context

The correlation chart shows project-level GSC traffic (all URLs aggregated). When a user
wants to prove that a specific action on a specific page improved that page's traffic, they
currently can't — there's no way to filter to a single URL.

The `gsc_data` table has a `page` (VARCHAR 1000) field with URL paths. GSC already stores
per-page data. We just need to expose a filter.

## Design

- Add `url` optional query param to `GET /api/correlation`
- Add `GET /api/correlation/urls` — returns distinct pages for a project (for dropdown)
- Chart header: add a URL search combobox (optional filter, clears to "all pages")
- When URL selected: chart shows clicks/impressions for that page only
- Task annotations stay on chart regardless of URL filter (tasks affect the whole site)

## Related Files

**Modify:**
- `packages/api-app/src/routes/correlation.ts` — add `url` filter + `/urls` sub-route
- `apps/web/src/app/dashboard/page.tsx` — add URL filter state, pass to fetch
- `apps/web/src/components/features/dashboard/CorrelationChart.tsx` — add URL combobox in header

## Implementation Steps

### Step 1 — New sub-route: `GET /api/correlation/urls`

Add before the main `app.get('/')` in `correlation.ts`:

```ts
// GET /api/correlation/urls?projectId=1
app.get('/urls', async (c) => {
  const rawProjectId = c.req.query('projectId');
  if (!rawProjectId) return c.json({ success: false, error: 'projectId required' }, 400);
  const projectId = Number(rawProjectId);
  if (isNaN(projectId)) return c.json({ success: false, error: 'Invalid projectId' }, 400);

  const rows = await db
    .selectDistinct({ page: gscData.page })
    .from(gscData)
    .where(eq(gscData.projectId, projectId))
    .orderBy(gscData.page)
    .limit(500); // cap at 500 URLs

  return c.json({ success: true, data: rows.map(r => r.page) });
});
```

### Step 2 — Add `url` param to `GET /api/correlation`

In the existing handler, after parsing `days`:
```ts
const urlFilter = c.req.query('url') || null;
```

Add `url` condition to the GSC query's `where` clause:
```ts
.where(
  and(
    eq(gscData.projectId, projectId),
    gte(gscData.date, startDate.toISOString().split('T')[0]),
    lte(gscData.date, endDate.toISOString().split('T')[0]),
    urlFilter ? eq(gscData.page, urlFilter) : undefined,
  )
)
```

Apply the same `urlFilter` to the `prevGscData` query for accurate growth calculation.

> Note: Task queries are NOT filtered by URL — annotations represent project-level actions.

### Step 3 — Frontend State (`apps/web/src/app/dashboard/page.tsx`)

Add state:
```ts
const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
const [availableUrls, setAvailableUrls] = useState<string[]>([]);
```

Fetch URLs when project changes:
```ts
useEffect(() => {
  if (!selectedProjectId) return;
  fetch(getApiUrl(`/api/correlation/urls?projectId=${selectedProjectId}`))
    .then(r => r.json())
    .then(json => { if (json.success) setAvailableUrls(json.data); });
}, [selectedProjectId]);
```

Pass `selectedUrl` to correlation fetch:
```ts
const url = getApiUrl(
  `/api/correlation?projectId=${projectId}&days=${dateRange}${selectedUrl ? `&url=${encodeURIComponent(selectedUrl)}` : ''}`
);
```

Pass to `CorrelationChart`:
```tsx
<CorrelationChart
  data={chartData}
  layers={layers}
  onLayerChange={setLayers}
  dateRange={dateRange}
  availableUrls={availableUrls}
  selectedUrl={selectedUrl}
  onUrlChange={setSelectedUrl}
/>
```

### Step 4 — URL Combobox in `CorrelationChart.tsx`

Add props:
```ts
interface CorrelationChartProps {
  // ...existing
  availableUrls: string[];
  selectedUrl: string | null;
  onUrlChange: (url: string | null) => void;
}
```

Add URL filter in card header (next to LayerControls):
```tsx
<div className="flex items-center gap-2">
  <Select
    value={selectedUrl ?? '__all__'}
    onValueChange={(v) => onUrlChange(v === '__all__' ? null : v)}
  >
    <SelectTrigger className="w-[280px] text-xs">
      <SelectValue placeholder="All pages" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__all__">All pages</SelectItem>
      {availableUrls.map(url => (
        <SelectItem key={url} value={url} className="text-xs font-mono">
          {url.length > 50 ? '...' + url.slice(-47) : url}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  {selectedUrl && (
    <Button variant="ghost" size="sm" onClick={() => onUrlChange(null)} className="h-8 px-2">
      ✕
    </Button>
  )}
</div>
```

Show filtered indicator in chart title:
```tsx
<CardTitle className="flex items-center gap-2">
  <BarChart3 className="w-5 h-5" />
  Correlation Chart
  {selectedUrl && (
    <span className="text-xs font-normal text-muted-foreground ml-1">
      — {selectedUrl.length > 40 ? '...' + selectedUrl.slice(-37) : selectedUrl}
    </span>
  )}
</CardTitle>
```

## Todo

- [ ] Add `GET /api/correlation/urls` sub-route to `correlation.ts`
- [ ] Add `url` optional param to main `GET /api/correlation` handler
- [ ] Apply `urlFilter` to both current and previous period GSC queries
- [ ] Register sub-route BEFORE main route (order matters in Hono)
- [ ] Add `selectedUrl`, `availableUrls` state to `dashboard/page.tsx`
- [ ] Add URL fetch effect triggered by `selectedProjectId` change
- [ ] Pass URL params into correlation fetch URL
- [ ] Add `availableUrls/selectedUrl/onUrlChange` props to `CorrelationChart`
- [ ] Add URL Select + clear button in chart header
- [ ] Run `npm run type-check` — verify no errors
- [ ] Test: filter to a URL, confirm chart data changes, confirm task annotations remain

## Success Criteria

- [ ] `GET /api/correlation/urls?projectId=X` returns list of distinct pages
- [ ] `GET /api/correlation?projectId=X&url=/some/path` returns filtered GSC data
- [ ] Chart header shows URL dropdown when project has GSC data
- [ ] Selecting URL updates chart (clicks/impressions for that URL only)
- [ ] Task annotations (markers/shading) remain visible regardless of URL filter
- [ ] Clearing URL filter restores all-pages view
- [ ] "All pages" is the default state

## Hono Route Order Note

In Hono, `/urls` sub-route MUST be registered before `/` catch-all:
```ts
app.get('/urls', handler);  // must come first
app.get('/', handler);
```
