'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface URLData {
    page: string;
    clicks: number;
    impressions: number;
    position: number;
    ctr: number;
    changePercent: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface URLTableProps {
    urls: URLData[];
    pagination: Pagination;
    onSearch: (search: string) => void;
    onSort: (sortBy: string) => void;
    onPageChange: (page: number) => void;
    onFilter: (filter: 'all' | 'declining' | 'improving') => void;
    onSelectUrl: (url: string) => void;
    sortBy: string;
    filter: 'all' | 'declining' | 'improving';
}

function extractPath(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname || '/';
    } catch {
        return url.replace(/^https?:\/\/[^/]+/, '') || '/';
    }
}

export function URLTable({
    urls,
    pagination,
    onSearch,
    onSort,
    onPageChange,
    onFilter,
    onSelectUrl,
    sortBy,
    filter,
}: URLTableProps) {
    const [searchValue, setSearchValue] = useState('');

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
        onSearch(e.target.value);
    };

    const SortableHeader = ({ field, label }: { field: string; label: string }) => (
        <th
            className="text-right py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
            onClick={() => onSort(field)}
        >
            <div className="flex items-center justify-end gap-1">
                {label}
                <ArrowUpDown className={`h-3 w-3 ${sortBy === field ? 'text-blue-400' : ''}`} />
            </div>
        </th>
    );

    const FilterButton = ({ value, label }: { value: 'all' | 'declining' | 'improving'; label: string }) => (
        <button
            onClick={() => onFilter(value)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filter === value
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
        >
            {label}
        </button>
    );

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg text-white">All URLs</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-1">
                            <FilterButton value="all" label="All" />
                            <FilterButton value="declining" label="📉 Declining" />
                            <FilterButton value="improving" label="📈 Improving" />
                        </div>
                        <div className="relative w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search URLs..."
                                value={searchValue}
                                onChange={handleSearch}
                                className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 h-8 text-xs"
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">URL</th>
                                <SortableHeader field="clicks" label="Clicks" />
                                <SortableHeader field="change" label="Change" />
                                <SortableHeader field="impressions" label="Impressions" />
                                <SortableHeader field="position" label="Position" />
                            </tr>
                        </thead>
                        <tbody>
                            {urls.length > 0 ? (
                                urls.map((url, i) => (
                                    <tr
                                        key={i}
                                        onClick={() => onSelectUrl(url.page)}
                                        className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    >
                                        <td className="py-3 px-4 text-white font-medium max-w-xs truncate" title={url.page}>
                                            {extractPath(url.page)}
                                        </td>
                                        <td className="text-right py-3 px-4 text-slate-300">
                                            {url.clicks.toLocaleString()}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            <span className={`flex items-center justify-end gap-1 ${url.changePercent > 10 ? 'text-emerald-400' :
                                                    url.changePercent < -10 ? 'text-rose-400' :
                                                        'text-slate-400'
                                                }`}>
                                                {url.changePercent > 0 ? <TrendingUp className="h-3 w-3" /> :
                                                    url.changePercent < 0 ? <TrendingDown className="h-3 w-3" /> :
                                                        <Minus className="h-3 w-3" />}
                                                {url.changePercent > 0 ? '+' : ''}{url.changePercent.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="text-right py-3 px-4 text-slate-300">
                                            {url.impressions.toLocaleString()}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${url.position <= 3 ? 'bg-emerald-500/20 text-emerald-400' :
                                                    url.position <= 10 ? 'bg-blue-500/20 text-blue-400' :
                                                        url.position <= 20 ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {url.position}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500">
                                        No URLs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                        <span className="text-sm text-slate-400">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onPageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-slate-400">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => onPageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
