import { Router } from 'express';
import {
  listRules,
  createRule,
  deleteRule,
  listWebhooks,
  createWebhook,
  deleteWebhook,
} from '../controllers/automation.controller';
import { importTrello } from '../controllers/import.controller';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = Router();

// Rules-lite: list/create under a goal (edit rights), delete by id.
router.get('/goals/:goalId/rules', protect, checkPermission('goal', 'list'), listRules);
router.post('/goals/:goalId/rules', protect, checkPermission('goal', 'edit'), createRule);
router.delete('/rules/:ruleId', protect, deleteRule);

// Outgoing webhooks per workspace (owner-managed).
router.get('/workspaces/:workspaceId/webhooks', protect, checkPermission('workspace', 'list'), listWebhooks);
router.post('/workspaces/:workspaceId/webhooks', protect, checkPermission('workspace', 'edit'), createWebhook);
router.delete('/webhooks/:webhookId', protect, deleteWebhook);

// Trello import with dry-run preview + idempotent confirm.
router.post('/imports/trello', protect, importTrello);

export default router;
