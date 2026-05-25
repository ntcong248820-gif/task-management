'use client';

import { useState, useCallback } from 'react';
import {
  useReactTable, getCoreRowModel, flexRender,
  createColumnHelper, type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { KeywordRow } from '@/hooks/use-analytics';

interface KeywordsTableProps {
  keywords: KeywordRow[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  onRowClick: (keyword: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sort: string, order: 'asc' | 'desc') => void;
  onSearch: (q: string) => void;
}

const col = createColumnHelper<KeywordRow>();

function PositionDelta({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-muted-foreground text-xs">–</span>;
  const isImproved = delta > 0;
  return (
    <span className={cn('text-xs font-medium flex items-center gap-0.5', isImproved ? 'text-emerald-600' : 'text-red-500')}>
      {isImproved ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(delta).toFixed(1)}
    </span>
  );
}

const columns = [
  col.accessor('query', {
    header: 'Keyword',
    cell: info => <span className="font-medium text-sm">{info.getValue()}</span>,
  }),
  col.accessor('clicks', {
    header: 'Clicks',
    cell: info => <span className="tabular-nums text-sm">{info.getValue().toLocaleString()}</span>,
  }),
  col.accessor('impressions', {
    header: 'Impressions',
    cell: info => <span className="tabular-nums text-sm">{info.getValue().toLocaleString()}</span>,
  }),
  col.accessor('ctr', {
    header: 'CTR',
    cell: info => <span className="tabular-nums text-sm">{info.getValue().toFixed(2)}%</span>,
  }),
  col.accessor('position', {
    header: 'Avg Pos',
    cell: info => <span className="tabular-nums text-sm">{info.getValue().toFixed(1)}</span>,
  }),
  col.accessor('positionChange', {
    header: 'Δ Pos',
    cell: info => <PositionDelta delta={info.getValue()} />,
  }),
];

const sortableKeys: Record<string, string> = {
  clicks: 'clicks',
  impressions: 'impressions',
  ctr: 'ctr',
  position: 'position',
  positionChange: 'change',
};

export function KeywordsTable({
  keywords, total, page, totalPages, loading,
  onRowClick, onPageChange, onSortChange, onSearch,
}: KeywordsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'clicks', desc: true }]);
  const [searchValue, setSearchValue] = useState('');

  const table = useReactTable({
    data: keywords,
    columns,
    state: { sorting },
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
      if (next[0]) {
        const apiKey = sortableKeys[next[0].id] ?? next[0].id;
        onSortChange(apiKey, next[0].desc ? 'desc' : 'asc');
      }
    },
  });

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch(e.target.value);
  }, [onSearch]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search keywords…"
          value={searchValue}
          onChange={handleSearch}
          className="pl-8 h-9"
        />
      </div>

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b bg-muted/50">
                {hg.headers.map(header => {
                  const canSort = header.column.id !== 'query';
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-3 py-2 text-left text-xs font-medium text-muted-foreground',
                        canSort && 'cursor-pointer select-none hover:text-foreground',
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          header.column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> :
                          header.column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> :
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {columns.map((_, j) => (
                    <td key={j} className="px-3 py-2">
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  No keywords found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onRowClick(row.original.query)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total.toLocaleString()} keywords total</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>Page {page} of {totalPages}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
