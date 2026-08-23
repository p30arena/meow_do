# MeowDo Project Review

## Full-stack review — 2026-08-23

Second review pass covering backend, frontend, and infrastructure end to end. Each finding below was verified in source, fixed where safe, and re-verified with builds, the SQLite smoke test (`backend/scripts/sqlite-smoke.mjs`), ESLint, and an 11-check live API verification script (all passing).

### Fixed this round

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | P0 | **SQL injection via timezone** — `PUT /me/timezone` accepted arbitrary strings; `getTaskTrackingSummary` interpolated that value into Postgres SQL with `sql.raw()` (`task.controller.ts`). A malicious stored timezone executed attacker-controlled SQL. | Strict validation on write: `updateUserTimezoneSchema` now requires a valid IANA zone/offset plus a character whitelist. Defense in depth on read: `safeTimezone()` re-validates before any raw SQL interpolation and falls back to UTC for legacy rows. |
| 2 | P0 | **Registration logged the password** to the browser console (`RegisterForm.tsx`) — same class of issue as the LoginForm P0 from the previous review, missed on this form. | Log removed entirely. |
| 3 | P1 | **Cross-tenant writes** — `createGoal`/`createTask` never checked that the target workspace/goal belongs to the caller; any authenticated user could insert rows into another user's workspace. | Ownership check added; shared users are admitted only with an accepted share plus workspace-level `canEdit` (goals) or goal-level `canAddTask` / workspace-level `canEdit` (tasks), mirroring `checkPermission` semantics. Verified live: intruder writes get 404/403. |
| 4 | P1 | **Validation errors returned as 500s** — no error middleware existed, so every `ZodError` bubbled to Express's default handler (500 + stack trace in dev). | New centralized `errorHandler`: `ZodError` → 400 with per-field `issues`; PG unique violation → 409; everything else → sanitized 500 without stack leak. |
| 5 | P1 | **`getTaskTrackingSummary` ignored the `workspaceId` filter** — conditions were pushed onto the condition arrays *after* `.where(...)` had already been applied, for both owned and shared queries. | Filters moved before query execution; the goals join is now unconditional (safe — `goal_id` is NOT NULL). |
| 6 | P1 | **SQLite/Postgres divergence in `startTask`** — the SQLite path skipped the "another task is already active" guard, allowing parallel tracking records in SQLite mode only. | Unified flow: active-task check runs for both drivers; stale-record closing stays Postgres-only (server-side duration math). Verified: second start gets 400 in SQLite mode. |
| 7 | P1 | **No auth rate limiting / no security headers** — `/auth/*` allowed unlimited brute-force attempts; backend sent no hardening headers. | Added `express-rate-limit` (20 attempts / 15 min on `/api/v1/auth`, draft-8 headers) and `helmet()`. Verified live. |
| 8 | P1 | **Secrets baked into Docker images** — neither `Dockerfile` had a `.dockerignore`, so `COPY . /app/` shipped local `.env`, SQLite data files, and `node_modules` into image layers. | Added `backend/.dockerignore` and `frontend/.dockerignore`. |
| 9 | P2 | **JWT secret not validated at startup** — a missing `JWT_SECRET` produced a cryptic runtime failure on first login attempt. | Fail-fast startup check when missing/empty; loud warning when short or a known placeholder (`random_key`, …). |
| 10 | P2 | **CORS fully open with no opt-out.** | New optional `CORS_ORIGIN` env var (comma-separated allowlist); default remains permissive so existing local setups keep working. Documented in `.env.example`. |
| 11 | P2 | **`updatePermissions` accepted unvalidated body** — `resourceId`/`resourceType` were taken verbatim, allowing permission rows pointing at resources outside the workspace. | Zod schema (uuid + enum) plus containment check: workspace permissions must target the workspace itself; goal/task permissions must resolve inside the shared workspace. |
| 12 | P2 | **Broken/dead API function** — `copyTaskToNextDay()` called `POST /tasks/:id/copy-to-next-day`, which has never existed in the backend. | Removed (was unreferenced). |
| 13 | P2 | **Untranslated fallback string** — hardcoded `"Loading…"` in `App.tsx` authenticated Suspense fallback while every other state uses i18n. | Uses `t("loading")`. |
| 14 | P2 | **Weak input limits** — register schema had no maximum lengths (bcrypt silently truncates beyond 72 bytes). | `username ≤ 64`, `email ≤ 256`, `password ≤ 72`. Timezone capped at 64 chars. |
| 15 | P3 | **Hygiene**: obsolete `version:` key in `docker-compose.yml`; non-reproducible `npm install` in backend Dockerfile; nginx served no security headers. | Removed key; switched to `npm ci`; added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` (duplicated into locations that set their own `add_header`, since nginx does not inherit server-level headers there). |

### Noted, not fixed (deliberate)

- **JWT lifetime is 90 days** with no revocation/refresh. Acceptable for a self-hosted app; revisit if it ever becomes multi-tenant SaaS.
- **Email enumeration**: register/login responses distinguish known emails. Fixing requires uniform responses + timing normalization; left as-is for usability.
- **Client-supplied duration on manual records** is trusted (validated non-negative int). Low risk since it only affects the submitting user's own stats.
- **SQLite list endpoints use N+1 queries** (`getWorkspaces`/`getGoals`/`getTasks`). SQLite mode is positioned as a lightweight/local mode; Postgres path uses proper joins.
- **Frontend api layer duplicates token/fetch boilerplate** across six files. A small `request()` wrapper would remove ~200 lines; cosmetic.
- **`navigateFromParams` parses `window.location.pathname` manually** instead of using route context. Works correctly today; refactor candidate.

### Verification performed

- `backend`: `tsc` clean; SQLite smoke test passes (register → group → workspace → goal → task → start → stop → summary).
- `frontend`: ESLint clean; bundle-size test passes; production build succeeds.
- Live API checks against a running SQLite-mode server: all 11 passed, covering the new error handler, timezone validation, ownership guards, tracking parity, and rate limiting.

---

# Prior review — frontend UX focus

## Scope and method

Review focused on the React frontend, its primary workspace → goal → task workflow, responsive behavior, accessibility, internationalization, error states, and perceived performance. Backend architecture and project health were reviewed where they affect the user experience.

Evidence used:

- Source review of `frontend/src/App.tsx` and all feature-level UI components.
- Production build with `npm run build`.
- Static accessibility and responsive-layout review.
- Attempted browser review against the local Vite server. The server ran, but the available browser harness repeatedly timed out before creating a tab; authenticated end-to-end flows also require the backend and database. Findings that require visual confirmation are identified as such rather than presented as observed behavior.

## Executive assessment

The product has a coherent domain model, useful task-tracking functionality, localization/RTL support, and a reusable component base built on Radix primitives. The main UX risk is not visual styling; it is workflow resilience. Routine API failures replace entire working screens, navigation depends on transient router state/history, and several core interactions are unavailable to keyboard and touch users. These failures conflict directly with the project's stated mobile-first and accessible goals.

Recommended order:

1. Make primary workflows recoverable: preserve content on mutation errors, provide retries, and stop relying on history/state for navigation and titles.
2. Make cards and grouping operable by keyboard and touch.
3. Fix mobile layout and accessibility semantics.
4. Reduce initial/PWA payload and simplify theme/settings complexity.
5. Restore a clean lint boundary and add focused behavioral coverage.

## Findings

### P0 — Login writes the user's password to the browser console

**Evidence:** `frontend/src/components/auth/LoginForm.tsx:51-55` logs both email and password before calling the API.

**Impact:** Credentials can be captured by shared-device console history, remote debugging, monitoring wrappers, support recordings, or browser extensions. This is a release blocker independent of UI polish.

**Recommendation:** Delete the log entirely. Do not replace it with masked credentials; authentication attempts do not need client-side credential logging.

### P1 — Any list error replaces the entire workflow with a dead-end message

**Evidence:**

- `WorkspaceList.tsx:222-231`, `GoalList.tsx:82-91`, and `TaskList.tsx:360-369` return early when `error` is set.
- Mutation handlers reuse the same screen-level `error` state (`WorkspaceList.tsx:89-102`, `140-157`, `165-195`, `202-215`; `TaskList.tsx:254-275`, `295-335`, `340-355`).
- The resulting error view has no retry, dismiss, or navigation action.

**Impact:** A failed rename, drag/drop, delete, tracking action, or temporary network request removes all useful content and strands the user. Existing data disappears even when it remains valid. This is especially damaging in an intermittent mobile connection and PWA.

**Recommendation:** Separate initial-load errors from mutation errors. Keep stale content visible, show mutation failures in an announced toast/inline callout, and offer retry where safe. Initial-load errors need a primary retry action and a route back.

### P1 — Navigation and page identity depend on transient history state

**Evidence:**

- Workspace and goal names are passed through `navigate(..., { state })` in `App.tsx:139-141` and `249-250`.
- Detail views read those names with an empty-string fallback in `App.tsx:227-228` and `264-265`.
- Back actions use `navigate(-1)` in `App.tsx:175-207`, `239`, and `276`.

**Impact:** Refreshing or directly opening a valid goal/task URL loses the page name (for example, “Tasks for ”). A user entering from a bookmark or external link can be sent outside the app by “Back,” or to an unrelated prior route. Form success and cancel are similarly history-dependent.

**Recommendation:** Fetch/display resource identity from route IDs or a route-level loader/cache. Use deterministic parent URLs for breadcrumbs, cancel, and success. Render a real breadcrumb hierarchy: Workspaces / Workspace / Goal.

### P1 — Workspace and goal cards are mouse-only controls

**Evidence:**

- Workspace cards are clickable `<div>`-based `Card` components with `onClick` (`WorkspaceList.tsx:375-380`) but no link/button semantics, tab stop, or keyboard handler.
- Goal cards use the same pattern (`GoalList.tsx:106-108`).

**Impact:** Keyboard and switch-device users cannot open two of the three primary hierarchy levels. Screen readers do not receive a control role or destination. Nested action menus inside a clickable container also create competing interaction semantics.

**Recommendation:** Make the title or card body a real React Router `<Link>`. Keep the overflow menu a separate sibling action. Do not emulate links with `role`, `tabIndex`, and key handlers when a native link is available.

### P1 — Workspace grouping excludes touch and keyboard users

**Evidence:** Group movement is implemented only with HTML drag events (`WorkspaceList.tsx:105-131`, `282-286`, `375-379`). Empty groups instruct users to “drag workspaces here” (`WorkspaceList.tsx:506-509`). No move menu or touch/keyboard alternative exists.

**Impact:** HTML drag-and-drop is unreliable or unavailable on touch screens and inaccessible to keyboard users. Grouping is a headline workspace feature, yet it conflicts with the stated mobile-first goal.

**Recommendation:** Add a “Move to group” action in each workspace menu using the existing Radix menu/select primitives. Keep drag-and-drop as an optional desktop shortcut. Announce the successful move and preserve focus.

### P1 — Mobile headers can collide and wrap unpredictably

**Evidence:**

- The fixed navbar has no height contract (`Navbar.tsx:33`) while content uses a hard-coded `pt-16` (`App.tsx:130`).
- Detail headers force `justify-between items-center` with a potentially long localized heading and text back button (`App.tsx:237-241`, `274-278`) and no mobile stacking/wrapping strategy.
- The mobile drawer is only 200 px wide below the `sm` breakpoint (`Navbar.tsx:47-50`, `94-97`), while it contains profile data, localized controls, invitations, and nested settings.

**Impact:** Long workspace/goal names and Arabic/Farsi labels can overlap, squeeze, or wrap into poor tap targets. Navbar growth can obscure page content because the offset remains fixed. The narrow drawer creates truncation pressure.

**Recommendation:** Use a sticky, in-flow header or derive a single shared height token. Stack detail title/actions on narrow screens (`flex-col items-start`) and constrain long names with intentional wrapping. Use a near-full-width mobile sheet with a sensible maximum width.

### P1 — Destructive confirmations do not visually identify the destructive action

**Evidence:** Delete confirmations use the default `AlertDialogAction` in `WorkspaceList.tsx:488-495`, `GoalList.tsx:201-207`, and `TaskList.tsx:619-626`; group deletion does the same at `WorkspaceList.tsx:362-366`. The default action styling is not destructive.

**Impact:** Confirm and cancel have insufficient visual differentiation during irreversible actions. Generic `confirmDeleteDescription` wording also weakens consequence clarity, especially when deleting containers with nested goals/tasks.

**Recommendation:** Style the delete action with the destructive variant and label it specifically (“Delete workspace,” not “Confirm”). State scope and consequence in the description. Default focus should remain on Cancel for destructive operations.

### P2 — Loading feedback is disruptive and does not preserve context

**Evidence:** Lists return plain text during loading (`WorkspaceList.tsx:222-224`, `GoalList.tsx:82-84`, `TaskList.tsx:360-362`). Workspace mutations set the shared `loading` flag, replacing the entire list (`WorkspaceList.tsx:89-102`, `140-157`, `179-195`, `202-215`).

**Impact:** The screen flashes to a text-only state during routine operations, scroll/focus context is lost, and users cannot distinguish initial loading from a targeted update. No loading state is programmatically announced.

**Recommendation:** Reserve full-page skeletons for initial load. Use local pending state on the affected card/group/action, disable only conflicting actions, retain layout, and expose status with `aria-live="polite"` or Radix toast.

### P2 — Error and status messages are not announced accessibly

**Evidence:** Form and operation errors are plain `<p>`/`<div>` elements, for example `LoginForm.tsx:85-96`, `TaskList.tsx:364-369`, and `TimezoneSelector.tsx:78-80`. Inputs do not connect errors through `aria-describedby` or `aria-invalid`. The mobile menu icon button lacks an accessible name (`Navbar.tsx:42-45`).

**Impact:** Screen-reader users may not learn that submission failed or which field needs correction. The menu trigger may be announced only as an unlabeled button.

**Recommendation:** Add a localized screen-reader label to the menu trigger. Give form errors stable IDs, connect them to inputs, set `aria-invalid`, and announce submit/server status through `role="alert"` or an appropriate live region. Move keyboard focus to a form-level error summary after failed submit when multiple fields fail.

### P2 — Color tokens are bypassed, weakening themes and contrast consistency

**Evidence:** Feature components repeatedly use fixed `text-gray-500`, `text-blue-500`, `text-red-500`, and related hover colors (for example `WorkspaceList.tsx:328-341`, `406`; `TaskList.tsx:375-376`, `512`; `App.tsx:99-100`, `115-116`, `239`, `276`) despite semantic tokens in `index.css`.

**Impact:** Fixed palette colors behave inconsistently across ten base themes and dark mode. Some secondary text and actions may miss contrast expectations depending on the selected theme. Meaning is also encoded primarily by red/blue/green in several places.

**Recommendation:** Use `text-muted-foreground`, `text-destructive`, `text-primary`, and component variants. Verify each supported theme against WCAG contrast. Pair colored status dots/text with visible labels or icons, not tooltip-only meaning.

### P2 — The theme selector is over-complex and partly untranslated

**Evidence:** `ThemeToggle.tsx:49-79` exposes ten base themes plus light/dark/system. Theme names and “Toggle light/dark mode” are hard-coded English. `index.css` contains more than 1,000 lines dominated by theme variables.

**Impact:** A productivity tool presents 30 effective appearance combinations in a primary navigation area. This increases decision cost, QA surface, accessibility contrast risk, and maintenance cost without improving the core task workflow. Hard-coded labels break the localized experience.

**Recommendation:** Keep system/light/dark and at most one deliberate brand palette in primary settings. If multiple themes are a product requirement, move them into an “Appearance” screen with previews and translated names; formally test contrast for every combination.

### P2 — Initial and offline payloads are excessive for a mobile-first PWA

**Evidence from `npm run build`:**

- Main JavaScript chunk: 1,782.89 kB minified / 519.84 kB gzip.
- Workbox precache: 63 entries totaling 6,712.12 KiB.
- Mermaid-related diagram chunks, KaTeX (265.45 kB), Cytoscape (439.76 kB), and many diagram renderers are emitted.
- Vite reports chunks larger than 500 kB.

**Impact:** Slower first use, more CPU parse/compile work, and a heavy service-worker update—most visible on mobile hardware and limited connections. Aggressive precaching amplifies the cost even for users who never view a Mermaid description.

**Recommendation:** Lazy-load Markdown/Mermaid rendering only when expanded; configure Mermaid for required diagram types where possible; route-split authenticated screens and charts; exclude nonessential lazy chunks from initial precache. Set and enforce a bundle budget.

### P2 — Authentication readiness can flash the login screen

**Evidence:** The route branch uses `!user || !isAuthReady` in `App.tsx:91`, rendering unauthenticated routes while authentication is still being resolved.

**Impact:** Returning users can see a login flash and interact with the wrong UI before session restoration completes. It also conflates “not authenticated” with “authentication state unknown.”

**Recommendation:** Render a dedicated app-shell/session loading state until `isAuthReady`; only then choose authenticated or unauthenticated routes.

### P2 — Not-found and unauthenticated deep-link handling provide no recovery

**Evidence:** Both authenticated and unauthenticated catch-all routes render `NoMatch` (`App.tsx:125`, `211`). `NoMatch` contains only a heading and paragraph (`App.tsx:300-307`).

**Impact:** A signed-out user opening a shared/deep URL gets a generic not-found page rather than login plus a return target. Any 404 is a dead end without a home/back action.

**Recommendation:** Use an auth guard that preserves the intended URL and redirects to login. Give the 404 screen a primary route back to Workspaces and a secondary safe back action.

### P2 — Group management has data and feedback ambiguities

**Evidence:**

- New empty groups exist only in component state (`WorkspaceList.tsx:133-138`) and disappear after refresh because groups are reconstructed from workspace records (`WorkspaceList.tsx:66-75`).
- Group rename/delete updates workspaces sequentially (`WorkspaceList.tsx:140-152`, `182-188`) without transaction semantics or progress.
- The save control for a renamed group uses a pencil icon (`WorkspaceList.tsx:302-311`), which still communicates “edit,” not “save.”

**Impact:** Users can create an empty group and lose it on reload. Partial network failure can leave a mixed group state. Feedback and icon semantics do not match the operation.

**Recommendation:** Either persist groups as first-class backend entities or clearly make grouping an attribute selected on workspaces and remove empty-group creation. Use a single transactional bulk endpoint for rename/delete. Use Check/Save and X/Cancel actions with explicit labels.

### P3 — Progress presentation is dense and ambiguous

**Evidence:** Every task card repeats budget, daily fraction, percentage, progress bar, overall spent, status, priority, deadline, timer, and up to three actions (`TaskList.tsx:435-633`). The progress bar caps visually at 100% while displayed percentages can exceed 100% (`TaskList.tsx:464-472`).

**Impact:** Scanning many tasks is slow, especially on mobile. Over-budget effort cannot be inferred from the bar because 100% and 250% look identical. Priority is shown as an unexplained number from 1–10.

**Recommendation:** Establish a compact card hierarchy: title + running/status indicator, primary time signal, deadline/priority badge, then actions. Move secondary totals to details. Represent over-budget explicitly with a semantic state and label; explain priority direction or use named levels.

### P3 — App version is persistent visual noise

**Evidence:** `App.tsx:213-215` renders `App Version: ...` below every authenticated route.

**Impact:** Build metadata competes with task content and looks unfinished in the main workflow.

**Recommendation:** Move version information to Settings/About or expose it only in diagnostics/support UI.

### P3 — Frontend quality gate is not clean

**Evidence from `npm run lint`:** 62 findings: 51 errors and 11 warnings. The lint target includes generated `dev-dist/workbox-54d0af47.js`, causing invalid rule-definition errors; source issues include widespread explicit `any`, stale hook dependencies, unused values, and fast-refresh boundary warnings.

**Impact:** Real regressions are hidden in baseline noise, generated assets are treated as source, and hook dependency warnings can represent stale data behavior.

**Recommendation:** Exclude generated `dist`/`dev-dist` assets, align ESLint and TypeScript ESLint versions/rules, then resolve source findings. Make lint and production build required CI checks.

## What is working well

- Radix-based dialogs, menus, selects, sheets, and toasts provide a stronger accessibility foundation than custom primitives.
- Form labels are generally associated with inputs, and icon-only overflow actions commonly include screen-reader text.
- `App.tsx:33-46` updates document language and text direction when locale changes.
- The navigation drawer changes side for RTL (`Navbar.tsx:47-49`, `177-179`), and logical margin utilities such as `me-2` are used in navigation.
- Primary forms use schema validation and disable submit while requests are active.
- Destructive operations generally request confirmation instead of executing immediately.
- The production frontend build completes successfully.

## Concrete remediation plan

This plan is ordered by dependency and risk. Complete phases in sequence. Each work item names the implementation boundary and its observable acceptance criteria.

### Phase 0 — Remove credential exposure

#### 0.1 Delete credential logging

**Files:** `frontend/src/components/auth/LoginForm.tsx`

**Change:**

- Remove the pre-login `console.log` and its credential object.
- Keep failure logging free of request payloads and tokens.

**Acceptance:**

- Submitting login never writes the email, password, token, or full authentication response to the console.
- Login success and failure behavior otherwise remains unchanged.

**Verification:**

- Exercise one successful and one rejected login with the browser console open.
- Search authentication code for logs containing credentials or tokens.

### Phase 1 — Make navigation deterministic

#### 1.1 Introduce authenticated route guards

**Files:** `frontend/src/App.tsx`, `frontend/src/context/AuthContext.tsx`

**Change:**

- Render a dedicated session-loading state while `isAuthReady` is false.
- After readiness, redirect signed-out users from protected URLs to `/`, preserving the requested URL in router state.
- After login or registration, return users to the preserved URL; default to `/workspaces`.
- Keep authenticated and public route trees explicit rather than using the current combined boolean branch.

**Acceptance:**

- Returning users do not see the login form while session restoration is pending.
- Opening a protected deep link while signed out leads to login and returns to that exact route after authentication.
- Authenticated users visiting `/` are redirected to `/workspaces`.

**Verification:**

- Exercise cold-load session restoration, signed-out deep linking, successful login return, and expired-session behavior.

#### 1.2 Stop using transient router state for page titles

**Files:** `frontend/src/App.tsx`, `frontend/src/api/workspace.ts`, `frontend/src/api/goal.ts`

**Change:**

- Resolve the current workspace and goal by route ID using existing API conventions.
- Show a content skeleton while names load and a recoverable not-found/error state if the resource cannot be resolved.
- Remove `workspaceName` and `goalName` from navigation state.

**Acceptance:**

- Refreshing or directly opening any valid workspace, goal, or task-list URL renders the complete localized title.
- Stale or invalid IDs produce a useful recovery screen rather than “Goals for ” or “Tasks for ”.

**Verification:**

- Directly load and refresh each hierarchy level without prior in-app navigation.

#### 1.3 Replace history-relative navigation

**Files:** `frontend/src/App.tsx`, `frontend/src/components/workspace/WorkspaceForm.tsx`, `frontend/src/components/goal/GoalForm.tsx`, `frontend/src/components/task/TaskForm.tsx`

**Change:**

- Replace `navigate(-1)` for hierarchy navigation, form cancel, and form success with explicit parent URLs derived from route parameters.
- Add breadcrumbs for Workspaces / Workspace / Goal.
- Give the not-found screen a primary link to Workspaces; show a login link when signed out.

**Acceptance:**

- Back, Cancel, and successful Save always land on the logical parent, regardless of browser-entry history.
- Breadcrumbs remain correct after refresh and are keyboard accessible.
- No application action can navigate the user outside MeowDo through history traversal.

**Verification:**

- Open each form directly in a new tab and test Cancel and Save.
- Enter detail URLs from an external page and test every in-app back action.

### Phase 2 — Preserve workflows during failures

#### 2.1 Separate initial-load and mutation state

**Files:** `frontend/src/components/workspace/WorkspaceList.tsx`, `frontend/src/components/goal/GoalList.tsx`, `frontend/src/components/task/TaskList.tsx`

**Change:**

- Replace the shared `loading`/`error` pair with distinct initial-load, refresh, and mutation state.
- Keep successfully loaded content mounted when a mutation fails.
- Show a retry action for initial-load failures.
- Show mutation failures through the existing toast system or a dismissible inline callout.
- Track pending state by affected entity/action; disable only conflicting controls.

**Acceptance:**

- A failed create, rename, move, delete, start, stop, or manual-record operation does not remove existing list content.
- Initial-load failures offer Retry and a safe parent route.
- Repeated submissions are prevented only for the action currently in flight.
- Focus and scroll position remain stable after success or failure.

**Verification:**

- Force a rejected API response for every mutation family and confirm content, focus, retry, and error announcements.
- Exercise slow initial loads and slow mutations separately.

#### 2.2 Replace disruptive text loading states

**Files:** the three list components above, `frontend/src/components/task/TaskTrackingChart.tsx`

**Change:**

- Add layout-preserving skeletons for first load.
- Retain stale charts and lists during background refresh, with a small localized updating indicator.
- Announce loading and completion with a polite live region.

**Acceptance:**

- Routine refreshes do not collapse the page or replace it with a text-only message.
- Loading status is perceivable without relying on animation.
- Layout shift is minimal at 320, 375, 768, and 1440 px widths.

**Verification:**

- Throttle API responses and inspect initial load, refresh, and mutation transitions at all target widths.

### Phase 3 — Make primary actions accessible

#### 3.1 Convert card navigation to native links

**Files:** `frontend/src/components/workspace/WorkspaceList.tsx`, `frontend/src/components/goal/GoalList.tsx`

**Change:**

- Remove card-level `onClick` navigation.
- Make each card title and a clearly sized card-body region a React Router `<Link>`.
- Keep sharing/edit/delete menus outside the link’s interactive subtree.
- Preserve visible keyboard focus using existing semantic ring tokens.

**Acceptance:**

- Every workspace and goal is reachable and openable with Tab and Enter.
- Screen readers announce the item as a link and expose its destination.
- Menu actions do not trigger card navigation.
- Links support standard browser behaviors such as opening in a new tab.

**Verification:**

- Complete the hierarchy using keyboard only.
- Test Enter, Cmd/Ctrl+Enter, context menu, and overflow-menu actions.

#### 3.2 Add a non-drag group movement path

**Files:** `frontend/src/components/workspace/WorkspaceList.tsx`

**Change:**

- Add “Move to group” to each workspace overflow menu.
- Present existing groups plus Ungrouped using the current Radix menu/select primitives.
- Keep drag-and-drop only as an optional pointer shortcut.
- Announce successful movement and restore focus to the moved workspace or its menu trigger.

**Acceptance:**

- A workspace can be moved between every group using touch, keyboard, and pointer input.
- Drag-and-drop is not required to discover or complete grouping.
- Empty-group copy no longer instructs users to drag as the only action.

**Verification:**

- Move a workspace with keyboard only and in a touch-sized viewport.
- Confirm RTL menu alignment and focus restoration.

#### 3.3 Connect errors, statuses, and icon controls to accessible semantics

**Files:** authentication/forms/list components, `frontend/src/components/Navbar.tsx`, shared UI primitives where the behavior is universal

**Change:**

- Give the mobile menu trigger a localized accessible name.
- Give validation messages stable IDs; set `aria-invalid` and `aria-describedby` on invalid controls.
- Use `role=\"alert\"` for submission failures and polite live regions for non-urgent operation status.
- Focus a form-level error summary when multiple fields fail.
- Ensure colored status dots also have visible text or an accessible label.

