'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createSprint } from '@/hooks/use-sprints';
import type { Sprint } from '@/types/goal.types';

interface SprintCreateDialogProps {
  open: boolean;
  goalId?: string | null;
  onClose: () => void;
  onCreated: (sprint: Sprint) => void;
}

export function SprintCreateDialog({ open, goalId, onClose, onCreated }: SprintCreateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) {
      setError('Name, start date, and end date are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sprint = await createSprint({
        name: form.name.trim(),
        description: form.description || null,
        goalId: goalId ?? null,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      onCreated(sprint);
      onClose();
      setForm({ name: '', description: '', startDate: '', endDate: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sprint');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Sprint</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input
              className="mt-1 h-8 text-xs"
              placeholder="e.g. Sprint 1 — Technical fixes"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
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
            <Button type="submit" size="sm" disabled={loading}>{loading ? 'Creating…' : 'Create sprint'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
