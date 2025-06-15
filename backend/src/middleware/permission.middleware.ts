import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { permissions, workspaceShares, workspaces, goals, tasks, taskTrackingRecords } from '../db/schema';
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
      // For tasks, use the ID from the URL parameters
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
      // For tasks, join with goals to check ownership
      const task = await db.select().from(tasks).innerJoin(goals, eq(tasks.goalId, goals.id)).where(and(eq(tasks.id, resourceId), eq(tasks.userId, userId)));
      isOwner = task.length > 0;
    }

    if (isOwner) {
      return next(); // Owners have full access
    }

    // Check if the user has access through sharing
    let workspaceId: string | undefined = undefined;
    if (resourceType === 'workspace') {
      workspaceId = resourceId;
    } else if (resourceType === 'goal') {
      const goal = await db.select({ workspaceId: goals.workspaceId }).from(goals).where(eq(goals.id, resourceId));
      workspaceId = goal[0]?.workspaceId;
    } else {
      // For tasks, use the task ID directly from the URL
      const task = await db.select({ workspaceId: goals.workspaceId, taskId: tasks.id }).from(tasks).innerJoin(goals, eq(tasks.goalId, goals.id)).where(eq(tasks.id, resourceId));
      if (task.length > 0) {
        workspaceId = task[0].workspaceId;
      } else {
        // If task not found or not linked to a goal, try to find if it's a tracking record ID for stop action
        if (req.url.includes('/stop')) {
          const trackingRecord = await db.select({ taskId: taskTrackingRecords.taskId }).from(taskTrackingRecords).where(eq(taskTrackingRecords.id, resourceId));
          if (trackingRecord.length > 0) {
            const taskId = trackingRecord[0].taskId;
            const taskFromTracking = await db.select({ workspaceId: goals.workspaceId }).from(tasks).innerJoin(goals, eq(tasks.goalId, goals.id)).where(eq(tasks.id, taskId));
            if (taskFromTracking.length > 0) {
              workspaceId = taskFromTracking[0].workspaceId;
            }
          }
        }
      }
    }
    if (typeof workspaceId === 'undefined') {
      return res.status(404).json({ message: 'Workspace ID not found for the resource' });
    }

    // Allow stop action on tasks to bypass share check if no share entry exists
    const share = await db.select().from(workspaceShares).where(and(eq(workspaceShares.workspaceId, workspaceId), eq(workspaceShares.sharedWithUserId, userId)));
    if (share.length === 0) {
      if (req.url.includes('/stop') && resourceType === 'task') {
        // Proceed to permission check for stop action even if no share entry exists
      } else {
        return res.status(403).json({ message: 'You do not have access to this resource' });
      }
    } else {
      // Ensure the share is accepted for full access; otherwise, limit to read-only actions unless it's a stop action
      const isAcceptedShare = share.some(s => s.status === 'accepted');
      if (!isAcceptedShare && action !== 'list' && !(req.url.includes('/stop') && resourceType === 'task')) {
        return res.status(403).json({ message: 'You do not have permission to perform this action as the share is not accepted' });
      }
    }

    // Check specific permissions
    const permission = await db.select().from(permissions).where(and(eq(permissions.userId, userId), eq(permissions.resourceId, resourceId), eq(permissions.resourceType, resourceType)));
    if (permission.length === 0) {
      // Check workspace-level permissions if resource-specific permissions are not set
      const workspacePermission = await db.select().from(permissions).where(and(eq(permissions.userId, userId), eq(permissions.resourceId, workspaceId), eq(permissions.resourceType, 'workspace')));
      if (workspacePermission.length === 0) {
        // If no specific workspace permission is defined, allow access with default permissions for shared resources
        if (action === 'list' || action === 'submitRecord') {
          return next();
        } else {
          return res.status(403).json({ message: 'No permissions defined for this resource, and action is not allowed by default' });
        }
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
