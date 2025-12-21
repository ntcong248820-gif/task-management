'use client';

import { Hammer } from 'lucide-react';

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

interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as CorrelationData;
    const hasTasks = data.completedTasks?.length > 0;

    return (
        <div className="bg-slate-900 text-white p-4 rounded-lg shadow-xl border border-slate-700 min-w-[250px] z-50">
            <p className="text-sm font-medium text-slate-400 mb-2">{label}</p>
            <div className="space-y-1">
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                        <span style={{ color: entry.color }}>{entry.name}</span>
                        <span className="font-bold">{formatNumber(entry.value)}</span>
                    </div>
                ))}
            </div>
            {hasTasks && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1">
                        <Hammer className="w-3 h-3" />Tasks Done:
                    </p>
                    <ul className="space-y-1">
                        {data.completedTasks.map((task) => (
                            <li key={task.id} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                {task.title}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
