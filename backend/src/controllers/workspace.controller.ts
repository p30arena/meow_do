import { Request, Response, NextFunction } from 'express';
import { db, driver, type TransactionClient } from '../db';
import { workspaces, workspaceGroups, goals, tasks, taskTrackingRecords, workspaceShares } from '../db/schema';
import { eq, and, ne, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createWorkspaceSchema, updateWorkspaceSchema } from '../validation/workspace.validation';
import { catchAsync } from '../utils/catchAsync';

export const createWorkspace = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createWorkspaceSchema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const newWorkspace = await db.insert(workspaces).values({ ...validatedData, userId }).returning();
  res.status(201).json(newWorkspace[0]);
});

export const getWorkspaces = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  if (driver === 'sqlite') {
    const owned = await db.select().from(workspaces).where(eq(workspaces.userId, userId));
    // Aggregate counts in bulk instead of one query per workspace (N+1)
    const goalRows = await db.select({ workspaceId: goals.workspaceId, count: sql<number>`COUNT(*)` })
      .from(goals)
      .where(eq(goals.userId, userId))
      .groupBy(goals.workspaceId);
    const taskRows = await db.select({ workspaceId: goals.workspaceId, count: sql<number>`COUNT(*)` })
      .from(tasks)
      .innerJoin(goals, eq(tasks.goalId, goals.id))
      .where(eq(goals.userId, userId))
      .groupBy(goals.workspaceId);
    const goalsPerWorkspace = new Map(goalRows.map((row: { workspaceId: string; count: number }) => [row.workspaceId, row.count]));
    const tasksPerWorkspace = new Map(taskRows.map((row: { workspaceId: string; count: number }) => [row.workspaceId, row.count]));
    const formatted = owned.map((workspace: typeof workspaces.$inferSelect) => ({
      ...workspace,
      goalCount: goalsPerWorkspace.get(workspace.id) ?? 0,
      taskCount: tasksPerWorkspace.get(workspace.id) ?? 0,
      totalProgress: 0,
      hasRunningTask: false,
      isShared: false,
    }));
    return res.status(200).json(formatted);
  }
  const dailyTrackedTimeSubquery = db.select({
    taskId: taskTrackingRecords.taskId,
    total_duration_minutes: sql<number>`SUM(${taskTrackingRecords.duration})::numeric / 60`.as('total_duration_minutes'),
  })
  .from(taskTrackingRecords)
  .where(sql`date_trunc('day', ${taskTrackingRecords.startTime}) = date_trunc('day', NOW())`)
  .groupBy(taskTrackingRecords.taskId)
  .as('daily_tracked_time');

  const runningTasksSubquery = db.select({
    workspaceId: goals.workspaceId,
    hasRunningTask: sql<boolean>`TRUE`.as('hasRunningTask'),
  })
  .from(taskTrackingRecords)
  .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
  .innerJoin(goals, eq(tasks.goalId, goals.id))
  .where(and(eq(taskTrackingRecords.userId, userId), sql`${taskTrackingRecords.endTime} IS NULL`))
  .groupBy(goals.workspaceId)
  .as('running_tasks');

  // Subquery to check if a workspace is shared by the owner
  const sharedByOwnerSubquery = db.select({
    workspaceId: workspaceShares.workspaceId,
    isSharedByOwner: sql<boolean>`TRUE`.as('isSharedByOwner'),
  })
  .from(workspaceShares)
  .groupBy(workspaceShares.workspaceId)
  .as('shared_by_owner');

  // Fetch owned workspaces
  const ownedWorkspaces = await db.select({
    id: workspaces.id,
    userId: workspaces.userId,
    name: workspaces.name,
    description: workspaces.description,
    groupName: workspaces.groupName, // Include groupName
    createdAt: workspaces.createdAt,
    updatedAt: workspaces.updatedAt,
    goalCount: sql<number>`COUNT(DISTINCT ${goals.id})::integer`.as('goalCount'),
    taskCount: sql<number>`COUNT(${tasks.id})::integer`.as('taskCount'),
    totalProgress: sql<number>`
      (CASE
        WHEN SUM(${tasks.timeBudget}) = 0 THEN 0
        ELSE
          (
            SUM(
              CASE
                WHEN ${tasks.status} = 'done' THEN ${tasks.timeBudget}
                ELSE COALESCE(${dailyTrackedTimeSubquery.total_duration_minutes}, 0)
              END
            ) * 100.0 / SUM(${tasks.timeBudget})
          )
      END)::numeric
    `.as('totalProgress'),
    hasRunningTask: sql<boolean>`COALESCE(${runningTasksSubquery.hasRunningTask}, FALSE)`.as('hasRunningTask'),
    isShared: sql<boolean>`COALESCE(${sharedByOwnerSubquery.isSharedByOwner}, FALSE)`.as('isShared'),
  })
  .from(workspaces)
  .leftJoin(goals, and(eq(goals.workspaceId, workspaces.id), eq(goals.userId, userId), ne(goals.status, "reached")))
  .leftJoin(tasks, and(eq(tasks.goalId, goals.id), eq(tasks.userId, userId), ne(tasks.status, "done")))
  .leftJoin(dailyTrackedTimeSubquery, eq(tasks.id, dailyTrackedTimeSubquery.taskId))
  .leftJoin(runningTasksSubquery, eq(workspaces.id, runningTasksSubquery.workspaceId))
  .leftJoin(sharedByOwnerSubquery, eq(workspaces.id, sharedByOwnerSubquery.workspaceId))
  .where(eq(workspaces.userId, userId))
  .groupBy(workspaces.id, workspaces.name, workspaces.description, workspaces.groupName, workspaces.createdAt, workspaces.updatedAt, workspaces.userId, runningTasksSubquery.hasRunningTask, sharedByOwnerSubquery.isSharedByOwner);

  // Fetch shared workspaces
  const sharedWorkspaces = await db.select({
    id: workspaces.id,
    userId: workspaces.userId,
    name: workspaces.name,
    description: workspaces.description,
    groupName: workspaces.groupName, // Include groupName
    createdAt: workspaces.createdAt,
    updatedAt: workspaces.updatedAt,
    goalCount: sql<number>`COUNT(DISTINCT ${goals.id})::integer`.as('goalCount'),
    taskCount: sql<number>`COUNT(${tasks.id})::integer`.as('taskCount'),
    totalProgress: sql<number>`
      (CASE
        WHEN SUM(${tasks.timeBudget}) = 0 THEN 0
        ELSE
          (
            SUM(
              CASE
                WHEN ${tasks.status} = 'done' THEN ${tasks.timeBudget}
                ELSE COALESCE(${dailyTrackedTimeSubquery.total_duration_minutes}, 0)
              END
            ) * 100.0 / SUM(${tasks.timeBudget})
          )
      END)::numeric
    `.as('totalProgress'),
    hasRunningTask: sql<boolean>`COALESCE(${runningTasksSubquery.hasRunningTask}, FALSE)`.as('hasRunningTask'),
    isShared: sql<boolean>`TRUE`.as('isShared'),
  })
  .from(workspaces)
  .innerJoin(workspaceShares, and(eq(workspaceShares.workspaceId, workspaces.id), eq(workspaceShares.sharedWithUserId, userId)))
  .leftJoin(goals, and(eq(goals.workspaceId, workspaces.id), ne(goals.status, "reached")))
  .leftJoin(tasks, and(eq(tasks.goalId, goals.id), ne(tasks.status, "done")))
  .leftJoin(dailyTrackedTimeSubquery, eq(tasks.id, dailyTrackedTimeSubquery.taskId))
  .leftJoin(runningTasksSubquery, eq(workspaces.id, runningTasksSubquery.workspaceId))
  .groupBy(workspaces.id, workspaces.name, workspaces.description, workspaces.groupName, workspaces.createdAt, workspaces.updatedAt, workspaces.userId, runningTasksSubquery.hasRunningTask);

  // Combine owned and shared workspaces
  const allWorkspaces = [...ownedWorkspaces, ...sharedWorkspaces];

  const formattedWorkspaces = allWorkspaces.map(workspace => ({
    ...workspace,
    totalProgress: workspace.totalProgress != null ? parseFloat(workspace.totalProgress.toString()) : 0,
    hasRunningTask: workspace.hasRunningTask || false, // Ensure it's always a boolean
    isShared: workspace.isShared || false // Ensure it's always a boolean
  }));

  res.status(200).json(formattedWorkspaces);
});

