'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { fetcher } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';

export interface DecliningURL {
    page: string;
    clicks: number;
    previousClicks: number;
    impressions: number;
    position: number;
    changePercent: number;
    severity: 'severe' | 'moderate' | 'slight' | 'stable' | 'improving';
}

export interface Summary {
    totalUrls: number;
    declining: number;
    improving: number;
    stable: number;
    avgChangePercent: number;
}

export interface OverviewData {
    decliningUrls: DecliningURL[];
    summary: Summary;
}

export interface URLData {
    page: string;
    clicks: number;
    previousClicks: number;
    impressions: number;
    position: number;
    ctr: number;
    changePercent: number;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ListData {
    urls: URLData[];
    pagination: Pagination;
}

export interface ChartDataPoint {
    date: string;
    displayDate: string;
    clicks: number;
    impressions: number;
    position: number;
}

export interface TopQuery {
    query: string;
    clicks: number;
    impressions: number;
}

export interface DetailData {
    url: string;
    chartData: ChartDataPoint[];
    topQueries: TopQuery[];
}

export interface UseURLsDataReturn {
    overview: OverviewData | null;
    listData: ListData | null;
    detailData: DetailData | null;
    loading: boolean;
    error: string | null;
    fetchList: (params: {
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        filter?: 'all' | 'declining' | 'improving';
    }) => Promise<void>;
    fetchDetail: (url: string) => Promise<void>;
    clearDetail: () => void;
    mutate: () => void;
}

export function useURLsData(projectId: number | null, days: number = 30): UseURLsDataReturn {
    const overviewKey = projectId
        ? getApiUrl(`/api/urls/overview?projectId=${projectId}&days=${days}`)
        : null;
    const listKey = projectId
        ? getApiUrl(`/api/urls/list?projectId=${projectId}&days=${days}&limit=20`)
        : null;

    const { data: overview, error: overviewError, isLoading: overviewLoading, mutate: overviewMutate } = useSWR(overviewKey, fetcher);
    const { data: listData, error: listError, isLoading: listLoading, mutate: listMutate } = useSWR(listKey, fetcher);

    const error = overviewError?.message || listError?.message || null;
    const loading = overviewLoading || listLoading;

    const fetchList = useCallback(async (params: {
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        filter?: 'all' | 'declining' | 'improving';
    } = {}) => {
        const { search = '', sortBy = 'clicks', sortOrder = 'desc', page = 1, filter = 'all' } = params;
        const key = getApiUrl(`/api/urls/list?projectId=${projectId}&days=${days}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=20&filter=${filter}`);
        await listMutate(key);
    }, [projectId, days, listMutate]);

    const fetchDetail = useCallback(async (urlToFetch: string) => {
        const encodedUrl = encodeURIComponent(urlToFetch);
        const key = getApiUrl(`/api/urls/detail?projectId=${projectId}&url=${encodedUrl}&days=${days}`);
        await mutate(key);
    }, [projectId, days]);

    const clearDetail = useCallback(() => {
        // SWR handles cache automatically
    }, []);

    return {
        overview: overview || null,
        listData: listData || null,
        detailData: null,
        loading,
        error,
        fetchList,
        fetchDetail,
        clearDetail,
        mutate: () => {
            overviewMutate();
            listMutate();
        },
    };
}