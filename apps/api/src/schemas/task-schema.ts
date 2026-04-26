import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1),
  projectId: z.number().int().positive(),
  description: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  taskType: z.enum(['technical', 'content', 'links']).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: z.string().nullable().optional(),
  timeSpent: z.number().int().nonnegative().optional(),
  estimatedTime: z.number().int().positive().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  expectedImpactStart: z.string().nullable().optional(),
  expectedImpactEnd: z.string().nullable().optional(),
  actualImpact: z.unknown().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();
