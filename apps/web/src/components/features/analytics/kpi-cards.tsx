'use client';

import { TrendingUp, TrendingDown, Minus, MousePointerClick, Eye, Target, BarChart2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { AnalyticsKpis } from '@/hooks/use-analytics';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  invertChange?: boolean;
}

function KpiCard({ label, value, change, icon, invertChange = false }: KpiCardProps) {
  const isPositive = invertChange ? change < 0 : change > 0;
  const isNeutral = change === 0;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {isNeutral ? (
            <Minus className="h-3 w-3 text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {isNeutral ? '–' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
          </span>
          <span className="text-xs text-muted-foreground">vs prev period</span>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface KpiCardsProps {
  kpis: AnalyticsKpis;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        label="Total Clicks"
        value={formatNumber(kpis.clicks.value)}
        change={kpis.clicks.change}
        icon={<MousePointerClick className="h-4 w-4" />}
      />
      <KpiCard
        label="Impressions"
        value={formatNumber(kpis.impressions.value)}
        change={kpis.impressions.change}
        icon={<Eye className="h-4 w-4" />}
      />
      <KpiCard
        label="Avg Position"
        value={kpis.avgPosition.value.toFixed(1)}
        change={kpis.avgPosition.change}
        icon={<Target className="h-4 w-4" />}
        invertChange
      />
      <KpiCard
        label="Avg CTR"
        value={`${kpis.avgCtr.value.toFixed(2)}%`}
        change={kpis.avgCtr.change}
        icon={<BarChart2 className="h-4 w-4" />}
      />
    </div>
  );
}
