import { z } from 'zod';

export const createRuleSchema = z.object({
  goalId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  trigger: z.enum(['task_done']).default('task_done').optional(),
  action: z.enum(['close_goal']).default('close_goal').optional(),
}).refine((v) => v.goalId || v.workspaceId, { message: 'goalId or workspaceId is required' });

export const createWebhookSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  url: z.string().url('Must be a valid URL').refine((u) => u.startsWith('https://'), { message: 'Only https URLs allowed' }),
  secret: z.string().min(8, 'Secret must be at least 8 characters').max(256),
  events: z.array(z.enum(['task.created', 'task.updated', 'task.done'])).min(1),
});

export const trelloImportSchema = z.object({
  dryRun: z.boolean().default(true).optional(),
  confirm: z.boolean().default(false).optional(),
  batchId: z.string().min(1, 'batchId is required for idempotency').optional(),
  board: z.object({
    name: z.string().min(1),
    lists: z.array(z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      cards: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        desc: z.string().optional(),
        due: z.string().optional(),
        labels: z.array(z.object({ name: z.string(), color: z.string().optional() })).optional(),
        members: z.array(z.object({ email: z.string().email() })).optional(),
      })).optional(),
    })),
  }),
});
