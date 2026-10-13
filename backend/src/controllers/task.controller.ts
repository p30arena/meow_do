import { Request, Response } from 'express';
import { db, driver } from '../db';
import { tasks, taskTrackingRecords, users, goals, workspaceShares, permissions } from '../db/schema';
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';
import { createTaskSchema, updateTaskSchema, startTaskTrackingSchema, stopTaskTrackingSchema, createManualTaskRecordSchema } from '../validation/task.validation';
import { catchAsync } from '../utils/catchAsync';
import { forDriver } from '../utils/driverPayload';
import { DateTime } from 'luxon';

// Defense in depth for values that end up inside sql.raw() fragments below.
// Timezones are validated on write (updateUserTimezoneSchema); this guards
// against legacy rows that predate validation. Only IANA-safe characters
// survive; anything else falls back to UTC.
const safeTimezone = (tz: string | undefined | null): string => {
  const candidate = (tz ?? '').trim();
  return /^[A-Za-z0-9_+\-/]{1,64}$/.test(candidate) && DateTime.now().setZone(candidate).isValid ? candidate : 'UTC';
};

export const createTask = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createTaskSchema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  const goalRow = await db.select({ userId: goals.userId, workspaceId: goals.workspaceId }).from(goals).where(eq(goals.id, validatedData.goalId));
  if (goalRow.length === 0) {
    return res.status(404).json({ message: 'Goal not found' });
  }
  const goal = goalRow[0];
  if (goal.userId !== userId) {
    // Shared-workspace path: require an accepted share plus goal-level addTask
    // or workspace-level edit permission, mirroring checkPermission semantics.
    const share = await db.select({ id: workspaceShares.id }).from(workspaceShares).where(and(
      eq(workspaceShares.workspaceId, goal.workspaceId),
      eq(workspaceShares.sharedWithUserId, userId),
      eq(workspaceShares.status, 'accepted'),
    ));
    if (share.length === 0) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    const goalPerm = await db.select().from(permissions).where(and(
      eq(permissions.userId, userId),
      eq(permissions.resourceId, validatedData.goalId),
      eq(permissions.resourceType, 'goal'),
    ));
    const wsPerm = await db.select().from(permissions).where(and(
      eq(permissions.userId, userId),
      eq(permissions.resourceId, goal.workspaceId),
      eq(permissions.resourceType, 'workspace'),
    ));
    const allowed = (goalPerm.length > 0 && goalPerm[0].canAddTask) || (wsPerm.length > 0 && wsPerm[0].canEdit);
    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to add tasks to this goal' });
    }
  }

  const payload = forDriver({
    ...validatedData,
    // zod's .default(false).optional() omits the key when the client doesn't
    // send it; drizzle would then bind the pg-schema boolean default (JS false),
    // which crashes better-sqlite3. Always materialize it.
    isRecurring: validatedData.isRecurring ?? false,
    position: validatedData.position ?? 0,
    userId,
    deadline: validatedData.deadline?.toISOString(),
  });
  const newTask = await db.insert(tasks).values(payload).returning();
  res.status(201).json(newTask[0]);
});

