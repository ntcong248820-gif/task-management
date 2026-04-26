import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1),
  client: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  description: z.string().nullable().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
