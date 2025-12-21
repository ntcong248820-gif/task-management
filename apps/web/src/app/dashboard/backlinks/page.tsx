'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2 } from 'lucide-react';

export default function BacklinksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backlinks Monitor</h1>
        <p className="text-muted-foreground">
          Feature not available - requires third-party integration
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Backlinks Dashboard</CardTitle>
          <CardDescription>Monitor your backlink profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] items-center justify-center rounded-lg border border-dashed">
            <div className="flex flex-col items-center gap-1 text-center">
              <Link2 className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-xl font-semibold">Feature Not Available</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Backlink monitoring requires integration with a third-party SEO tool
                (e.g., Ahrefs, Moz, Semrush). This feature is not included in the current scope.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
