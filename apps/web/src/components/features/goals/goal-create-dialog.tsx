'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspaceStore } from '@/stores/use-workspace-store';
import { useProjectStore } from '@/stores/use-project-store';
import { createGoal } from '@/hooks/use-goals';
import type { Goal } from '@/types/goal.types';

interface GoalCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (goal: Goal) => void;
}

const GOAL_TYPES = ['traffic', 'ranking', 'conversion', 'custom'] as const;
const TARGET_METRICS = ['clicks', 'impressions', 'position', 'sessions', 'conversions'];

export function GoalCreateDialog({ open, onClose, onCreated }: GoalCreateDialogProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    projectId: '',
    title: '',
    type: 'traffic' as typeof GOAL_TYPES[number],
    targetMetric: '',
    targetValue: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      ...prev,
      projectId: selectedProjectId ?? projects[0]?.id ?? '',
    }));
    setError(null);
  }, [open, selectedProjectId, projects]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectId || !form.title || !form.startDate || !form.endDate) {
      setError('Project, title, start date, and end date are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const goal = await createGoal({
        projectId: form.projectId,
        title: form.title.trim(),
        type: form.type,
        targetMetric: form.targetMetric || null,
        targetValue: form.targetValue || null,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description || null,
      });
      onCreated(goal);
      onClose();
      setForm({ projectId: selectedProjectId ?? projects[0]?.id ?? '', title: '', type: 'traffic', targetMetric: '', targetValue: '', startDate: '', endDate: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Project *</Label>
            <Select value={form.projectId} onValueChange={(v) => set('projectId', v)}>
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">No projects found. Create one first.</p>
            )}
          </div>

          <div>
            <Label className="text-xs">Title *</Label>
            <Input
              className="mt-1 h-8 text-xs"
              placeholder="e.g. Increase organic traffic 40% in Q2"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type *</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v as typeof GOAL_TYPES[number])}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Target metric</Label>
              <Select value={form.targetMetric} onValueChange={(v) => set('targetMetric', v)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_METRICS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Target value</Label>
            <Input
              className="mt-1 h-8 text-xs"
              placeholder="e.g. 40 (for 40%)"
              value={form.targetValue}
              onChange={(e) => set('targetValue', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start date *</Label>
              <Input type="date" className="mt-1 h-8 text-xs" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End date *</Label>
              <Input type="date" className="mt-1 h-8 text-xs" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              className="mt-1 min-h-[60px] text-xs"
              placeholder="Optional notes"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}>{loading ? 'Creating…' : 'Create goal'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
