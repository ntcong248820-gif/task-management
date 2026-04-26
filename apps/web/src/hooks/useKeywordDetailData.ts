'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { fetcher } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';

export interface KeywordDetail {
    keyword: string;
    summary: {
        totalClicks: number;
        totalImpressions: number;
        avgPosition: number;
        avgCtr: number;
        trend: number;
    };
    chartData: {
        date: string;
        displayDate: string;
        position: number;
        clicks: number;
        impressions: number;
    }[];
    pages: {
        page: string;
        clicks: number;
        impressions: number;
        position: number;
    }[];
}

export interface UseKeywordDetailDataReturn {
    data: KeywordDetail | null;
    loading: boolean;
    error: string | null;
    fetchDetail: (keyword: string) => Promise<void>;
    mutate: () => void;
}

export function useKeywordDetailData(projectId: number | null): UseKeywordDetailDataReturn {
    const { data, error, isLoading, mutate: mutateData } = useSWR(
        projectId ? getApiUrl(`/api/keywords/detail?projectId=${projectId}&days=30`) : null,
        fetcher
    );

    const fetchDetail = useCallback(async (keywordToFetch: string) => {
        if (!projectId) return;
        const encodedKeyword = encodeURIComponent(keywordToFetch);
        const key = getApiUrl(`/api/keywords/detail?projectId=${projectId}&keyword=${encodedKeyword}&days=30`);
        await mutate(key);
    }, [projectId]);

    return {
        data: data || null,
        loading: isLoading,
        error: error?.message || null,
        fetchDetail,
        mutate: mutateData,
    };
}