'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDateContext } from '@/contexts/DateContext';
import { format } from 'date-fns';
import { getApiUrl } from '@/lib/config';

export interface KeywordMover {
    query: string;
    position: number;
    previousPosition: number | null;
    positionChange: number;
    clicks: number;
    impressions: number;
}

export interface Summary {
    totalKeywords: number;
    improved: number;
    declined: number;
    unchanged: number;
    avgPosition: number;
}

export interface OverviewData {
    topMovers: {
        gainers: KeywordMover[];
        losers: KeywordMover[];
    };
    summary: Summary;
}

export interface Keyword {
    query: string;
    position: number;
    clicks: number;
    impressions: number;
    ctr: number;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface KeywordsData {
    keywords: Keyword[];
    pagination: Pagination;
}

export interface ChartDataPoint {
    date: string;
    displayDate: string;
    [key: string]: number | string;
}

export interface ChartData {
    chartData: ChartDataPoint[];
    keywords: string[];
}

export interface DistributionBucket {
    name: string;
    count: number;
    percentage: number;
}

export interface DistributionData {
    distribution: DistributionBucket[];
    totalKeywords: number;
}

export interface UseRankingsDataReturn {
    overview: OverviewData | null;
    keywordsData: KeywordsData | null;
    chartData: ChartData | null;
    distributionData: DistributionData | null;
    loading: boolean;
    error: string | null;
    // Actions
    fetchKeywords: (params: {
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
    }) => Promise<void>;
    refetch: () => void;
}

export function useRankingsData(projectId: number = 1): UseRankingsDataReturn {
    const { dateRange } = useDateContext();
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [keywordsData, setKeywordsData] = useState<KeywordsData | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [distributionData, setDistributionData] = useState<DistributionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    const fetchOverview = async () => {
        try {
            const res = await fetch(getApiUrl(`/api/rankings/overview?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`));
            const json = await res.json();
            if (json.success) {
                setOverview(json.data);
            }
        } catch (err) {
            console.error('Failed to fetch overview:', err);
        }
    };

    const fetchKeywords = useCallback(async (params: {
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
    } = {}) => {
        try {
            const { search = '', sortBy = 'clicks', sortOrder = 'desc', page = 1 } = params;
            const url = getApiUrl(`/api/rankings/keywords?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=20`);
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                setKeywordsData(json.data);
            }
        } catch (err) {
            console.error('Failed to fetch keywords:', err);
        }
    }, [projectId, startDate, endDate]);

    const fetchChart = async () => {
        try {
            const res = await fetch(getApiUrl(`/api/rankings/chart?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}&limit=5`));
            const json = await res.json();
            if (json.success) {
                setChartData(json.data);
            }
        } catch (err) {
            console.error('Failed to fetch chart:', err);
        }
    };

    const fetchDistribution = async () => {
        try {
            const res = await fetch(getApiUrl(`/api/rankings/distribution?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`));
            const json = await res.json();
            if (json.success) {
                setDistributionData(json.data);
            }
        } catch (err) {
            console.error('Failed to fetch distribution:', err);
        }
    };

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchOverview(),
                fetchKeywords(),
                fetchChart(),
                fetchDistribution(),
            ]);
        } catch (err: any) {
            setError(err.message || 'Failed to load rankings data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [projectId, startDate, endDate]);

    return {
        overview,
        keywordsData,
        chartData,
        distributionData,
        loading,
        error,
        fetchKeywords,
        refetch: fetchAll,
    };
}
