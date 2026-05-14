import { z } from 'zod';

const nullableString = z.string().trim().min(1).nullable().optional();

export const createProjectSchema = z.object({
  name: z.string().trim().min(1),
  domain: nullableString,
  description: nullableString,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updateProjectSchema = createProjectSchema.partial();
