# MeowDo — UI/UX Review

**Reviewer:** Mercury (acting Senior PM/Product Designer)
**Date:** 2026-08-23
**Scope:** Frontend (`frontend/src`) — information architecture, core loops, screen-level UX, visual design
**Verdict up front:** Solid engineering foundation, weak product thinking. The app mirrors its database schema instead of the user's day. It's usable, but it doesn't yet earn daily return visits — which is the entire job of a habit/tracker app.

---

## 1. Executive Summary

MeowDo's README promises a *mobile-first, intuitive, motivating* goals/tasks/time tracker. Today it delivers a competent **CRUD admin panel**, not a daily companion.

The single biggest problem: **there is no "Today."** The core question a user opens the app with — *"What should I work on right now?"* — requires navigating Workspace → Goal → Task, scanning grouped card lists, and mentally assembling their day from scattered progress bars. That loop must be one tap. Everything else in this review is secondary to that.

Secondary themes:

1. **Structure-first, not action-first IA** — the nav hierarchy is the data model.
2. **Cards are walls of labeled text** — no visual hierarchy, no scannability.
3. **The timer — the hero feature — is buried three levels deep** and stopping it demands a datetime dialog.
4. **Zero emotional payoff** — no streaks, history, weekly view, or momentum. Nothing motivates a return visit.
5. **Mobile-first claim vs reality gaps** — drag-to-group is desktop-only; forms have no mobile ergonomics.

---

## 2. Scorecard

| Dimension | Score | Notes |
|---|---|---|
| Information architecture | ★★☆☆☆ | Schema-shaped navigation; no home/today surface |
| Core loop (track time) | ★★☆☆☆ | Buried 3 levels deep; stop-flow over-engineered |
| Visual design | ★★★☆☆ | Clean shadcn base, but flat, text-heavy, token inconsistencies |
| Mobile experience | ★★☆☆☆ | Responsive ≠ mobile-first; DnD broken on touch |
| Feedback & loading states | ★★★☆☆ | Good error/retry pattern; plain-text loaders, janky transitions |
| Accessibility & i18n | ★★★★☆ | Genuinely strong: RTL, lang/dir switching, aria live regions, focus rings |
| Delight / motivation | ★☆☆☆☆ | None. No reward loop whatsoever |

---

## 3. Top Problems (prioritized)

### P0 — No "Today" view; the product has no front door
**Evidence:** `App.tsx` routes land on `/workspaces`. There is no aggregated view of tasks due today, running timers, or overall progress.
**Impact:** The #1 job-to-be-done ("start my next task") costs 3–4 taps plus scanning. Daily-active behavior dies here.
**Recommendation:** Build a **Today** screen as the default route after login:
- Currently-running timer pinned at top (with stop button inline)
- Tasks due today / overdue across *all* workspaces
- One-tap start from this list
- Day budget ring: spent vs planned minutes

### P0 — Stopping the timer is hostile
**Evidence:** `TaskList.tsx` — `showStopTrackingDialog` opens a dialog requiring a `datetime-local` edit to simply stop working.
**Impact:** The highest-frequency action in the product has the highest friction. Every stop becomes a micro-chore.
**Recommendation:** One tap stops the timer now; offer "adjust end time" as an optional secondary action afterward (or in the manual-record form, which already exists).

### P1 — Cards communicate via label:value prose, not hierarchy
**Evidence:** `TaskList.tsx` renders `Time budget: 30 minutes`, `Status: pending`, `Priority: 1`, `Overall spent: …` as stacked `<p><strong>label:</strong> value</p>` rows. Same pattern in `GoalList.tsx` and `WorkspaceList.tsx`.
**Impact:** Nothing is scannable. Status/priority/budget have equal visual weight; users read every card fully. With 20+ tasks this is exhausting.
**Recommendation:** Establish a card anatomy:
- Title (bold) + status as a colored badge/chip (you already have the color mapping in `TaskListDivider` — reuse it on cards)
- Priority as an icon/flame count or "P1…P10" chip, not a raw number
- Budget/spent as a compact progress bar with `45m / 1h 30m` caption — drop "minutes" everywhere; humans read hours+minutes
- Deadline only when near/overdue (highlight red)

