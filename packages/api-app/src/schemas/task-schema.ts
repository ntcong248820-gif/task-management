import { z } from 'zod';

const uuidString = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const dueDateRefinement = (d: { dueDate?: string | null; startDate?: string | null }) =>
  !d.dueDate || !d.startDate || d.dueDate >= d.startDate;
const dueDateRefinementOpts = { message: 'dueDate must be >= startDate', path: ['dueDate'] };

const baseTaskSchema = z.object({
  title: z.string().trim().min(1),
  projectId: uuidString,
  goalId: uuidString.nullable().optional(),
  sprintId: uuidString.nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'blocked', 'in_review', 'done']).default('backlog'),
  taskType: z.enum(['technical', 'content', 'links', 'planning', 'meeting', 'audit']).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  affectsWebsite: z.boolean().default(true),
  assigneeId: z.string().nullable().optional(),
  timeSpent: z.number().int().nonnegative().optional(),
  estimatedTime: z.number().int().positive().nullable().optional(),
  startDate: dateString.nullable().optional(),
  dueDate: dateString.nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  expectedImpactStart: dateString.nullable().optional(),
  expectedImpactEnd: dateString.nullable().optional(),
  actualImpact: z.unknown().nullable().optional(),
  isRecurring: z.boolean().default(false),
  recurringTemplateId: uuidString.nullable().optional(),
  recurringConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
  targetUrl: z.string().url().nullable().optional(),
});

export const createTaskSchema = baseTaskSchema.refine(dueDateRefinement, dueDateRefinementOpts);

export const updateTaskSchema = baseTaskSchema.partial().refine(dueDateRefinement, dueDateRefinementOpts);

export const moveTaskSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'blocked', 'in_review', 'done']),
});

export const createTaskTemplateSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  taskType: z.enum(['technical', 'content', 'links', 'planning', 'meeting', 'audit']).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  affectsWebsite: z.boolean().default(true),
  estimatedTime: z.number().int().positive().nullable().optional(),
  recurringConfig: z.record(z.string(), z.unknown()),
  tags: z.array(z.string()).nullable().optional(),
});
