'use client';

import { AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CrossSourceInsight } from '@/hooks/use-analytics';

const GA4_SOURCE_OPTIONS = [
  { value: 'all', label: 'All sessions' },
  { value: 'organic', label: 'Organic' },
  { value: 'direct', label: 'Direct' },
  { value: 'social', label: 'Social' },
  { value: 'referral', label: 'Referral' },
] as const;

interface CrossSourceInsightCardProps {
  insight: CrossSourceInsight | null;
  ga4Source: string;
  onGa4SourceChange: (source: string) => void;
}

export function CrossSourceInsightCard({
  insight,
  ga4Source,
  onGa4SourceChange,
}: CrossSourceInsightCardProps) {
  const isWarning = insight?.severity === 'warning';

  return (
    <Card className={cn(
      'border',
      insight && isWarning && 'border-amber-400/50 bg-amber-500/5',
      insight && !isWarning && 'border-blue-400/40 bg-blue-500/5',
    )}>
      <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          {insight ? (
            isWarning
              ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              : <Info className="h-4 w-4 text-blue-500 shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          Cross-source comparison
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">GA4 source:</span>
          <Select value={ga4Source} onValueChange={onGa4SourceChange}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GA4_SOURCE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {ga4Source === 'organic' && (
          <p className="text-xs text-muted-foreground">
            Filtering GA4 to organic gives an apples-to-apples comparison with GSC (which is organic-only).
          </p>
        )}

        {!insight ? (
          <p className="text-xs text-muted-foreground">
            No significant gap detected between GSC and GA4{ga4Source !== 'all' ? ` (${ga4Source})` : ''} in this period.
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className={cn(
              'text-sm font-medium',
              isWarning ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400',
            )}>
              {insight.message}
            </p>
            <p className="text-xs text-muted-foreground">
              {insight.tooltip}
            </p>
            <div className="flex items-center gap-4 text-xs pt-1">
              <span>
                GSC growth: <span className={cn('font-medium tabular-nums', insight.gscGrowth >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {insight.gscGrowth >= 0 ? '+' : ''}{insight.gscGrowth.toFixed(1)}%
                </span>
              </span>
              <span>
                GA4 growth: <span className={cn('font-medium tabular-nums', insight.ga4Growth >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {insight.ga4Growth >= 0 ? '+' : ''}{insight.ga4Growth.toFixed(1)}%
                </span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
