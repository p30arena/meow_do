import { createHmac } from 'node:crypto';
import { db } from '../db';
import { rules, webhooks, importBatches, tasks, goals } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createRuleSchema, createWebhookSchema } from '../validation/automation.validation';
import { catchAsync } from '../utils/catchAsync';
import { forDriver } from '../utils/driverPayload';

/** Fire-and-forget HMAC-signed POST; retry once; never throw into callers. */
export const fireWebhooks = async (workspaceId: string, event: string, payload: unknown) => {
  try {
    const all = await db.select().from(webhooks).where(eq(webhooks.workspaceId, workspaceId));
    const hooks = all.filter((h: typeof webhooks.$inferSelect) => h.isActive === true || (h.isActive as unknown) === 1);
    const body = JSON.stringify({ event, ...(payload as Record<string, unknown>) });
    for (const hook of hooks as Array<typeof webhooks.$inferSelect>) {
      const events = JSON.parse(hook.events) as string[];
      if (!events.includes(event)) continue;
      const sig = createHmac('sha256', hook.secret).update(body).digest('hex');
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const res = await fetch(hook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-MeowDo-Signature': sig, 'X-MeowDo-Event': event },
            body,
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) break;
        } catch {
          if (attempt === 1) console.error(`[webhook] delivery failed: ${hook.url} event=${event}`);
        }
      }
    }
  } catch (err) {
    console.error('[webhook] fan-out error', err);
  }
};

/** Rules-lite v1: when every task in a goal is done, close the goal. */
export const evaluateTaskDoneRules = async (goalId: string) => {
  try {
    const active = await db.select().from(rules).where(eq(rules.goalId, goalId));
    const enabled = active.filter((r: typeof rules.$inferSelect) => r.isActive === true || (r.isActive as unknown) === 1);
    if (enabled.length === 0) return;
    const open = await db.select().from(tasks).where(eq(tasks.goalId, goalId));
    const allDone = open.length > 0 && open.every((t: { status: string }) => t.status === 'done');
    if (allDone) {
      await db.update(goals).set({ status: 'reached' }).where(eq(goals.id, goalId));
    }
  } catch (err) {
    console.error('[rules] evaluation error', err);
  }
};

export const listRules = catchAsync(async (req, res) => {
  const { goalId } = req.params;
  const rows = await db.select().from(rules).where(eq(rules.goalId, goalId as string));
  res.status(200).json(rows);
});

export const createRule = catchAsync(async (req, res) => {
  const data = createRuleSchema.parse(req.body);
  const [row] = await db.insert(rules).values(forDriver({
    goalId: data.goalId ?? null,
    workspaceId: data.workspaceId ?? null,
    trigger: data.trigger ?? 'task_done',
    action: data.action ?? 'close_goal',
    isActive: true,
  })).returning();
  res.status(201).json(row);
});

export const deleteRule = catchAsync(async (req, res) => {
  const [row] = await db.delete(rules).where(eq(rules.id, req.params.ruleId)).returning();
  if (!row) return res.status(404).json({ message: 'Rule not found' });
  res.status(204).send();
});

export const listWebhooks = catchAsync(async (req, res) => {
  const rows = await db.select().from(webhooks).where(eq(webhooks.workspaceId, req.params.workspaceId));
  res.status(200).json(rows.map((h: typeof webhooks.$inferSelect) => ({ ...h, secret: '***' })));
});

export const createWebhook = catchAsync(async (req, res) => {
  const data = createWebhookSchema.parse(req.body);
  const [row] = await db.insert(webhooks).values(forDriver({
    workspaceId: data.workspaceId,
    url: data.url,
    secret: data.secret,
    events: JSON.stringify(data.events),
    isActive: true,
  })).returning();
  res.status(201).json({ ...(row as object), secret: '***' });
});

export const deleteWebhook = catchAsync(async (req, res) => {
  const [row] = await db.delete(webhooks).where(eq(webhooks.id, req.params.webhookId)).returning();
  if (!row) return res.status(404).json({ message: 'Webhook not found' });
  res.status(204).send();
});

export const seenImportKeys = async (userId: string, source: 'trello' | 'excel') => {
  const rows = await db.select().from(importBatches).where(and(eq(importBatches.userId, userId)));
  return new Set(rows.filter((r: typeof importBatches.$inferSelect) => r.source === source).map((r: typeof importBatches.$inferSelect) => r.externalId));
};

export const markImportKey = async (userId: string, source: 'trello' | 'excel', externalId: string, resourceId: string | null) => {
  const existing = await db.select().from(importBatches).where(and(eq(importBatches.userId, userId), eq(importBatches.externalId, externalId)));
  if (existing.length > 0) return false;
  await db.insert(importBatches).values(forDriver({ userId, source, externalId, resourceId }));
  return true;
};