**Acceptance:**

- Every icon-only button has a localized accessible name.
- A screen reader announces validation and server failures once, with the relevant field relationship.
- Shared/running/status meaning is available without color or hover.

**Verification:**

- Run axe on login, registration, each form, each list, dialogs, and mobile navigation.
- Manually verify keyboard order and screen-reader announcements.

#### 3.4 Correct destructive-action semantics

**Files:** workspace, goal, and task list components; localized message resources

**Change:**

- Apply the destructive button variant to delete confirmations.
- Replace generic “Confirm” labels with object-specific actions.
- State whether nested goals, tasks, records, or memberships are affected.
- Keep initial focus on Cancel.

**Acceptance:**

- Every irreversible action clearly names the object and consequence.
- Delete is visually distinct in every supported theme.
- Opening a destructive dialog does not put keyboard focus on Delete.

**Verification:**

- Inspect and keyboard-test workspace, group, goal, and task deletion in light/dark modes and all retained themes.

### Phase 4 — Repair mobile and RTL layout

#### 4.1 Make the application header participate in layout

**Files:** `frontend/src/App.tsx`, `frontend/src/components/Navbar.tsx`

**Change:**

- Prefer a sticky in-flow navbar and remove the unrelated hard-coded `pt-16`; otherwise define one shared height token used by both.
- Allow localized controls and user data to wrap or truncate intentionally.
- Expand the mobile sheet to near viewport width with a maximum width instead of 200 px.

