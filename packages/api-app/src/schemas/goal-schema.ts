import { z } from 'zod';

const uuidString = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const validDateRange = (d: { startDate?: string | null; endDate?: string | null }) =>
  !d.startDate || !d.endDate || d.endDate >= d.startDate;

const dateRangeError = {
  message: 'endDate must be >= startDate',
  path: ['endDate'],
};

const goalBaseSchema = z.object({
  projectId: uuidString,
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  type: z.enum(['traffic', 'ranking', 'conversion', 'custom']),
  targetMetric: z.string().max(100).nullable().optional(),
  targetValue: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  startDate: dateString,
  endDate: dateString,
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
});

export const createGoalSchema = goalBaseSchema.refine(validDateRange, dateRangeError);

export const updateGoalSchema = goalBaseSchema
  .omit({ projectId: true })
  .partial()
  .refine(validDateRange, dateRangeError);

const sprintBaseSchema = z.object({
  projectId: uuidString.nullable().optional(),
  goalId: uuidString.nullable().optional(),
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  startDate: dateString,
  endDate: dateString,
  status: z.enum(['planning', 'active', 'completed']).default('planning'),
});

export const createSprintSchema = sprintBaseSchema.refine(validDateRange, dateRangeError);

// status intentionally excluded — use /start and /complete action endpoints
export const updateSprintSchema = sprintBaseSchema
  .omit({ status: true })
  .partial()
  .refine(validDateRange, dateRangeError);
