'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DistributionBucket {
    name: string;
    count: number;
    percentage: number;
}

interface PositionDistributionProps {
    distribution: DistributionBucket[];
    totalKeywords: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

export function PositionDistribution({ distribution, totalKeywords }: PositionDistributionProps) {
    if (distribution.length === 0 || totalKeywords === 0) {
        return (
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-lg text-white">Position Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-slate-500">
                        No distribution data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-lg text-white">Position Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={distribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            interval={0}
                            angle={-15}
                            textAnchor="end"
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            label={{
                                value: 'Keywords',
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
                            formatter={(value: number, _name, props) => [
                                `${value} keywords (${props.payload.percentage}%)`,
                                ''
                            ]}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {distribution.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {distribution.map((bucket, index) => (
                        <div key={bucket.name} className="flex items-center gap-2 text-xs">
                            <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-slate-400">
                                {bucket.count} ({bucket.percentage}%)
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
