'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { useDateContext } from '@/contexts/DateContext';
import { format } from 'date-fns';
import { fetcher } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';

export interface DiagnosisIssue {
    type: 'declining_traffic' | 'position_drop' | 'low_ctr' | 'high_bounce' | 'content_stale';
    severity: 'alert' | 'warning' | 'info';
    message: string;
    recommendation: string;
    metric?: string;
}

export interface DiagnosisData {
    url: string;
    issues: DiagnosisIssue[];
    score: number;
    metrics: {
        clicks: number;
        impressions: number;
        position: number;
        ctr: number;
    };
    comparison: {
        clicksChange: number;
        positionChange: number;
    };
    lastUpdated: string;
}

export interface UseDiagnosisDataReturn {
    diagnosis: DiagnosisData | null;
    loading: boolean;
    error: string | null;
    fetchDiagnosis: (url: string) => Promise<void>;
    clearDiagnosis: () => void;
    mutate: () => void;
}

export function useDiagnosisData(projectId: number | null): UseDiagnosisDataReturn {
    const { dateRange } = useDateContext();
    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    const { data, error, isLoading, mutate: mutateData } = useSWR(
        projectId ? getApiUrl(`/api/diagnosis/list?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`) : null,
        fetcher
    );

    const fetchDiagnosis = useCallback(async (urlToDiagnose: string) => {
        if (!projectId) return;
        const encodedUrl = encodeURIComponent(urlToDiagnose);
        const key = getApiUrl(`/api/diagnosis/url?projectId=${projectId}&url=${encodedUrl}&startDate=${startDate}&endDate=${endDate}`);
        await mutate(key);
    }, [projectId, startDate, endDate]);

    const clearDiagnosis = useCallback(() => {
        mutateData(undefined);
    }, [mutateData]);

    return {
        diagnosis: data || null,
        loading: isLoading,
        error: error?.message || null,
        fetchDiagnosis,
        clearDiagnosis,
        mutate: mutateData,
    };
}