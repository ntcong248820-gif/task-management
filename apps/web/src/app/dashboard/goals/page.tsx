'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoalCard } from '@/components/features/goals/goal-card';
import { GoalCreateDialog } from '@/components/features/goals/goal-create-dialog';
import { useGoals, deleteGoal } from '@/hooks/use-goals';
import { SELECT_ALL_VALUE, optionalFilterValue } from '@/lib/select-values';
import { useWorkspaceStore } from '@/stores/use-workspace-store';
import type { Goal } from '@/types/goal.types';

export default function GoalsPage() {
  const projects = useWorkspaceStore((s) => s.projects);
  const [projectFilter, setProjectFilter] = useState(SELECT_ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState(SELECT_ALL_VALUE);
  const [createOpen, setCreateOpen] = useState(false);

  const { goals, loading, mutate } = useGoals({
    projectId: optionalFilterValue(projectFilter),
    status: optionalFilterValue(statusFilter),
  });

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal? All linked sprints will lose their goal reference.')) return;
    try {
      await deleteGoal(id);
      mutate();
    } catch {
      alert('Failed to delete goal');
    }
  }

  function handleCreated(_goal: Goal) {
    mutate();
  }

  return (
    <div>
      <PageHeader
        title="Goals"
        description="Project goals with task progress tracking."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create goal
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL_VALUE}>All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL_VALUE}>All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Goal list */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LoadingSkeleton className="h-40 w-full" />
            <LoadingSkeleton className="h-40 w-full" />
            <LoadingSkeleton className="h-40 w-full" />
          </div>
        ) : goals.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No goals found. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <GoalCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
