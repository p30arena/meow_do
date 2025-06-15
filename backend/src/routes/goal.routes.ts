import express, { Router } from 'express';
import {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
} from '../controllers/goal.controller';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router: Router = express.Router(); // Goal routes

router.post('/', protect, createGoal);
router.get('/', protect, getGoals);
router.get('/:id', protect, checkPermission('goal', 'list'), getGoalById);
router.put('/:id', protect, checkPermission('goal', 'edit'), updateGoal);
router.delete('/:id', protect, checkPermission('goal', 'delete'), deleteGoal);

export default router;
