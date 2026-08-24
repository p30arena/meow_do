import { driver } from '../db';

/**
 * SQLite (better-sqlite3) can only bind numbers, strings, bigints, buffers and
 * null — JS booleans throw. The pg schema declares boolean columns
 * (`permissions.*`, `tasks.is_recurring`), so every payload that may contain
 * booleans must pass through this mapper when running in sqlite mode.
 *
 * Postgres mode returns the payload untouched.
 */
export const forDriver = <T extends Record<string, unknown>>(payload: T): T => {
  if (driver !== 'sqlite') return payload;
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? (value ? 1 : 0) : value,
    ]),
  ) as T;
};
