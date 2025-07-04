import { pgTable, uuid, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  groupName: varchar('group_name', { length: 256 }), // New column for grouping workspaces
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 256 }).notNull().unique(),
  email: varchar('email', { length: 256 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 256 }).notNull(),
  timezone: varchar('timezone', { length: 256 }).default('UTC').notNull(), // Default to UTC
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  timeBudget: integer('time_budget').notNull(), // in minutes
  deadline: timestamp('deadline'),
  status: varchar('status', { enum: ['pending', 'started', 'failed', 'done'] }).default('pending').notNull(),
  priority: integer('priority').default(1).notNull(), // Default priority to 1
  isRecurring: boolean('is_recurring').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskTrackingRecords = pgTable('task_tracking_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Assuming tracking is per user
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }), // Nullable, for ongoing tasks
  duration: integer('duration'), // Duration in seconds, calculated on stop
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  deadline: timestamp('deadline'),
  status: varchar('status', { enum: ['pending', 'reached'] }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// New table for tracking shared workspaces
export const workspaceShares = pgTable('workspace_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sharedWithUserId: uuid('shared_with_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  invitedByUserId: uuid('invited_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { enum: ['pending', 'accepted', 'declined'] }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// New table for managing permissions on shared resources
export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id').notNull(), // References workspace, goal, or task ID
  resourceType: varchar('resource_type', { enum: ['workspace', 'goal', 'task'] }).notNull(),
  canList: boolean('can_list').default(false).notNull(),
  canEdit: boolean('can_edit').default(false).notNull(),
  canDelete: boolean('can_delete').default(false).notNull(),
  canAddTask: boolean('can_add_task').default(false).notNull(), // Only applicable for goals
  canSubmitRecord: boolean('can_submit_record').default(false).notNull(), // Only applicable for tasks
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
