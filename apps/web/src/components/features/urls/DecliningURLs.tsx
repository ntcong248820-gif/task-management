'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';

interface DecliningURL {
    page: string;
    clicks: number;
    previousClicks: number;
    changePercent: number;
    severity: 'severe' | 'moderate' | 'slight' | 'stable' | 'improving';
}

interface DecliningURLsProps {
    urls: DecliningURL[];
    onSelectUrl: (url: string) => void;
}

function SeverityBadge({ severity, change }: { severity: string; change: number }) {
    const configs = {
        severe: { bg: 'bg-rose-500/20', text: 'text-rose-400', icon: AlertOctagon, label: 'Severe' },
        moderate: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: AlertTriangle, label: 'Moderate' },
        slight: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertCircle, label: 'Slight' },
        stable: { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: TrendingDown, label: 'Stable' },
        improving: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: TrendingDown, label: 'Up' },
    };

    const config = configs[severity as keyof typeof configs] || configs.stable;
    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${config.bg} ${config.text} text-xs font-medium`}>
            <Icon className="h-3 w-3" />
            <span>{change.toFixed(1)}%</span>
        </div>
    );
}

function extractPath(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname || '/';
    } catch {
        return url.replace(/^https?:\/\/[^/]+/, '') || '/';
    }
}

export function DecliningURLs({ urls, onSelectUrl }: DecliningURLsProps) {
    if (urls.length === 0) {
        return (
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-rose-400" />
                        <span className="text-white">Declining URLs</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-slate-500">
                        No declining URLs detected 🎉
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-rose-400" />
                    <span className="text-white">Declining URLs</span>
                    <span className="text-xs text-slate-500 font-normal ml-auto">Top 10 by traffic drop</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {urls.map((url, i) => (
                    <div
                        key={i}
                        onClick={() => onSelectUrl(url.page)}
                        className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between gap-4"
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate" title={url.page}>
                                {extractPath(url.page)}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                <span>{url.clicks.toLocaleString()} clicks</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-500">was {url.previousClicks.toLocaleString()}</span>
                            </div>
                        </div>
                        <SeverityBadge severity={url.severity} change={url.changePercent} />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
