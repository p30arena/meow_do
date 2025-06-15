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
import { checkPermission } from '../middleware/permission.middleware';

const router: Router = express.Router(); // Task routes

router.post('/', protect, createTask);
router.get('/', protect, getTasks);
router.get('/summary', protect, getTaskTrackingSummary); // Move this before dynamic ID routes
router.get('/:id', protect, checkPermission('task', 'list'), getTaskById);
router.put('/:id', protect, checkPermission('task', 'edit'), updateTask);
router.delete('/:id', protect, checkPermission('task', 'delete'), deleteTask);

router.get('/daily-budget/:goalId', protect, getDailyTimeBudgetForGoal);

router.post('/:id/start', protect, checkPermission('task', 'submitRecord'), startTask);
router.post('/:id/stop', protect, checkPermission('task_tracking_records', 'submitRecord'), stopTask);
router.post('/:taskId/manual-record', protect, checkPermission('task', 'submitRecord'), createManualTaskRecord); // New route for manual records

export default router;
