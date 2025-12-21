'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TrafficSource {
    source: string;
    medium: string;
    sessions: number;
    conversions: number;
    convRate: number;
}

interface TrafficSourcesTableProps {
    data: TrafficSource[];
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

export function TrafficSourcesTable({ data }: TrafficSourcesTableProps) {
    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white">Traffic Sources</CardTitle>
                <CardDescription className="text-slate-400">Top sources by sessions</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 px-2 text-slate-400 font-medium">Source / Medium</th>
                                <th className="text-right py-3 px-2 text-slate-400 font-medium">Sessions</th>
                                <th className="text-right py-3 px-2 text-slate-400 font-medium">Conv.</th>
                                <th className="text-right py-3 px-2 text-slate-400 font-medium">Conv. Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                                    <td className="py-3 px-2 text-white font-medium">
                                        {row.source} <span className="text-slate-500">/ {row.medium}</span>
                                    </td>
                                    <td className="text-right py-3 px-2 text-slate-300">{formatNumber(row.sessions)}</td>
                                    <td className="text-right py-3 px-2 text-slate-300">{formatNumber(row.conversions)}</td>
                                    <td className="text-right py-3 px-2 text-emerald-400">{row.convRate.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
