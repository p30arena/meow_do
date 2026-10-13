import { Router } from 'express';
import {
  createReminder,
  deleteReminder,
  listNotifications,
  markNotificationRead,
  sweepReminders,
  timeReport,
} from '../controllers/notify.controller';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = Router();

router.post('/tasks/:id/reminders', protect, checkPermission('task', 'edit'), createReminder);
router.delete('/reminders/:reminderId', protect, deleteReminder);
router.get('/me/notifications', protect, listNotifications);
router.put('/me/notifications/:notificationId/read', protect, markNotificationRead);
router.get('/reports/time', protect, timeReport);
// Manual sweep trigger (cron calls this; also handy in dev).
router.post('/reminders/sweep', protect, async (_req, res) => {
  res.status(200).json(await sweepReminders());
});

export default router;