export const getWorkspaceById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const workspace = await db.select().from(workspaces).where(eq(workspaces.id, id));
  if (workspace.length === 0) {
    return res.status(404).json({ message: 'Workspace not found' });
  }
  res.status(200).json(workspace[0]);
});

export const updateWorkspace = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateWorkspaceSchema.parse(req.body);
  const updatedWorkspace = await db.update(workspaces).set(validatedData).where(eq(workspaces.id, id)).returning();
  if (updatedWorkspace.length === 0) {
    return res.status(404).json({ message: 'Workspace not found' });
  }
  res.status(200).json(updatedWorkspace[0]);
});

export const deleteWorkspace = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deletedWorkspace = await db.delete(workspaces).where(eq(workspaces.id, id)).returning();
  if (deletedWorkspace.length === 0) {
    return res.status(404).json({ message: 'Workspace not found' });
  }
  res.status(204).send(); // No content for successful deletion
});

export const getUniqueGroupNames = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  const groupNames = await db.selectDistinct({ groupName: workspaces.groupName })
    .from(workspaces)
    .where(and(eq(workspaces.userId, userId), sql`${workspaces.groupName} IS NOT NULL`));

  res.status(200).json(groupNames.map((g: { groupName: string | null }) => g.groupName));
});
export const getWorkspaceGroups = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Not authorized, user ID missing' });
  const groups = await db.select().from(workspaceGroups).where(eq(workspaceGroups.userId, userId)).orderBy(workspaceGroups.name);
  res.status(200).json(groups);
});

