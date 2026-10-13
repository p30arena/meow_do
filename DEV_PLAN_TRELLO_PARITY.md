# Trello-Parity Implementation Plan (MeowDo)

> Concrete build plan for the developments promised in `CLIENT_DOC_FA.md` §10–§11.
> Status: **planning** — no code changed yet. Language: English (dev audience).
> Last updated: Oct 2026. Codebase ref: `main`.

## 0. Goal and non-goals

**Goal:** reach demonstrable Trello parity in 4 phases (A→D) while keeping
MeowDo's advantages (Today view, time tracking, RTL/i18n, self-host).

**Non-goals for this plan:** native mobile apps, accounting/payroll
integration, SSO/LDAP (listed in client doc §11 as separate quotes).

## 1. Ground rules (apply to every phase)

1. **Dual-database discipline:** every schema change lands in BOTH
   `backend/src/db/schema.ts` (Postgres/Drizzle) AND the SQLite bootstrap SQL
   in `backend/src/db/index.ts`. SQLite = single-process only.
2. **Validation first:** new inputs get Zod schemas in
   `backend/src/validation/`; errors surface as 400 with `issues`, never 500.
3. **Permissions:** new endpoints reuse `protect` + `checkPermission`;
   ownership checks mirror `task.controller.ts` (404 for foreign resources,
   403 for insufficient share rights).
4. **i18n:** every user-facing string gets `en`/`ar`/`fa` keys in the same
   commit (`frontend/public/locales/*/translation.json`).
5. **Conventions:** confirmations via `AlertDialog`, spacing via `gap-*`,
   shadcn additions via `npx shadcn@latest add`. Lazy-load new views in
   `App.tsx` (bundle budgets enforced by `scripts/check-bundle.mjs`).
6. **Gates per phase:** `typecheck` + `lint` + `npm test` (frontend &
   backend) + production `vite build` all green before merge.

## 2. Recommended build order (pre-deal)

For maximum demo leverage before the deal settles, build in this order:

1. **Phase 0** (1–2 days) → unblocks everything.
2. **Phase A kanban** (2–3 weeks) → the single biggest Trello-gap closer;
   demoable on a phone.
3. **Thin slice of B**: labels + assignee only (3–5 days) → makes the board
   look real without the full comment/attachment cost.
4. **Trello/Excel import** (from Phase D, 1 week) → lets the client's own
   data appear in the demo. Huge persuasion value.
5. Then full B → C → D remainder, in that order.

## 3. Phase 0 — Foundations (1–2 days)

Why: drag-and-drop needs a stable order field; demos need data; the board
needs a route that doesn't disturb `TaskList`.

### 3.1 Tasks

- [ ] Add `position INTEGER DEFAULT 0 NOT NULL` to `tasks`
      (schema.ts + SQLite bootstrap + drizzle migration `0008_*`).
      Backfill: per goal, order by current sort
      (status-case, priority DESC, name) → 0..n.
- [ ] Include `position` in create/update Zod schemas (optional on input;
      server defaults). Order `getTasks` by `position` first, keep old sort
      as tiebreak so existing behavior is unchanged.
- [ ] Add `@dnd-kit/core` (+ `sortable`, `utilities`) to
      `frontend/package.json`. No global CSS changes.
- [ ] New lazy route skeleton (empty-state only, no logic yet):
      `/workspaces/:workspaceId/goals/:goalId/board` → `BoardView.tsx`
      placeholder behind the same `ResourceHeader` + breadcrumb pattern as
      `TasksView` in `App.tsx`.
- [ ] Demo seed script `backend/scripts/seed-demo.mjs`: 1 user, 2
      workspaces, 3 goals, ~12 tasks across all statuses/priorities, a few
      tracking records, 1 share invitation. Must be idempotent and clearly
      labeled DEMO (own prefix, e.g. `[demo]`).
- [ ] i18n keys for `board.*` (title, empty, columns) in 3 locales.

### 3.2 Acceptance

- Existing list views render byte-identical order as before (position
  backfill matches old sort).
- `/board` route loads placeholder with correct breadcrumb; bundle budget
  test still passes.
- Seed script runs twice without duplicates; `npm test` green on both drivers.


## 4. Phase A — Kanban board minimal (2–3 weeks)

One board per **goal** (`/workspaces/:ws/goals/:goal/board`), columns =
task status (`pending` → `started` → `done`, plus `failed` collapsed).

### 4.1 Backend

- [ ] `PUT /tasks/:id/position` (or extend `updateTask`): body
      `{ position: number, status?: enum }`. Zod: int >= 0.
      Permission: same as task edit.
- [ ] Cross-column drop sends new status + position together; server does a
      single UPDATE. Renumber the affected column server-side (transaction
      on pg, sequential on sqlite).
- [ ] `GET /tasks?goalId=` already returns `position`; no new endpoint.

### 4.2 Frontend (`BoardView.tsx`, lazy-loaded)

- [ ] dnd-kit `DndContext` + per-column `SortableContext`;
      `PointerSensor` + `TouchSensor` (touch must work on a phone).
      `DragOverlay` shows dragged card.
- [ ] Same-column drop = reorder; cross-column = status + reorder.
      Optimistic update with rollback + toast on failure.
- [ ] Column headers: localized status + live count badge.
- [ ] Board/List toggle on Tasks page (persist `localStorage`); readonly
      users get no drag handles.
- [ ] A11y: dnd-kit announcements, `aria-live` "moved X to Done",
      focus rings, RTL-safe (`gap-*`, logical props).

### 4.3 Acceptance

Phone drag Pending→Done persists after reload; readonly user cannot drag;
`typecheck/lint/test/build` green; no `TaskList`/`TodayView` regression.


