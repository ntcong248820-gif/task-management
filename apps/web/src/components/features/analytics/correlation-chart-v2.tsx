'use client';

import { useState, useCallback } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Legend,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCorrelationData, useCorrelationUrls } from '@/hooks/use-correlation';
import type { TaskAnnotation } from '@/hooks/use-correlation';

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  tasks: TaskAnnotation[];
}

function CustomTooltip({ active, payload, label, tasks }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  const dateTasks = tasks.filter(
    t => t.completedAt && t.completedAt.slice(0, 10) === label,
  );

  return (
    <div className="rounded-md border bg-background p-2.5 shadow-md text-xs space-y-1 min-w-[160px]">
      <p className="font-medium">{formatDate(label)}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="tabular-nums font-medium">{p.value?.toLocaleString()}</span>
        </p>
      ))}
      {dateTasks.length > 0 && (
        <div className="border-t pt-1 mt-1 space-y-0.5">
          {dateTasks.map(t => (
            <p key={t.id} className="text-amber-600">◆ {t.title}</p>
          ))}
        </div>
      )}
    </div>
  );
}

interface CorrelationChartV2Props {
  projectId: string;
  days?: number;
  initialUrl?: string;
  highlightFrom?: string | null;
  highlightTo?: string | null;
  onAnnotationClick?: (date: string) => void;
}

export function CorrelationChartV2({
  projectId,
  days = 90,
  initialUrl,
  highlightFrom,
  highlightTo,
  onAnnotationClick,
}: CorrelationChartV2Props) {
  const [selectedUrl, setSelectedUrl] = useState<string>(initialUrl ?? 'all');
  const { urls, loading: urlsLoading } = useCorrelationUrls(projectId);
  const {
    data,
    loading,
  } = useCorrelationData(projectId, days, selectedUrl !== 'all' ? selectedUrl : undefined);

  const handleUrlChange = useCallback((val: string) => {
    setSelectedUrl(val);
  }, []);

  const tasks = data?.tasks ?? [];

  return (
    <div className="space-y-3">
      {/* URL filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Page filter:</span>
        <Select value={selectedUrl} onValueChange={handleUrlChange} disabled={urlsLoading}>
          <SelectTrigger className="h-8 w-56 text-xs">
            <SelectValue placeholder="All pages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pages</SelectItem>
            {urls.map(u => {
              const display = u.replace(/^https?:\/\/[^/]+/, '') || '/';
              return (
                <SelectItem key={u} value={u} className="text-xs">
                  <span className="truncate max-w-[200px] block" title={u}>{display}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-[260px] bg-muted animate-pulse rounded-md" />
      ) : !data ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data.chartData} margin={{ top: 4, right: 32, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="corrClicksGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="corrImpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />

            <Tooltip
              content={<CustomTooltip tasks={tasks} />}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />

            {/* Highlighted date range */}
            {highlightFrom && highlightTo && (
              <ReferenceArea
                yAxisId="left"
                x1={highlightFrom}
                x2={highlightTo}
                fill="#3b82f6"
                fillOpacity={0.08}
                strokeOpacity={0.3}
                stroke="#3b82f6"
              />
            )}

            {/* Task annotation lines */}
            {tasks.map(t => {
              const annotDate = t.completedAt ? t.completedAt.slice(0, 10) : null;
              if (!annotDate) return null;
              return (
                <ReferenceLine
                  key={t.id}
                  yAxisId="left"
                  x={annotDate}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  onClick={() => onAnnotationClick?.(annotDate)}
                  style={{ cursor: onAnnotationClick ? 'pointer' : undefined }}
                />
              );
            })}

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="clicks"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#corrClicksGrad)"
              dot={false}
              name="GSC Clicks"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="impressions"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="url(#corrImpGrad)"
              dot={false}
              name="Impressions"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sessions"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              name="GA4 Sessions"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Annotation legend */}
      {tasks.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          <span className="inline-block w-3 border-t border-dashed border-amber-500 mr-1 align-middle" />
          Dashed lines = completed tasks (affectsWebsite=true). Click a line to set the impact window from that date.
        </p>
      )}
    </div>
  );
}
