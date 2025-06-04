# Progress: MeowDo

## What works

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
*   **Docker Setup:** Docker Compose and Dockerfiles for containerizing the backend, frontend, and PostgreSQL database are successfully set up, including Nginx configuration for the frontend and addressing PostgreSQL port exposure.
*   **Fixed Task Tracking Timer:** The "Tracking" timer now correctly starts from the task's actual start time when a task is already in progress, instead of resetting to 00:00:00.

## What's left to build

*   Multi-language support (i18n) including RTL/LTR is fully configured with a language switcher.
*   Configuration for light/dark mode theming is configured with a theme toggle.
*   User timezone preference (backend schema, API, frontend UI) - **Completed**.
*   Task priority (backend schema, API, frontend UI) - **Completed**.
*   Task start/stop tracking (backend schema, API, frontend UI) - **Completed**.
*   Task time spent summary and display using Recharts (backend API, frontend UI) - **Completed**.

### Enhancements:
*   Comprehensive error handling.
*   Unit and integration tests for both backend and frontend.
*   Deployment pipeline setup.
*   Performance optimizations.

## Current status

The project has completed its initial setup phase and made significant progress on the frontend. All core backend features are complete. Frontend authentication components (Login and Register forms), workspace management components (list and form), goal management components (list and form), and task management components (list and form) are implemented, integrated with the backend API using `fetch`, and multi-language support for these components is in place. All project initialization tasks, including full RTL/LTR support and light/dark mode theming, are now complete. The backend and frontend projects now build successfully to their `dist` folders, with the frontend build no longer generating unwanted declaration files. The backend development server also starts successfully, and its API routes now include the `/v1` prefix, matching the frontend's API calls. The i18n key usage in `WorkspaceList.tsx`, `WorkspaceForm.tsx`, `GoalList.tsx`, `GoalForm.tsx`, `TaskList.tsx`, and `TaskForm.tsx` has been corrected to use nested keys, and edit/delete functionalities for workspaces, goals, and tasks have been implemented. Additionally, the goal fetching API call in `frontend/src/api/goal.ts` has been updated to use a query parameter for `workspaceId`, resolving the 404 Not Found error. The task fetching API call in `frontend/src/api/task.ts` has also been updated to use a query parameter for `goalId`, resolving the 404 Not Found error for tasks. The translation files for English, Arabic and Farsi have been updated to reflect the new nested key structure for goals and tasks. Furthermore, a centralized unauthorized error handling mechanism has been implemented to clear the authentication token and redirect to the login page upon receiving a 401 Unauthorized response from the API. The foundational documentation is updated, providing a clear roadmap for further development, including new guidelines for i18n translations. The translation files now include build-time versioning to prevent caching issues. The Docker setup for the project is complete, containerizing the backend, frontend, and PostgreSQL database, and addressing the PostgreSQL port exposure. The "Tracking" timer bug has been fixed. The next phase of development will focus on implementing comprehensive error handling, unit and integration tests, deployment pipeline setup, and performance optimizations.

## Known issues

*   **RTL Punctuation Display:** Previously, there was an issue where punctuation (e.g., "!") in RTL languages (like Arabic) appeared on the right side of the text, which is incorrect. This issue is no longer a concern as per user's instruction.

## Evolution of project decisions

*   Initial decision to use Express Zod API and Drizzle for backend, and Vite + React with ShadcnUI for frontend, remains firm.
*   Emphasis on mobile-first design is a guiding principle for all UI/UX decisions.
*   The need for robust internationalization (including RTL/LTR support) and theming has been identified and will be integrated early in the frontend development.
*   Multi-user support with JWT authentication is a confirmed core requirement.