export const getTasks = catchAsync(async (req: Request, res: Response) => {
  const { goalId } = req.query;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  if (driver === 'sqlite') {
    // Owned tasks
    const ownedConditions = [eq(tasks.userId, userId)];
    if (goalId) {
      ownedConditions.push(eq(tasks.goalId, goalId as string));
    }
    const ownedTasks = await db.select().from(tasks).where(and(...ownedConditions)).orderBy(
      tasks.position,
      sql`CASE
        WHEN ${tasks.status} = 'started' THEN 0
        WHEN ${tasks.status} = 'pending' THEN 1
        WHEN ${tasks.status} = 'failed' THEN 2
        WHEN ${tasks.status} = 'done' THEN 3
        ELSE 4
      END`,
      sql`${tasks.priority} DESC`,
      tasks.name,
    );

    // Shared tasks through accepted workspace shares (parity with the Postgres path)
    const sharedTasks = await db.select({ task: tasks })
      .from(tasks)
      .innerJoin(goals, eq(tasks.goalId, goals.id))
      .innerJoin(workspaceShares, and(
        eq(workspaceShares.workspaceId, goals.workspaceId),
        eq(workspaceShares.sharedWithUserId, userId),
        eq(workspaceShares.status, 'accepted'),
      ))
      .where(goalId ? eq(tasks.goalId, goalId as string) : undefined)
      .orderBy(
        sql`${tasks.position}`,
        sql`CASE
          WHEN ${tasks.status} = 'started' THEN 0
          WHEN ${tasks.status} = 'pending' THEN 1
          WHEN ${tasks.status} = 'failed' THEN 2
          WHEN ${tasks.status} = 'done' THEN 3
          ELSE 4
        END`,
        sql`${tasks.priority} DESC`,
        tasks.name,
      );

    const allTasks: Array<typeof tasks.$inferSelect> = [
      ...ownedTasks,
      ...sharedTasks.map((row: { task: typeof tasks.$inferSelect }) => row.task),
    ];

    // Single query for all open tracking records instead of one per task (N+1)
    const openRecords = allTasks.length > 0
      ? await db.select().from(taskTrackingRecords).where(and(
          isNull(taskTrackingRecords.endTime),
          inArray(taskTrackingRecords.taskId, allTasks.map((task: typeof tasks.$inferSelect) => task.id)),
        ))
      : [];
    const activePerTask = new Map<string, (typeof taskTrackingRecords.$inferSelect)>();
    for (const record of openRecords) {
      if (!activePerTask.has(record.taskId)) {
        activePerTask.set(record.taskId, record);
      }
    }
    const tasksWithTracking = allTasks.map((task: typeof tasks.$inferSelect) => ({
      ...task,
      activeTracking: activePerTask.get(task.id) ?? null,
    }));
    return res.status(200).json(tasksWithTracking);
  }

  const joinCondition = and(
    eq(taskTrackingRecords.taskId, tasks.id),
    eq(taskTrackingRecords.userId, userId),
    isNull(taskTrackingRecords.endTime)
  );

  // Fetch owned tasks
  const ownedConditions = [eq(tasks.userId, userId)];
  if (goalId) {
    ownedConditions.push(eq(tasks.goalId, goalId as string));
  }

  const ownedResult = await db.select({
    task: tasks,
    activeTracking: taskTrackingRecords,
  })
  .from(tasks)
  .leftJoin(taskTrackingRecords, joinCondition)
  .where(and(...ownedConditions))
  .orderBy(
    tasks.position,
    sql`CASE
      WHEN ${tasks.status} = 'started' THEN 0
      WHEN ${tasks.status} = 'pending' THEN 1
      WHEN ${tasks.status} = 'failed' THEN 2
      WHEN ${tasks.status} = 'done' THEN 3
      ELSE 4
    END`,
    sql`${tasks.priority} DESC`,
    tasks.name
  );

  // Fetch shared tasks through shared workspaces
  const sharedConditions = [];
  if (goalId) {
    sharedConditions.push(eq(tasks.goalId, goalId as string));
  }

  const sharedResult = await db.select({
    task: tasks,
    activeTracking: taskTrackingRecords,
  })
  .from(tasks)
  .innerJoin(goals, eq(tasks.goalId, goals.id))
  .innerJoin(workspaceShares, and(eq(workspaceShares.workspaceId, goals.workspaceId), eq(workspaceShares.sharedWithUserId, userId)))
  .leftJoin(taskTrackingRecords, joinCondition)
  .where(and(...sharedConditions))
  .orderBy(
    tasks.position,
    sql`CASE
      WHEN ${tasks.status} = 'started' THEN 0
      WHEN ${tasks.status} = 'pending' THEN 1
      WHEN ${tasks.status} = 'failed' THEN 2
      WHEN ${tasks.status} = 'done' THEN 3
      ELSE 4
    END`,
    sql`${tasks.priority} DESC`,
    tasks.name
  );

  // Combine owned and shared tasks
  const combinedResult = [...ownedResult, ...sharedResult];

  const tasksWithTracking = combinedResult.map(row => ({
    ...row.task,
    activeTracking: row.activeTracking || null,
  }));

  res.status(200).json(tasksWithTracking);
});

export const getTaskById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const task = await db.select().from(tasks).where(eq(tasks.id, id));
  if (task.length === 0) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.status(200).json(task[0]);
});