**Acceptance:**

- Content is never covered by the navbar at 200% zoom or with long translated labels.
- Mobile navigation remains usable at 320 px in English, Arabic, and Farsi.
- Opening and closing nested settings preserves logical focus.

**Verification:**

- Test 320/375/768/1440 px, 200% zoom, all locales, and both text directions.

#### 4.2 Stack detail headers and form actions on narrow screens

**Files:** `frontend/src/App.tsx`, workspace/goal/task form components, time-record dialogs

**Change:**

- Stack title/breadcrumb/action groups below the mobile breakpoint.
- Permit long resource names to wrap without shrinking adjacent actions.
- Make primary form actions full-width or vertically stacked where two buttons cannot maintain 44 px targets.
- Replace fixed four-column dialog rows with responsive label/control layouts.

**Acceptance:**

- Long names and translations do not overlap controls or create horizontal scrolling.
- Tap targets are at least 44 × 44 CSS pixels for primary mobile interactions.
- Dialog fields and actions fit at 320 px without clipping.

**Verification:**

- Test representative longest strings and long user-provided names at target widths and 200% zoom.

#### 4.3 Use semantic color tokens consistently

**Files:** `frontend/src/App.tsx`, all feature components, `frontend/src/index.css`

**Change:**

- Replace fixed gray/blue/red/green utilities with semantic foreground, muted, primary, destructive, and status tokens.
- Define explicit success/running/warning tokens if existing tokens cannot express those states.
- Pair state colors with text or icons.

