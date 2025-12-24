'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, Plus, ChevronRight } from 'lucide-react';
import { DiagnosisData, DiagnosisIssue } from '@/hooks';

interface DiagnosisPanelProps {
    data: DiagnosisData;
    onCreateTask?: (issue: DiagnosisIssue) => void;
}

export function DiagnosisPanel({ data, onCreateTask }: DiagnosisPanelProps) {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'alert': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
            case 'warning': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case 'info': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'alert': return <AlertCircle className="h-4 w-4" />;
            case 'warning': return <AlertTriangle className="h-4 w-4" />;
            case 'info': return <Info className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const scoreColor = data.score >= 80 ? 'text-emerald-400' : data.score >= 50 ? 'text-yellow-400' : 'text-rose-400';

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg text-white">AI Diagnosis</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">Rule-based performance analysis</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Health Score</p>
                    <p className={`text-3xl font-bold ${scoreColor}`}>{data.score}</p>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {data.issues.length === 0 ? (
                    <div className="py-8 text-center bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                        <Info className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400">No critical issues detected for this URL.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.issues.map((issue, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                                            <span className="flex items-center gap-1">
                                                {getSeverityIcon(issue.severity)}
                                                {issue.severity.toUpperCase()}
                                            </span>
                                        </Badge>
                                        <span className="text-sm font-medium text-white">{issue.message}</span>
                                    </div>
                                    {issue.metric && (
                                        <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                                            {issue.metric}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 flex items-start gap-3">
                                    <ChevronRight className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                                    <p className="text-sm text-slate-400 italic">
                                        {issue.recommendation}
                                    </p>
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 gap-1"
                                        onClick={() => onCreateTask?.(issue)}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Create Recovery Task
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