### P1 — Priority exists but does nothing
**Evidence:** Priority 1–10 is set in `TaskForm.tsx`, displayed in `TaskList.tsx` — never sorted or filtered by it. Lists render in API order, then get bucketed by status only.
**Impact:** Users invest in metadata that changes nothing. Trust erodes.
**Recommendation:** Sort Pending/Started groups by priority desc (then deadline asc). Long-term: let priority drive ordering in the future Today view.

### P1 — Navbar is a settings shelf with zero navigation
**Evidence:** `Navbar.tsx` — brand link is the *only* navigational element. Everything else (install PWA, language, theme, invitations, settings) is utility chrome. Mobile and desktop variants duplicate ~150 lines of identical JSX including nested Sheet-in-Sheet for settings.
**Impact:** No sense of place; no way to jump between workspaces or (future) Today. Settings-in-a-sheet-inside-a-menu is undiscoverable.
**Recommendation:**
- Add real destinations: Today · Workspaces · (later: Insights)
- Collapse utilities into one avatar/settings entry point
- Extract shared menu content into a component; kill the double-nesting

### P1 — Drag-and-drop grouping ignores touch entirely
**Evidence:** `WorkspaceList.tsx` uses HTML5 drag events (`onDragStart/onDrop`). These don't fire on iOS/Android. README claims "mobile-first."
**Impact:** A headline feature silently doesn't exist on the primary target platform.
**Recommendation:** Keep DnD for desktop; ensure the "Move to group" dropdown submenu works everywhere (it already does) and make it the documented path. Consider long-press → move sheet on mobile later.

### P2 — Group creation box permanently occupies prime real estate
**Evidence:** `WorkspaceList.tsx` renders the "Create group" bordered card *above* the workspace list unconditionally.
**Impact:** Empty-state and first-run screens lead with an advanced organizational feature before showing any actual content.
**Recommendation:** Move behind a "+" affordance next to the Groups heading; show only when >1 workspace exists.

### P2 — Redundant wayfinding: breadcrumbs AND back-links
**Evidence:** `App.tsx` `ResourceHeader` renders breadcrumbs; immediately below, GoalsView/TasksView add "Back to workspaces"/"Back to goals" underlined links. Both do the same job.
**Impact:** Visual noise, doubled maintenance.
**Recommendation:** Keep breadcrumbs (they scale); delete the back-links. Or keep back-links styled as proper buttons and drop breadcrumb trail below depth 2.

### P2 — Loading & empty states are afterthoughts
**Evidence:** All three lists render plain text `"Loading tasks"` / `"No tasks yet"` (`GoalList.tsx`, `TaskList.tsx`, `WorkspaceList.tsx`). Empty state isn't paired with its CTA (the Create button lives elsewhere on the page).
**Impact:** Layout jump on load; empty states are dead ends rather than onboarding moments.
**Recommendation:** Skeleton cards matching final layout; empty state = illustration/icon + one-line value prop + primary "Create your first task" button colocated.

### P2 — Charts feel bolted on
**Evidence:** `App.tsx` mounts `TaskTrackingChart` with `<div className="mt-8">` at the very bottom of goal/task pages.
**Impact:** Nobody scrolls there; charts answer questions users didn't ask at that moment.
**Recommendation:** Either give insights their own tab/screen (per goal: last 14 days bars, total vs budget) or surface one summary stat inline ("12h 30m this week") and drop the embedded chart.

