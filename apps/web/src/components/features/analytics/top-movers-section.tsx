'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { KeywordMover } from '@/hooks/use-analytics';
import { cn } from '@/lib/utils';

interface MoverRowProps {
  kw: KeywordMover;
  direction: 'up' | 'down';
}

function MoverRow({ kw, direction }: MoverRowProps) {
  const isUp = direction === 'up';
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <span className="text-sm truncate flex-1 min-w-0">{kw.query}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground tabular-nums">{kw.position.toFixed(1)}</span>
        <Badge
          variant="outline"
          className={cn(
            'text-xs px-1.5 py-0',
            isUp ? 'border-emerald-500 text-emerald-600' : 'border-red-400 text-red-500',
          )}
        >
          {isUp ? <TrendingUp className="h-3 w-3 mr-0.5 inline" /> : <TrendingDown className="h-3 w-3 mr-0.5 inline" />}
          {isUp ? '+' : ''}{kw.positionChange.toFixed(1)}
        </Badge>
      </div>
    </div>
  );
}

interface TopMoversSectionProps {
  improving: KeywordMover[];
  declining: KeywordMover[];
}

export function TopMoversSection({ improving, declining }: TopMoversSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Top improving keywords
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 divide-y">
          {improving.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No improving keywords this period.</p>
          ) : (
            improving.map(kw => <MoverRow key={kw.query} kw={kw} direction="up" />)
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Top declining keywords
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 divide-y">
          {declining.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No declining keywords this period.</p>
          ) : (
            declining.map(kw => <MoverRow key={kw.query} kw={kw} direction="down" />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
