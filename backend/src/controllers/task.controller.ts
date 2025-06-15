import { Request, Response } from 'express';
import { db } from '../db';
import { tasks, taskTrackingRecords, users, goals } from '../db/schema'; // Import goals
import { eq, and, sql } from 'drizzle-orm';
import { createTaskSchema, updateTaskSchema, startTaskTrackingSchema, stopTaskTrackingSchema, createManualTaskRecordSchema } from '../validation/task.validation';
import { catchAsync } from '../utils/catchAsync';
import { DateTime } from 'luxon';

export const createTask = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createTaskSchema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const newTask = await db.insert(tasks).values({ ...validatedData, userId }).returning();
  res.status(201).json(newTask[0]);
});

export const getTasks = catchAsync(async (req: Request, res: Response) => {
  const { goalId } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  const joinCondition = and(
    eq(taskTrackingRecords.taskId, tasks.id),
    eq(taskTrackingRecords.userId, userId),
    sql`${taskTrackingRecords.endTime} IS NULL`
  );

  const mainQueryConditions = [
    eq(tasks.userId, userId)
  ];
  if (goalId) {
    mainQueryConditions.push(eq(tasks.goalId, goalId as string));
  }

  const result = await db.select({
    task: tasks,
    activeTracking: taskTrackingRecords,
  })
  .from(tasks)
  .leftJoin(taskTrackingRecords, joinCondition)
  .where(and(...mainQueryConditions))
  .orderBy(
    sql`CASE WHEN ${tasks.status} = 'done' THEN 1 ELSE 0 END`,
    tasks.name
  );

  const tasksWithTracking = result.map(row => ({
    ...row.task,
    activeTracking: row.activeTracking || null,
  }));

  res.status(200).json(tasksWithTracking);
});

export const getTaskById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const task = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  if (task.length === 0) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.status(200).json(task[0]);
});

export const updateTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const validatedData = updateTaskSchema.parse(req.body);
  const updatedTask = await db.update(tasks).set(validatedData).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();
  if (updatedTask.length === 0) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.status(200).json(updatedTask[0]);
});

export const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }
  const deletedTask = await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();
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

  const totalTimeBudgetMinutes = tasksForGoal.reduce((sum, task) => sum + task.timeBudget, 0);
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

  // Fetch user's timezone
  const user = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
  const userTimezone = user[0]?.timezone || 'UTC'; // Default to UTC if not found

  const actualStartTime = validatedData.startTime || DateTime.now().setZone(userTimezone).toJSDate();

  // Check if any other task is currently active for this user
  const activeTaskRecord = await db.select({
    taskId: taskTrackingRecords.taskId,
    taskName: tasks.name,
  })
    .from(taskTrackingRecords)
    .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
    .where(and(
      eq(taskTrackingRecords.userId, userId),
      sql`${taskTrackingRecords.endTime} IS NULL`
    ));

  if (activeTaskRecord.length > 0) {
    return res.status(400).json({
      message: 'Another task is already active. Please stop it before starting a new one.',
      activeTask: activeTaskRecord[0],
    });
  }

  // Stop any existing active tracking records for this task (should not happen if above check passes, but as a safety)
  await db.update(taskTrackingRecords)
    .set({ endTime: new Date(), duration: sql`EXTRACT(EPOCH FROM (NOW() - ${taskTrackingRecords.startTime}))` }) // Calculate duration
    .where(and(eq(taskTrackingRecords.taskId, validatedData.taskId), sql`${taskTrackingRecords.endTime} IS NULL`));

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

  const startTime = recordToStop[0].startTime;
  const actualStopTime = validatedData.stopTime || new Date();

  if (actualStopTime < startTime) {
    return res.status(400).json({ message: 'Stop time cannot be before start time' });
  }

  const duration = Math.floor((actualStopTime.getTime() - startTime.getTime()) / 1000); // Duration in seconds

  const updatedRecord = await db.update(taskTrackingRecords)
    .set({ endTime: actualStopTime, duration, updatedAt: new Date() })
    .where(eq(taskTrackingRecords.id, validatedData.trackingId))
    .returning();

  // As a safety measure, stop any other active records for the same task
  await db.update(taskTrackingRecords)
    .set({ endTime: new Date(), duration: sql`EXTRACT(EPOCH FROM (NOW() - ${taskTrackingRecords.startTime}))` })
    .where(and(
      eq(taskTrackingRecords.taskId, recordToStop[0].taskId),
      sql`${taskTrackingRecords.endTime} IS NULL`,
      sql`${taskTrackingRecords.id} != ${validatedData.trackingId}` // Exclude the current record
    ));

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

  // Insert the new manual tracking record
  // The duration is calculated on the frontend and sent here.
  const newManualRecord = await db.insert(taskTrackingRecords).values({
    taskId: validatedData.taskId,
    userId: validatedData.userId,
    startTime: validatedData.startTime,
    endTime: validatedData.stopTime, // Use stopTime from validated data
    duration: validatedData.duration, // Use duration from validated data
  }).returning();

  res.status(201).json({ message: 'Manual task record created', record: newManualRecord[0] });
});

export const getTaskTrackingSummary = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { period, workspaceId, goalId } = req.query;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Fetch user's timezone
  const user = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
  const userTimezone = user[0]?.timezone || 'UTC'; // Default to UTC if not found

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

  const conditions = [eq(taskTrackingRecords.userId, userId)];

  if (goalId) {
    conditions.push(eq(tasks.goalId, goalId as string));
  }

  if (periodCondition) {
    conditions.push(periodCondition);
  }

  let queryBuilder: any = db.select({ // Explicitly type as any to resolve type issues
    taskName: tasks.name,
    totalDurationSeconds: sql<number>`sum(${taskTrackingRecords.duration})::integer`,
    ...(period !== 'total' && { period: periodGroupByColumn }),
  })
    .from(taskTrackingRecords)
    .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id));

  if (workspaceId) {
    queryBuilder = queryBuilder.innerJoin(goals, eq(tasks.goalId, goals.id));
    conditions.push(eq(goals.workspaceId, workspaceId as string));
  }

  // Apply where clause
  queryBuilder = queryBuilder.where(and(...conditions));

  // Construct final groupBy and orderBy arrays
  const finalGroupByColumns = [tasks.name];
  if (periodGroupByColumn) {
    finalGroupByColumns.push(periodGroupByColumn);
  }

  const finalOrderByColumns = [tasks.name];
  if (periodOrderByColumn) {
    finalOrderByColumns.push(periodOrderByColumn);
  }

  const summary = await queryBuilder
    .groupBy(...finalGroupByColumns)
    .orderBy(...finalOrderByColumns);

  res.status(200).json(summary);
});