### P3 — Visual system inconsistencies
**Evidence:**
- `index.css` defines multiple full themes, but radius varies (`0.5rem` default vs `0.375rem` in two themes)
- Hardcoded Tailwind grays inside components: `bg-gray-300` divider lines, `border-gray-300 dark:border-gray-700` in `TaskList.tsx`/`WorkspaceList.tsx` bypass the token system and can drift in custom themes
- Status color semantics: Done = gray, Failed = red, Pending = blue — reasonable, but applied only to section headers, not the cards themselves
**Recommendation:** Single source of truth: all colors via CSS vars/tailwind config aliases (`--status-done` etc.), one radius scale. Extend status chips onto each card so color carries meaning at list level.

### P3 — Forms lack mobile ergonomics
**Evidence:** `TaskForm.tsx` — save/cancel at form bottom only; errors render at the bottom of the form (likely off-viewport when validation fails on mobile); numeric inputs without `inputMode`; no context header saying what you're creating or where it lands.
**Recommendation:** Sticky footer action bar (cancel | save); scroll-to-error on submit; `inputMode="numeric"` on budget/priority; header like "New task · *Goal name*"; consider splitting into basics + optional sections.

### P3 — Minor papercuts
- `onKeyPress` used in `WorkspaceList.tsx` (deprecated; use `onKeyDown`)
- Only one concurrent tracker allowed, but sibling Start buttons are merely disabled — explain why inline ("Another task is running")
- "Failed" as a manually-settable task status will confuse most users; consider renaming or auto-suggesting when deadline passes
- `ResourceHeader` fetches workspace and goal sequentially (waterfall) — parallelize
- Desktop nav shows raw utility buttons (Install PWA etc.) permanently; low-value clutter

---

## 4. What's Already Good (keep it)

- **i18n + RTL done properly**: `lang`/`dir` swap on language change, logical properties (`me-*`/`ms-*`), direction-aware sheets. Most apps fail here; MeowDo doesn't.
- **Consistent destructive-action confirmations** across all three entities.
- **Error + Retry pattern** on failed loads, dismissible inline error banners.
- **PWA lifecycle handled** (update prompt, offline-ready) — rare discipline.
- **Timezone-awareness** threaded through consistently.
- Focus-visible rings on interactive card titles.

---

## 5. Recommended Roadmap

### Now (1–2 weeks) — fix the loop
1. One-tap stop tracking; demote time-adjustment
2. Sort tasks by priority/deadline within status groups
3. Status badges on task cards; kill label:value prose
4. Sticky form footers + scroll-to-error
5. Replace back-links with breadcrumbs (or vice versa)

### Next (3–6 weeks) — earn the daily visit
6. **Today screen** (default post-login): running timer, due/overdue across workspaces, day-budget ring
7. Skeleton loaders + designed empty states
8. Navbar with real destinations; consolidated settings/avatar menu
9. Hours+minutes formatting everywhere; deprecate raw minutes

### Later (quarter) — deepen moat
10. Insights tab: weekly/monthly summaries, streaks, per-goal trends (move Recharts there)
11. Touch-friendly reorganization (long-press menus) if groups matter
12. Design-token audit; second accent color for motivation moments (completion celebrations)

---

## 6. North Star Suggestion

Reframe the product metric from "tasks created" to **"sessions that end with a started or completed task."** Every recommendation above serves that: fewer taps to start, less friction to stop, visible momentum to return to.

---

*Files referenced: `frontend/src/App.tsx`, `components/Navbar.tsx`, `components/workspace/WorkspaceList.tsx`, `components/goal/GoalList.tsx`, `components/task/TaskList.tsx`, `components/task/TaskForm.tsx`, `index.css`.*

---

# Round 2 — 2026-08-28: Review of recent UI/UX commits + full-project re-pass

**Scope:** the two most recent UI/UX commits (`1aea022` “Today view, card redesign, and SQLite correctness fixes”, `28b5bcb` “keep running timer monotonic and style install control”), plus a full re-pass of the current frontend state against this document’s round-1 findings.

