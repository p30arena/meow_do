import express, { Router } from 'express';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getUniqueGroupNames,
} from '../controllers/workspace.controller';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router: Router = express.Router(); // Workspace routes

router.post('/', protect, createWorkspace);
router.get('/', protect, getWorkspaces);
router.get('/:id', protect, checkPermission('workspace', 'list'), getWorkspaceById);
router.put('/:id', protect, checkPermission('workspace', 'edit'), updateWorkspace);
router.delete('/:id', protect, checkPermission('workspace', 'delete'), deleteWorkspace);
router.get('/groups/unique', protect, getUniqueGroupNames);

export default router;
