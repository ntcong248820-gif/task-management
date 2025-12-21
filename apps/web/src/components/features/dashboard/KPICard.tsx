'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KPICardProps {
    /** Title of the KPI metric */
    title: string;
    /** Display value */
    value: string;
    /** Lucide icon component */
    icon: React.ElementType;
    /** Trend percentage (positive = up, negative = down) */
    trend?: number;
    /** Subtext description */
    subtext: string;
    /** Color class for icon */
    colorClass?: string;
}

export function KPICard({
    title,
    value,
    icon: Icon,
    trend,
    subtext,
    colorClass = 'text-primary',
}: KPICardProps) {
    const isPositive = (trend || 0) >= 0;

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between pb-2">
                    <span className="text-sm font-medium text-muted-foreground">{title}</span>
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                </div>
                <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="flex items-center text-xs">
                        {trend !== undefined && (
                            <span className={`font-medium flex items-center ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                {Math.abs(trend)}%
                            </span>
                        )}
                        <span className="text-muted-foreground ml-2">{subtext}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
