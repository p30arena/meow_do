import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

const driver = process.env.DB_DRIVER?.toLowerCase() || 'postgres';
if (driver !== 'postgres' && driver !== 'sqlite') {
  throw new Error(`Unsupported DB_DRIVER "${driver}". Use "postgres" or "sqlite".`);
}

const sqlitePath = process.env.SQLITE_PATH || './data/meowdo.sqlite';
if (driver === 'sqlite') mkdirSync(dirname(sqlitePath), { recursive: true });
const sqliteDatabase = driver === 'sqlite' ? new Database(sqlitePath) : null;

if (sqliteDatabase) {
  sqliteDatabase.function('gen_random_uuid', () => randomUUID());
  sqliteDatabase.function('now', () => new Date().toISOString());
  sqliteDatabase.pragma('foreign_keys = ON');
  sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'UTC', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, group_name TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS workspace_groups (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, name));
    CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, deadline TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, time_budget INTEGER NOT NULL, deadline TEXT, status TEXT NOT NULL DEFAULT 'pending', priority INTEGER NOT NULL DEFAULT 1, is_recurring INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS task_tracking_records (id TEXT PRIMARY KEY NOT NULL, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, start_time TEXT NOT NULL, end_time TEXT, duration INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS workspace_shares (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, shared_with_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, invited_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS permissions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, resource_id TEXT NOT NULL, resource_type TEXT NOT NULL, can_list INTEGER NOT NULL DEFAULT 0, can_edit INTEGER NOT NULL DEFAULT 0, can_delete INTEGER NOT NULL DEFAULT 0, can_add_task INTEGER NOT NULL DEFAULT 0, can_submit_record INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);
}

const pool = driver === 'postgres' ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
export const db = (driver === 'sqlite'
  ? drizzleSqlite(sqliteDatabase!, { schema })
  : drizzlePostgres(pool!, { schema })) as any;
export { driver };

export interface TransactionClient {
  update(table: unknown): {
    set(values: unknown): {
      where(condition: unknown): Promise<unknown[]> & {
        returning(): Promise<unknown[]>;
        run(): unknown;
      };
    };
  };
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown> & { run(): unknown };
  };
}
