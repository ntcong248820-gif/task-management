'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ChartDataPoint {
    date: string;
    displayDate: string;
    [key: string]: number | string;
}

interface RankingChartProps {
    chartData: ChartDataPoint[];
    keywords: string[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function RankingChart({ chartData, keywords }: RankingChartProps) {
    if (chartData.length === 0) {
        return (
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-lg text-white">Position Trends</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-slate-500">
                        No ranking data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-lg text-white">Position Trends (Top 5 Keywords)</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            reversed // Lower position is better
                            domain={['auto', 'auto']}
                            label={{
                                value: 'Position',
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: '#94a3b8' }
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px'
                            }}
                            labelStyle={{ color: '#f1f5f9' }}
                            formatter={(value: number) => [value.toFixed(1), 'Position']}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => (
                                <span className="text-slate-300 text-xs truncate max-w-[100px] inline-block">
                                    {value.length > 20 ? value.substring(0, 20) + '...' : value}
                                </span>
                            )}
                        />
                        {keywords.map((keyword, index) => (
                            <Line
                                key={keyword}
                                type="monotone"
                                dataKey={keyword}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                                name={keyword}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
