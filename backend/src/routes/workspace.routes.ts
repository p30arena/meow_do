import express, { Router } from 'express';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
} from '../controllers/workspace.controller';

const router: Router = express.Router(); // Workspace routes

router.post('/', createWorkspace);
router.get('/', getWorkspaces);
router.get('/:id', getWorkspaceById);
router.put('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);

export default router;
