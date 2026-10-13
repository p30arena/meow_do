import { Router } from 'express';
import {
  listLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  assignLabel,
  unassignLabel,
  listAssignees,
  assignUser,
  unassignUser,
  taskCardDetails,
} from '../controllers/card.controller';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = Router();

// Labels live under goals (workspace-scoped); card links live under tasks.
router.get('/goals/:goalId/labels', protect, checkPermission('goal', 'list'), listLabels);
router.post('/goals/:goalId/labels', protect, checkPermission('goal', 'edit'), createLabel);
router.put('/labels/:labelId', protect, updateLabel);
router.delete('/labels/:labelId', protect, deleteLabel);

router.get('/tasks/:id/card', protect, checkPermission('task', 'list'), taskCardDetails);
router.post('/tasks/:id/labels', protect, checkPermission('task', 'edit'), assignLabel);
router.delete('/tasks/:id/labels/:labelId', protect, checkPermission('task', 'edit'), unassignLabel);
router.get('/tasks/:id/assignees', protect, checkPermission('task', 'list'), listAssignees);
router.post('/tasks/:id/assignees', protect, checkPermission('task', 'edit'), assignUser);
router.delete('/tasks/:id/assignees/:userId', protect, checkPermission('task', 'edit'), unassignUser);

export default router;
