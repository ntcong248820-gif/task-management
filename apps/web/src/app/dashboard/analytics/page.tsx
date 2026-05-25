'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KpiCards } from '@/components/features/analytics/kpi-cards';
import { TrafficTrendChart } from '@/components/features/analytics/traffic-trend-chart';
import { TopMoversSection } from '@/components/features/analytics/top-movers-section';
import { CrossSourceInsightCard } from '@/components/features/analytics/cross-source-insight-card';
import { CorrelationChartV2 } from '@/components/features/analytics/correlation-chart-v2';
import { ImpactWindowPicker } from '@/components/features/analytics/impact-window-picker';
import { ImpactSummaryPanel } from '@/components/features/analytics/impact-summary-panel';
import { useAnalyticsOverview } from '@/hooks/use-analytics';
import { useImpactWindow } from '@/hooks/use-correlation';
import { useProjectStore } from '@/stores/use-project-store';
import { useWorkspaceStore } from '@/stores/use-workspace-store';

const DAYS_OPTIONS = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
] as const;

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const projects = useWorkspaceStore(s => s.projects);
  const selectedProjectId = useProjectStore(s => s.selectedProjectId);

  const [days, setDays] = useState('30');
  const [ga4Source, setGa4Source] = useState('all');

  // Correlation state
  const initialUrl = searchParams.get('url') ?? undefined;
  const [impactFrom, setImpactFrom] = useState<string | null>(null);
  const [impactTo, setImpactTo] = useState<string | null>(null);

  const projectId = selectedProjectId ?? projects[0]?.id ?? null;

  const { data, loading } = useAnalyticsOverview(projectId, Number(days), ga4Source !== 'all' ? ga4Source : undefined);
  const { data: impactData, loading: impactLoading } = useImpactWindow(projectId, impactFrom, impactTo);

  const handleApplyWindow = (from: string, to: string) => {
    setImpactFrom(from);
    setImpactTo(to);
  };

  const handleAnnotationClick = (date: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setImpactFrom(date);
    setImpactTo(today);
  };

  if (!projectId) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">No project selected. Please select a project from the sidebar.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Traffic, keyword performance, and correlation insights."
        actions={
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : data?.kpis ? (
          <KpiCards kpis={data.kpis} />
        ) : null}

        {/* Traffic Trend */}
        {loading ? (
          <div className="h-72 bg-muted animate-pulse rounded-lg" />
        ) : data?.trafficTrend ? (
          <TrafficTrendChart data={data.trafficTrend} taskAnnotations={[]} />
        ) : null}

        {/* Top Movers */}
        {data?.topMovers && (
          <TopMoversSection
            improving={data.topMovers.improving}
            declining={data.topMovers.declining}
          />
        )}

        {/* Cross-source insight */}
        <CrossSourceInsightCard
          insight={data?.crossSourceInsight ?? null}
          ga4Source={ga4Source}
          onGa4SourceChange={setGa4Source}
        />

        {/* Correlation section */}
        <div id="correlation" className="space-y-4">
          <h2 className="text-base font-semibold">Correlation</h2>

          <CorrelationChartV2
            projectId={projectId}
            days={Number(days)}
            initialUrl={initialUrl}
            highlightFrom={impactFrom}
            highlightTo={impactTo}
            onAnnotationClick={handleAnnotationClick}
          />

          <ImpactWindowPicker
            from={impactFrom}
            to={impactTo}
            onApply={handleApplyWindow}
          />

          {(impactFrom && impactTo) && (
            <ImpactSummaryPanel
              data={impactData!}
              loading={impactLoading}
              onFocusTask={handleApplyWindow}
            />
          )}
        </div>
      </div>
    </div>
  );
}
