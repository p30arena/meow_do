import express, { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getDailyTimeBudgetForGoal,
  startTask,
  stopTask,
  getTaskTrackingSummary,
  createManualTaskRecord, // Import the new controller
} from '../controllers/task.controller';
import { protect } from '../middleware/auth.middleware';

const router: Router = express.Router(); // Task routes

router.post('/', protect, createTask);
router.get('/', protect, getTasks);
router.get('/summary', protect, getTaskTrackingSummary); // Move this before dynamic ID routes
router.get('/:id', protect, getTaskById);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);

router.get('/daily-budget/:goalId', protect, getDailyTimeBudgetForGoal);

router.post('/:id/start', protect, startTask);
router.post('/:id/stop', protect, stopTask);
router.post('/:taskId/manual-record', protect, createManualTaskRecord); // New route for manual records

export default router;
