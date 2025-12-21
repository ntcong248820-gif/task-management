'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpIcon, ArrowDownIcon, MousePointerClick, Eye, Target, TrendingUp, Users, ShoppingCart, Activity } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MetricValue {
  value: number;
  change: number;
}

interface GSCMetrics {
  clicks: MetricValue;
  impressions: MetricValue;
  ctr: MetricValue;
  position: MetricValue;
}

interface GA4Metrics {
  sessions: MetricValue;
  users: MetricValue;
  conversions: MetricValue;
  revenue: MetricValue;
}

interface ChartData {
  date: string;
  [key: string]: number | string;
}

interface TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  conversions: number;
  convRate: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  format = 'number',
  suffix = ''
}: {
  title: string;
  value: number;
  change: number;
  icon: React.ElementType;
  format?: 'number' | 'currency' | 'percent' | 'decimal';
  suffix?: string;
}) {
  const isPositive = change >= 0;

  const formatValue = () => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return value.toFixed(2) + '%';
      case 'decimal':
        return value.toFixed(1) + suffix;
      default:
        return formatNumber(value) + suffix;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{formatValue()}</div>
        <div className={`flex items-center text-xs mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
          {Math.abs(change).toFixed(1)}% vs previous period
        </div>
      </CardContent>
    </Card>
  );
}

function GSCChart({ data }: { data: ChartData[] }) {
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Search Performance</CardTitle>
        <CardDescription className="text-slate-400">Clicks and Impressions over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#f1f5f9' }}
            />
            <Legend />
            <Area type="monotone" dataKey="clicks" stroke="#3b82f6" fillOpacity={1} fill="url(#colorClicks)" name="Clicks" />
            <Area type="monotone" dataKey="impressions" stroke="#10b981" fillOpacity={1} fill="url(#colorImpressions)" name="Impressions" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function GA4Chart({ data }: { data: ChartData[] }) {
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Sessions & Conversions</CardTitle>
        <CardDescription className="text-slate-400">Traffic and conversion trends</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#f1f5f9' }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Sessions" />
            <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#f59e0b" strokeWidth={2} dot={false} name="Conversions" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TrafficSourcesTable({ data }: { data: TrafficSource[] }) {
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Traffic Sources</CardTitle>
        <CardDescription className="text-slate-400">Top sources by sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Source / Medium</th>
                <th className="text-right py-3 px-2 text-slate-400 font-medium">Sessions</th>
                <th className="text-right py-3 px-2 text-slate-400 font-medium">Conv.</th>
                <th className="text-right py-3 px-2 text-slate-400 font-medium">Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                  <td className="py-3 px-2 text-white font-medium">
                    {row.source} <span className="text-slate-500">/ {row.medium}</span>
                  </td>
                  <td className="text-right py-3 px-2 text-slate-300">{formatNumber(row.sessions)}</td>
                  <td className="text-right py-3 px-2 text-slate-300">{formatNumber(row.conversions)}</td>
                  <td className="text-right py-3 px-2 text-emerald-400">{row.convRate.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-slate-900 border-slate-700 animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-slate-700 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-700 rounded w-32 mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-slate-900 border-slate-700 animate-pulse">
        <CardContent className="p-6">
          <div className="h-[350px] bg-slate-800 rounded"></div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [gscData, setGscData] = useState<{ metrics: GSCMetrics; chartData: ChartData[] } | null>(null);
  const [ga4Data, setGa4Data] = useState<{ metrics: GA4Metrics; chartData: ChartData[]; trafficSources: TrafficSource[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const projectId = 1; // TODO: Get from context/params

        // Fetch GSC data
        const gscRes = await fetch(`${API_BASE}/api/analytics/gsc?projectId=${projectId}`);
        const gscJson = await gscRes.json();
        if (gscJson.success) {
          setGscData(gscJson.data);
        }

        // Fetch GA4 data
        const ga4Res = await fetch(`${API_BASE}/api/analytics/ga4?projectId=${projectId}`);
        const ga4Json = await ga4Res.json();
        if (ga4Json.success) {
          setGa4Data(ga4Json.data);
        }

        setError(null);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
        console.error('Failed to fetch analytics:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
    </div >
  );
}
