'use client';

import { Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ImpactWindowData } from '@/hooks/use-correlation';
import type { TaskAnnotation } from '@/hooks/use-correlation';

interface ImpactSummaryPanelProps {
  data: ImpactWindowData;
  loading?: boolean;
  onFocusTask?: (from: string, to: string) => void;
}

function DeltaBadge({ value }: { value: number }) {
  const isPos = value > 0;
  return (
    <span className={cn('text-xs font-medium', isPos ? 'text-emerald-600' : 'text-red-500')}>
      {isPos ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function MetricRow({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 tabular-nums">
        <span className="text-sm font-medium">{value}</span>
        {delta !== undefined && <DeltaBadge value={delta} />}
      </div>
    </div>
  );
}

export function ImpactSummaryPanel({ data, loading, onFocusTask }: ImpactSummaryPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const copyReport = () => {
    const lines = [
      `Period: ${data.periodLabel}`,
      `Clicks: ${data.rangeClicks.toLocaleString()} (${data.deltaClicks > 0 ? '+' : ''}${data.deltaClicks.toFixed(1)}% vs ${data.priorPeriodLabel})`,
      `Impressions: ${data.rangeImpressions.toLocaleString()} (${data.deltaImpressions > 0 ? '+' : ''}${data.deltaImpressions.toFixed(1)}%)`,
      `Avg Position: ${data.rangeAvgPosition.toFixed(1)}`,
    ];
    if (data.tasks.length > 0) {
      lines.push('', 'Tasks completed in period:');
      data.tasks.forEach(t => lines.push(`• ${t.title}${t.completedAt ? ` (${t.completedAt.slice(0, 10)})` : ''}`));
    }
    navigator.clipboard.writeText(lines.join('\n'));
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Showing: {data.periodLabel}
          <span className="text-xs text-muted-foreground ml-2">vs {data.priorPeriodLabel}</span>
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy as report snippet" onClick={copyReport}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          <MetricRow
            label="Clicks in range"
            value={data.rangeClicks.toLocaleString()}
            delta={data.deltaClicks}
          />
          <MetricRow
            label="Impressions in range"
            value={data.rangeImpressions.toLocaleString()}
            delta={data.deltaImpressions}
          />
          <MetricRow
            label="Avg Position in range"
            value={data.rangeAvgPosition.toFixed(1)}
          />
        </div>

        {data.tasks.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Tasks in period</p>
            <div className="space-y-1.5">
              {data.tasks.map(t => (
                <TaskRow key={t.id} task={t} onFocus={onFocusTask} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRow({
  task,
  onFocus,
}: {
  task: TaskAnnotation;
  onFocus?: (from: string, to: string) => void;
}) {
  const completedDate = task.completedAt ? task.completedAt.slice(0, 10) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex items-center gap-2 text-xs">
      {task.taskType && (
        <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0">{task.taskType}</Badge>
      )}
      <span className="truncate flex-1 min-w-0">{task.title}</span>
      {completedDate && <span className="text-muted-foreground shrink-0">{completedDate}</span>}
      {onFocus && completedDate && (
        <button
          className="text-blue-600 hover:underline shrink-0"
          onClick={() => onFocus(completedDate, today)}
        >
          Focus →
        </button>
      )}
    </div>
  );
}