**Method:** source review of `TodayView.tsx`, `TaskCard.tsx`, `TaskList.tsx`, `Navbar.tsx`, `GoalList.tsx`, `WorkspaceList.tsx`, `InstallPWAButton.tsx`, `App.tsx`, `ThemeToggle.tsx`, `lib/elapsed.ts`, `lib/format.ts`, `ui/popover.tsx`, and the three locale files; git diff review of both commits; verification via `npm run typecheck` (clean), `npm run lint` (clean, 0 findings), `npm test` (1/1 pass).

## 1. Commit reviews

### `1aea022` — Today view + card redesign

This commit executes the round-1 plan almost exactly as specified. Verified delivered:

| Round-1 item | Status |
|---|---|
| P0: “No Today view” | ✅ `/today` is the default post-login route; running timer pinned on top; overdue → due today → upcoming buckets across all workspaces; day-budget bar; all-clear state; skeleton loaders; fully localized (en/ar/fa) |
| P0: “Stopping the timer is hostile” | ✅ One-tap stop; “Adjust stop time” demoted to an opt-in refinement inside the same dialog |
| P1: Cards as label:value prose | ✅ New `TaskCard`: status badge (shared `STATUS_BADGE_CLASSES`), priority as flame icons with sr-only value, human durations (`1h 30m`), deadline surfaced only when ≤ 3 days or overdue, explicit over-budget styling |
| P1: Priority does nothing | ✅ All Today buckets sort by priority desc |
| P1: Navbar has no destinations | ✅ Today / Workspaces links on desktop and in the mobile sheet |

Well done, specifically: the stop dialog keeps destructive styling with Cancel focused; the running banner uses `role="timer" aria-live="off"` so screen readers aren’t spammed every second; loading uses `role="status" aria-live="polite"`; i18n keys were added to all three locales in the same commit.

**Issues found in the commit (current as of HEAD):**

1. **[P1] TodayView shows the *empty* state on load failure.** When `getAllTasks()` rejects, `tasks.length === 0` renders `today.empty` (“No tasks across your workspaces yet”) under the error banner — no retry. `TaskList` correctly branches `error && tasks.length === 0` into an error view with Retry; `TodayView` regressed relative to that pattern. A transient failure on the app’s front door looks identical to “you have no tasks.”
2. **[P2] “Spent today” and the day-budget bar lag up to an hour.** `loadSummaries` runs only when `[loading, tasks.length, now.hour]` change, but it bakes live running seconds into `spentTodaySecondsByTask`. The elapsed clock ticks every second; the progress bars and per-card minutes refresh hourly. `TaskList` recomputes live seconds at render (`liveDailySeconds`) — so the two surfaces disagree. Fix: compute live seconds at render in TodayView too, or put a minute-granularity tick in the deps.
3. **[P2] `upcoming` is silently truncated to 6** (`slice(0, 6)`) with no “N more” affordance — tasks quietly disappear from the front door.
4. **[P2] “Day budget” semantics.** It is the sum of `timeBudget` of all non-done tasks across all workspaces — for a user with 10 × 2h tasks it reads “1200m” and the bar never becomes a meaningful daily signal. Either rename (e.g. “Remaining budget”) or define an actual daily target the user sets.
5. **[P2] Timezone inconsistency.** `TaskCard` and `GoalList` use `Intl.DateTimeFormat().resolvedOptions().timeZone`; `TodayView` and `TaskList` honor `user.timezone` first. For a user whose profile timezone differs from the device, deadline urgency (“due today”, overdue, “2 days left”) will contradict other screens.
6. **[P3] `TaskCard` caption pairing is ambiguous.** The bar shows *today’s* spend vs the day budget, but the right-hand caption reads `overall · pct%` where pct is the *daily* percentage — it reads as if the % belongs to the overall total. Put the % next to today’s value or drop it.
7. **[P3] Summaries keyed by task *name*.** `getTaskTrackingSummary` returns rows keyed by name; two tasks sharing a name merge their tracked time on every screen. Backend shape limitation, but the UI inherits it silently — worth a backend fix or a visible caveat.
8. **[P3] Stop-dialog validation asymmetry.** `TaskList.confirmStop` pre-checks stop-before-start with a friendly message; `TodayView.confirmStop` doesn’t (backend 400 surfaces as a raw error).
9. **[P3] Shared `error` state between the stop dialog and the page banner.** After a failed stop inside the dialog, dismissing the dialog leaves the error stranded in the page-level banner.
10. **[P3] Dead i18n key** `today.startNext` — defined in all locales, never rendered.
11. **[P3] The 404 page (`NoMatch`) still links to Workspaces**, though the home is now `/today`.
12. **[P3] Blocked Start is `disabled` + `title` tooltip** — the reason (“Another task is running”) is invisible to touch users and screen readers. Add sr-only text or `aria-describedby`.

