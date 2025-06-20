import { Request, Response } from 'express';
import { db } from '../db';
import { workspaceShares, permissions, users, workspaces, goals, tasks } from '../db/schema';
import { inArray } from 'drizzle-orm';
import { eq, and, or } from 'drizzle-orm';
import { catchAsync } from '../utils/catchAsync';

export const shareWorkspace = catchAsync(async (req: Request, res: Response) => {
  const { id: workspaceId } = req.params;
  const { identifier, canList = true, canEdit = false, canDelete = false } = req.body;
  const invitedByUserId = req.user?.id;

  if (!invitedByUserId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Verify the workspace exists and belongs to the user
  const workspace = await db.select().from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, invitedByUserId)));
  if (workspace.length === 0) {
    return res.status(404).json({ message: 'Workspace not found or you do not have permission to share it' });
  }

  // Find the user to share with by username or email
  const sharedWithUser = await db.select().from(users).where(or(eq(users.username, identifier), eq(users.email, identifier)));
  if (sharedWithUser.length === 0) {
    return res.status(404).json({ message: 'User not found with the provided username or email' });
  }
  const sharedWithUserId = sharedWithUser[0].id;

  // Check if the workspace is already shared with this user
  const existingShare = await db.select().from(workspaceShares).where(and(eq(workspaceShares.workspaceId, workspaceId), eq(workspaceShares.sharedWithUserId, sharedWithUserId)));
  if (existingShare.length > 0) {
    return res.status(400).json({ message: 'Workspace is already shared with this user' });
  }

  // Create a share entry
  const newShare = await db.insert(workspaceShares).values({
    workspaceId,
    sharedWithUserId,
    invitedByUserId,
    status: 'pending',
  }).returning();

  // Set default permissions for the workspace
  const newPermission = await db.insert(permissions).values({
    userId: sharedWithUserId,
    resourceId: workspaceId,
    resourceType: 'workspace',
    canList,
    canEdit,
    canDelete,
    canAddTask: false, // Not applicable for workspace
    canSubmitRecord: false, // Not applicable for workspace
  }).returning();

  res.status(201).json({ message: 'Workspace shared successfully', share: newShare[0], permission: newPermission[0] });
});

export const respondToShareInvitation = catchAsync(async (req: Request, res: Response) => {
  const { id: workspaceId, shareId } = req.params;
  const { response } = req.body; // 'accept' or 'decline'
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  if (response !== 'accept' && response !== 'decline') {
    return res.status(400).json({ message: 'Invalid response. Use "accept" or "decline"' });
  }

  // Find the share invitation
  const share = await db.select().from(workspaceShares).where(and(eq(workspaceShares.id, shareId), eq(workspaceShares.workspaceId, workspaceId), eq(workspaceShares.sharedWithUserId, userId)));
  if (share.length === 0) {
    return res.status(404).json({ message: 'Share invitation not found' });
  }

  if (share[0].status !== 'pending') {
    return res.status(400).json({ message: 'Invitation has already been responded to' });
  }

  // Update the share status
  const status = response === 'accept' ? 'accepted' : 'declined';
  const updatedShare = await db.update(workspaceShares).set({ status }).where(eq(workspaceShares.id, shareId)).returning();

  // If declined, remove any associated permissions
  if (status === 'declined') {
    await db.delete(permissions).where(and(eq(permissions.userId, userId), eq(permissions.resourceId, workspaceId), eq(permissions.resourceType, 'workspace')));
  }

  res.status(200).json({ message: `Workspace share invitation ${status}`, share: updatedShare[0] });
});

export const updatePermissions = catchAsync(async (req: Request, res: Response) => {
  const { workspaceId, userId: targetUserId } = req.params;
  const { resourceId, resourceType, canList, canEdit, canDelete, canAddTask = false, canSubmitRecord = false } = req.body;
  const ownerId = req.user?.id;

  if (!ownerId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Verify the workspace exists and belongs to the requesting user
  const workspace = await db.select().from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, ownerId)));
  if (workspace.length === 0) {
    return res.status(404).json({ message: 'Workspace not found or you do not have permission to manage it' });
  }

  // Verify the target user has been shared with the workspace (regardless of acceptance status)
  const share = await db.select().from(workspaceShares).where(and(eq(workspaceShares.workspaceId, workspaceId), eq(workspaceShares.sharedWithUserId, targetUserId)));
  if (share.length === 0) {
    return res.status(404).json({ message: 'User does not have access to this workspace' });
  }

  // Check if permission entry exists, if not create one, otherwise update
  const existingPermission = await db.select().from(permissions).where(and(eq(permissions.userId, targetUserId), eq(permissions.resourceId, resourceId), eq(permissions.resourceType, resourceType)));
  let updatedPermission;

  if (existingPermission.length > 0) {
    updatedPermission = await db.update(permissions).set({
      canList,
      canEdit,
      canDelete,
      canAddTask: resourceType === 'goal' ? canAddTask : false,
      canSubmitRecord: resourceType === 'task' ? canSubmitRecord : false,
      updatedAt: new Date(),
    }).where(eq(permissions.id, existingPermission[0].id)).returning();
  } else {
    updatedPermission = await db.insert(permissions).values({
      userId: targetUserId,
      resourceId,
      resourceType,
      canList,
      canEdit,
      canDelete,
      canAddTask: resourceType === 'goal' ? canAddTask : false,
      canSubmitRecord: resourceType === 'task' ? canSubmitRecord : false,
    }).returning();
  }

  res.status(200).json({ message: 'Permissions updated successfully', permission: updatedPermission[0] });
});

