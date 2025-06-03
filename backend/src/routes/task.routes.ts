import express, { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getDailyTimeBudgetForGoal,
} from '../controllers/task.controller';

const router: Router = express.Router(); // Task routes

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

router.get('/daily-budget/:goalId', getDailyTimeBudgetForGoal);

export default router;
