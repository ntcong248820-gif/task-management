'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function RankingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keyword Rankings</h1>
        <p className="text-muted-foreground">
          Track keyword position changes from GSC data
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Rankings Dashboard</CardTitle>
          <CardDescription>View keyword performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] items-center justify-center rounded-lg border border-dashed">
            <div className="flex flex-col items-center gap-1 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-xl font-semibold">Coming in Phase 4</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Keyword ranking tracking using GSC query data will be available soon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
