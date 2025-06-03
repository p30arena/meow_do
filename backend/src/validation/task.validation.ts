import { z } from 'zod';

export const createTaskSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID format'),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  timeBudget: z.number().int().min(0, 'Time budget must be a non-negative integer'),
  deadline: z.string().datetime().optional().transform((str) => (str ? new Date(str) : undefined)), // ISO 8601 string to Date object
  status: z.enum(['pending', 'started', 'failed', 'done']).default('pending').optional(),
  isRecurring: z.boolean().default(false).optional(),
});

export const updateTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required').optional(),
  description: z.string().optional(),
  timeBudget: z.number().int().min(0, 'Time budget must be a non-negative integer').optional(),
  deadline: z.string().datetime().optional().transform((str) => (str ? new Date(str) : undefined)), // ISO 8601 string to Date object
  status: z.enum(['pending', 'started', 'failed', 'done']).optional(),
  isRecurring: z.boolean().optional(),
});
