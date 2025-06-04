import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { workspaces } from '../db/schema';
import { eq, and } from 'drizzle-orm';
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
  const allWorkspaces = await db.select().from(workspaces).where(eq(workspaces.userId, userId));
  res.status(200).json(allWorkspaces);
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
