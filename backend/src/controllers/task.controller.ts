import { Request, Response } from 'express';
import { db } from '../db';
import { tasks, taskTrackingRecords, users } from '../db/schema';
import { eq, and, sql, sum } from 'drizzle-orm';
import { createTaskSchema, updateTaskSchema, startTaskTrackingSchema, stopTaskTrackingSchema } from '../validation/task.validation';
import { catchAsync } from '../utils/catchAsync';

export const createTask = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createTaskSchema.parse(req.body);
  const newTask = await db.insert(tasks).values(validatedData).returning();
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

  const mainQueryConditions = [];
  if (goalId) {
    mainQueryConditions.push(eq(tasks.goalId, goalId as string));
  }

  const result = await db.select({
    task: tasks,
    activeTracking: taskTrackingRecords,
  })
  .from(tasks)
  .leftJoin(taskTrackingRecords, joinCondition)
  .where(and(...mainQueryConditions));

  const tasksWithTracking = result.map(row => ({
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
  const tasksForGoal = await db.select({ timeBudget: tasks.timeBudget }).from(tasks).where(eq(tasks.goalId, goalId));

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

  // Validate input using the new schema
  const validatedData = startTaskTrackingSchema.parse({ taskId, userId });

  // Stop any existing active tracking records for this task
  await db.update(taskTrackingRecords)
    .set({ endTime: new Date(), duration: sql`EXTRACT(EPOCH FROM (NOW() - "startTime"))` }) // Calculate duration
    .where(and(eq(taskTrackingRecords.taskId, validatedData.taskId), sql`${taskTrackingRecords.endTime} IS NULL`));

  const newTaskTrackingRecord = await db.insert(taskTrackingRecords).values({
    taskId: validatedData.taskId,
    userId: validatedData.userId,
    startTime: new Date(),
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
    .set({ endTime: new Date(), duration: sql`EXTRACT(EPOCH FROM (NOW() - "startTime"))` })
    .where(and(
      eq(taskTrackingRecords.taskId, recordToStop[0].taskId),
      sql`${taskTrackingRecords.endTime} IS NULL`,
      sql`${taskTrackingRecords.id} != ${validatedData.trackingId}` // Exclude the current record
    ));

  res.status(200).json({ message: 'Task tracking stopped', record: updatedRecord[0] });
});

export const getTaskTrackingSummary = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { period } = req.query; // 'day', 'month', 'year'

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  let groupByColumn;
  let dateTruncFunction;

  switch (period) {
    case 'day':
      groupByColumn = sql`date_trunc('day', ${taskTrackingRecords.startTime})`;
      dateTruncFunction = 'day';
      break;
    case 'month':
      groupByColumn = sql`date_trunc('month', ${taskTrackingRecords.startTime})`;
      dateTruncFunction = 'month';
      break;
    case 'year':
      groupByColumn = sql`date_trunc('year', ${taskTrackingRecords.startTime})`;
      dateTruncFunction = 'year';
      break;
    default:
      return res.status(400).json({ message: 'Invalid period specified. Must be "day", "month", or "year".' });
  }

  const summary = await db.select({
    taskName: tasks.name,
    totalDurationSeconds: sum(taskTrackingRecords.duration),
    period: groupByColumn,
  })
    .from(taskTrackingRecords)
    .innerJoin(tasks, eq(taskTrackingRecords.taskId, tasks.id))
    .where(eq(taskTrackingRecords.userId, userId))
    .groupBy(tasks.name, groupByColumn)
    .orderBy(groupByColumn, tasks.name);

  res.status(200).json(summary);
});
