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

export const workspaceGroups = pgTable('workspace_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 256 }).notNull(),
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
  position: integer('position').default(0).notNull(), // Manual order within a goal (kanban drag-and-drop)
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

// Phase D: rules-lite, outgoing webhooks, import batches (idempotency).
export const rules = pgTable('rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  trigger: varchar('trigger', { enum: ['task_done'] }).default('task_done').notNull(),
  action: varchar('action', { enum: ['close_goal'] }).default('close_goal').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const webhooks = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 2048 }).notNull(), // https only, validated by Zod
  secret: varchar('secret', { length: 256 }).notNull(),
  events: text('events').notNull(), // JSON array of event names
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const importBatches = pgTable('import_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: varchar('source', { enum: ['trello', 'excel'] }).notNull(),
  externalId: varchar('external_id', { length: 512 }).notNull(),
  resourceId: uuid('resource_id'), // created workspace/goal/task id
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Phase C: reminders + in-app notifications. SMS/email fan out through
// notify.ts (provider abstraction); the worker marks rows sent/failed.
export const reminders = pgTable('reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
  channel: varchar('channel', { enum: ['inapp', 'email', 'sms'] }).default('inapp').notNull(),
  status: varchar('status', { enum: ['pending', 'sent', 'failed'] }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 64 }).notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Rich-card tables (Phase B): labels, assignees, checklist, comments,
// attachments (metadata only — bytes live in ./uploads), activity log.
export const labels = pgTable('labels', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 64 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(), // #rrggbb, validated by Zod
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskLabels = pgTable('task_labels', {
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
});

export const taskAssignees = pgTable('task_assignees', {
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
