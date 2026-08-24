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
