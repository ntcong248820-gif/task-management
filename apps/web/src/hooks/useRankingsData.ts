'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { useDateContext } from '@/contexts/DateContext';
import { format } from 'date-fns';
import { fetcher } from '@/lib/api-client';
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
    fetchKeywords: (params: {
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
    }) => Promise<void>;
    mutate: () => void;
}

export function useRankingsData(projectId: number | null): UseRankingsDataReturn {
    const { dateRange } = useDateContext();
    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    const overviewKey = projectId
        ? getApiUrl(`/api/rankings/overview?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`)
        : null;
    const keywordsKey = projectId
        ? getApiUrl(`/api/rankings/keywords?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}&limit=20`)
        : null;
    const chartKey = projectId
        ? getApiUrl(`/api/rankings/chart?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}&limit=5`)
        : null;
    const distributionKey = projectId
        ? getApiUrl(`/api/rankings/distribution?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`)
        : null;

    const { data: overview, error: overviewError, isLoading: overviewLoading, mutate: overviewMutate } = useSWR(overviewKey, fetcher);
    const { data: keywordsData, error: keywordsError, isLoading: keywordsLoading, mutate: keywordsMutate } = useSWR(keywordsKey, fetcher);
    const { data: chartData, error: chartError, isLoading: chartLoading, mutate: chartMutate } = useSWR(chartKey, fetcher);
    const { data: distributionData, error: distError, isLoading: distLoading, mutate: distMutate } = useSWR(distributionKey, fetcher);

    const error = overviewError?.message || keywordsError?.message || chartError?.message || distError?.message || null;
    const loading = overviewLoading || keywordsLoading || chartLoading || distLoading;

    const fetchKeywords = useCallback(async (params: {
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
    } = {}) => {
        const { search = '', sortBy = 'clicks', sortOrder = 'desc', page = 1 } = params;
        const key = getApiUrl(`/api/rankings/keywords?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=20`);
        await keywordsMutate(key);
    }, [projectId, startDate, endDate, keywordsMutate]);

    return {
        overview: overview || null,
        keywordsData: keywordsData || null,
        chartData: chartData || null,
        distributionData: distributionData || null,
        loading,
        error,
        fetchKeywords,
        mutate: () => {
            overviewMutate();
            keywordsMutate();
            chartMutate();
            distMutate();
        },
    };
}