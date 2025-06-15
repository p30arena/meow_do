import { Request, Response } from 'express';
import { db } from '../db';
import { goals, tasks, taskTrackingRecords } from '../db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { createGoalSchema, updateGoalSchema } from '../validation/goal.validation';
import { catchAsync } from '../utils/catchAsync';

export const createGoal = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createGoalSchema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const newGoal = await db.insert(goals).values({ ...validatedData, userId }).returning();
  res.status(201).json(newGoal[0]);
});

export const getGoals = catchAsync(async (req: Request, res: Response) => {
  const { workspaceId } = req.query;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  let conditions = [eq(goals.userId, userId)];
  if (workspaceId) {
    conditions.push(eq(goals.workspaceId, workspaceId as string));
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
    goalId: tasks.goalId,
    hasRunningTask: sql<boolean>`TRUE`.as('hasRunningTask'),
  })
  .from(taskTrackingRecords)
  .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
  .where(and(eq(taskTrackingRecords.userId, userId), sql`${taskTrackingRecords.endTime} IS NULL`))
  .groupBy(tasks.goalId)
  .as('running_tasks');

  const allGoals = await db.select({
    id: goals.id,
    userId: goals.userId,
    workspaceId: goals.workspaceId,
    name: goals.name,
    description: goals.description,
    deadline: goals.deadline,
    status: goals.status,
    createdAt: goals.createdAt,
    updatedAt: goals.updatedAt,
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
  })
  .from(goals)
  .leftJoin(tasks, and(eq(tasks.goalId, goals.id), eq(tasks.userId, userId), ne(tasks.status, "done")))
  .leftJoin(dailyTrackedTimeSubquery, eq(tasks.id, dailyTrackedTimeSubquery.taskId))
  .leftJoin(runningTasksSubquery, eq(goals.id, runningTasksSubquery.goalId))
  .where(and(...conditions))
  .groupBy(goals.id, goals.name, goals.description, goals.deadline, goals.status, goals.createdAt, goals.updatedAt, goals.userId, goals.workspaceId, runningTasksSubquery.hasRunningTask);

  const formattedGoals = allGoals.map(goal => ({
    ...goal,
    totalProgress: goal.totalProgress != null ? parseFloat(goal.totalProgress.toString()) : 0,
    hasRunningTask: goal.hasRunningTask || false, // Ensure it's always a boolean
  }));

  res.status(200).json(formattedGoals);
});

export const getGoalById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const goal = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  if (goal.length === 0) {
    return res.status(404).json({ message: 'Goal not found' });
  }
  res.status(200).json(goal[0]);
});

export const updateGoal = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const validatedData = updateGoalSchema.parse(req.body);
  const updatedGoal = await db.update(goals).set(validatedData).where(and(eq(goals.id, id), eq(goals.userId, userId))).returning();
  if (updatedGoal.length === 0) {
    return res.status(404).json({ message: 'Goal not found' });
  }
  res.status(200).json(updatedGoal[0]);
});

export const deleteGoal = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const deletedGoal = await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId))).returning();
  if (deletedGoal.length === 0) {
    return res.status(404).json({ message: 'Goal not found' });
  }
  res.status(204).send(); // No content for successful deletion
});