Also noted: `onOpenTask` does an extra `getGoalById` round-trip to resolve the edit route; on failure it silently navigates to `/workspaces` with no message. Acceptable, but including `workspaceId` in the tasks payload would remove the dependency.

### `28b5bcb` — monotonic timer + install control

- ✅ `lib/elapsed.ts` fixes a genuine, well-documented bug: a server clock even slightly ahead made `diffNow()` negative and rendered “00:00:-05” counting *up* toward zero. The baseline-once + monotonic-delta approach with negative clamping is the right fix.
- ⚠️ It dropped the explicit `{ zone: "utc" }` used by every other parse site (`TaskList`, `TaskCard`, `TodayView`). It happens to be safe today because the API serializes `startTime` as a `Date` → Z-suffixed ISO, but it’s a latent inconsistency; state the zone explicitly like everywhere else.
- ⚠️ The formatter is created and called exactly once per render (baseline recomputed each tick). Functionally fine because the parent re-renders on the 1s ticker, but it’s a subtle coupling: remove the ticker and the timer silently freezes. Memoizing per `startTime` inside `TaskCard` would be more robust.
- ✅ `InstallPWAButton`: the permanent instruction text blob is gone — native prompt → clean outline button; iOS/unsupported → quiet icon + popover with instructions; dismissal persists in `localStorage`. Good pattern. New `ui/popover.tsx` is a standard shadcn primitive.
- ⚠️ The button hardcodes `text-primary-foreground` / `bg-white/10` / `border-white/40`, coupling it to the navbar’s `bg-primary`. Breaks quietly if navbar theming ever changes. A comment or a `navbar-button` recipe would protect it.

## 2. Full-project re-pass

### Round-1 items verified fixed since 2026-08-23

- Today front door (P0) · one-tap stop (P0) · card anatomy (P1) · priority sorting (P1) · navbar destinations (P1) · group creator behind “+” (P2) · “Move to group” touch/keyboard path (P1) · theme selector simplified to light/dark/system and fully translated (P2) · app-version footer removed · status colors centralized in `lib/format.ts` · skeletons on Today/Task lists · destructive confirm styling · workspace/goal/task cards use real `<Link>` titles with focus rings.

### Still open from round 1

1. **[P2] Redundant wayfinding** — `GoalsView`/`TasksView` render breadcrumbs *and* “Back to …” links directly under them. Pick one (breadcrumbs recommended).
2. **[P2] Charts still bolted to the bottom** of goal/task pages (`<div className="mt-8"><TaskTrackingChart/></div>`) where nobody scrolls.
3. **[P2] WorkspaceList loading is still plain text** — no skeleton, unlike Today/TaskList.
4. **[P3] Hardcoded grays** in WorkspaceList drop zones (`border-gray-300 dark:border-gray-700`) bypass tokens.
5. **[P3] Navbar still duplicates ~150 lines** between mobile/desktop and keeps the Sheet-inside-Sheet settings; desktop still shows all utility buttons permanently.
6. **[P3] Nav links have no active state** (`aria-current="page"` / visual highlight) — no sense of place on desktop.
7. **[P3] Empty groups still instruct “drag workspaces here”** even though the menu path works everywhere — copy should mention the menu for touch users.
8. **[P3] Group rename save still uses a Pencil icon**; TaskList delete-confirm still uses the generic “Confirm” label.
9. **[P3] Share dialog passes `isOwner={true} // Placeholder`** — unimplemented signal in shipped UI.
10. **[P3] `err: any`** in Today/Task catch blocks (typecheck/lint allow it; `unknown` + narrowing would match the codebase’s own `ApiError` design).

