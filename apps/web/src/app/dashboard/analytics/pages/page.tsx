'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { PagesTable } from '@/components/features/analytics/pages-table';
import { PageDetailPanel } from '@/components/features/analytics/page-detail-panel';
import { useAnalyticsPages } from '@/hooks/use-analytics';
import { useProjectStore } from '@/stores/use-project-store';
import { useWorkspaceStore } from '@/stores/use-workspace-store';

export default function AnalyticsPagesPage() {
  const router = useRouter();
  const projects = useWorkspaceStore(s => s.projects);
  const selectedProjectId = useProjectStore(s => s.selectedProjectId);
  const projectId = selectedProjectId ?? projects[0]?.id ?? null;

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('clicks');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  const { data, loading } = useAnalyticsPages(projectId, {
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

  const handleOpenCorrelation = useCallback((url: string) => {
    router.push(`/dashboard/analytics?url=${encodeURIComponent(url)}#correlation`);
  }, [router]);

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
        title="Pages"
        description="URL-level traffic, decay status, and keyword breakdown."
      />

      <div className="p-4 sm:p-6">
        <PagesTable
          pages={data?.pages ?? []}
          total={data?.total ?? 0}
          page={page}
          totalPages={data?.totalPages ?? 1}
          loading={loading}
          onRowClick={setActiveUrl}
          onPageChange={setPage}
          onSortChange={handleSortChange}
          onSearch={handleSearch}
        />
      </div>

      <PageDetailPanel
        url={activeUrl}
        projectId={projectId}
        onClose={() => setActiveUrl(null)}
        onOpenCorrelation={handleOpenCorrelation}
      />
    </div>
  );
}
