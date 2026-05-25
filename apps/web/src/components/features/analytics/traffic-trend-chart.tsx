'use client';

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DailyTrafficPoint } from '@/hooks/use-analytics';
import type { TaskAnnotation } from '@/hooks/use-correlation';

interface TrafficTrendChartProps {
  data: DailyTrafficPoint[];
  taskAnnotations?: TaskAnnotation[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const CustomTooltip = ({ active, payload, label, tasksByDate }: any) => {
  if (!active || !payload?.length) return null;
  const tasks: TaskAnnotation[] = tasksByDate?.[label] ?? [];
  return (
    <div className="rounded-lg border bg-background p-2.5 text-xs shadow-md min-w-[150px]">
      <p className="font-medium mb-1.5">{formatDate(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono tabular-nums">{p.value?.toLocaleString()}</span>
        </div>
      ))}
      {tasks.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t">
          {tasks.map(t => (
            <p key={t.id} className="text-muted-foreground truncate max-w-[180px]">
              ✦ {t.title}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export function TrafficTrendChart({ data, taskAnnotations = [] }: TrafficTrendChartProps) {
  const tasksByDate = taskAnnotations.reduce<Record<string, TaskAnnotation[]>>((acc, t) => {
    if (t.completedAt) {
      acc[t.completedAt] = [...(acc[t.completedAt] ?? []), t];
    }
    return acc;
  }, {});

  const annotationDates = [...new Set(taskAnnotations.map(t => t.completedAt).filter(Boolean))] as string[];

  // Downsample x-axis labels for readability
  const tickDates = data
    .filter((_, i) => i % Math.ceil(data.length / 8) === 0)
    .map(d => d.date);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Traffic Trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              ticks={tickDates}
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatNumber}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatNumber}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip tasksByDate={tasksByDate} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />

            {annotationDates.map(date => (
              <ReferenceLine
                key={date}
                yAxisId="left"
                x={date}
                stroke="#f59e0b"
                strokeDasharray="4 3"
                strokeWidth={1.5}
              />
            ))}

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="clicks"
              name="Clicks"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#clicksGrad)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sessions"
              name="GA4 Sessions"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="5 3"
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {annotationDates.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 text-center">
            <span className="inline-block w-6 border-t border-dashed border-amber-500 mr-1 align-middle" />
            Task completed (affects website)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
