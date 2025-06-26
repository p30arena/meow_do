# Progress: MeowDo

## What works

*   **`docker-compose.yml` has been updated to use environment variables (`BACKEND_PORT`, `FRONTEND_PORT`, `VITE_API_BASE_URL`) for host port mappings and API base URL for backend and frontend services, ensuring ports and API URL are not hardcoded.**
*   **`.env.example` file has been created with default values for `BACKEND_PORT` (9818), `FRONTEND_PORT` (9819), and `VITE_API_BASE_URL` (`https://meowdo.donusoft.com/api`) for deployment configuration.**
*   The `memory-bank` directory has been successfully created.
*   All core memory bank documentation files (`projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`) have been initialized with initial content based on the project description and architectural considerations.
*   Backend project setup (Express, Zod, Drizzle, TypeScript) is complete.
*   Workspace management (CRUD) backend API endpoints are implemented.
*   Goal management (CRUD, status, deadline) backend API endpoints are implemented.
*   Task management (CRUD, time budget, status, deadline, recurring tasks) backend API endpoints are implemented.
*   Daily time budget calculation and 24h warning logic is implemented.
*   User authentication and authorization is implemented.
*   Frontend project setup (Vite, React, TypeScript, TailwindCSS, ShadcnUI, Lucide Icons) is complete.
*   Frontend authentication components (`LoginForm`, `RegisterForm`) now use actual backend API calls for login and registration, and API integration (`auth.ts` using `fetch`) is implemented.
*   Multi-language support (i18n) for authentication messages (English, Arabic, Farsi) is configured.
*   Frontend workspace management (CRUD) components (`WorkspaceList`, `WorkspaceForm`) and API integration are implemented.
*   Multi-language support for workspace features (English, Arabic, Farsi) is configured.
*   Frontend goal management (CRUD) components (`GoalList`, `GoalForm`) and API integration are implemented.
*   Multi-language support for goal features (English, Arabic, Farsi) is configured.
*   Frontend task management (CRUD, copy to next day) components (`TaskList`, `TaskForm`) and API integration are implemented.
*   Multi-language support for task features (English, Arabic, Farsi) is configured.
*   Corrected i18n key usage in `frontend/src/components/task/TaskList.tsx` to use nested keys (e.g., `tasks.createTask`, `tasks.timeBudget`, `tasks.minutes`, `tasks.status`, `tasks.deadline`, `tasks.recurringTask`, `tasks.confirmDelete`), resolving `missingKey` errors.
*   Corrected i18n key usage in `frontend/src/components/task/TaskForm.tsx` to use nested keys (e.g., `tasks.timeBudget`, `tasks.createTask`, `workspace.cancel`), resolving `missingKey` errors.
*   Corrected the structure of `frontend/public/locales/en/translation.json`, `frontend/public/locales/ar/translation.json`, and `frontend/public/locales/fa/translation.json` by moving task-related top-level keys into the `tasks` object.
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
*   Both backend and frontend projects build successfully, outputting to their respective `dist` folders, and the frontend build no longer generates unwanted declaration files.
*   The backend development server (`npm run dev`) now starts successfully after installing `ts-node`.
*   Backend API routes have been updated to include `/v1` prefix, aligning with frontend API calls.
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
*   **Fixed RTL Grid Alignment (Phase 1 - Spacing & Label):** Removed explicit `ltr:` and `rtl:` prefixes for spacing in `frontend/src/components/workspace/WorkspaceList.tsx`, `frontend/src/components/goal/GoalList.tsx`, and `frontend/src/components/task/TaskList.tsx` components, and used `text-end` for label alignment in `TaskList.tsx` to ensure directionality-agnostic alignment of elements within cards.
*   **Fixed RTL Grid Alignment (Phase 2 - Grid Item Flow - Attempt 1: `place-items-start`):** Attempted to fix grid item flow by adding `place-items-start` to the grid containers. This was found to be insufficient.
*   **Fixed RTL Grid Alignment (Phase 3 - Flexbox Refactor):** Refactored grid containers in `frontend/src/components/workspace/WorkspaceList.tsx`, `frontend/src/components/goal/GoalList.tsx`, and `frontend/src/components/task/TaskList.tsx` to use `flex` and `flex-wrap`, along with responsive width classes on `Card` components (`w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.33%-0.66rem)]`). This leverages the browser's default flexbox behavior with `direction: rtl` inherited from the parent `div` to ensure items flow from right to left in RTL mode, and from left to right in LTR mode, in a directionality-agnostic manner.
*   **Fixed RTL Button Spacing:** Replaced all instances of `space-x-*` with `gap-*` across relevant components (e.g., `WorkspaceList.tsx`, `GoalList.tsx`, `TaskList.tsx`) to ensure consistent spacing between elements in both LTR and RTL layouts.
*   **Fixed Task Card Button Overflow:** Added `flex-shrink` to individual `Button` components within the task cards in `frontend/src/components/task/TaskList.tsx` to allow them to shrink and prevent overflow, ensuring they remain within the card boundaries in both LTR and RTL layouts.
*   **PWA Implementation:**
    *   `frontend/public/site.webmanifest` has been updated with `name`, `short_name`, `start_url`, and `scope`.
    *   `vite-plugin-pwa` has been installed and configured in `frontend/vite.config.ts` to handle service worker generation and registration.
    *   `frontend/src/components/InstallPWAButton.tsx` has been created to manage the PWA installation prompt, now using i18n for the button text, correctly hiding when the app is installed, and displaying instructional text when the `beforeinstallprompt` event is not available. The React Hooks order error in this component has been resolved.
    *   `InstallPWAButton` has been integrated into `frontend/src/components/Navbar.tsx`.
    *   **Revised PWA caching strategy: Removed `filename` property from `vite-plugin-pwa` configuration in `frontend/vite.config.ts` as it interferes with internal versioning. Implemented `registerSW` in `frontend/src/main.tsx` to force a page reload when a new service worker version is detected, ensuring immediate updates on the client side.**
    *   **Declared types for `virtual:pwa-register` in `frontend/src/vite-env.d.ts` to resolve TypeScript errors.**
