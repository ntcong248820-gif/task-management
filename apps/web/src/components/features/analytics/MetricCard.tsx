'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: number;
    change: number;
    icon: React.ElementType;
    format?: 'number' | 'currency' | 'percent' | 'decimal';
    suffix?: string;
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function formatCurrency(num: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

export function MetricCard({
    title,
    value,
    change,
    icon: Icon,
    format = 'number',
    suffix = ''
}: MetricCardProps) {
    const isPositive = change >= 0;

    const formatValue = () => {
        switch (format) {
            case 'currency':
                return formatCurrency(value);
            case 'percent':
                return value.toFixed(2) + '%';
            case 'decimal':
                return value.toFixed(1) + suffix;
            default:
                return formatNumber(value) + suffix;
        }
    };

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
                <Icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{formatValue()}</div>
                <div className={`flex items-center text-xs mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                    {Math.abs(change).toFixed(1)}% vs previous period
                </div>
            </CardContent>
        </Card>
    );
}
