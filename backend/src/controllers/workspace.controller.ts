import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { workspaces, goals, tasks, taskTrackingRecords } from '../db/schema';
import { eq, and, count, sum, sql } from 'drizzle-orm';
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

  const dailyTrackedTimeSubquery = db.select({
    taskId: taskTrackingRecords.taskId,
    total_duration_minutes: sql<number>`SUM(${taskTrackingRecords.duration})::numeric / 60`.as('total_duration_minutes'),
  })
  .from(taskTrackingRecords)
  .where(sql`date_trunc('day', ${taskTrackingRecords.startTime}) = date_trunc('day', NOW())`)
  .groupBy(taskTrackingRecords.taskId)
  .as('daily_tracked_time');

  const allWorkspaces = await db.select({
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
  })
  .from(workspaces)
  .leftJoin(goals, and(eq(goals.workspaceId, workspaces.id), eq(goals.userId, userId)))
  .leftJoin(tasks, and(eq(tasks.goalId, goals.id), eq(tasks.userId, userId)))
  .leftJoin(dailyTrackedTimeSubquery, eq(tasks.id, dailyTrackedTimeSubquery.taskId))
  .where(eq(workspaces.userId, userId))
  .groupBy(workspaces.id, workspaces.name, workspaces.description, workspaces.groupName, workspaces.createdAt, workspaces.updatedAt, workspaces.userId);

  const formattedWorkspaces = allWorkspaces.map(workspace => ({
    ...workspace,
    totalProgress: workspace.totalProgress != null ? parseFloat(workspace.totalProgress.toString()) : 0,
  }));

  res.status(200).json(formattedWorkspaces);
});

export const getWorkspaceById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const workspace = await db.select().from(workspaces).where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)));
  if (workspace.length === 0) {
    return res.status(404).json({ message: 'Workspace not found' });
  }
  res.status(200).json(workspace[0]);
});

export const updateWorkspace = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const validatedData = updateWorkspaceSchema.parse(req.body);
  const updatedWorkspace = await db.update(workspaces).set(validatedData).where(and(eq(workspaces.id, id), eq(workspaces.userId, userId))).returning();
  if (updatedWorkspace.length === 0) {
    return res.status(404).json({ message: 'Workspace not found' });
  }
  res.status(200).json(updatedWorkspace[0]);
});

export const deleteWorkspace = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const deletedWorkspace = await db.delete(workspaces).where(and(eq(workspaces.id, id), eq(workspaces.userId, userId))).returning();
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

  res.status(200).json(groupNames.map(g => g.groupName));
});
