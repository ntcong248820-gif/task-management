'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Keyword {
    query: string;
    position: number;
    clicks: number;
    impressions: number;
    ctr: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface KeywordTableProps {
    keywords: Keyword[];
    pagination: Pagination;
    onSearch: (search: string) => void;
    onSort: (sortBy: string) => void;
    onPageChange: (page: number) => void;
    sortBy: string;
}

export function KeywordTable({
    keywords,
    pagination,
    onSearch,
    onSort,
    onPageChange,
    sortBy,
}: KeywordTableProps) {
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

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white">All Keywords</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search keywords..."
                            value={searchValue}
                            onChange={handleSearch}
                            className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Keyword</th>
                                <SortableHeader field="position" label="Position" />
                                <SortableHeader field="clicks" label="Clicks" />
                                <SortableHeader field="impressions" label="Impressions" />
                                <SortableHeader field="ctr" label="CTR" />
                            </tr>
                        </thead>
                        <tbody>
                            {keywords.length > 0 ? (
                                keywords.map((kw, i) => (
                                    <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 px-4 text-white font-medium max-w-xs truncate" title={kw.query}>
                                            {kw.query}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${kw.position <= 3 ? 'bg-emerald-500/20 text-emerald-400' :
                                                kw.position <= 10 ? 'bg-blue-500/20 text-blue-400' :
                                                    kw.position <= 20 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {kw.position}
                                            </span>
                                        </td>
                                        <td className="text-right py-3 px-4 text-slate-300">
                                            {kw.clicks.toLocaleString()}
                                        </td>
                                        <td className="text-right py-3 px-4 text-slate-300">
                                            {kw.impressions.toLocaleString()}
                                        </td>
                                        <td className="text-right py-3 px-4 text-slate-300">
                                            {kw.ctr.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500">
                                        No keywords found
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
