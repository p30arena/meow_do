import { Request, Response } from 'express';
import { db } from '../db';
import { reminders, notifications, tasks } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createReminderSchema } from '../validation/notify.validation';
import { catchAsync } from '../utils/catchAsync';
import { forDriver } from '../utils/driverPayload';
import { deliverNotification } from '../utils/notify';

export const createReminder = catchAsync(async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Not authorized, user ID missing' });
  const data = createReminderSchema.parse(req.body);
  if (data.remindAt.getTime() <= Date.now()) {
    return res.status(400).json({ message: 'remindAt must be in the future' });
  }
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (task.length === 0) return res.status(404).json({ message: 'Task not found' });
  const [row] = await db.insert(reminders).values(forDriver({
    taskId,
    userId,
    // pg timestamp columns map Date -> ISO via drizzle; better-sqlite3 also
    // binds Date through the same pg column mapping in this project setup.
    remindAt: data.remindAt,
    channel: data.channel ?? 'inapp',
  })).returning();
  res.status(201).json(row);
});

export const deleteReminder = catchAsync(async (req: Request, res: Response) => {
  const [row] = await db.delete(reminders).where(eq(reminders.id, req.params.reminderId)).returning();
  if (!row) return res.status(404).json({ message: 'Reminder not found' });
  res.status(204).send();
});

/** Sweep due reminders: in-app rows always land; email/sms via notify.ts. */
export const sweepReminders = async () => {
  const due = await db.select().from(reminders).where(eq(reminders.status, 'pending'));
  const now = Date.now();
  let sent = 0;
  for (const row of due as Array<typeof reminders.$inferSelect>) {
    if (new Date(row.remindAt).getTime() > now) continue;
    const body = `Reminder: ${row.taskId}`;
    const result = await deliverNotification({ userId: row.userId, taskId: row.taskId, kind: 'reminder', body, channel: row.channel as 'inapp' | 'email' | 'sms' });
    await db.insert(notifications).values(forDriver({ userId: row.userId, taskId: row.taskId, kind: 'reminder', body }));
    await db.update(reminders).set({ status: result.delivered || row.channel === 'inapp' ? 'sent' : 'failed' }).where(eq(reminders.id, row.id));
    sent += 1;
  }
  return { swept: sent };
};

export const listNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Not authorized, user ID missing' });
  const rows = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  res.status(200).json(rows);
});

export const markNotificationRead = catchAsync(async (req: Request, res: Response) => {
  const [row] = await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, req.params.notificationId), eq(notifications.userId, req.user?.id ?? ''))).returning();
  if (!row) return res.status(404).json({ message: 'Notification not found' });
  res.status(200).json(row);
});

/** Management report stub (Phase D fullness later): per-task totals hook. */
export const timeReport = catchAsync(async (req: Request, res: Response) => {
  const groupBy = req.query.groupBy === 'project' ? 'project' : 'user';
  res.status(200).json({ groupBy, rows: [] });
});
