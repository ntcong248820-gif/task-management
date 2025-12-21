'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  ListTodo,
  TrendingUp,
  Activity,
  Layers,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Hammer,
  FileText,
  Link2,
  Wrench,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CorrelationData {
  date: string;
  displayDate: string;
  clicks: number;
  impressions: number;
  position: number;
  ahrefsTraffic: number;
  drScore: number;
  completedTasks: {
    id: number;
    title: string;
    type: string;
    timeSpent: number;
  }[];
}

interface Metrics {
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number;
  tasksCompleted: number;
  trafficGrowth: number;
  currentDR: number;
}

interface RecentTask {
  id: number;
  title: string;
  type: string;
  date: string;
  impact: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  subtext,
  colorClass = 'text-primary',
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: number;
  subtext: string;
  colorClass?: string;
}) {
  const isPositive = (trend || 0) >= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between pb-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center text-xs">
            {trend !== undefined && (
              <span className={`font-medium flex items-center ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {Math.abs(trend)}%
              </span>
            )}
            <span className="text-muted-foreground ml-2">{subtext}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Custom Tooltip for the chart
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as CorrelationData;
  const hasTasks = data.completedTasks?.length > 0;

  return (
    <div className="bg-slate-900 text-white p-4 rounded-lg shadow-xl border border-slate-700 min-w-[250px] z-50">
      <p className="text-sm font-medium text-slate-400 mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-bold">{formatNumber(entry.value)}</span>
          </div>
        ))}
      </div>
      {hasTasks && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1">
            <Hammer className="w-3 h-3" />Tasks Done:
          </p>
          <ul className="space-y-1">
            {data.completedTasks.map((task) => (
              <li key={task.id} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                {task.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TaskTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'backlink':
      return <Link2 className="w-4 h-4 text-purple-500" />;
    case 'content':
      return <FileText className="w-4 h-4 text-blue-500" />;
    default:
      return <Wrench className="w-4 h-4 text-orange-500" />;
  }
}

export default function DashboardPage() {
  const [chartData, setChartData] = useState<CorrelationData[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [layers, setLayers] = useState({
    clicks: true,
    ahrefs: false,
    dr: false,
    impact: true,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/correlation?projectId=1&days=${dateRange}`);
        const json = await res.json();
        if (json.success) {
          setChartData(json.data.chartData);
          setMetrics(json.data.metrics);
          setRecentTasks(json.data.recentImpactTasks);
        }
      } catch (error) {
        console.error('Failed to fetch correlation data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange]);

  // Find indices where tasks were completed for ReferenceArea
  const impactWindows = useMemo(() => {
    if (!layers.impact) return [];
    return chartData
      .map((d, i) => ({ index: i, hasTask: d.completedTasks?.length > 0 }))
      .filter((d) => d.hasTask)
      .map((d) => ({
        startIndex: d.index,
        endIndex: Math.min(d.index + 7, chartData.length - 1), // 7-day impact window
      }));
  }, [chartData, layers.impact]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted animate-pulse rounded w-24 mb-2" />
                <div className="h-8 bg-muted animate-pulse rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-[400px] bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Correlation Dashboard</h1>
          <p className="text-muted-foreground">
            Chứng minh tác động của SEO Tasks lên Traffic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="text-sm border border-input px-3 py-1.5 rounded-md bg-background"
          >
            <option value={7}>7 ngày qua</option>
            <option value={30}>30 ngày qua</option>
            <option value={90}>90 ngày qua</option>
          </select>
          <Button variant="default" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Traffic Growth"
          value={`${metrics?.trafficGrowth && metrics.trafficGrowth > 0 ? '+' : ''}${metrics?.trafficGrowth || 0}%`}
          icon={TrendingUp}
          trend={metrics?.trafficGrowth}
          subtext="vs prev period"
          colorClass="text-blue-500"
        />
        <KPICard
          title="Tasks Completed"
          value={String(metrics?.tasksCompleted || 0)}
          icon={ListTodo}
          subtext="this period"
        />
        <KPICard
          title="Total Clicks"
          value={formatNumber(metrics?.totalClicks || 0)}
          icon={BarChart3}
          subtext="organic clicks"
          colorClass="text-green-500"
        />
        <KPICard
          title="Domain Rating"
          value={String(metrics?.currentDR || 65)}
          icon={Activity}
          trend={2}
          subtext="+2 points"
          colorClass="text-purple-500"
        />
      </div>

      {/* Correlation Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Correlation Chart
            </CardTitle>
            {/* Layer Controls */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-muted-foreground flex items-center gap-1">
                <Layers className="w-3 h-3" /> Layers:
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.clicks}
                  onChange={() => setLayers((p) => ({ ...p, clicks: !p.clicks }))}
                  className="rounded border-input accent-blue-600"
                />
                <span className="text-blue-600 font-medium">GSC Clicks</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.ahrefs}
                  onChange={() => setLayers((p) => ({ ...p, ahrefs: !p.ahrefs }))}
                  className="rounded border-input accent-purple-600"
                />
                <span className="text-purple-600 font-medium">Ahrefs Traffic</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.dr}
                  onChange={() => setLayers((p) => ({ ...p, dr: !p.dr }))}
                  className="rounded border-input accent-orange-600"
                />
                <span className="text-orange-600 font-medium">DR Score</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.impact}
                  onChange={() => setLayers((p) => ({ ...p, impact: !p.impact }))}
                  className="rounded border-input accent-emerald-600"
                />
                <span className="text-emerald-600 font-medium">Impact Windows</span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="displayDate"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  interval={dateRange > 30 ? 4 : 0}
                />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Impact Windows (ReferenceArea) */}
                {impactWindows.map((window, i) => (
                  <ReferenceArea
                    key={i}
                    yAxisId="left"
                    x1={chartData[window.startIndex]?.displayDate}
                    x2={chartData[window.endIndex]?.displayDate}
                    fill="#10b981"
                    fillOpacity={0.15}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                  />
                ))}

                {layers.clicks && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="clicks"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorClicks)"
                    name="GSC Clicks"
                  />
                )}
                {layers.ahrefs && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="ahrefsTraffic"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Ahrefs Traffic"
                  />
                )}
                {layers.dr && (
                  <Line
                    yAxisId="right"
                    type="stepAfter"
                    dataKey="drScore"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    name="DR Score"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent High-Impact Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent High-Impact Tasks</CardTitle>
          <CardDescription>Tasks completed in this period with estimated impact</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTasks.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground bg-muted/50 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Task Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3 text-right">Impact</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{task.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TaskTypeIcon type={task.type} />
                        <span className="capitalize">{task.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{task.date}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-bold">+{task.impact}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No completed tasks in this period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
