# Active Context: MeowDo

## Current Work Focus

The current focus is on implementing new features: user timezone preference, task tracking (start/stop, time spent summary with Recharts), task priority, and **manual task time record entry**. All previous core features (User authentication, Workspace management, Goal management, and Task management) and project initialization tasks (multi-language support including RTL/LTR, and light/dark mode theming) have been successfully implemented. All core backend features are also complete.

## Recent Changes

*   **Updated `docker-compose.yml` to use environment variables (`BACKEND_PORT`, `FRONTEND_PORT`, `VITE_API_BASE_URL`) for host port mappings and API base URL for backend and frontend services, ensuring ports and API URL are not hardcoded.**
*   **Created `.env.example` file with default values for `BACKEND_PORT` (9818), `FRONTEND_PORT` (9819), and `VITE_API_BASE_URL` (`https://meowdo.donusoft.com/api`) for deployment configuration.**
*   **Implemented backend Zod validation schema (`createManualTaskRecordSchema`) for manual task time records.**
*   **Implemented backend controller function (`createManualTaskRecord`) to handle insertion of manual task time records into `taskTrackingRecords` table (with `startTime` defaulting to insertion time as per schema constraint).**
*   **Added new backend route (`POST /api/v1/tasks/:taskId/manual-record`) for creating manual task time records.**
*   **Created new frontend API function (`createManualTaskRecord`) and interface (`CreateManualTaskRecordPayload`) in `frontend/src/api/task.ts` for manual time record creation.**
*   **Created new frontend UI component (`ManualTimeRecordForm.tsx`) for users to input manual start and stop times.**
*   **Integrated `ManualTimeRecordForm` into `frontend/src/components/task/TaskList.tsx` with a button to open the form and state management.**
*   **Added new internationalization keys for manual time record feature in `frontend/public/locales/en/translation.json`, `ar/translation.json`, and `fa/translation.json`.**
*   **Addressed the user's constraint regarding "no schema changes" by implementing manual record functionality within the existing `taskTrackingRecords` schema, with the understanding that the `startTime` in the database will reflect the time of API call, not the user's manually entered past start time.**
*   **Included the logo 'frontend/public/logo.png' in the Navbar near the title, with a circular shape.**
*   **Fixed `backend/Dockerfile` to use a multi-stage build, resolving the `Error: Cannot find module '/app/dist/index.js'` by ensuring the `dist` directory is correctly copied into the final image.**
*   **Implemented persistence for the base theme preference (e.g., 'default', 'amber-minimal') using `localStorage` in `frontend/src/context/BaseThemeContext.tsx`. The selected theme is now saved and loaded across sessions.**

