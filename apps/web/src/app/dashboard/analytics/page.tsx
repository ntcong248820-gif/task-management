'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MousePointerClick, Eye, Target, TrendingUp, Activity, Users, ShoppingCart } from 'lucide-react';
import { useAnalyticsData } from '@/hooks';
import {
  MetricCard,
  GSCChart,
  GA4Chart,
  TrafficSourcesTable,
  LoadingSkeleton,
} from '@/components/features/analytics';

export default function AnalyticsDashboard() {
  const { gscData, ga4Data, loading, error } = useAnalyticsData(1);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Analytics Dashboard</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <div className="text-sm text-slate-400">Last 30 days</div>
      </div>

      {error && (
        <Card className="bg-rose-900/20 border-rose-700 mb-6">
          <CardContent className="pt-4">
            <p className="text-rose-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="gsc" className="space-y-6">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="gsc" className="data-[state=active]:bg-slate-700">Search Console</TabsTrigger>
          <TabsTrigger value="ga4" className="data-[state=active]:bg-slate-700">Google Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="gsc" className="space-y-6">
          {gscData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Clicks"
                  value={gscData.metrics.clicks.value}
                  change={gscData.metrics.clicks.change}
                  icon={MousePointerClick}
                />
                <MetricCard
                  title="Impressions"
                  value={gscData.metrics.impressions.value}
                  change={gscData.metrics.impressions.change}
                  icon={Eye}
                />
                <MetricCard
                  title="CTR"
                  value={gscData.metrics.ctr.value}
                  change={gscData.metrics.ctr.change}
                  icon={Target}
                  format="percent"
                />
                <MetricCard
                  title="Avg. Position"
                  value={gscData.metrics.position.value}
                  change={gscData.metrics.position.change}
                  icon={TrendingUp}
                  format="decimal"
                />
              </div>
              <GSCChart data={gscData.chartData} />
            </>
          ) : (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="py-10 text-center">
                <p className="text-slate-400">No GSC data available. Connect Google Search Console to see metrics.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ga4" className="space-y-6">
          {ga4Data ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Sessions"
                  value={ga4Data.metrics.sessions.value}
                  change={ga4Data.metrics.sessions.change}
                  icon={Activity}
                />
                <MetricCard
                  title="Users"
                  value={ga4Data.metrics.users.value}
                  change={ga4Data.metrics.users.change}
                  icon={Users}
                />
                <MetricCard
                  title="Conversions"
                  value={ga4Data.metrics.conversions.value}
                  change={ga4Data.metrics.conversions.change}
                  icon={ShoppingCart}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GA4Chart data={ga4Data.chartData} />
                <TrafficSourcesTable data={ga4Data.trafficSources} />
              </div>
            </>
          ) : (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="py-10 text-center">
                <p className="text-slate-400">No GA4 data available. Connect Google Analytics to see metrics.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
