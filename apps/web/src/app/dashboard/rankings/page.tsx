'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { useRankingsData } from '@/hooks';
import {
  TopMovers,
  KeywordTable,
  RankingChart,
  PositionDistribution,
} from '@/components/features/rankings';

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-700 h-[200px]"></Card>
        <Card className="bg-slate-900 border-slate-700 h-[200px]"></Card>
      </div>
      <Card className="bg-slate-900 border-slate-700 h-[350px]"></Card>
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

export default function RankingsPage() {
  const [sortBy, setSortBy] = useState('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const {
    overview,
    keywordsData,
    chartData,
    distributionData,
    loading,
    error,
    fetchKeywords,
  } = useRankingsData(1, 30);

  const handleSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
    fetchKeywords({ search: newSearch, sortBy, sortOrder, page: 1 });
  }, [sortBy, sortOrder, fetchKeywords]);

  const handleSort = useCallback((newSortBy: string) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    fetchKeywords({ search, sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, search, fetchKeywords]);

  const handlePageChange = useCallback((newPage: number) => {
    fetchKeywords({ search, sortBy, sortOrder, page: newPage });
  }, [search, sortBy, sortOrder, fetchKeywords]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Keyword Rankings</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Keyword Rankings</h1>
        <p className="text-slate-400">Track keyword position changes from GSC data</p>
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
            title="Total Keywords"
            value={overview.summary.totalKeywords}
            icon={Target}
            color="bg-blue-500"
          />
          <SummaryCard
            title="Improved"
            value={overview.summary.improved}
            icon={TrendingUp}
            color="bg-emerald-500"
          />
          <SummaryCard
            title="Declined"
            value={overview.summary.declined}
            icon={TrendingDown}
            color="bg-rose-500"
          />
          <SummaryCard
            title="Avg. Position"
            value={overview.summary.avgPosition.toFixed(1)}
            icon={Minus}
            color="bg-slate-500"
          />
        </div>
      )}

      {/* Top Movers */}
      {overview && (
        <TopMovers
          gainers={overview.topMovers.gainers}
          losers={overview.topMovers.losers}
        />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Trend Chart */}
        {chartData && (
          <RankingChart
            chartData={chartData.chartData}
            keywords={chartData.keywords}
          />
        )}

        {/* Position Distribution */}
        {distributionData && (
          <PositionDistribution
            distribution={distributionData.distribution}
            totalKeywords={distributionData.totalKeywords}
          />
        )}
      </div>

      {/* Keywords Table */}
      {keywordsData && (
        <KeywordTable
          keywords={keywordsData.keywords}
          pagination={keywordsData.pagination}
          onSearch={handleSearch}
          onSort={handleSort}
          onPageChange={handlePageChange}
          sortBy={sortBy}
        />
      )}
    </div>
  );
}