**Acceptance:**

- Text and controls meet WCAG AA contrast in every retained theme and light/dark mode.
- No workflow status is communicated by color alone.

**Verification:**

- Run automated contrast checks and manually inspect hover, focus, disabled, destructive, warning, and running states.

### Phase 5 — Clarify grouping and task information

#### 5.1 Choose and implement one persistent group model

**Files:** `frontend/src/components/workspace/WorkspaceList.tsx`, workspace API/backend route/schema/migration files as required

**Decision:** Make groups first-class persisted workspace-owner resources. This matches the existing “Create group,” rename, delete, and empty-group UI; retaining client-only groups would continue to violate user expectations.

**Change:**

- Add persisted group create/rename/delete/reorder operations scoped to the user.
- Move all workspaces during group rename/delete in one backend transaction.
- Replace sequential per-workspace requests with one group operation.
- Use Save/Check and Cancel/X semantics while renaming.

**Acceptance:**

- Empty groups survive refresh and a new session.
- Rename/delete either completes fully or leaves all records unchanged.
- Pending, success, duplicate-name, and failure feedback is localized and recoverable.

**Verification:**

- Test empty-group persistence, duplicate names, group deletion with members, interrupted requests, and transaction rollback.

#### 5.2 Simplify task cards

**Files:** `frontend/src/components/task/TaskList.tsx`, shared task-status presentation if extracted