### New ease-of-use finding (round 2)

- **[P1] There is no way to complete a task from any list.** Task status changes only inside the full edit form (`TaskForm`). The daily loop the Today view was built for — *start → work → stop → done* — still ends with a drill-down: Today → card menu → Edit → change status → save. The natural close of the loop (a “Mark done” action on `TaskCard`, especially on the pinned running card right after stopping) is missing. This is now the biggest gap between the Today view’s promise and the product’s behavior.

### What’s genuinely good right now

- The core loop is finally one tap from the front door: open → see running timer → stop.
- Accessibility posture of the new code is above average: live regions, roles, sr-only labels, focus-visible rings, logical properties (`me-*`) for RTL, direction-aware sheets.
- i18n discipline: new features ship with all three locales in the same commit; no hardcoded English found in the new components.
- Shared formatting (`lib/format.ts`) and documented utilities (`lib/elapsed.ts`) reduce the drift that round 1 complained about.
- Clean quality gates: `typecheck`, `lint` (0 findings), and tests all pass.

## 3. Implementation update — 2026-08-28 (continued)

Implemented in this pass (UI_UX_REVIEW §4 items 2–6 + hygiene batch):

- `TaskCard` exposes a one-tap `Mark failed` action from the overflow menu in
  both Today and goal task lists, closing the loop for unsuccessful work.
- Today's spent-today/day-budget bars and per-card spent values now tick live
  via render-time computation (`liveRunningSeconds`), matching `TaskList`.
- All timezone reads go through `resolveUserTimezone(user.timezone)` —
  `TaskCard`, `TaskList`, `TodayView`, `TaskTrackingChart`, and `GoalList` —
  so profile timezone and device fallback stay consistent.
- The truncated Upcoming section shows the full total plus a localized
  `+N more` / `Show less` toggle (`today.showMore`, `today.showLess`).
- `elapsed.ts` already parses server timestamps with `{ zone: "utc" }`; the
  monotonic formatter is now memoized per start time inside `TaskCard` (with
  a self-contained 1s tick), so parent re-renders no longer reset the clock.
- Hygiene: group-rename save uses a `Check` icon, task delete-confirm uses
  the specific `tasks.deleteTask` label, share dialog derives `isOwner` from
  `workspace.userId` instead of a hardcoded placeholder, nav links use
  `NavLink` active state, and Today/Task/Chart catch blocks narrow `unknown`
  via `ApiError`/`Error` instead of `any`. Duplicate locale keys in
  `ar`/`fa` were merged and missing keys added.
- `TaskTrackingRecord.endTime` is now `string | null`; `TaskCard` accepts the
  record `id` from the API type.

Verification after implementation: `npm run typecheck`, `npm run lint`, and
`npm test` (frontend + backend) all pass.

## 4. Recommended next steps (priority order)

1. TodayView: error-vs-empty branch with Retry (mirrors TaskList).
2. Add a quick “Failed” affordance to `TaskCard` — close the loop for unsuccessful work.
3. Make Today’s spent-today/budget bars tick live (render-time computation like TaskList).
4. Unify timezone resolution in one helper (`user.timezone ?? device`) used by TaskCard/GoalList too.
5. Add “+N more” under the truncated Upcoming section; reconsider the “Day budget” label/semantics.
6. State `{ zone: "utc" }` explicitly in `elapsed.ts`; memoize the formatter per start time.
7. Retire the back-links in favor of breadcrumbs; move the chart off the page bottoms.8. Small hygiene batch: dead `today.startNext` key, 404 link → `/today`, aria-current on nav, sr-only reason on blocked Start, sr-only text share-dialog `isOwner`.
