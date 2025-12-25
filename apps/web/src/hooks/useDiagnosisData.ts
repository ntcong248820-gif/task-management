'use client';

import { useState, useCallback } from 'react';
import { useDateContext } from '@/contexts/DateContext';
import { format } from 'date-fns';
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

export function useDiagnosisData(projectId: number = 1) {
    const { dateRange } = useDateContext();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);

    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    const fetchDiagnosis = useCallback(async (urlToDiagnose: string) => {
        setLoading(true);
        setError(null);
        try {
            const encodedUrl = encodeURIComponent(urlToDiagnose);
            const res = await fetch(getApiUrl(`/api/diagnosis/url?projectId=${projectId}&url=${encodedUrl}&startDate=${startDate}&endDate=${endDate}`));
            const json = await res.json();
            if (json.success) {
                setDiagnosis(json.data);
            } else {
                setError(json.error || 'Failed to fetch diagnosis');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch diagnosis');
        } finally {
            setLoading(false);
        }
    }, [projectId, startDate, endDate]);

    const clearDiagnosis = useCallback(() => {
        setDiagnosis(null);
    }, []);

    return {
        diagnosis,
        loading,
        error,
        fetchDiagnosis,
        clearDiagnosis,
    };
}
