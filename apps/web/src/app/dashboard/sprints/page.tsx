'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SprintCard } from '@/components/features/goals/sprint-card';
import { SprintCreateDialog } from '@/components/features/goals/sprint-create-dialog';
import { useSprints, useSprintTasks } from '@/hooks/use-sprints';
import type { Sprint } from '@/types/goal.types';

function SprintCardWithTasks({ sprint, onMutate }: { sprint: Sprint; onMutate: () => void }) {
  const { tasks } = useSprintTasks(sprint.status === 'active' ? sprint.id : null);
  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  return (
    <SprintCard
      sprint={sprint}
      tasksTotal={sprint.status === 'active' ? tasks.length : undefined}
      tasksDone={sprint.status === 'active' ? tasksDone : undefined}
      onMutate={onMutate}
    />
  );
}

export default function SprintsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { sprints, loading, mutate } = useSprints({
    status: statusFilter || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Sprints"
        description="Campaign periods and sprint planning."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create sprint
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sprint list */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading sprints…</div>
        ) : sprints.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No sprints found. Create one to start planning.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sprints.map((sprint) => (
              <SprintCardWithTasks key={sprint.id} sprint={sprint} onMutate={mutate} />
            ))}
          </div>
        )}
      </div>

      <SprintCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => mutate()}
      />
    </div>
  );
}
