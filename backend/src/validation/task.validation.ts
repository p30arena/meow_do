import { z } from 'zod';

export const createTaskSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID format'),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  timeBudget: z.number().int().min(0, 'Time budget must be a non-negative integer'),
  deadline: z.string().datetime().optional().transform((str) => (str ? new Date(str) : undefined)), // ISO 8601 string to Date object
  status: z.enum(['pending', 'started', 'failed', 'done']).default('pending').optional(),
  priority: z.number().int().min(1).max(10).default(1).optional(), // Priority from 1 to 10, default 1
  isRecurring: z.boolean().default(false).optional(),
});

export const updateTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required').optional(),
  description: z.string().optional(),
  timeBudget: z.number().int().min(0, 'Time budget must be a non-negative integer').optional(),
  deadline: z.string().datetime().optional().transform((str) => (str ? new Date(str) : undefined)), // ISO 8601 string to Date object
  status: z.enum(['pending', 'started', 'failed', 'done']).optional(),
  priority: z.number().int().min(1).max(10).optional(), // Priority from 1 to 10
  isRecurring: z.boolean().optional(),
});

export const startTaskTrackingSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  startTime: z.string().datetime().optional().transform((str) => (str ? new Date(str) : undefined)), // ISO 8601 string to Date object
});

export const stopTaskTrackingSchema = z.object({
  trackingId: z.string().uuid('Invalid tracking ID format'),
  stopTime: z.string().datetime().optional().transform((str) => (str ? new Date(str) : undefined)), // ISO 8601 string to Date object
});

export const createManualTaskRecordSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  startTime: z.string().datetime('Invalid start time format').transform((str) => new Date(str)), // ISO 8601 string to Date object
  stopTime: z.string().datetime('Invalid stop time format').transform((str) => new Date(str)), // ISO 8601 string to Date object
  duration: z.number().int().min(0, 'Duration must be a non-negative integer'), // Duration in seconds
});
