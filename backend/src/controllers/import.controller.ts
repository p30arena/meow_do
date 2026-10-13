import { db } from '../db';
import { importBatches, tasks, goals, workspaces, labels, taskLabels, taskAssignees, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { trelloImportSchema } from '../validation/automation.validation';
import { catchAsync } from '../utils/catchAsync';
import { forDriver } from '../utils/driverPayload';
import { seenImportKeys, markImportKey } from './automation.controller';

/**
 * Trello import: boards -> workspaces, lists -> goals, cards -> tasks.
 * Dry-run returns the mapping preview; confirm commits. Idempotent via
 * (userId, externalId) in import_batches — re-runs skip created rows.
 */
export const importTrello = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Not authorized, user ID missing' });
  const data = trelloImportSchema.parse(req.body);
  const batchId = data.batchId ?? `trello-${Date.now()}`;
  const board = data.board;

  const preview = {
    batchId,
    workspace: board.name,
    goals: board.lists.map((l) => ({ list: l.name, cards: (l.cards ?? []).length })),
    totalCards: board.lists.reduce((n, l) => n + (l.cards ?? []).length, 0),
  };
  if (!data.confirm) return res.status(200).json({ dryRun: true, ...preview });

  const skipped: string[] = [];
  const created: string[] = [];
  const seen = await seenImportKeys(userId, 'trello');

  let workspaceId: string | null = null;
  const wsKey = `${batchId}:board:${board.name}`;
  if (!seen.has(wsKey)) {
    const [ws] = await db.insert(workspaces).values(forDriver({ name: board.name, userId })).returning();
    workspaceId = ws.id;
    await markImportKey(userId, 'trello', wsKey, ws.id);
    created.push(`workspace:${board.name}`);
  } else {
    const existing = await db.select().from(workspaces).where(and(eq(workspaces.name, board.name), eq(workspaces.userId, userId)));
    workspaceId = existing[0]?.id ?? null;
    skipped.push(`workspace:${board.name} (already imported)`);
  }
  if (!workspaceId) return res.status(200).json({ dryRun: false, ...preview, created, skipped });

  for (const list of board.lists) {
    let goalId: string | null = null;
    const listKey = `${batchId}:list:${list.id}`;
    if (!seen.has(listKey)) {
      const [goal] = await db.insert(goals).values(forDriver({ workspaceId, name: list.name, userId })).returning();
      goalId = goal.id;
      await markImportKey(userId, 'trello', listKey, goal.id);
      created.push(`goal:${list.name}`);
    } else {
      skipped.push(`list:${list.name} (already imported)`);
      const existing = await db.select().from(goals).where(and(eq(goals.workspaceId, workspaceId), eq(goals.name, list.name)));
      goalId = existing[0]?.id ?? null;
    }
    if (!goalId) continue;
    for (const card of list.cards ?? []) {
      const cardKey = `${batchId}:card:${card.id}`;
      if (seen.has(cardKey)) {
        skipped.push(`card:${card.name} (already imported)`);
        continue;
      }
      let due: string | undefined;
      if (card.due) {
        const d = new Date(card.due);
        if (!Number.isNaN(d.getTime())) due = d.toISOString();
      }
      const [task] = await db.insert(tasks).values(forDriver({
        goalId, name: card.name.slice(0, 256), description: card.desc?.slice(0, 10000),
        timeBudget: 30, deadline: due, userId, position: 0, isRecurring: false,
      })).returning();
      await markImportKey(userId, 'trello', cardKey, task.id);
      created.push(`task:${card.name}`);
      for (const lab of card.labels ?? []) {
        const existing = await db.select().from(labels).where(and(eq(labels.workspaceId, workspaceId), eq(labels.name, lab.name)));
        const labelId = existing[0]?.id ?? (await db.insert(labels).values(forDriver({ workspaceId, name: lab.name.slice(0, 64), color: /^#[0-9a-fA-F]{6}$/.test(lab.color ?? '') ? lab.color! : '#8884d8' })).returning())[0].id;
        await db.insert(taskLabels).values(forDriver({ taskId: task.id, labelId })).catch(() => undefined);
      }
      for (const m of card.members ?? []) {
        const person = await db.select({ id: users.id }).from(users).where(eq(users.email, m.email));
        if (person[0]) {
          await db.insert(taskAssignees).values(forDriver({ taskId: task.id, userId: person[0].id })).catch(() => undefined);
        } else {
          skipped.push(`member:${m.email} (no such user)`);
        }
      }
    }
  }
  void importBatches;
  res.status(201).json({ dryRun: false, ...preview, created, skipped });
});
