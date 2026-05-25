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
import type { PageRow } from '@/hooks/use-analytics';

interface PagesTableProps {
  pages: PageRow[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  onRowClick: (url: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sort: string, order: 'asc' | 'desc') => void;
  onSearch: (q: string) => void;
}

function DecayBadge({ status }: { status: PageRow['decayStatus'] }) {
  if (status === 'decaying') return <span title="Decaying">🔴</span>;
  if (status === 'declining') return <span title="Declining">🟡</span>;
  return <span title="Stable">🟢</span>;
}

const col = createColumnHelper<PageRow>();

const columns = [
  col.accessor('decayStatus', {
    header: '',
    cell: info => <DecayBadge status={info.getValue()} />,
    enableSorting: false,
  }),
  col.accessor('page', {
    header: 'URL',
    cell: info => (
      <span className="text-xs font-medium truncate block max-w-[280px]" title={info.getValue()}>
        {info.getValue().replace(/^https?:\/\/[^/]+/, '') || '/'}
      </span>
    ),
    enableSorting: false,
  }),
  col.accessor('clicks', {
    header: 'Clicks',
    cell: info => <span className="tabular-nums text-sm">{info.getValue().toLocaleString()}</span>,
  }),
  col.accessor('impressions', {
    header: 'Impressions',
    cell: info => <span className="tabular-nums text-sm">{info.getValue().toLocaleString()}</span>,
  }),
  col.accessor('position', {
    header: 'Avg Pos',
    cell: info => <span className="tabular-nums text-sm">{info.getValue().toFixed(1)}</span>,
  }),
  col.accessor('changePercent', {
    header: 'Δ Clicks',
    cell: info => {
      const v = info.getValue();
      if (v === 0) return <span className="text-xs text-muted-foreground">–</span>;
      return (
        <span className={cn('text-xs font-medium', v > 0 ? 'text-emerald-600' : 'text-red-500')}>
          {v > 0 ? '+' : ''}{v.toFixed(1)}%
        </span>
      );
    },
    enableSorting: false,
  }),
];

const sortableKeys: Record<string, string> = {
  clicks: 'clicks',
  impressions: 'impressions',
  position: 'position',
};

export function PagesTable({
  pages, total, page, totalPages, loading,
  onRowClick, onPageChange, onSortChange, onSearch,
}: PagesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'clicks', desc: true }]);
  const [searchValue, setSearchValue] = useState('');

  const table = useReactTable({
    data: pages,
    columns,
    state: { sorting },
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: updater => {
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
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter by URL…" value={searchValue} onChange={handleSearch} className="pl-8 h-9" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>🟢 Stable</span>
          <span>🟡 Declining</span>
          <span>🔴 Decaying</span>
        </div>
      </div>

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b bg-muted/50">
                {hg.headers.map(header => {
                  const canSort = header.column.getCanSort();
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
                  No pages found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onRowClick(row.original.page)}
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
        <span>{total.toLocaleString()} pages total</span>
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
