import { z } from 'zod';
import { DateTime } from 'luxon';

// IANA zone names ("Europe/Berlin", "Etc/GMT+5") or fixed offsets ("+02:00").
// The character whitelist is critical: this value is interpolated into SQL
// date_trunc expressions in task tracking summaries.
const isValidTimezone = (tz: string): boolean =>
  /^[A-Za-z0-9_+\-/]+$/.test(tz) && DateTime.now().setZone(tz).isValid;

export const registerUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long').max(64),
  email: z.string().email('Invalid email address').max(256),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(72), // bcrypt operates on at most 72 bytes
});

export const updateUserTimezoneSchema = z.object({
  timezone: z
    .string()
    .min(1, 'Timezone cannot be empty')
    .max(64)
    .refine(isValidTimezone, 'Invalid timezone'),
});

export const loginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});
