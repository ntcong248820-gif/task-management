'use client';

import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DecliningURL {
    page: string;
    clicks: number;
    previousClicks: number;
    impressions: number;
    position: number;
    changePercent: number;
    severity: 'severe' | 'moderate' | 'slight' | 'stable' | 'improving';
}

interface Summary {
    totalUrls: number;
    declining: number;
    improving: number;
    stable: number;
    avgChangePercent: number;
}

interface OverviewData {
    decliningUrls: DecliningURL[];
    summary: Summary;
}

interface URLData {
    page: string;
    clicks: number;
    previousClicks: number;
    impressions: number;
    position: number;
    ctr: number;
    changePercent: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface ListData {
    urls: URLData[];
    pagination: Pagination;
}

interface ChartDataPoint {
    date: string;
    displayDate: string;
    clicks: number;
    impressions: number;
    position: number;
}

interface TopQuery {
    query: string;
    clicks: number;
    impressions: number;
}

interface DetailData {
    url: string;
    chartData: ChartDataPoint[];
    topQueries: TopQuery[];
}

interface UseURLsDataReturn {
    overview: OverviewData | null;
    listData: ListData | null;
    detailData: DetailData | null;
    loading: boolean;
    error: string | null;
    // Actions
    fetchList: (params: {
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        filter?: 'all' | 'declining' | 'improving';
    }) => Promise<void>;
    fetchDetail: (url: string) => Promise<void>;
    clearDetail: () => void;
    refetch: () => void;
}

export function useURLsData(projectId: number = 1, days: number = 30): UseURLsDataReturn {
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [listData, setListData] = useState<ListData | null>(null);
    const [detailData, setDetailData] = useState<DetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOverview = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/urls/overview?projectId=${projectId}&days=${days}`);
            const json = await res.json();
            if (json.success) {
                setOverview(json.data);
            }
        } catch (err) {
            console.error('Failed to fetch URLs overview:', err);
        }
    };

    const fetchList = useCallback(async (params: {
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        filter?: 'all' | 'declining' | 'improving';
    } = {}) => {
        try {
            const { search = '', sortBy = 'clicks', sortOrder = 'desc', page = 1, filter = 'all' } = params;
            const url = `${API_BASE}/api/urls/list?projectId=${projectId}&days=${days}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=20&filter=${filter}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                setListData(json.data);
            }
        } catch (err) {
            console.error('Failed to fetch URLs list:', err);
        }
    }, [projectId, days]);

    const fetchDetail = useCallback(async (urlToFetch: string) => {
        try {
            const encodedUrl = encodeURIComponent(urlToFetch);
            const res = await fetch(`${API_BASE}/api/urls/detail?projectId=${projectId}&url=${encodedUrl}&days=${days}`);
            const json = await res.json();
            if (json.success) {
                setDetailData(json.data);
            }
        } catch (err) {
            console.error('Failed to fetch URL detail:', err);
        }
    }, [projectId, days]);

    const clearDetail = useCallback(() => {
        setDetailData(null);
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchOverview(),
                fetchList(),
            ]);
        } catch (err: any) {
            setError(err.message || 'Failed to load URLs data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [projectId, days]);

    return {
        overview,
        listData,
        detailData,
        loading,
        error,
        fetchList,
        fetchDetail,
        clearDetail,
        refetch: fetchAll,
    };
}

// Export types
export type { DecliningURL, Summary, URLData, Pagination, ChartDataPoint, TopQuery, DetailData };