## 5. Phase B — Rich cards (2–4 weeks)

Ship in slices so each is demoable: **B1 labels+assignee → B2 checklist
→ B3 comments+activity → B4 attachments**.

### 5.1 Data model (pg migration + sqlite bootstrap, both!)

| Table | Key columns |
|---|---|
| `labels` | `id, workspaceId, name, color` (hex `^#[0-9a-fA-F]{6}$`) |
| `task_labels` | `taskId, labelId` (composite PK) |
| `task_assignees` | `taskId, userId` (assignee must have workspace access) |
| `checklist_items` | `id, taskId, title, isDone, position` |
| `comments` | `id, taskId, userId, body` (markdown, ≤10k chars) |
| `attachments` | `id, taskId, userId, fileName, mimeType, size, storageKey` (10 MB cap + allowlist) |
| `activity_events` | `id, taskId, actorId, kind, payload JSON, createdAt` (append-only) |

### 5.2 Backend (all behind `protect` + permission checks)

- Labels: CRUD per goal + assign/unassign per task.
- Assignees: add/remove (403 if target lacks workspace access).
- Checklist: CRUD + toggle + reorder via `position`.
- Comments: list/add; owner-or-workspace-owner edit/delete.
- Attachments: multipart upload to a mounted volume (`./uploads`,
  `uploads_data` in compose), served via authenticated GET — never a
  public static dir. Abstract storage behind `storage.ts` (local now,
  S3/MinIO later).
- Emit `activity_events` on: status/assignee/label change, checklist
  toggle, comment, attachment, timer start/stop.

### 5.3 Frontend

- `TaskDetailSheet` (direction-aware slide-over): labels, assignees,
  checklist + progress, comments (existing `MarkdownRenderer`),
  attachments, activity timeline, reused timer controls.
- Compact indicators on cards: label dots, assignee initials, `2/5`
  checklist, comment/attachment counts.

### 5.4 Acceptance

Full card lifecycle (label+assign+check+comment+file) survives reload on
both drivers; foreign access → 403/404; oversized/exe upload → 400.


## 6. Phase C — Calendar and reminders (2–3 weeks)

### 6.1 Calendar views (frontend-first, no schema)

- [ ] `CalendarView.tsx` month grid + week strip, fed by `getAllTasks`
      filtered on `deadline` in `resolveUserTimezone`. Reuse Today-view
      overdue/today highlighting. Click day → task sheet.
- [ ] Workspace color dot per task (group or name hash).

### 6.2 Reminders (schema + worker)

- [ ] `reminders`: `id, taskId, userId, remindAt, channel
      (inapp|email|sms), status (pending|sent|failed)`.
- [ ] `POST/DELETE /tasks/:id/reminders` (Zod: future ISO; default inapp).
- [ ] Worker: in-process sweeper (SQLite-safe) or compose cron script.
      In-app bell (`GET /me/notifications`, count in `Navbar`) ships
      first; email via SMTP env; SMS via Iranian panel (`SMS_API_KEY`)
      behind a `notify.ts` abstraction.
- [ ] Web Push (VAPID) optional inside C — skip if pressed; SMS+inapp
      covers the demo. Requires HTTPS anyway.

### 6.3 Acceptance

Reminder fires within a minute in dev; bell count updates; SMS path
tested in provider sandbox.

## 7. Phase D — Automation + import/export (3–4 weeks, partly parallel)

### 7.1 Rules-lite (NOT full Butler)

- `rules`: `id, goalId|workspaceId, trigger, action, config JSON,
  isActive`. V1: single kind — "task→Done closes goal when all tasks
  done", evaluated inline in `updateTask`, idempotent. UI: minimal
  per-goal rules list + create form.

### 7.2 Webhooks (outgoing)

- `webhooks`: `workspaceId, url (https only), secret, events[]`.
  Fire-and-forget HMAC-signed POST on task create/update/done + retry
  once. Document payload in client doc §9.

### 7.3 Trello + Excel import — DO EARLY (see §2)

- `POST /imports/trello`: boards→workspaces, lists→goals/status,
  cards→tasks (labels/due/members matched by email, unmatched → report).
  Dry-run preview + confirm commit. Batch id → no duplicates on re-run.
- `POST /imports/excel`: CSV/XLSX with column-mapping UI. Same pattern.

### 7.4 Reports + Excel export

- `GET /reports/time?groupBy=user|project&from&to` from
  `taskTrackingRecords` (reuse summary patterns; keep `safeTimezone`
  rule). Server-side `.xlsx` (exceljs) + CSV fallback.

### 7.5 Acceptance

Client's real Trello export imports to staging with matching counts and
explicit skip report; report totals cross-check vs summary endpoint.

## 8. Test + rollout (every phase)

1. Extend `sqlite-smoke.mjs` for new endpoints (both drivers); keep the
   live-API verification habit.
2. Keep bundle budgets green (`check-bundle.mjs`); document any lazy-chunk
   exception.
3. QA matrix: owner/member/readonly/intruder × en/fa × light/dark ×
   mobile/desktop.
4. Re-run `seed-demo.mjs` before every client demo.
5. Docs: move shipped items from `CLIENT_DOC_FA.md` §10–§11 into §2.

## 9. What I need from you to start

1. **Scope lock:** full A→D, or pre-deal slice (§2)? Recommended: slice.
2. **Go-ahead** to install `@dnd-kit/*` and run `npm install`.
3. **Migration convention confirm:** Drizzle pg migration + manual sqlite
   bootstrap edit (current practice).
4. Say the word → I start **Phase 0** (1–2 days, gates included).
