import { z } from 'zod';

export const reminderChannel = z.enum(['inapp', 'email', 'sms']);

export const createReminderSchema = z.object({
  // Accept ISO datetimes with or without millis (luxon/Python both send .000Z;
  // zod's datetime() requires millis — normalize before validating).
  remindAt: z.string().min(1, 'Reminder time is required').transform((s) => {
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(s)
      ? s.replace(/(\d{2}:\d{2}:\d{2})(Z|[+-])/, '$1.000$2')
      : s;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) throw new Error('Invalid reminder time');
    return d;
  }),
  channel: reminderChannel.default('inapp').optional(),
});