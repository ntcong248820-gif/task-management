'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-slate-900 border-slate-700 animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-slate-700 rounded w-24"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-slate-700 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-slate-700 rounded w-20"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card className="bg-slate-900 border-slate-700 animate-pulse">
                <CardContent className="p-6">
                    <div className="h-[350px] bg-slate-800 rounded"></div>
                </CardContent>
            </Card>
        </div>
    );
}
