'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useURLsData } from '@/hooks';
import {
    DecliningURLs,
    URLTable,
    URLDetailChart,
} from '@/components/features/urls';

function LoadingSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="bg-slate-900 border-slate-700">
                        <CardContent className="p-4">
                            <div className="h-4 bg-slate-700 rounded w-20 mb-2"></div>
                            <div className="h-8 bg-slate-700 rounded w-16"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card className="bg-slate-900 border-slate-700 h-[300px]"></Card>
            <Card className="bg-slate-900 border-slate-700 h-[400px]"></Card>
        </div>
    );
}

function SummaryCard({
    title,
    value,
    icon: Icon,
    color
}: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-sm text-slate-400">{title}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function URLsPage() {
    const [sortBy, setSortBy] = useState('clicks');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'declining' | 'improving'>('all');

    const {
        overview,
        listData,
        detailData,
        loading,
        error,
        fetchList,
        fetchDetail,
        clearDetail,
    } = useURLsData(1, 30);

    const handleSearch = useCallback((newSearch: string) => {
        setSearch(newSearch);
        fetchList({ search: newSearch, sortBy, sortOrder, page: 1, filter });
    }, [sortBy, sortOrder, filter, fetchList]);

    const handleSort = useCallback((newSortBy: string) => {
        const newSortOrder = sortBy === newSortBy && sortOrder === 'desc' ? 'asc' : 'desc';
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        fetchList({ search, sortBy: newSortBy, sortOrder: newSortOrder, page: 1, filter });
    }, [sortBy, sortOrder, search, filter, fetchList]);

    const handlePageChange = useCallback((newPage: number) => {
        fetchList({ search, sortBy, sortOrder, page: newPage, filter });
    }, [search, sortBy, sortOrder, filter, fetchList]);

    const handleFilter = useCallback((newFilter: 'all' | 'declining' | 'improving') => {
        setFilter(newFilter);
        fetchList({ search, sortBy, sortOrder, page: 1, filter: newFilter });
    }, [search, sortBy, sortOrder, fetchList]);

    const handleSelectUrl = useCallback((url: string) => {
        fetchDetail(url);
    }, [fetchDetail]);

    if (loading) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-6">URL Performance</h1>
                <LoadingSkeleton />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">URL Performance</h1>
                <p className="text-slate-400">Track page-level traffic changes from GSC data</p>
            </div>

            {/* Error */}
            {error && (
                <Card className="bg-rose-900/20 border-rose-700">
                    <CardContent className="pt-4">
                        <p className="text-rose-400">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            {overview && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        title="Total URLs"
                        value={overview.summary.totalUrls}
                        icon={FileText}
                        color="bg-blue-500"
                    />
                    <SummaryCard
                        title="Declining"
                        value={overview.summary.declining}
                        icon={TrendingDown}
                        color="bg-rose-500"
                    />
                    <SummaryCard
                        title="Improving"
                        value={overview.summary.improving}
                        icon={TrendingUp}
                        color="bg-emerald-500"
                    />
                    <SummaryCard
                        title="Avg Change"
                        value={`${overview.summary.avgChangePercent > 0 ? '+' : ''}${overview.summary.avgChangePercent}%`}
                        icon={Minus}
                        color="bg-slate-500"
                    />
                </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Declining URLs */}
                <div className="lg:col-span-1">
                    {overview && (
                        <DecliningURLs
                            urls={overview.decliningUrls}
                            onSelectUrl={handleSelectUrl}
                        />
                    )}
                </div>

                {/* Detail Chart (when URL selected) */}
                <div className="lg:col-span-2">
                    {detailData ? (
                        <URLDetailChart
                            url={detailData.url}
                            chartData={detailData.chartData}
                            topQueries={detailData.topQueries}
                            onClose={clearDetail}
                        />
                    ) : (
                        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 h-full min-h-[300px]">
                            <CardContent className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-400">Click on a URL to view detailed performance</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* URLs Table */}
            {listData && (
                <URLTable
                    urls={listData.urls}
                    pagination={listData.pagination}
                    onSearch={handleSearch}
                    onSort={handleSort}
                    onPageChange={handlePageChange}
                    onFilter={handleFilter}
                    onSelectUrl={handleSelectUrl}
                    sortBy={sortBy}
                    filter={filter}
                />
            )}
        </div>
    );
}
