'use client';

import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface KeywordMover {
    query: string;
    position: number;
    previousPosition: number | null;
    positionChange: number;
    clicks: number;
    impressions: number;
}

interface Summary {
    totalKeywords: number;
    improved: number;
    declined: number;
    unchanged: number;
    avgPosition: number;
}

interface OverviewData {
    topMovers: {
        gainers: KeywordMover[];
        losers: KeywordMover[];
    };
    summary: Summary;
}

interface Keyword {
    query: string;
    position: number;
    clicks: number;
    impressions: number;
    ctr: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface KeywordsData {
    keywords: Keyword[];
    pagination: Pagination;
}

interface ChartDataPoint {
    date: string;
    displayDate: string;
    [key: string]: number | string;
}

interface ChartData {
    chartData: ChartDataPoint[];
    keywords: string[];
}

interface DistributionBucket {
    name: string;
    count: number;
    percentage: number;
}

interface DistributionData {
    distribution: DistributionBucket[];
    totalKeywords: number;
}

interface UseRankingsDataReturn {
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

export function useRankingsData(projectId: number = 1, days: number = 30): UseRankingsDataReturn {
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [keywordsData, setKeywordsData] = useState<KeywordsData | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [distributionData, setDistributionData] = useState<DistributionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOverview = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/rankings/overview?projectId=${projectId}&days=${days}`);
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
            const url = `${API_BASE}/api/rankings/keywords?projectId=${projectId}&days=${days}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=20`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                setKeywordsData(json.data);
            }
        } catch (err) {
            console.error('Failed to fetch keywords:', err);
        }
    }, [projectId, days]);

    const fetchChart = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/rankings/chart?projectId=${projectId}&days=${days}&limit=5`);
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
            const res = await fetch(`${API_BASE}/api/rankings/distribution?projectId=${projectId}&days=${days}`);
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
    }, [projectId, days]);

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

// Export types
export type { KeywordMover, Summary, Keyword, Pagination, ChartDataPoint, DistributionBucket };
