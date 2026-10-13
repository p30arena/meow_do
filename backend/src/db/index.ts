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
  // Backfill-safe: fresh installs get the column inline; existing files get
  // ALTER TABLE below (CREATE TABLE IF NOT EXISTS never adds columns).
  sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'UTC', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, group_name TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS workspace_groups (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, name));
    CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, deadline TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, time_budget INTEGER NOT NULL, deadline TEXT, status TEXT NOT NULL DEFAULT 'pending', priority INTEGER NOT NULL DEFAULT 1, position INTEGER NOT NULL DEFAULT 0, is_recurring INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS task_tracking_records (id TEXT PRIMARY KEY NOT NULL, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, start_time TEXT NOT NULL, end_time TEXT, duration INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS workspace_shares (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, shared_with_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, invited_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS permissions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, resource_id TEXT NOT NULL, resource_type TEXT NOT NULL, can_list INTEGER NOT NULL DEFAULT 0, can_edit INTEGER NOT NULL DEFAULT 0, can_delete INTEGER NOT NULL DEFAULT 0, can_add_task INTEGER NOT NULL DEFAULT 0, can_submit_record INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS labels (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name TEXT NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS task_labels (task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE, PRIMARY KEY (task_id, label_id));
    CREATE TABLE IF NOT EXISTS task_assignees (task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (task_id, user_id));
    CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY NOT NULL, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, remind_at TEXT NOT NULL, channel TEXT NOT NULL DEFAULT 'inapp', status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE, kind TEXT NOT NULL, body TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS rules (id TEXT PRIMARY KEY NOT NULL, goal_id TEXT REFERENCES goals(id) ON DELETE CASCADE, workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE, trigger TEXT NOT NULL DEFAULT 'task_done', action TEXT NOT NULL DEFAULT 'close_goal', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS webhooks (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, url TEXT NOT NULL, secret TEXT NOT NULL, events TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS import_batches (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, source TEXT NOT NULL, external_id TEXT NOT NULL, resource_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, external_id));
  `);
  // Migrate existing SQLite files: add position column if missing, then
  // backfill per-goal order matching the legacy list sort
  // (status-case, priority DESC, name).
  const taskCols = sqliteDatabase.prepare(`PRAGMA table_info(tasks)`).all() as Array<{ name: string }>;
  if (!taskCols.some((c) => c.name === 'position')) {
    sqliteDatabase.exec(`ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0`);
    sqliteDatabase.exec(`
      UPDATE tasks SET position = (
        SELECT COUNT(*) FROM tasks t2
        WHERE t2.goal_id = tasks.goal_id
        AND (
          CASE WHEN t2.status = 'started' THEN 0 WHEN t2.status = 'pending' THEN 1 WHEN t2.status = 'failed' THEN 2 WHEN t2.status = 'done' THEN 3 ELSE 4 END < CASE WHEN tasks.status = 'started' THEN 0 WHEN tasks.status = 'pending' THEN 1 WHEN tasks.status = 'failed' THEN 2 WHEN tasks.status = 'done' THEN 3 ELSE 4 END
          OR (
            CASE WHEN t2.status = 'started' THEN 0 WHEN t2.status = 'pending' THEN 1 WHEN t2.status = 'failed' THEN 2 WHEN t2.status = 'done' THEN 3 ELSE 4 END = CASE WHEN tasks.status = 'started' THEN 0 WHEN tasks.status = 'pending' THEN 1 WHEN tasks.status = 'failed' THEN 2 WHEN tasks.status = 'done' THEN 3 ELSE 4 END
            AND (t2.priority > tasks.priority OR (t2.priority = tasks.priority AND t2.name < tasks.name) OR (t2.priority = tasks.priority AND t2.name = tasks.name AND t2.id < tasks.id))
          )
        )
      )
    `);
  }
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