export const updateTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateTaskSchema.parse(req.body);
  const updatedTask = await db.update(tasks).set(validatedData).where(eq(tasks.id, id)).returning();
  if (updatedTask.length === 0) {
    return res.status(404).json({ message: 'Task not found' });
  }
  const task = updatedTask[0] as typeof tasks.$inferSelect;
  // Phase D hooks (best-effort, never fail the update): rules-lite + webhooks.
  if (validatedData.status === 'done') {
    const goalRows = await db.select({ workspaceId: goals.workspaceId }).from(goals).where(eq(goals.id, task.goalId));
    const workspaceId = goalRows[0]?.workspaceId;
    const { evaluateTaskDoneRules, fireWebhooks } = await import('./automation.controller');
    await evaluateTaskDoneRules(task.goalId);
    if (workspaceId) {
      void fireWebhooks(workspaceId, 'task.done', { taskId: task.id, goalId: task.goalId, status: task.status });
    }
  } else if (validatedData.status !== undefined || validatedData.position !== undefined) {
    const goalRows = await db.select({ workspaceId: goals.workspaceId }).from(goals).where(eq(goals.id, task.goalId));
    const workspaceId = goalRows[0]?.workspaceId;
    if (workspaceId) {
      const { fireWebhooks } = await import('./automation.controller');
      void fireWebhooks(workspaceId, 'task.updated', { taskId: task.id, goalId: task.goalId, status: task.status });
    }
  }
  res.status(200).json(updatedTask[0]);
});

export const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deletedTask = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  if (deletedTask.length === 0) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.status(204).send(); // No content for successful deletion
});

export const getDailyTimeBudgetForGoal = catchAsync(async (req: Request, res: Response) => {
  const { goalId } = req.params; // Assuming goalId comes from params for a specific goal's daily budget
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  // Ensure the goal belongs to the user, and then filter tasks by that goal and user
  const tasksForGoal = await db.select({ timeBudget: tasks.timeBudget })
    .from(tasks)
    .innerJoin(goals, and(eq(tasks.goalId, goals.id), eq(goals.userId, userId)))
    .where(eq(tasks.goalId, goalId));

  const totalTimeBudgetMinutes = tasksForGoal.reduce((sum: number, task: { timeBudget: number }) => sum + task.timeBudget, 0);
  const totalTimeBudgetHours = totalTimeBudgetMinutes / 60;

  const warning = totalTimeBudgetHours > 24 ? 'Warning: Total time budget exceeds 24 hours for this goal.' : undefined;

  res.status(200).json({
    goalId,
    totalTimeBudgetMinutes,
    totalTimeBudgetHours,
    warning,
  });
});

export const startTask = catchAsync(async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Validate input using the new schema, combining params and body
  const validatedData = startTaskTrackingSchema.parse({ ...req.body, taskId, userId });

  const user = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
  const userTimezone = safeTimezone(user[0]?.timezone); // Default to UTC if not found

  const actualStartTime = validatedData.startTime || DateTime.now().setZone(userTimezone).toJSDate();

  // Check if any other task is currently active for this user (both drivers)
  const activeTaskRecord = await db.select({
    taskId: taskTrackingRecords.taskId,
    taskName: tasks.name,
  })
    .from(taskTrackingRecords)
    .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
    .where(and(
      eq(taskTrackingRecords.userId, userId),
      isNull(taskTrackingRecords.endTime),
    ));

  if (activeTaskRecord.length > 0) {
    return res.status(400).json({
      message: 'Another task is already active. Please stop it before starting a new one.',
      activeTask: activeTaskRecord[0],
    });
  }

  // Close stale open records for this task (Postgres can compute the duration
  // server-side; SQLite mode leaves them to be closed via stopTask).
  if (driver === 'postgres') {
    await db.update(taskTrackingRecords)
      .set({ endTime: new Date(), duration: sql`EXTRACT(EPOCH FROM (NOW() - ${taskTrackingRecords.startTime}))` })
      .where(and(eq(taskTrackingRecords.taskId, validatedData.taskId), eq(taskTrackingRecords.userId, validatedData.userId), sql`${taskTrackingRecords.endTime} IS NULL`));
  }

  const newTaskTrackingRecord = await db.insert(taskTrackingRecords).values({
    taskId: validatedData.taskId,
    userId: validatedData.userId,
    startTime: actualStartTime,
  }).returning();

  res.status(201).json({ message: 'Task tracking started', record: newTaskTrackingRecord[0] });
});

