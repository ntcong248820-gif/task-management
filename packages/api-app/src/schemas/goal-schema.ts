import { z } from 'zod';

const uuidString = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createGoalSchema = z.object({
  projectId: uuidString,
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  type: z.enum(['traffic', 'ranking', 'conversion', 'custom']),
  targetMetric: z.string().max(100).nullable().optional(),
  targetValue: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  startDate: dateString,
  endDate: dateString,
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
}).refine((d) => d.endDate >= d.startDate, {
  message: 'endDate must be >= startDate',
  path: ['endDate'],
});

export const updateGoalSchema = createGoalSchema.partial().omit({ projectId: true });

export const createSprintSchema = z.object({
  projectId: uuidString.nullable().optional(),
  goalId: uuidString.nullable().optional(),
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  startDate: dateString,
  endDate: dateString,
  status: z.enum(['planning', 'active', 'completed']).default('planning'),
}).refine((d) => d.endDate >= d.startDate, {
  message: 'endDate must be >= startDate',
  path: ['endDate'],
});

// status intentionally excluded — use /start and /complete action endpoints
export const updateSprintSchema = createSprintSchema.omit({ status: true }).partial();
