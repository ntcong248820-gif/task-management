'use client';

import { useState, useCallback } from 'react';
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

export function useKeywordDetailData(projectId: number = 1) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<KeywordDetail | null>(null);

    const fetchDetail = useCallback(async (keywordToFetch: string) => {
        setLoading(true);
        setError(null);
        try {
            const encodedKeyword = encodeURIComponent(keywordToFetch);
            const res = await fetch(getApiUrl(`/api/keywords/detail?projectId=${projectId}&keyword=${encodedKeyword}&days=30`));
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            } else {
                setError(json.error || 'Failed to fetch keyword detail');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch keyword detail');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    return {
        data,
        loading,
        error,
        fetchDetail,
    };
}
