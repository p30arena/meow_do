import express, { Router } from 'express';
import {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
} from '../controllers/goal.controller';

const router: Router = express.Router(); // Goal routes

router.post('/', createGoal);
router.get('/', getGoals);
router.get('/:id', getGoalById);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

export default router;
