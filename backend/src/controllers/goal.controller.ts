import { Request, Response } from 'express';
import { db, driver } from '../db';
import { goals, tasks, taskTrackingRecords, workspaceShares, workspaces, permissions } from '../db/schema';
import { eq, and, ne, sql, inArray, isNull } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { createGoalSchema, updateGoalSchema } from '../validation/goal.validation';
import { catchAsync } from '../utils/catchAsync';

export const createGoal = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createGoalSchema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Only the workspace owner or an accepted share with edit permission may add goals
  const workspaceRow = await db.select({ userId: workspaces.userId }).from(workspaces).where(eq(workspaces.id, validatedData.workspaceId));
  if (workspaceRow.length === 0) {
    return res.status(404).json({ message: 'Workspace not found' });
  }
  if (workspaceRow[0].userId !== userId) {
    const share = await db.select({ id: workspaceShares.id }).from(workspaceShares).where(and(
      eq(workspaceShares.workspaceId, validatedData.workspaceId),
      eq(workspaceShares.sharedWithUserId, userId),
      eq(workspaceShares.status, 'accepted'),
    ));
    if (share.length === 0) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const perm = await db.select().from(permissions).where(and(
      eq(permissions.userId, userId),
      eq(permissions.resourceId, validatedData.workspaceId),
      eq(permissions.resourceType, 'workspace'),
    ));
    if (perm.length === 0 || !perm[0].canEdit) {
      return res.status(403).json({ message: 'You do not have permission to add goals to this workspace' });
    }
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
  if (driver === 'sqlite') {
    const conditions = workspaceId
      ? and(eq(goals.userId, userId), eq(goals.workspaceId, workspaceId as string))
      : eq(goals.userId, userId);
    const ownedGoals = await db.select().from(goals).where(conditions);
    const goalIds = ownedGoals.map((goal: typeof goals.$inferSelect) => goal.id);

    // Single grouped query instead of one query per goal (N+1)
    type GoalStats = {
      goalId: string;
      count: number;
      sumTimeBudget: number;
      doneWeighted: number;
      trackedMinutes: number;
    };
    let taskRows: GoalStats[] = [];
    if (goalIds.length > 0) {
      taskRows = await db.select({
        goalId: tasks.goalId,
        count: sql<number>`COUNT(*)`,
        sumTimeBudget: sql<number>`COALESCE(SUM(${tasks.timeBudget}), 0)`,
        doneWeighted: sql<number>`COALESCE(SUM(CASE WHEN ${tasks.status} = 'done' THEN ${tasks.timeBudget} ELSE 0 END), 0)`,
        trackedMinutes: sql<number>`COALESCE(SUM(${taskTrackingRecords.duration}) / 60.0, 0)`,
      })
        .from(tasks)
        .leftJoin(taskTrackingRecords, and(
          eq(taskTrackingRecords.taskId, tasks.id),
          // Daily tracked minutes only (mirrors date_trunc('day', ...) filter)
          sql`${taskTrackingRecords.startTime} >= ${DateTime.now().startOf('day').toUTC().toISO()}`,
        ))
        .where(inArray(tasks.goalId, goalIds))
        .groupBy(tasks.goalId);
    }
    const statsPerGoal = new Map<string, GoalStats>(taskRows.map((row) => [row.goalId, row]));

    // Goals with an open tracking record on any of their tasks
    const runningRows: Array<{ goalId: string }> = goalIds.length > 0
      ? await db.select({ goalId: tasks.goalId })
          .from(taskTrackingRecords)
          .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
          .where(and(
            inArray(tasks.goalId, goalIds),
            eq(taskTrackingRecords.userId, userId),
            isNull(taskTrackingRecords.endTime),
          ))
          .groupBy(tasks.goalId)
      : [];
    const runningGoalIds = new Set(runningRows.map((row) => row.goalId));

    const formatted = ownedGoals.map((goal: typeof goals.$inferSelect) => {
      const stats = statsPerGoal.get(goal.id);
      const sumTimeBudget = Number(stats?.sumTimeBudget ?? 0);
      let totalProgress = 0;
      if (sumTimeBudget > 0) {
        // done tasks count their full budget; open tasks count today's tracked minutes
        const weighted = Number(stats?.doneWeighted ?? 0) + Number(stats?.trackedMinutes ?? 0);
        totalProgress = Math.min(100, Math.max(0, (weighted * 100.0) / sumTimeBudget));
      }
      return {
        ...goal,
        taskCount: Number(stats?.count ?? 0),
        totalProgress,
        hasRunningTask: runningGoalIds.has(goal.id),
      };
    });
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
    goalId: tasks.goalId,
    hasRunningTask: sql<boolean>`TRUE`.as('hasRunningTask'),
  })
  .from(taskTrackingRecords)
  .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
  .where(and(eq(taskTrackingRecords.userId, userId), sql`${taskTrackingRecords.endTime} IS NULL`))
  .groupBy(tasks.goalId)
  .as('running_tasks');

  // Fetch owned goals
  let ownedConditions = [eq(goals.userId, userId)];
  if (workspaceId) {
    ownedConditions.push(eq(goals.workspaceId, workspaceId as string));
  }

  const ownedGoals = await db.select({
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
    isShared: sql<boolean>`FALSE`.as('isShared'),
  })
  .from(goals)
  .leftJoin(tasks, and(eq(tasks.goalId, goals.id), eq(tasks.userId, userId), ne(tasks.status, "done")))
  .leftJoin(dailyTrackedTimeSubquery, eq(tasks.id, dailyTrackedTimeSubquery.taskId))
  .leftJoin(runningTasksSubquery, eq(goals.id, runningTasksSubquery.goalId))
  .where(and(...ownedConditions))
  .groupBy(goals.id, goals.name, goals.description, goals.deadline, goals.status, goals.createdAt, goals.updatedAt, goals.userId, goals.workspaceId, runningTasksSubquery.hasRunningTask);

  // Fetch shared goals through shared workspaces
  let sharedConditions = [];
  if (workspaceId) {
    sharedConditions.push(eq(goals.workspaceId, workspaceId as string));
  }

  const sharedGoals = await db.select({
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
    isShared: sql<boolean>`TRUE`.as('isShared'),
  })
  .from(goals)
  .innerJoin(workspaceShares, and(eq(workspaceShares.workspaceId, goals.workspaceId), eq(workspaceShares.sharedWithUserId, userId)))
  .leftJoin(tasks, and(eq(tasks.goalId, goals.id), ne(tasks.status, "done")))
  .leftJoin(dailyTrackedTimeSubquery, eq(tasks.id, dailyTrackedTimeSubquery.taskId))
  .leftJoin(runningTasksSubquery, eq(goals.id, runningTasksSubquery.goalId))
  .where(and(...sharedConditions))
  .groupBy(goals.id, goals.name, goals.description, goals.deadline, goals.status, goals.createdAt, goals.updatedAt, goals.userId, goals.workspaceId, runningTasksSubquery.hasRunningTask);

  // Combine owned and shared goals
  const allGoals = [...ownedGoals, ...sharedGoals];

  const formattedGoals = allGoals.map(goal => ({
    ...goal,
    totalProgress: goal.totalProgress != null ? parseFloat(goal.totalProgress.toString()) : 0,
    hasRunningTask: goal.hasRunningTask || false, // Ensure it's always a boolean
    isShared: goal.isShared || false // Ensure it's always a boolean
  }));

  res.status(200).json(formattedGoals);
});

export const getGoalById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const goal = await db.select().from(goals).where(eq(goals.id, id));
  if (goal.length === 0) {
    return res.status(404).json({ message: 'Goal not found' });
  }
  res.status(200).json(goal[0]);
});

export const updateGoal = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateGoalSchema.parse(req.body);
  const updatedGoal = await db.update(goals).set(validatedData).where(eq(goals.id, id)).returning();
  if (updatedGoal.length === 0) {
    return res.status(404).json({ message: 'Goal not found' });
  }
  res.status(200).json(updatedGoal[0]);
});

export const deleteGoal = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deletedGoal = await db.delete(goals).where(eq(goals.id, id)).returning();
  if (deletedGoal.length === 0) {
    return res.status(404).json({ message: 'Goal not found' });
  }
  res.status(204).send(); // No content for successful deletion
});
