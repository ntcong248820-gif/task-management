'use client';

import { useEffect, useState } from 'react';

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

interface GSCData {
    metrics: GSCMetrics;
    chartData: ChartData[];
}

interface GA4Data {
    metrics: GA4Metrics;
    chartData: ChartData[];
    trafficSources: TrafficSource[];
}

interface UseAnalyticsDataReturn {
    gscData: GSCData | null;
    ga4Data: GA4Data | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Custom hook for fetching GSC and GA4 analytics data
 * Separates data fetching logic from UI components
 */
export function useAnalyticsData(projectId: number = 1): UseAnalyticsDataReturn {
    const [gscData, setGscData] = useState<GSCData | null>(null);
    const [ga4Data, setGa4Data] = useState<GA4Data | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

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
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
            console.error('Failed to fetch analytics:', err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [projectId]);

    return {
        gscData,
        ga4Data,
        loading,
        error,
        refetch: fetchData,
    };
}

// Re-export types for component use
export type { GSCMetrics, GA4Metrics, ChartData, TrafficSource, GSCData, GA4Data };
