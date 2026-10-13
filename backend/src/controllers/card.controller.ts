import { Request, Response } from 'express';
import { db } from '../db';
import { labels, taskLabels, taskAssignees, tasks, goals, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createLabelSchema, updateLabelSchema, assignLabelSchema, assignUserSchema } from '../validation/card.validation';
import { catchAsync } from '../utils/catchAsync';
import { forDriver } from '../utils/driverPayload';

/** Resolve the workspace for a goal, 404 when invisible to the caller. */
const goalWorkspace = async (goalId: string) => {
  const rows = await db.select({ workspaceId: goals.workspaceId }).from(goals).where(eq(goals.id, goalId));
  return rows[0]?.workspaceId ?? null;
};

export const listLabels = catchAsync(async (req: Request, res: Response) => {
  const { goalId } = req.params;
  const workspaceId = await goalWorkspace(goalId);
  if (!workspaceId) return res.status(404).json({ message: 'Goal not found' });
  const rows = await db.select().from(labels).where(eq(labels.workspaceId, workspaceId));
  res.status(200).json(rows);
});

export const createLabel = catchAsync(async (req: Request, res: Response) => {
  const { goalId } = req.params;
  const data = createLabelSchema.parse(req.body);
  const workspaceId = await goalWorkspace(goalId);
  if (!workspaceId) return res.status(404).json({ message: 'Goal not found' });
  const [row] = await db.insert(labels).values(forDriver({ ...data, workspaceId })).returning();
  res.status(201).json(row);
});

export const updateLabel = catchAsync(async (req: Request, res: Response) => {
  const data = updateLabelSchema.parse(req.body);
  const [row] = await db.update(labels).set(data).where(eq(labels.id, req.params.labelId)).returning();
  if (!row) return res.status(404).json({ message: 'Label not found' });
  res.status(200).json(row);
});

export const deleteLabel = catchAsync(async (req: Request, res: Response) => {
  // Junction rows cascade on Postgres; delete explicitly for SQLite parity.
  await db.delete(taskLabels).where(eq(taskLabels.labelId, req.params.labelId));
  const [row] = await db.delete(labels).where(eq(labels.id, req.params.labelId)).returning();
  if (!row) return res.status(404).json({ message: 'Label not found' });
  res.status(204).send();
});

export const assignLabel = catchAsync(async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const { labelId } = assignLabelSchema.parse(req.body);
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (task.length === 0) return res.status(404).json({ message: 'Task not found' });
  const existing = await db.select().from(taskLabels).where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)));
  if (existing.length === 0) {
    await db.insert(taskLabels).values({ taskId, labelId });
  }
  res.status(201).json({ taskId, labelId });
});

export const unassignLabel = catchAsync(async (req: Request, res: Response) => {
  const { id: taskId, labelId } = req.params;
  await db.delete(taskLabels).where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)));
  res.status(204).send();
});

export const listAssignees = catchAsync(async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const rows = await db.select({ userId: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, taskId));
  const ids = rows.map((r: { userId: string }) => r.userId);
  if (ids.length === 0) return res.status(200).json([]);
  const people = await db.select({ id: users.id, username: users.username, email: users.email }).from(users);
  res.status(200).json(people.filter((u: { id: string }) => ids.includes(u.id)));
});

export const assignUser = catchAsync(async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const { userId } = assignUserSchema.parse(req.body);
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (task.length === 0) return res.status(404).json({ message: 'Task not found' });
  // Assignee must own or share the parent workspace.
  const goal = await db.select({ workspaceId: goals.workspaceId }).from(goals).where(eq(goals.id, task[0].goalId));
  const workspaceId = goal[0]?.workspaceId;
  if (!workspaceId) return res.status(404).json({ message: 'Workspace not found' });
  const target = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (target.length === 0) return res.status(404).json({ message: 'User not found' });
  const existing = await db.select().from(taskAssignees).where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)));
  if (existing.length === 0) {
    await db.insert(taskAssignees).values({ taskId, userId });
  }
  res.status(201).json({ taskId, userId });
});

export const unassignUser = catchAsync(async (req: Request, res: Response) => {
  const { id: taskId, userId } = req.params;
  await db.delete(taskAssignees).where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)));
  res.status(204).send();
});

export const taskCardDetails = catchAsync(async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (task.length === 0) return res.status(404).json({ message: 'Task not found' });
  const joins = await db.select({ label: labels }).from(taskLabels).innerJoin(labels, eq(taskLabels.labelId, labels.id)).where(eq(taskLabels.taskId, taskId));
  const assigneeRows = await db.select({ userId: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, taskId));
  const assigneeIds = assigneeRows.map((r: { userId: string }) => r.userId);
  const people = assigneeIds.length > 0
    ? (await db.select({ id: users.id, username: users.username, email: users.email }).from(users))
      .filter((u: { id: string }) => assigneeIds.includes(u.id))
    : [];
  res.status(200).json({ task: task[0], labels: joins.map((r: { label: typeof labels.$inferSelect }) => r.label), assignees: people });
});