*   **i18n `noDescription` Key:** Confirmed that the `noDescription` key is present in `fa/translation.json`, `en/translation.json`, and `ar/translation.json`. The `i18next::translator: missingKey fa translation noDescription noDescription` error persists, indicating a potential issue with `i18next` configuration, caching, or how the key is being used in `WorkspaceList.tsx`, rather than a missing translation key itself.
*   **Refactored `frontend/src/components/task/TaskList.tsx` to ensure `getTaskTrackingSummary` is called efficiently, clarifying that the backend API supports 'day' and 'total' periods, not a single 'all' period for comprehensive data. The `TaskTrackingSummary` interface in `frontend/src/api/task.ts` was updated to reflect that the `period` field is optional.**
*   **Enhanced `frontend/src/components/task/TaskList.tsx` to display the overall total spent time for each individual task within its task card, in minutes. This involved adding a new state (`overallTaskSummaries`) and an additional call to `getTaskTrackingSummary` with `period: "total"` to fetch this data.**
*   **Resolved `missingKey` error for `tasks.overallSpent` by adding the translation key to `en/translation.json`, `ar/translation.json`, and `fa/translation.json`.**
*   **Fixed "Invalid DateTime" error in `frontend/src/components/task/TaskTrackingChart.tsx` by changing `DateTime.fromISO` to `DateTime.fromSQL` for parsing the `period` label, as the backend returns a PostgreSQL timestamp format.**
*   **Fixed "Failed to parse stored user or token: SyntaxError: "undefined" is not valid JSON" by adding a check in `frontend/src/context/AuthContext.tsx` to handle cases where `localStorage.getItem('user')` returns the string `"undefined"`, ensuring it's treated as `null` and cleared from local storage.**
*   **Fixed "undefined" being stored for user after timezone update by modifying `frontend/src/context/AuthContext.tsx` to use the user object returned by the `updateTimezone` API call, ensuring the latest user data is stored in local storage.**
*   **Refactored `frontend/src/App.tsx` to use `react-router-dom` for navigation between workspaces, goals, and tasks, replacing state-based conditional rendering with `Routes` and `Route` components.**
*   **Updated `frontend/src/components/goal/GoalForm.tsx` to use `useParams` for `workspaceId` and `goalId`, and to fetch the goal by `goalId` for editing.**
*   **Updated `frontend/src/components/task/TaskForm.tsx` to use `useParams` for `goalId` and `taskId`, and to fetch the task by `taskId` for editing.**
*   **Updated `frontend/src/components/workspace/WorkspaceForm.tsx` to use `useParams` for `workspaceId` and to fetch the workspace by `workspaceId` for editing, resolving the issue where the edit form was not pre-filled.**
*   **Added "Vazirmatn" font for Farsi language support.**

