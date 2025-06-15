import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { permissions, workspaceShares, workspaces, goals } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { catchAsync } from '../utils/catchAsync';

export const checkPermission = (resourceType: 'workspace' | 'goal' | 'task', action: 'list' | 'edit' | 'delete' | 'addTask' | 'submitRecord') => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized, user ID missing' });
    }

    let resourceId: string;
    if (resourceType === 'workspace') {
      resourceId = req.params.id || req.params.workspaceId;
    } else if (resourceType === 'goal') {
      resourceId = req.params.id || req.params.goalId;
    } else {
      resourceId = req.params.id || req.params.taskId;
    }

    if (!resourceId) {
      return res.status(400).json({ message: 'Resource ID missing in request' });
    }

    // Check if user is the owner of the resource
    let isOwner = false;
    if (resourceType === 'workspace') {
      const workspace = await db.select().from(workspaces).where(and(eq(workspaces.id, resourceId), eq(workspaces.userId, userId)));
      isOwner = workspace.length > 0;
    } else if (resourceType === 'goal') {
      const goal = await db.select().from(goals).where(and(eq(goals.id, resourceId), eq(goals.userId, userId)));
      isOwner = goal.length > 0;
    } else {
      // For tasks, we might need to join with goals or workspaces to check ownership
      // This is a placeholder for task ownership check
      isOwner = false;
    }

    if (isOwner) {
      return next(); // Owners have full access
    }

    // Check if the user has access through sharing
    const workspaceId = resourceType === 'workspace' ? resourceId : 
                        resourceType === 'goal' ? (await db.select({ workspaceId: goals.workspaceId }).from(goals).where(eq(goals.id, resourceId)))[0]?.workspaceId : 
                        // For tasks, this would need a join to get the workspace ID, placeholder for now
                        '';
    if (!workspaceId) {
      return res.status(404).json({ message: 'Workspace ID not found for the resource' });
    }

    const share = await db.select().from(workspaceShares).where(and(eq(workspaceShares.workspaceId, workspaceId), eq(workspaceShares.sharedWithUserId, userId), eq(workspaceShares.status, 'accepted')));
    if (share.length === 0) {
      return res.status(403).json({ message: 'You do not have access to this resource' });
    }

    // Check specific permissions
    const permission = await db.select().from(permissions).where(and(eq(permissions.userId, userId), eq(permissions.resourceId, resourceId), eq(permissions.resourceType, resourceType)));
    if (permission.length === 0) {
      // Check workspace-level permissions if resource-specific permissions are not set
      const workspacePermission = await db.select().from(permissions).where(and(eq(permissions.userId, userId), eq(permissions.resourceId, workspaceId), eq(permissions.resourceType, 'workspace')));
      if (workspacePermission.length === 0) {
        return res.status(403).json({ message: 'No permissions defined for this resource' });
      }
      
      const perm = workspacePermission[0];
      if (
        (action === 'list' && !perm.canList) ||
        (action === 'edit' && !perm.canEdit) ||
        (action === 'delete' && !perm.canDelete) ||
        (action === 'addTask' && !perm.canEdit) || // Assuming addTask requires edit permission at workspace level
        (action === 'submitRecord' && !perm.canEdit) // Assuming submitRecord requires edit permission at workspace level
      ) {
        return res.status(403).json({ message: `You do not have permission to ${action} this resource` });
      }
    } else {
      const perm = permission[0];
      if (
        (action === 'list' && !perm.canList) ||
        (action === 'edit' && !perm.canEdit) ||
        (action === 'delete' && !perm.canDelete) ||
        (action === 'addTask' && resourceType === 'goal' && !perm.canAddTask) ||
        (action === 'submitRecord' && resourceType === 'task' && !perm.canSubmitRecord)
      ) {
        return res.status(403).json({ message: `You do not have permission to ${action} this resource` });
      }
    }

    next();
  });
};
