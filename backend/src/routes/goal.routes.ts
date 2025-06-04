import express, { Router } from 'express';
import {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
} from '../controllers/goal.controller';
import { protect } from '../middleware/auth.middleware';

const router: Router = express.Router(); // Goal routes

router.post('/', protect, createGoal);
router.get('/', protect, getGoals);
router.get('/:id', protect, getGoalById);
router.put('/:id', protect, updateGoal);
router.delete('/:id', protect, deleteGoal);

export default router;