**Change:**

- Keep the card’s scan layer to title, running/status state, primary daily time signal, deadline/priority badge, and actions.
- Move overall totals and secondary metadata into an expandable detail region.
- Give priority named, localized levels or explicitly label the 1–10 direction.
- Add an explicit over-budget state rather than only capping the bar at 100%.

**Acceptance:**

- Users can identify running, overdue, high-priority, and over-budget tasks without opening details.
- Percentages above 100% are visually and textually distinct from exactly 100%.
- The primary Start/Stop action remains visible without horizontal crowding at 320 px.

**Verification:**

- Review cards with zero, normal, exactly complete, and over-budget time; all statuses; priorities 1 and 10; and long translated content.

#### 5.3 Reduce settings noise

**Files:** `frontend/src/components/ThemeToggle.tsx`, `frontend/src/components/Navbar.tsx`, `frontend/src/index.css`, localization resources

**Decision:** Retain system/light/dark with one brand palette. Remove the remaining theme choices and their unused CSS in a clean cutover.

**Change:**

- Move appearance controls inside Settings instead of keeping multiple top-level navbar controls.
- Translate all appearance labels and accessible names.
- Move app version to a Settings/About section.

**Acceptance:**

- Primary navigation emphasizes workspace/task actions rather than configuration.
- No hard-coded English remains in appearance controls.
- Removed themes leave no CSS, state, or migration aliases behind.

