'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, ListTodo, BarChart3, Activity } from 'lucide-react';
import {
  KPICard,
  CorrelationChart,
  RecentTasksTable,
} from '@/components/features/dashboard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types
interface CorrelationData {
  date: string;
  displayDate: string;
  clicks: number;
  impressions: number;
  position: number;
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
}

interface RecentTask {
  id: number;
  title: string;
  type: string;
  date: string;
  impact: number;
}

interface LayerState {
  clicks: boolean;
  impressions: boolean;
  impact: boolean;
}

// Helper function
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// Custom hook for fetching correlation data
function useCorrelationData(dateRange: number) {
  const [chartData, setChartData] = useState<CorrelationData[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/correlation?projectId=1&days=${dateRange}`);
        const json = await res.json();
        if (json.success && json.data) {
          setChartData(json.data.chartData || []);
          setMetrics(json.data.metrics || null);
          setRecentTasks(json.data.recentImpactTasks || []);
        }
      } catch (error) {
        console.error('Error fetching correlation data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange]);

  return { chartData, metrics, recentTasks, loading };
}

function DashboardContent() {
  const [dateRange, setDateRange] = useState(30);
  const [layers, setLayers] = useState<LayerState>({
    clicks: true,
    impressions: false,
    impact: true,
  });

  const { chartData, metrics, recentTasks, loading } = useCorrelationData(dateRange);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading correlation data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Correlation Dashboard</h1>
          <p className="text-muted-foreground">
            See how your SEO tasks impact organic traffic over time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center rounded-md border">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={dateRange === days ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(days)}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
              >
                {days}D
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Traffic Growth"
          value={`${metrics?.trafficGrowth || 0}%`}
          icon={TrendingUp}
          trend={metrics?.trafficGrowth}
          subtext="vs previous period"
          colorClass="text-blue-500"
        />
        <KPICard
          title="Tasks Completed"
          value={String(metrics?.tasksCompleted || 0)}
          icon={ListTodo}
          subtext="in this period"
          colorClass="text-orange-500"
        />
        <KPICard
          title="Total Clicks"
          value={formatNumber(metrics?.totalClicks || 0)}
          icon={BarChart3}
          subtext="organic clicks"
          colorClass="text-green-500"
        />
        <KPICard
          title="Avg Position"
          value={String(metrics?.avgPosition || 0)}
          icon={Activity}
          subtext="search position"
          colorClass="text-purple-500"
        />
      </div>

      {/* Correlation Chart */}
      <CorrelationChart
        data={chartData}
        layers={layers}
        onLayerChange={setLayers}
        dateRange={dateRange}
      />

      {/* Recent High-Impact Tasks */}
      <RecentTasksTable tasks={recentTasks} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
