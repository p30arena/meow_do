import { Request, Response } from 'express';
import { db } from '../db';
import { tasks } from '../db/schema';
import { eq } from 'drizzle-orm';
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