**Verification:**

- Test persisted system/light/dark selection, locale changes, and version visibility in About.

### Phase 6 — Reduce initial and offline cost

#### 6.1 Route-split authenticated features

**Files:** `frontend/src/App.tsx` and feature entry components

**Change:**

- Lazy-load workspace forms/sharing, goal views/forms, task views/forms, and charts at route or dialog boundaries.
- Provide stable Suspense fallbacks matching final layout.

**Acceptance:**

- Login and workspace-list entry do not download task charting or form code before required.
- Route transitions show a non-jarring localized fallback.

#### 6.2 Lazy-load rich description rendering

**Files:** `frontend/src/components/common/DescriptionViewer.tsx`, `MarkdownRenderer.tsx`, `Mermaid.tsx`, Vite/PWA configuration

**Change:**

- Load Markdown/Mermaid only when a description requiring it is expanded.
- Limit Mermaid diagram registrations to supported product needs where its API permits.
- Exclude optional rich-rendering chunks from eager service-worker precache.

**Acceptance:**

- Users who do not expand rich descriptions do not download Mermaid, KaTeX, Cytoscape, or diagram renderers.
- Offline viewing still works after a rich description has been opened once if runtime caching is enabled.

#### 6.3 Enforce performance budgets

**Files:** `frontend/vite.config.ts`, package scripts/CI configuration

