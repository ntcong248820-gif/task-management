'use client';

import { useMemo } from 'react';
import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
    Legend,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { CustomTooltip } from './CustomTooltip';
import { LayerControls } from './LayerControls';

interface CompletedTask {
    id: number;
    title: string;
    type: string;
    timeSpent: number;
}

interface CorrelationData {
    date: string;
    displayDate: string;
    clicks: number;
    impressions: number;
    position: number;
    completedTasks: CompletedTask[];
}

interface LayerState {
    clicks: boolean;
    impressions: boolean;
    impact: boolean;
}

interface CorrelationChartProps {
    data: CorrelationData[];
    layers: LayerState;
    onLayerChange: (layers: LayerState) => void;
    dateRange: number;
}

export function CorrelationChart({
    data,
    layers,
    onLayerChange,
    dateRange,
}: CorrelationChartProps) {
    // Find indices where tasks were completed for ReferenceArea
    const impactWindows = useMemo(() => {
        if (!layers.impact) return [];
        return data
            .map((d, i) => ({ index: i, hasTask: d.completedTasks?.length > 0 }))
            .filter((d) => d.hasTask)
            .map((d) => ({
                startIndex: d.index,
                endIndex: Math.min(d.index + 7, data.length - 1), // 7-day impact window
            }));
    }, [data, layers.impact]);

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Correlation Chart
                    </CardTitle>
                    <LayerControls layers={layers} onLayerChange={onLayerChange} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="displayDate"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                                interval={dateRange > 30 ? 4 : 0}
                            />
                            <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            {/* Impact Windows (ReferenceArea) */}
                            {impactWindows.map((window, i) => (
                                <ReferenceArea
                                    key={i}
                                    yAxisId="left"
                                    x1={data[window.startIndex]?.displayDate}
                                    x2={data[window.endIndex]?.displayDate}
                                    fill="#10b981"
                                    fillOpacity={0.15}
                                    stroke="#10b981"
                                    strokeOpacity={0.3}
                                />
                            ))}

                            {layers.clicks && (
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="clicks"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorClicks)"
                                    name="GSC Clicks"
                                />
                            )}
                            {layers.impressions && (
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="impressions"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    name="GSC Impressions"
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
