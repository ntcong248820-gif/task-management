'use client';

import useSWR from 'swr';
import { useDateContext } from '@/contexts/DateContext';
import { format } from 'date-fns';
import { fetcher } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';

export interface MetricValue {
    value: number;
    change: number;
}

export interface GSCMetrics {
    clicks: MetricValue;
    impressions: MetricValue;
    ctr: MetricValue;
    position: MetricValue;
}

export interface GA4Metrics {
    sessions: MetricValue;
    users: MetricValue;
    conversions: MetricValue;
    revenue: MetricValue;
}

export interface ChartData {
    date: string;
    [key: string]: number | string;
}

export interface TrafficSource {
    source: string;
    medium: string;
    sessions: number;
    conversions: number;
    convRate: number;
}

export interface GSCData {
    metrics: GSCMetrics;
    chartData: ChartData[];
}

export interface GA4Data {
    metrics: GA4Metrics;
    chartData: ChartData[];
    trafficSources: TrafficSource[];
}

export interface UseAnalyticsDataReturn {
    gscData: GSCData | null;
    ga4Data: GA4Data | null;
    loading: boolean;
    error: string | null;
    mutate: () => void;
}

/**
 * Custom hook for fetching GSC and GA4 analytics data using SWR
 */
export function useAnalyticsData(projectId: number | null): UseAnalyticsDataReturn {
    const { dateRange } = useDateContext();
    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    const gscKey = projectId
        ? getApiUrl(`/api/analytics/gsc?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`)
        : null;
    const ga4Key = projectId
        ? getApiUrl(`/api/analytics/ga4?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`)
        : null;

    const { data: gscData, error: gscError, isLoading: gscLoading, mutate: gscMutate } = useSWR(gscKey, fetcher);
    const { data: ga4Data, error: ga4Error, isLoading: ga4Loading, mutate: ga4Mutate } = useSWR(ga4Key, fetcher);

    const error = gscError?.message || ga4Error?.message || null;
    const loading = gscLoading || ga4Loading;

    return {
        gscData: gscData || null,
        ga4Data: ga4Data || null,
        loading,
        error,
        mutate: () => {
            gscMutate();
            ga4Mutate();
        },
    };
}