**Budgets:**

- Initial route JavaScript: ≤ 250 kB gzip.
- Largest asynchronously loaded feature chunk: ≤ 200 kB gzip unless documented.
- Install-time PWA precache: ≤ 1.5 MiB.

**Acceptance:**

- Production build reports and enforces the budgets.
- Exceeding a budget fails CI rather than emitting only a warning.

**Verification for Phase 6:**

- Run a clean production build and record initial chunks, lazy chunks, and precache size.
- Use a throttled mobile profile to verify login and workspace-list interactivity.

### Phase 7 — Restore the quality boundary

#### 7.1 Repair lint configuration, then clear source findings

**Files:** frontend ESLint configuration, ignore configuration, and files named by current lint output

**Change:**

- Exclude `dist`, `dev-dist`, service workers, and other generated assets.
- Align ESLint and TypeScript ESLint rule/plugin versions.
- Replace explicit `any` with bounded types, resolve hook dependency warnings without disabling rules, and fix remaining unused/refresh-boundary findings.

**Acceptance:**

- `npm run lint` exits zero with no warnings.
- Generated output is not linted.
- No lint rule is suppressed solely to reach a clean result.

#### 7.2 Add behavioral regression coverage

**Files:** existing frontend test location, or establish one using the lightest stack compatible with Vite/React