*   Successfully initialized the backend project with Express, Zod, Drizzle, and TypeScript.
*   Successfully initialized the frontend project with Vite, React, TypeScript, TailwindCSS, ShadcnUI, and Lucide Icons.
*   Configured multi-language support (i18n) including RTL/LTR setup.
*   Troubleshooted and resolved various setup issues, including TypeScript type definitions, `shadcn-ui` deprecation, Tailwind CSS version conflicts, and ShadcnUI initialization.
*   Addressed an RTL punctuation display issue, which is now no longer a concern as per user's instruction.
*   Implemented backend CRUD operations for Workspaces, including Drizzle schema, Zod validation, controllers, and routes.
*   Implemented backend CRUD operations for Goals, including Drizzle schema, Zod validation, controllers, and routes.
*   Implemented backend CRUD operations for Tasks, including Drizzle schema, Zod validation, controllers, and routes.
*   Implemented Daily time budget calculation and 24h warning logic.
*   Implemented User authentication and authorization, including user registration, login, JWT token generation, and authentication middleware.
*   Resolved persistent TypeScript errors related to Express Router by implementing a `catchAsync` utility.
*   Resolved Drizzle `Date` type incompatibility with Zod `datetime` strings by transforming the string to a `Date` object in Zod schemas.
*   Updated `frontend/src/components/auth/LoginForm.tsx` and `frontend/src/components/auth/RegisterForm.tsx` to use actual backend API calls for user authentication.
*   Created `frontend/src/api/auth.ts` to handle authentication API calls using the native `fetch` API (switched from `axios` as per user's request).
*   Installed required Shadcn UI components (`button`, `input`, `label`, `card`, `textarea`, `select`, `checkbox`, `dropdown-menu`) in the frontend.
*   Updated `frontend/src/App.tsx` to manage authentication state and conditionally render login/register forms or main application content, and to integrate WorkspaceList, WorkspaceForm, GoalList, GoalForm, TaskList, and TaskForm.
*   Updated translation files (`frontend/public/locales/en/translation.json`, `ar/translation.json`, `fa/translation.json`) with new authentication-related, workspace-related, goal-related, and task-related keys.
*   Created `frontend/src/api/workspace.ts` for workspace CRUD operations.
*   Created `frontend/src/config.ts` for `API_BASE_URL`.
*   Created `frontend/src/components/workspace/WorkspaceList.tsx` to display workspaces.
*   Created `frontend/src/components/workspace/WorkspaceForm.tsx` for creating/editing workspaces.
*   Created `frontend/src/api/goal.ts` for goal CRUD operations.
*   Created `frontend/src/components/goal/GoalList.tsx` to display goals.
*   Created `frontend/src/components/goal/GoalForm.tsx` for creating/editing goals.
*   Created `frontend/src/api/task.ts` for task CRUD operations and copying tasks.
*   Created `frontend/src/components/task/TaskList.tsx` to display tasks.
*   Created `frontend/src/components/task/TaskForm.tsx` for creating/editing tasks.
*   Resolved TypeScript module resolution issues by changing `moduleResolution` to `node` in `frontend/tsconfig.app.json` and `frontend/tsconfig.node.json`.
*   Resolved implicit `any` type errors in frontend components.
*   Resolved `tsconfig` project reference errors by adding `composite: true` and `emitDeclarationOnly: true` to referenced `tsconfig` files.
*   Implemented a `LanguageSwitcher` component and integrated it into `App.tsx` for multi-language support.
*   Implemented `ThemeProvider` and `ThemeToggle` components for light/dark mode theming and integrated them into `main.tsx` and `App.tsx` respectively.
*   Configured both backend and frontend projects to build successfully to their respective `dist` folders, and resolved issues preventing the frontend from generating unwanted `.d.ts` files.
*   Resolved the "ts-node: command not found" error for the backend development server by installing `ts-node` as a dev dependency.
*   Updated backend API routes in `backend/src/index.ts` to include the `/v1` prefix, ensuring alignment with frontend API calls.
*   Corrected i18n key usage in `frontend/src/components/workspace/WorkspaceList.tsx` to use nested keys (e.g., `workspace.loadingWorkspaces`) instead of top-level keys, resolving `missingKey` errors.
*   Corrected i18n key usage in `frontend/src/components/workspace/WorkspaceForm.tsx` to use nested keys (e.g., `workspace.createWorkspace`) instead of top-level keys, resolving `missingKey` errors.
*   Corrected i18n key usage for 'edit' and 'delete' in `frontend/src/components/workspace/WorkspaceList.tsx` to use nested keys (e.g., `workspace.edit`, `workspace.delete`), resolving `missingKey` errors.
*   Implemented edit and delete functionalities for workspaces in `frontend/src/components/workspace/WorkspaceList.tsx`, including integration with `App.tsx` for state management and adding a confirmation dialog for deletion with the new `workspace.confirmDelete` i18n key.
*   Corrected i18n key usage for 'error', 'edit', and 'delete' in `frontend/src/components/goal/GoalList.tsx` to use `workspace.error`, `workspace.edit`, and `workspace.delete` respectively, resolving `missingKey` errors.
*   Implemented goal deletion functionality in `frontend/src/components/goal/GoalList.tsx` and `frontend/src/App.tsx`, including a confirmation dialog with the new `goal.confirmDelete` i18n key.
*   Modified `frontend/src/api/goal.ts` to fetch goals by `workspaceId` using a query parameter (e.g., `/api/v1/goals?workspaceId=XYZ`), resolving the 404 Not Found error for goal fetching.
*   Corrected i18n key usage in `frontend/src/components/goal/GoalForm.tsx` to use nested keys (e.g., `workspace.cancel`, `workspace.create`), resolving `missingKey` errors.
*   Corrected i18n key usage for 'error', 'edit', and 'delete' in `frontend/src/components/task/TaskList.tsx` to use `workspace.error`, `workspace.edit`, and `workspace.delete` respectively, resolving `missingKey` errors.
*   Implemented task deletion functionality in `frontend/src/components/task/TaskList.tsx` and `frontend/src/App.tsx`, including a confirmation dialog with the new `task.confirmDelete` i18n key.
*   Modified `frontend/src/api/task.ts` to fetch tasks by `goalId` using a query parameter (e.g., `/api/v1/tasks?goalId=XYZ`), resolving the 404 Not Found error for task fetching.
*   Updated `frontend/public/locales/ar/translation.json` and `frontend/public/locales/fa/translation.json` to nest `confirmDelete` under `goals` and `tasks` objects, and added `title` keys to `goals` and `tasks` objects, resolving "Duplicate object key" errors.
*   Corrected the structure of `frontend/public/locales/en/translation.json`, `frontend/public/locales/ar/translation.json`, and `frontend/public/locales/fa/translation.json` by moving task-related top-level keys into the `tasks` object.
*   Implemented `handleUnauthorized` utility in `frontend/src/lib/utils.ts` to clear local storage token and redirect to login on 401 Unauthorized responses.
*   Integrated `handleUnauthorized` into `frontend/src/api/workspace.ts`, `frontend/src/api/goal.ts`, and `frontend/src/api/task.ts` to handle 401 errors.
*   Created `.clinerules/i18n-preferences.md` to document guidelines for internationalization translations.
*   **Reverted runtime versioning of translation files in `frontend/src/main.tsx`.**
*   **Configured build-time versioning for translation files by adding `__APP_VERSION__` to `frontend/vite.config.ts` and using it in `frontend/src/main.tsx`.**
*   **Declared `__APP_VERSION__` as a global variable in `frontend/src/vite-env.d.ts` to resolve TypeScript errors.**
*   **Docker Setup:** Successfully set up Docker Compose and Dockerfiles for containerizing the backend, frontend, and PostgreSQL database, including Nginx configuration for the frontend and addressing PostgreSQL port exposure.
*   **Fixed Task Tracking Timer Display:** The "Tracking" timer now correctly starts from the task's actual start time when a task is already in progress, instead of resetting to 00:00:00.
*   **Fixed Stop Task Tracking API Call:** Corrected the API endpoint for stopping task tracking in `frontend/src/api/task.ts` to match the backend route, resolving the 404 error.
*   **Fixed Stop Time Datetime Format:** Converted the `stopTime` to an ISO 8601 string in `frontend/src/components/task/TaskList.tsx` before sending it to the backend, resolving the `ZodError: Invalid datetime` validation error.
*   **Fixed Backend Duration Calculation (Stop Task):** Corrected the SQL `EXTRACT` function usage in `backend/src/controllers/task.controller.ts` to correctly reference the `startTime` column when calculating duration for other active tracking records in the `stopTask` controller.
*   **Fixed Backend Duration Calculation (Start Task):** Corrected the SQL `EXTRACT` function usage in `backend/src/controllers/task.controller.ts` to correctly reference the `startTime` column when calculating duration for existing active tracking records in the `startTask` controller.
*   **Fixed Task Tracking Summary Route:** Reordered routes in `backend/src/routes/task.routes.ts` to ensure the `/summary` endpoint is matched correctly before the dynamic `/:id` route, resolving the 500 error when fetching task tracking summary.
*   **Task Tracking Chart Placement and Filtering:**
    *   The `TaskTrackingChart` component has been moved from the "Settings" view.
    *   It is now rendered within the "Goals" view (when a workspace is selected) and the "Tasks" view (when a goal is selected).
    *   The chart now accepts `workspaceId` and `goalId` as props, allowing it to filter the task tracking summary data based on the currently selected workspace or goal.
    *   The backend `getTaskTrackingSummary` API has been updated to support filtering by `workspaceId` and `goalId`.
*   **Fixed RTL Grid Alignment (Phase 1 - Spacing & Label):** Removed explicit `ltr:` and `rtl:` prefixes for spacing in `WorkspaceList.tsx`, `GoalList.tsx`, and `TaskList.tsx` components, and used `text-end` for label alignment in `TaskList.tsx` to ensure directionality-agnostic alignment of elements within cards.
*   **Fixed RTL Grid Alignment (Phase 2 - Grid Item Flow - Attempt 1: `place-items-start`):** Attempted to fix grid item flow by adding `place-items-start` to the grid containers. This was found to be insufficient.
*   **Fixed RTL Grid Alignment (Phase 3 - Grid Item Flow - Attempt 2: Flexbox Refactor):** Refactored grid containers in `WorkspaceList.tsx`, `GoalList.tsx`, and `TaskList.tsx` to use `flex` and `flex-wrap`, along with responsive width classes on `Card` components (`w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.33%-0.66rem)]`). This leverages the browser's default flexbox behavior with `direction: rtl` inherited from the parent `div` to ensure items flow from right to left in RTL mode, and from left to right in LTR mode, in a directionality-agnostic manner.
*   **Fixed RTL Button Spacing:** Replaced all instances of `space-x-*` with `gap-*` across relevant components (e.g., `WorkspaceList.tsx`, `GoalList.tsx`, `TaskList.tsx`) to ensure consistent spacing between elements in both LTR and RTL layouts.
*   **Fixed Task Card Button Overflow:** Added `flex-shrink` to individual `Button` components within the task cards in `frontend/src/components/task/TaskList.tsx` to allow them to shrink and prevent overflow, ensuring they remain within the card boundaries in both LTR and RTL layouts.
*   **PWA Implementation:**
    *   Updated `frontend/public/site.webmanifest` with `name`, `short_name`, `start_url`, and `scope` for PWA functionality.
    *   Installed `vite-plugin-pwa` and configured it in `frontend/vite.config.ts` to generate and register the service worker.
    *   Created `frontend/src/components/InstallPWAButton.tsx` to handle the `beforeinstallprompt` event and provide a UI for installing the PWA, now using i18n for the button text and correctly hiding when the app is installed. The React Hooks order error in this component has been resolved.
    *   Integrated `InstallPWAButton` into `frontend/src/components/Navbar.tsx` for both mobile and desktop views.
