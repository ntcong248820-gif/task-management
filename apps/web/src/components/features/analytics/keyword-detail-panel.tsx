'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useKeywordDetail } from '@/hooks/use-analytics';

interface KeywordDetailPanelProps {
  keyword: string | null;
  projectId: string;
  onClose: () => void;
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function KeywordDetailPanel({ keyword, projectId, onClose }: KeywordDetailPanelProps) {
  const { data, loading } = useKeywordDetail(projectId, keyword, 90);

  return (
    <Sheet open={!!keyword} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base truncate">{keyword}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* 90-day position trend */}
            <section>
              <h3 className="text-sm font-medium mb-2">Position history (90 days)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.positionHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    reversed
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    labelFormatter={formatDate}
                    formatter={(v: number) => [v.toFixed(1), 'Position']}
                  />
                  <Line type="monotone" dataKey="position" stroke="#3b82f6" strokeWidth={2} dot={false} name="Position" />
                </LineChart>
              </ResponsiveContainer>
            </section>

            {/* Clicks + impressions */}
            <section>
              <h3 className="text-sm font-medium mb-2">Clicks &amp; impressions</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data.positionHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ fontSize: 12 }} labelFormatter={formatDate} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="l" type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Clicks" />
                  <Line yAxisId="r" type="monotone" dataKey="impressions" stroke="#10b981" strokeWidth={1.5} dot={false} name="Impressions" />
                </LineChart>
              </ResponsiveContainer>
            </section>

            {/* Top pages */}
            {data.topPages.length > 0 && (
              <section>
                <h3 className="text-sm font-medium mb-2">Top ranking pages</h3>
                <div className="space-y-1.5">
                  {data.topPages.map(p => (
                    <div key={p.page} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-muted-foreground flex-1 min-w-0">{p.page}</span>
                      <span className="shrink-0 tabular-nums">pos {p.position.toFixed(1)}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{p.clicks.toLocaleString()} clicks</span>
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
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