export const stopTask = catchAsync(async (req: Request, res: Response) => {
  const { id: trackingId } = req.params; // Changed from taskId to trackingId
  const userId = req.user?.id;
  const { stopTime } = req.body; // Get stopTime from body

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Validate input using the new schema
  const validatedData = stopTaskTrackingSchema.parse({ trackingId, stopTime });

  // Find the specific tracking record to stop
  const recordToStop = await db.select()
    .from(taskTrackingRecords)
    .where(and(eq(taskTrackingRecords.id, validatedData.trackingId), eq(taskTrackingRecords.userId, userId)));

  if (recordToStop.length === 0) {
    return res.status(404).json({ message: 'Tracking record not found' });
  }
  if (recordToStop[0].endTime !== null) {
    return res.status(400).json({ message: 'Task tracking record is already stopped' });
  }
  const startTime = recordToStop[0].startTime instanceof Date
    ? recordToStop[0].startTime
    : new Date(String(recordToStop[0].startTime));
  const actualStopTime = validatedData.stopTime || new Date();

  if (actualStopTime < startTime) {
    return res.status(400).json({ message: 'Stop time cannot be before start time' });
  }

  const duration = Math.floor((actualStopTime.getTime() - startTime.getTime()) / 1000);
  const updatedRecord = await db.update(taskTrackingRecords)
    .set({ endTime: actualStopTime, duration, updatedAt: new Date() })
    .where(eq(taskTrackingRecords.id, validatedData.trackingId))
    .returning();

  if (driver === 'postgres') {
    await db.update(taskTrackingRecords)
      .set({ endTime: new Date(), duration: sql`EXTRACT(EPOCH FROM (NOW() - ${taskTrackingRecords.startTime}))` })
      .where(and(
        eq(taskTrackingRecords.taskId, recordToStop[0].taskId),
        eq(taskTrackingRecords.userId, userId),
        sql`${taskTrackingRecords.endTime} IS NULL`,
        sql`${taskTrackingRecords.id} != ${validatedData.trackingId}`,
      ));
  }

  res.status(200).json({ message: 'Task tracking stopped', record: updatedRecord[0] });
});

export const createManualTaskRecord = catchAsync(async (req: Request, res: Response) => {
  const { taskId } = req.params; // Get taskId from params
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Validate input using the new schema, combining params and body
  const validatedData = createManualTaskRecordSchema.parse({ ...req.body, taskId, userId });

  // Only the task owner or an accepted share with submit permission may add records
  const goalRow = await db.select({ userId: goals.userId, workspaceId: goals.workspaceId }).from(goals)
    .innerJoin(tasks, eq(tasks.goalId, goals.id))
    .where(eq(tasks.id, validatedData.taskId));
  if (goalRow.length === 0) {
    return res.status(404).json({ message: 'Task not found' });
  }
  const goal = goalRow[0];
  if (goal.userId !== userId) {
    const share = await db.select({ id: workspaceShares.id }).from(workspaceShares).where(and(
      eq(workspaceShares.workspaceId, goal.workspaceId),
      eq(workspaceShares.sharedWithUserId, userId),
      eq(workspaceShares.status, 'accepted'),
    ));
    if (share.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const taskPerm = await db.select().from(permissions).where(and(
      eq(permissions.userId, userId),
      eq(permissions.resourceId, validatedData.taskId),
      eq(permissions.resourceType, 'task'),
    ));
    const wsPerm = await db.select().from(permissions).where(and(
      eq(permissions.userId, userId),
      eq(permissions.resourceId, goal.workspaceId),
      eq(permissions.resourceType, 'workspace'),
    ));
    const allowed = (taskPerm.length > 0 && taskPerm[0].canSubmitRecord) || (wsPerm.length > 0 && wsPerm[0].canEdit);
    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to submit records for this task' });
    }
  }

  if (validatedData.stopTime < validatedData.startTime) {
    return res.status(400).json({ message: 'Stop time cannot be before start time' });
  }

  // Compute duration server-side instead of trusting the client-supplied value
  const duration = Math.floor((validatedData.stopTime.getTime() - validatedData.startTime.getTime()) / 1000);

  // Insert the new manual tracking record
  const newManualRecord = await db.insert(taskTrackingRecords).values({
    taskId: validatedData.taskId,
    userId: validatedData.userId,
    startTime: validatedData.startTime,
    endTime: validatedData.stopTime,
    duration,
  }).returning();

  res.status(201).json({ message: 'Manual task record created', record: newManualRecord[0] });
});

