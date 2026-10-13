/**
 * Notification fan-out abstraction (Phase C).
 * In-app always works (DB row). Email/SMS consult env config and degrade
 * to a failed reminder row + notification when unconfigured — never throw.
 */
export interface NotifyInput {
  userId: string;
  taskId?: string;
  kind: string;
  body: string;
  channel: 'inapp' | 'email' | 'sms';
}

export const deliverNotification = async (input: NotifyInput): Promise<{ delivered: boolean; detail: string }> => {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smsKey = process.env.SMS_API_KEY?.trim();
  if (input.channel === 'email' && !smtpHost) {
    return { delivered: false, detail: 'SMTP_HOST not configured' };
  }
  if (input.channel === 'sms' && !smsKey) {
    return { delivered: false, detail: 'SMS_API_KEY not configured' };
  }
  // Transport wiring (SMTP provider / Iranian SMS panel) lands here when the
  // client picks a vendor. In-app delivery is recorded by the caller.
  return { delivered: input.channel === 'inapp', detail: input.channel === 'inapp' ? 'inapp' : 'provider-stub' };
};