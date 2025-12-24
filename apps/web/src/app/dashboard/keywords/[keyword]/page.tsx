'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    ChevronLeft,
    Target,
    TrendingUp,
    MousePointer2,
    BarChart2,
    ExternalLink
} from 'lucide-react';
import { useKeywordDetailData } from '@/hooks';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

function KPICard({ title, value, subValue, icon: Icon, color }: any) {
    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${color}`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                    <p className="text-sm text-slate-400 font-medium">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-white">{value}</h3>
                        {subValue && (
                            <span className={`text-xs font-medium ${subValue.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {subValue}
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
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

export default function KeywordDetailPage() {
    const router = useRouter();
    const params = useParams();
    const keyword = typeof params.keyword === 'string' ? decodeURIComponent(params.keyword) : '';

    const { data, loading, error, fetchDetail } = useKeywordDetailData(1);

    useEffect(() => {
        if (keyword) {
            fetchDetail(keyword);
        }
    }, [keyword, fetchDetail]);

    if (loading) {
        return (
            <div className="p-6 space-y-6 animate-pulse">
                <div className="h-8 bg-slate-800 w-64 rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-24 bg-slate-800 rounded"></div>
                    <div className="h-24 bg-slate-800 rounded"></div>
                    <div className="h-24 bg-slate-800 rounded"></div>
                </div>
                <div className="h-[400px] bg-slate-800 rounded"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-6">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-slate-400">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Quay lại
                </Button>
                <Card className="bg-rose-900/20 border-rose-700">
                    <CardContent className="p-6 text-center">
                        <p className="text-rose-400">{error || 'Không tìm thấy dữ liệu từ khóa'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Button variant="ghost" onClick={() => router.back()} className="p-0 h-auto text-slate-500 hover:text-white mb-2">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Rankings
                    </Button>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Target className="h-8 w-8 text-blue-400" />
                        {keyword}
                    </h1>
                </div>
                <Button
                    variant="outline"
                    className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`, '_blank')}
                >
                    View SERP <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Avg Position"
                    value={data.summary.avgPosition}
                    subValue={data.summary.trend > 0 ? `-${data.summary.trend.toFixed(1)}` : data.summary.trend < 0 ? `+${Math.abs(data.summary.trend).toFixed(1)}` : '0'}
                    icon={TrendingUp}
                    color="bg-blue-500"
                />
                <KPICard
                    title="Total Clicks"
                    value={data.summary.totalClicks.toLocaleString()}
                    icon={MousePointer2}
                    color="bg-emerald-500"
                />
                <KPICard
                    title="Impressions"
                    value={data.summary.totalImpressions.toLocaleString()}
                    icon={BarChart2}
                    color="bg-orange-500"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Chart */}
                <Card className="xl:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">Rank History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis
                                        dataKey="displayDate"
                                        stroke="#94a3b8"
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        reversed
                                        domain={[1, 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="position"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', r: 4 }}
                                        activeDot={{ r: 6 }}
                                        name="Position"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Ranking Pages */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">Ranking Pages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.pages.map((page, idx) => (
                                <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                                            Pos {page.position}
                                        </span>
                                        <span className="text-xs text-slate-500">{page.clicks} clicks</span>
                                    </div>
                                    <p className="text-sm text-slate-300 truncate font-medium mb-1" title={page.page}>
                                        {extractPath(page.page)}
                                    </p>
                                    <p className="text-[10px] text-slate-500 break-all leading-tight opacity-50">
                                        {page.page}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
