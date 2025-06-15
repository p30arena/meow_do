import { Router } from 'express';
import {
  shareWorkspace,
  respondToShareInvitation,
  updatePermissions,
  revokeAccess,
  getSharedUsers,
} from '../controllers/share.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Share a workspace with another user
router.post('/:id/share', protect, shareWorkspace);

// Respond to a share invitation (accept or decline)
router.post('/:id/share/:shareId/respond', protect, respondToShareInvitation);

// Update permissions for a user on a specific resource
router.put('/:workspaceId/permissions/:userId', protect, updatePermissions);

// Revoke access for a user from a workspace
router.delete('/:workspaceId/share/:userId', protect, revokeAccess);

// Get list of users with access to a workspace
router.get('/:id/shared-users', protect, getSharedUsers);

export default router;
