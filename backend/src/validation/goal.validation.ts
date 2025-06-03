import { z } from 'zod';

export const createGoalSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  name: z.string().min(1, 'Goal name is required'),
  description: z.string().optional(),
  deadline: z.string().datetime().optional().transform((str) => (str ? new Date(str) : undefined)), // ISO 8601 string to Date object
  status: z.enum(['pending', 'reached']).default('pending').optional(),
});

export const updateGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').optional(),
  description: z.string().optional(),
  deadline: z.string().datetime().optional().transform((str) => (str ? new Date(str) : undefined)), // ISO 8601 string to Date object
  status: z.enum(['pending', 'reached']).optional(),
});
