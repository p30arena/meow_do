import { z } from 'zod';

export const HEX_COLOR = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be #rrggbb');

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, 'Label name is required').max(64),
  color: HEX_COLOR,
});

export const updateLabelSchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
  color: HEX_COLOR.optional(),
});

export const assignLabelSchema = z.object({
  labelId: z.string().uuid('Invalid label ID format'),
});

export const assignUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});
