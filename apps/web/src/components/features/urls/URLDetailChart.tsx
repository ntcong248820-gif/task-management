'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { X, ExternalLink } from 'lucide-react';

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

interface URLDetailChartProps {
    url: string;
    chartData: ChartDataPoint[];
    topQueries: TopQuery[];
    onClose: () => void;
}

function extractPath(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname || '/';
    } catch {
        return url.replace(/^https?:\/\/[^/]+/, '') || '/';
    }
}

export function URLDetailChart({ url, chartData, topQueries, onClose }: URLDetailChartProps) {
    const totalClicks = chartData.reduce((sum, d) => sum + d.clicks, 0);
    const totalImpressions = chartData.reduce((sum, d) => sum + d.impressions, 0);
    const avgPosition = chartData.length > 0
        ? chartData.reduce((sum, d) => sum + d.position, 0) / chartData.length
        : 0;

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            URL Performance
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </CardTitle>
                        <p className="text-sm text-slate-400 truncate mt-1" title={url}>
                            {extractPath(url)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-400">Total Clicks</p>
                        <p className="text-xl font-bold text-blue-400">{totalClicks.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-400">Impressions</p>
                        <p className="text-xl font-bold text-emerald-400">{totalImpressions.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-400">Avg Position</p>
                        <p className="text-xl font-bold text-yellow-400">{avgPosition.toFixed(1)}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Chart */}
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis
                                dataKey="displayDate"
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                reversed
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px'
                                }}
                                labelStyle={{ color: '#f1f5f9' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="clicks"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                name="Clicks"
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="position"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={false}
                                name="Position"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[250px] flex items-center justify-center text-slate-500">
                        No chart data available
                    </div>
                )}

                {/* Top Queries */}
                {topQueries.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-3">Top Queries for this URL</h4>
                        <div className="space-y-2">
                            {topQueries.slice(0, 5).map((q, i) => (
                                <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
                                    <span className="text-sm text-white truncate flex-1" title={q.query}>
                                        {q.query}
                                    </span>
                                    <span className="text-xs text-slate-400 ml-2">
                                        {q.clicks} clicks
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
