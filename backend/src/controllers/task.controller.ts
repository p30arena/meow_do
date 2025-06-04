import { Request, Response } from 'express';
import { db } from '../db';
import { tasks, taskTrackingRecords, users } from '../db/schema';
import { eq, and, sql, sum } from 'drizzle-orm';
import { createTaskSchema, updateTaskSchema } from '../validation/task.validation';
import { catchAsync } from '../utils/catchAsync';

export const createTask = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createTaskSchema.parse(req.body);
  const newTask = await db.insert(tasks).values(validatedData).returning();
  res.status(201).json(newTask[0]);
});

export const getTasks = catchAsync(async (req: Request, res: Response) => {
  const { goalId } = req.query;
  let allTasks;
  if (goalId) {
    allTasks = await db.select().from(tasks).where(eq(tasks.goalId, goalId as string));
  } else {
    allTasks = await db.select().from(tasks);
  }
  res.status(200).json(allTasks);
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

  // Check if there's an active tracking record for this task by this user
  const activeRecord = await db.select()
    .from(taskTrackingRecords)
    .where(and(eq(taskTrackingRecords.taskId, taskId), eq(taskTrackingRecords.userId, userId), sql`${taskTrackingRecords.endTime} IS NULL`));

  if (activeRecord.length > 0) {
    return res.status(400).json({ message: 'Task is already being tracked' });
  }

  const newTaskTrackingRecord = await db.insert(taskTrackingRecords).values({
    taskId,
    userId,
    startTime: new Date(),
  }).returning();

  res.status(201).json({ message: 'Task tracking started', record: newTaskTrackingRecord[0] });
});

export const stopTask = catchAsync(async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Find the active tracking record for this task by this user
  const activeRecord = await db.select()
    .from(taskTrackingRecords)
    .where(and(eq(taskTrackingRecords.taskId, taskId), eq(taskTrackingRecords.userId, userId), sql`${taskTrackingRecords.endTime} IS NULL`));

  if (activeRecord.length === 0) {
    return res.status(400).json({ message: 'No active tracking record found for this task' });
  }

  const startTime = activeRecord[0].startTime;
  const endTime = new Date();
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // Duration in seconds

  const updatedRecord = await db.update(taskTrackingRecords)
    .set({ endTime, duration, updatedAt: new Date() })
    .where(eq(taskTrackingRecords.id, activeRecord[0].id))
    .returning();

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
