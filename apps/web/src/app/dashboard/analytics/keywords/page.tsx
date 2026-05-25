'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { KeywordsTable } from '@/components/features/analytics/keywords-table';
import { KeywordDetailPanel } from '@/components/features/analytics/keyword-detail-panel';
import { useAnalyticsKeywords } from '@/hooks/use-analytics';
import { useProjectStore } from '@/stores/use-project-store';
import { useWorkspaceStore } from '@/stores/use-workspace-store';

export default function AnalyticsKeywordsPage() {
  const projects = useWorkspaceStore(s => s.projects);
  const selectedProjectId = useProjectStore(s => s.selectedProjectId);
  const projectId = selectedProjectId ?? projects[0]?.id ?? null;

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('clicks');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);

  const { data, loading } = useAnalyticsKeywords(projectId, {
    days: 30,
    sort,
    order,
    page,
    limit: 50,
    search,
  });

  const handleSortChange = useCallback((newSort: string, newOrder: 'asc' | 'desc') => {
    setSort(newSort);
    setOrder(newOrder);
    setPage(1);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  if (!projectId) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">No project selected.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Keywords"
        description="Keyword rankings, click trends, and position movement."
      />

      <div className="p-4 sm:p-6">
        <KeywordsTable
          keywords={data?.keywords ?? []}
          total={data?.total ?? 0}
          page={page}
          totalPages={data?.totalPages ?? 1}
          loading={loading}
          onRowClick={setActiveKeyword}
          onPageChange={setPage}
          onSortChange={handleSortChange}
          onSearch={handleSearch}
        />
      </div>

      <KeywordDetailPanel
        keyword={activeKeyword}
        projectId={projectId}
        onClose={() => setActiveKeyword(null)}
      />
    </div>
  );
}