export const getTaskTrackingSummary = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { period, workspaceId, goalId } = req.query;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  if (driver === 'sqlite') {
    // Mirror the Postgres path's period filter: only 'total' has no time bound.
    const user = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
    const userTimezone = safeTimezone(user[0]?.timezone);

    let periodCondition;
    switch (period) {
      case 'day':
        // SQLite stores timestamps as ISO-8601 TEXT; compare against local midnight.
        periodCondition = sql`${taskTrackingRecords.startTime} >= ${DateTime.now().setZone(userTimezone).startOf('day').toUTC().toISO()}`;
        break;
      case 'month':
        periodCondition = sql`${taskTrackingRecords.startTime} >= ${DateTime.now().setZone(userTimezone).startOf('month').toUTC().toISO()}`;
        break;
      case 'year':
        periodCondition = sql`${taskTrackingRecords.startTime} >= ${DateTime.now().setZone(userTimezone).startOf('year').toUTC().toISO()}`;
        break;
      case 'total':
        break;
      default:
        return res.status(400).json({ message: 'Invalid period specified. Must be "day", "month", "year", or "total".' });
    }

    const rows = await db.select({ taskName: tasks.name, duration: taskTrackingRecords.duration })
      .from(taskTrackingRecords)
      .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
      .where(and(
        eq(taskTrackingRecords.userId, userId),
        ...(periodCondition ? [periodCondition] : []),
        ...(goalId ? [eq(tasks.goalId, goalId as string)] : []),
      ));
    const totals = new Map<string, number>();
    for (const row of rows as Array<{ taskName: string; duration: number | null }>) {
      totals.set(row.taskName, (totals.get(row.taskName) ?? 0) + (row.duration ?? 0));
    }
    return res.status(200).json(Array.from(totals, ([taskName, totalDurationSeconds]) => ({ taskName, totalDurationSeconds })));
  }

  const user = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
  const userTimezone = safeTimezone(user[0]?.timezone);
  let periodGroupByColumn: any = null;
  let periodOrderByColumn: any = null;
  let periodCondition: any = null;

  switch (period) {
    case 'day':
      periodGroupByColumn = sql`date_trunc('day', ${taskTrackingRecords.startTime} AT TIME ZONE ${sql.raw(`'${userTimezone}'`)})`;
      periodOrderByColumn = sql`date_trunc('day', ${taskTrackingRecords.startTime} AT TIME ZONE ${sql.raw(`'${userTimezone}'`)})`;
      periodCondition = sql`date_trunc('day', ${taskTrackingRecords.startTime} AT TIME ZONE ${sql.raw(`'${userTimezone}'`)}) = date_trunc('day', NOW() AT TIME ZONE ${sql.raw(`'${userTimezone}'`)})`;
      break;
    case 'month':
      periodGroupByColumn = sql`date_trunc('month', ${taskTrackingRecords.startTime} AT TIME ZONE ${sql.raw(`'${userTimezone}'`)})`;
      periodOrderByColumn = sql`date_trunc('month', ${taskTrackingRecords.startTime} AT TIME ZONE ${sql.raw(`'${userTimezone}'`)})`;
      periodCondition = sql`date_trunc('month', ${taskTrackingRecords.startTime} AT TIME ZONE ${sql.raw(`'${userTimezone}'`)}) = date_trunc('month', NOW() AT TIME ZONE ${sql.raw(`'${userTimezone}'`)})`;
      break;
    case 'year':
      periodGroupByColumn = sql`date_trunc('year', ${taskTrackingRecords.startTime} AT TIME ZONE ${sql.raw(`'${userTimezone}'`)})`;
      periodOrderByColumn = sql`date_trunc('year', ${taskTrackingRecords.startTime} AT TIME ZONE ${sql.raw(`'${userTimezone}'`)})`;
      periodCondition = sql`date_trunc('year', ${taskTrackingRecords.startTime} AT TIME ZONE ${sql.raw(`'${userTimezone}'`)}) = date_trunc('year', NOW() AT TIME ZONE ${sql.raw(`'${userTimezone}'`)})`;
      break;
    case 'total':
      // No specific time-based grouping/ordering for 'total'
      break;
    default:
      return res.status(400).json({ message: 'Invalid period specified. Must be "day", "month", "year", or "total".' });
  }

  // Base conditions for task tracking records
  const baseConditions = [eq(taskTrackingRecords.userId, userId)];

  if (periodCondition) {
    baseConditions.push(periodCondition);
  }

  // Fetch owned task tracking summary
  const ownedConditions = [...baseConditions];
  if (goalId) {
    ownedConditions.push(eq(tasks.goalId, goalId as string));
  }
  if (workspaceId) {
    ownedConditions.push(eq(goals.workspaceId, workspaceId as string));
  }

  let ownedQueryBuilder: any = db.select({
    taskName: tasks.name,
    totalDurationSeconds: sql<number>`sum(${taskTrackingRecords.duration})::integer`,
    ...(period !== 'total' && { period: periodGroupByColumn }),
  })
    .from(taskTrackingRecords)
    .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
    .innerJoin(goals, eq(tasks.goalId, goals.id))
    .where(and(...ownedConditions));

  // Construct final groupBy and orderBy arrays for owned tasks
  const ownedGroupByColumns = [tasks.name];
  if (periodGroupByColumn) {
    ownedGroupByColumns.push(periodGroupByColumn);
  }

  const ownedOrderByColumns = [tasks.name];
  if (periodOrderByColumn) {
    ownedOrderByColumns.push(periodOrderByColumn);
  }

  const ownedSummary = await ownedQueryBuilder
    .groupBy(...ownedGroupByColumns)
    .orderBy(...ownedOrderByColumns);

  // Fetch shared task tracking summary through shared workspaces
  const sharedConditions = [...baseConditions];
  if (goalId) {
    sharedConditions.push(eq(tasks.goalId, goalId as string));
  }
  if (workspaceId) {
    sharedConditions.push(eq(goals.workspaceId, workspaceId as string));
  }

  let sharedQueryBuilder: any = db.select({
    taskName: tasks.name,
    totalDurationSeconds: sql<number>`sum(${taskTrackingRecords.duration})::integer`,
    ...(period !== 'total' && { period: periodGroupByColumn }),
  })
    .from(taskTrackingRecords)
    .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
    .innerJoin(goals, eq(tasks.goalId, goals.id))
    .innerJoin(workspaceShares, and(eq(workspaceShares.workspaceId, goals.workspaceId), eq(workspaceShares.sharedWithUserId, userId)))
    .where(and(...sharedConditions));

  // Construct final groupBy and orderBy arrays for shared tasks
  const sharedGroupByColumns = [tasks.name];
  if (periodGroupByColumn) {
    sharedGroupByColumns.push(periodGroupByColumn);
  }

  const sharedOrderByColumns = [tasks.name];
  if (periodOrderByColumn) {
    sharedOrderByColumns.push(periodOrderByColumn);
  }

  const sharedSummary = await sharedQueryBuilder
    .groupBy(...sharedGroupByColumns)
    .orderBy(...sharedOrderByColumns);

  // Combine owned and shared summaries
  const combinedSummary = [...ownedSummary, ...sharedSummary];

  // Aggregate summaries by taskName and period if necessary
  const aggregatedSummary = combinedSummary.reduce((acc, curr) => {
    const key = period !== 'total' ? `${curr.taskName}-${curr.period}` : curr.taskName;
    if (!acc[key]) {
      acc[key] = { ...curr };
    } else {
      acc[key].totalDurationSeconds += curr.totalDurationSeconds;
    }
    return acc;
  }, {});

  // Convert back to array
  const finalSummary = Object.values(aggregatedSummary);

  res.status(200).json(finalSummary);
});
