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

const router: Router = express.Router(); // Workspace routes

router.post('/', protect, createWorkspace);
router.get('/', protect, getWorkspaces);
router.get('/:id', protect, getWorkspaceById);
router.put('/:id', protect, updateWorkspace);
router.delete('/:id', protect, deleteWorkspace);
router.get('/groups/unique', protect, getUniqueGroupNames);

export default router;