export const createWorkspaceGroup = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Not authorized, user ID missing' });
  const name = z.string().trim().min(1).max(256).parse(req.body.name);
  const existing = await db.select({ id: workspaceGroups.id }).from(workspaceGroups).where(and(eq(workspaceGroups.userId, userId), eq(workspaceGroups.name, name)));
  if (existing.length > 0) return res.status(409).json({ message: 'Group name already exists' });
  const [group] = await db.insert(workspaceGroups).values({ userId, name }).returning();
  res.status(201).json(group);
});

export const renameWorkspaceGroup = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Not authorized, user ID missing' });
  const name = z.string().trim().min(1).max(256).parse(req.body.name);
  const [group] = await db.select().from(workspaceGroups).where(and(eq(workspaceGroups.id, req.params.id), eq(workspaceGroups.userId, userId)));
  if (!group) return res.status(404).json({ message: 'Group not found' });
  const duplicate = await db.select({ id: workspaceGroups.id }).from(workspaceGroups).where(and(eq(workspaceGroups.userId, userId), eq(workspaceGroups.name, name), ne(workspaceGroups.id, group.id)));
  if (duplicate.length > 0) return res.status(409).json({ message: 'Group name already exists' });
  if (driver === 'sqlite') {
    db.transaction((tx: TransactionClient) => {
      tx.update(workspaces).set({ groupName: name, updatedAt: new Date() }).where(and(eq(workspaces.userId, userId), eq(workspaces.groupName, group.name))).run();
      tx.update(workspaceGroups).set({ name, updatedAt: new Date() }).where(eq(workspaceGroups.id, group.id)).run();
    });
    return res.status(200).json({ ...group, name });
  }
  const updated = await db.transaction(async (tx: TransactionClient) => {
    await tx.update(workspaces).set({ groupName: name, updatedAt: new Date() }).where(and(eq(workspaces.userId, userId), eq(workspaces.groupName, group.name)));
    return tx.update(workspaceGroups).set({ name, updatedAt: new Date() }).where(eq(workspaceGroups.id, group.id)).returning();
  });
  res.status(200).json(updated[0]);
});

export const deleteWorkspaceGroup = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Not authorized, user ID missing' });
  const [group] = await db.select().from(workspaceGroups).where(and(eq(workspaceGroups.id, req.params.id), eq(workspaceGroups.userId, userId)));
  if (!group) return res.status(404).json({ message: 'Group not found' });
  if (driver === 'sqlite') {
    db.transaction((tx: TransactionClient) => {
      tx.update(workspaces).set({ groupName: null, updatedAt: new Date() }).where(and(eq(workspaces.userId, userId), eq(workspaces.groupName, group.name))).run();
      tx.delete(workspaceGroups).where(eq(workspaceGroups.id, group.id)).run();
    });
    return res.status(204).send();
  }
  await db.transaction(async (tx: TransactionClient) => {
    await tx.update(workspaces).set({ groupName: null, updatedAt: new Date() }).where(and(eq(workspaces.userId, userId), eq(workspaces.groupName, group.name)));
    await tx.delete(workspaceGroups).where(eq(workspaceGroups.id, group.id));
  });
  res.status(204).send();
});
