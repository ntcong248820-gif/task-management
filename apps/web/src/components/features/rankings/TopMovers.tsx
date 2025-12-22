'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KeywordMover {
    query: string;
    position: number;
    previousPosition: number | null;
    positionChange: number;
    clicks: number;
    impressions: number;
}

interface TopMoversProps {
    gainers: KeywordMover[];
    losers: KeywordMover[];
}

function MoverCard({ keyword, type }: { keyword: KeywordMover; type: 'gainer' | 'loser' }) {
    const isGainer = type === 'gainer';
    const bgColor = isGainer ? 'bg-emerald-500/10' : 'bg-rose-500/10';
    const textColor = isGainer ? 'text-emerald-400' : 'text-rose-400';
    const Icon = isGainer ? TrendingUp : TrendingDown;

    return (
        <div className={`${bgColor} rounded-lg p-3 flex items-center justify-between`}>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate" title={keyword.query}>
                    {keyword.query}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                        Pos: {keyword.position}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                        {keyword.clicks.toLocaleString()} clicks
                    </span>
                </div>
            </div>
            <div className={`flex items-center gap-1 ${textColor} font-semibold`}>
                <Icon className="h-4 w-4" />
                <span>{Math.abs(keyword.positionChange).toFixed(1)}</span>
            </div>
        </div>
    );
}

export function TopMovers({ gainers, losers }: TopMoversProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gainers */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                        <span className="text-white">Top Gainers</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {gainers.length > 0 ? (
                        gainers.map((kw, i) => (
                            <MoverCard key={i} keyword={kw} type="gainer" />
                        ))
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No gainers in this period</p>
                    )}
                </CardContent>
            </Card>

            {/* Losers */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-rose-400" />
                        <span className="text-white">Top Losers</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {losers.length > 0 ? (
                        losers.map((kw, i) => (
                            <MoverCard key={i} keyword={kw} type="loser" />
                        ))
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No losers in this period</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