export const revokeAccess = catchAsync(async (req: Request, res: Response) => {
  const { workspaceId, userId: targetUserId } = req.params;
  const ownerId = req.user?.id;

  if (!ownerId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Verify the workspace exists and belongs to the requesting user
  const workspace = await db.select().from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, ownerId)));
  if (workspace.length === 0) {
    return res.status(404).json({ message: 'Workspace not found or you do not have permission to manage it' });
  }

  // Check if the target user has access to revoke
  const share = await db.select().from(workspaceShares).where(and(eq(workspaceShares.workspaceId, workspaceId), eq(workspaceShares.sharedWithUserId, targetUserId)));
  if (share.length === 0) {
    return res.status(404).json({ message: 'User does not have access to this workspace' });
  }

  // Delete the share entry
  await db.delete(workspaceShares).where(eq(workspaceShares.id, share[0].id));

  // Delete permissions for the workspace itself
  await db.delete(permissions).where(
    and(
      eq(permissions.userId, targetUserId),
      eq(permissions.resourceId, workspaceId),
      eq(permissions.resourceType, 'workspace')
    )
  );

  // Delete permissions for goals associated with this workspace
  const goalsInWorkspace = await db.select({ id: goals.id }).from(goals).where(eq(goals.workspaceId, workspaceId));
  const goalIds = goalsInWorkspace.map(goal => goal.id);
  if (goalIds.length > 0) {
    await db.delete(permissions).where(
      and(
        eq(permissions.userId, targetUserId),
        eq(permissions.resourceType, 'goal'),
        inArray(permissions.resourceId, goalIds)
      )
    );
  }

  // Delete permissions for tasks associated with goals in this workspace
  if (goalIds.length > 0) {
    const tasksInGoals = await db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.goalId, goalIds));
    const taskIds = tasksInGoals.map(task => task.id);
    if (taskIds.length > 0) {
      await db.delete(permissions).where(
        and(
          eq(permissions.userId, targetUserId),
          eq(permissions.resourceType, 'task'),
          inArray(permissions.resourceId, taskIds)
        )
      );
    }
  }

  res.status(200).json({ message: 'Access revoked successfully for the user' });
});

// Get all users who have access to a specific workspace
export const getSharedUsers = catchAsync(async (req: Request, res: Response) => {
  const { id: workspaceId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  // Check if the user has access to the workspace (either as owner or shared user with accepted status)
  const workspaceAccessOwner = await db.select().from(workspaces).where(
    and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId))
  );
  
  const workspaceAccessShared = await db.select().from(workspaceShares).where(
    and(eq(workspaceShares.workspaceId, workspaceId), eq(workspaceShares.sharedWithUserId, userId), eq(workspaceShares.status, 'accepted'))
  );

  if (workspaceAccessOwner.length === 0 && workspaceAccessShared.length === 0) {
    return res.status(403).json({ message: 'You do not have access to view shared users for this workspace' });
  }

  // Get all users who have access to this workspace
  const sharedUsers = await db.select({
    userId: users.id,
    username: users.username,
    email: users.email,
    status: workspaceShares.status,
    invitedByUserId: workspaceShares.invitedByUserId,
    permission: permissions,
  }).from(workspaceShares)
    .innerJoin(users, eq(workspaceShares.sharedWithUserId, users.id))
    .leftJoin(permissions, and(eq(permissions.userId, users.id), eq(permissions.resourceId, workspaceId), eq(permissions.resourceType, 'workspace')))
    .where(eq(workspaceShares.workspaceId, workspaceId));

  res.status(200).json(sharedUsers);
});

export const getMyInvitations = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'User not authenticated',
    });
  }
  const userId = req.user.id;
  // Fetch all share invitations for the current user
  const sharedWorkspaces = await db.select({
    shareId: workspaceShares.id,
    workspaceId: workspaceShares.workspaceId,
    status: workspaceShares.status,
    invitedByUserId: workspaceShares.invitedByUserId,
    workspace: {
      id: workspaces.id,
      name: workspaces.name,
      description: workspaces.description,
      groupName: workspaces.groupName,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    },
    invitedBy: {
      id: users.id,
      username: users.username,
    },
  }).from(workspaceShares)
    .innerJoin(workspaces, eq(workspaceShares.workspaceId, workspaces.id))
    .innerJoin(users, eq(workspaceShares.invitedByUserId, users.id))
    .where(eq(workspaceShares.sharedWithUserId, userId));

  res.status(200).json({
    status: 'success',
    data: sharedWorkspaces,
  });
});
