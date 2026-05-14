import { z } from 'zod';

const uuidString = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createTaskSchema = z.object({
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
});

export const updateTaskSchema = createTaskSchema.partial();
