'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { usePageDetail } from '@/hooks/use-analytics';

interface PageDetailPanelProps {
  url: string | null;
  projectId: string;
  onClose: () => void;
  onOpenCorrelation?: (url: string) => void;
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PageDetailPanel({ url, projectId, onClose, onOpenCorrelation }: PageDetailPanelProps) {
  const { data, loading } = usePageDetail(projectId, url, 90);
  const displayUrl = url ? url.replace(/^https?:\/\/[^/]+/, '') || '/' : '';

  return (
    <Sheet open={!!url} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base truncate" title={url ?? ''}>
            {displayUrl}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* 90-day traffic trend */}
            <section>
              <h3 className="text-sm font-medium mb-2">Traffic history (90 days)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.trafficHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pageClicksGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ fontSize: 12 }} labelFormatter={formatDate} />
                  <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} fill="url(#pageClicksGrad)" dot={false} name="Clicks" />
                </AreaChart>
              </ResponsiveContainer>
            </section>

            {/* Top keywords */}
            {data.topKeywords.length > 0 && (
              <section>
                <h3 className="text-sm font-medium mb-2">Top keywords for this page</h3>
                <div className="space-y-1.5">
                  {data.topKeywords.map(k => (
                    <div key={k.query} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate flex-1 min-w-0">{k.query}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">pos {k.position.toFixed(1)}</span>
                      <span className="shrink-0 tabular-nums">{k.clicks.toLocaleString()} clicks</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Linked tasks */}
            {data.linkedTasks.length > 0 && (
              <section>
                <h3 className="text-sm font-medium mb-2">Linked tasks</h3>
                <div className="space-y-1.5">
                  {data.linkedTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0">{t.status}</Badge>
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {onOpenCorrelation && url && (
              <button
                onClick={() => { onOpenCorrelation(url); onClose(); }}
                className="text-xs text-blue-600 hover:underline"
              >
                View in correlation chart →
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