## What's left to build

*   Multi-language support (i18n) including RTL/LTR is fully configured with a language switcher.
*   Configuration for light/dark mode theming is configured with a theme toggle.
*   User timezone preference (backend schema, API, frontend UI) - **Completed**.
*   Task priority (backend schema, API, frontend UI) - **Completed**.
*   Task start/stop tracking (backend schema, API, frontend UI) - **Completed**.
*   Task time spent summary and display using Recharts (backend API, frontend UI) - **Completed**.
*   **Manual task time record entry (backend API, frontend UI) - Completed (with `startTime` in DB reflecting insertion time due to schema constraint).**
*   **Logo 'frontend/public/logo.png' in the Navbar near the title with a circular shape.**
*   **Fixed `backend/Dockerfile` to use a multi-stage build, resolving the `Error: Cannot find module '/app/dist/index.js'` by ensuring the `dist` directory is correctly copied into the final image.**
*   **Theme preference storage (using `localStorage`) - Completed.**

### Enhancements:
*   Comprehensive error handling.
*   Unit and integration tests for both backend and frontend.
*   Deployment pipeline setup.
*   Performance optimizations.

## Current status

The project has completed its initial setup phase and made significant progress on the frontend. All core backend features are complete. Frontend authentication components (Login and Register forms), workspace management components (list and form), goal management components (list and form), and task management components (list and form) are implemented, integrated with the backend API using `fetch`, and multi-language support for these components is in place. All project initialization tasks, including full RTL/LTR support and light/dark mode theming, are now complete. The backend and frontend projects now build successfully to their `dist` folders, with the frontend build no longer generates unwanted declaration files. The backend development server also starts successfully, and its API routes now include the `/v1` prefix, matching the frontend's API calls. The i18n key usage in `WorkspaceList.tsx`, `WorkspaceForm.tsx`, `GoalList.tsx`, `GoalForm.tsx`, `TaskList.tsx`, and `TaskForm.tsx` has been corrected to use nested keys, and edit/delete functionalities for workspaces, goals, and tasks have been implemented. Additionally, the goal fetching API call in `frontend/src/api/goal.ts` has been updated to use a query parameter for `workspaceId`, resolving the 404 Not Found error. The task fetching API call in `frontend/src/api/task.ts` has also been updated to use a query parameter for `goalId`, resolving the 404 Not Found error for tasks. The translation files for English, Arabic and Farsi have been updated to reflect the new nested key structure for goals and tasks. Furthermore, a centralized unauthorized error handling mechanism has been implemented to clear the authentication token and redirect to the login page upon receiving a 401 Unauthorized response from the API. The foundational documentation is updated, providing a clear roadmap for further development, including new guidelines for i18n translations. The translation files now include build-time versioning to prevent caching issues. The Docker setup for the project is complete, containerizing the backend, frontend, and PostgreSQL database, and addressing the PostgreSQL port exposure. `docker-compose.yml` has been updated to use environment variables for host port mappings for backend and frontend services, and a `.env.example` file has been created with default port values. All previously identified bugs related to the "Tracking" timer display, "Stop Task Tracking" API call, "Stop Time Datetime Format", backend duration calculation errors (for start and stop task), and the task tracking summary route issue have been fixed. The `TaskTrackingChart` component is now correctly placed and filtered based on the selected workspace or goal. The RTL grid alignment issue has been addressed by removing explicit `ltr:` and `rtl:` prefixes and using directionality-agnostic TailwindCSS utilities. The initial attempt with `place-items-start` was insufficient, leading to a refactor of the grid containers to use `flex` and `flex-wrap` with responsive width classes on `Card` components (`w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.33%-0.66rem)]`). This leverages the browser's default flexbox behavior with `direction: rtl` inherited from the parent `div` to ensure items flow from right to left in RTL mode, and from left to right in LTR mode, in a directionality-agnostic manner.

## Known issues

*   None.

## Evolution of project decisions

*   Initial decision to use Express Zod API and Drizzle for backend, and Vite + React with ShadcnUI for frontend, remains firm.
*   Emphasis on mobile-first design is a guiding principle for all UI/UX decisions.
*   The need for robust internationalization (including RTL/LTR support) and theming has been identified and will be integrated early in the frontend development.
*   Multi-user support with JWT authentication is a confirmed core requirement.
