import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  description: z.string().optional(),
  groupName: z.string().optional().nullable(), // New: Optional group name
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').optional(),
  description: z.string().optional(),
  groupName: z.string().optional().nullable(), // New: Optional group name
});