**Required contracts:**

- Session readiness and signed-out deep-link return.
- Deterministic title, breadcrumb, Back, Cancel, and Save destinations after direct entry.
- Initial-load retry and content preservation after every mutation-error family.
- Keyboard card navigation and menus.
- Group movement without drag-and-drop.
- Persistent/transactional group operations.
- Over-budget task presentation.

**Acceptance:**

- Each test fails under the corresponding current defect and passes after its fix.
- Tests assert user-observable behavior rather than component internals.

#### 7.3 Add final accessibility and responsive gates

**Change:**

- Run automated accessibility checks on public routes, hierarchy lists, forms, dialogs, settings, and error/loading states.
- Manually test keyboard, screen reader, touch, RTL, 200% zoom, reduced motion, and retained theme contrast.

**Acceptance:**

- No critical or serious automated accessibility violations.
- Every primary workflow is completable by keyboard and touch.
- English, Arabic, and Farsi pass at 320, 375, 768, and 1440 px without horizontal page scrolling.

### Definition of done

The remediation is complete only when:

- All Phase 0–7 acceptance criteria pass.
- `npm run lint` and `npm run build` exit zero without warnings owned by the project.
- Focused behavioral tests pass in CI.
- Bundle and precache budgets pass.
- Browser verification covers signed-out and authenticated end-to-end workflows at desktop and mobile widths.
- Keyboard, touch, screen-reader, RTL, zoom, reduced-motion, and contrast checks are recorded.
- Obsolete router-state navigation, client-only group handling, removed themes, fixed palette utilities, and generated lint targets are deleted rather than retained as compatibility paths.

## Implementation status

Implemented in the current branch:

- Session-ready shell, protected-route recovery, deterministic resource titles, breadcrumbs, and explicit parent navigation.
- Credential-log removal, stale-content preservation, retry/error states, accessible form errors, native hierarchy links, and non-drag workspace movement.
- Responsive navbar/sheets, semantic status colors, destructive action styling, over-budget task messaging, and simplified appearance controls.
- Persisted workspace groups with transactional rename/delete backend operations and migration `backend/drizzle/0007_workspace_groups.sql`.
- Optional SQLite backend mode selected with `DB_DRIVER=sqlite` and `SQLITE_PATH`; PostgreSQL remains the default.
- SQLite startup schema creation, UUID/time compatibility functions, authenticated workspace/goal/task flows, group transactions, task tracking, and adapter smoke coverage.
- Route-level lazy loading, on-demand Markdown/Mermaid rendering, reduced PWA precache, and enforced bundle budgets.
- Clean frontend/backend compilation gates plus regression tests for bundle budgets and SQLite boot/auth/workspace behavior.

Remaining verification limitation:

- The browser harness timed out before creating a tab, so visual keyboard, screen-reader, touch, RTL, zoom, reduced-motion, contrast, and authenticated end-to-end checks still require execution in a working browser environment.

## Database support

PostgreSQL remains the recommended production database. SQLite is now supported for local and single-process deployments:

```bash
cd backend
npm ci
DB_DRIVER=sqlite SQLITE_PATH=./data/meowdo.sqlite JWT_SECRET=local-secret npm run dev
```

The SQLite database and tables are created automatically. Do not run `drizzle:migrate` in SQLite mode; that command is PostgreSQL-specific. SQLite mode intentionally targets one backend process. Use PostgreSQL for multi-instance deployments and high-concurrency sharing workloads.

## Verification record

- `frontend: npm run build` — passed. Vite still reports a large-chunk warning for optional rich-rendering dependencies.
- `frontend: npm run lint` — passed with generated `dist`/`dev-dist` assets excluded.
- `frontend: npm test` — passed, including the bundle-budget regression test.
- `frontend: npm run check:bundle` — passed: initial entry `200,313 B` gzip, largest async chunk `140,941 B` gzip, precache `1,071,901 B`.
- `backend: npm run build` — passed.
- `backend: npm test` — passed SQLite registration, group create/rename, workspace/goal/task creation, permission-protected task start/stop, and tracking summary.
- English, Arabic, and Farsi locale JSON — parsed successfully.
- Local Vite server — started successfully and returned the application shell over HTTP.
- Browser surface review — blocked by the browser harness timing out before tab creation; no visual or end-to-end claims are presented as directly observed.
