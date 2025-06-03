import { Request, Response } from 'express';
import { db } from '../db';
import { goals } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createGoalSchema, updateGoalSchema } from '../validation/goal.validation';
import { catchAsync } from '../utils/catchAsync';

export const createGoal = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createGoalSchema.parse(req.body);
  const newGoal = await db.insert(goals).values(validatedData).returning();
  res.status(201).json(newGoal[0]);
});

export const getGoals = catchAsync(async (req: Request, res: Response) => {
  const { workspaceId } = req.query;
  let allGoals;
  if (workspaceId) {
    allGoals = await db.select().from(goals).where(eq(goals.workspaceId, workspaceId as string));
  } else {
    allGoals = await db.select().from(goals);
  }
  res.status(200).json(allGoals);
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
