'use client';

import { useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

    const fetchDetail = useCallback(async (keyword: string, days: number = 30) => {
        setLoading(true);
        setError(null);
        try {
            const encodedKeyword = encodeURIComponent(keyword);
            const res = await fetch(`${API_BASE}/api/keywords/detail?projectId=${projectId}&keyword=${encodedKeyword}&days=${days}`);
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
