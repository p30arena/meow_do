# Active Context: MeowDo

## Current Work Focus

The current focus is on implementing new features: user timezone preference, task tracking (start/stop, time spent summary with Recharts), and task priority. All previous core features (User authentication, Workspace management, Goal management, and Task management) and project initialization tasks (multi-language support including RTL/LTR, and light/dark mode theming) have been successfully implemented. All core backend features are also complete.

## Recent Changes

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

## Next Steps

1.  Implement user timezone preference (backend schema, API, frontend UI) - **Completed**.
2.  Implement task priority (backend schema, API, frontend UI) - **Completed**.
3.  Implement task start/stop tracking (backend schema, API, frontend UI) - **Completed**.
4.  Implement task time spent summary and display using Recharts (backend API, frontend UI) - **Completed**.
5.  Comprehensive error handling.
6.  Unit and integration tests for both backend and frontend.
7.  Deployment pipeline setup.
8.  Performance optimizations.

## Active Decisions and Considerations

*   **Mobile-First Design:** Emphasizing responsiveness from the outset for all UI components.
*   **Modular Architecture:** Planning for a clear separation between backend (Express Zod API, Drizzle) and frontend (Vite + React) to facilitate independent development and scalability.
*   **Internationalization (i18n):** Integrating multi-lingual support (En, Ar, Fa) early in the frontend setup, including full support for RTL/LTR layouts. The previous RTL punctuation display issue has been addressed and is no longer a concern.
*   **Theming:** Implementing Light Mode and Dark Mode capabilities for user preference.
*   **Multi-user & Authentication:** Implementing JWT-based authentication for multi-user support, with tokens passed via `localStorage` and included in `fetch` headers.
*   **Timezone Preference:** Allowing users to set their preferred timezone for accurate time display and calculations.
*   **Task Prioritization:** Adding a priority field to tasks to help users organize their work.
*   **Detailed Task Tracking:** Implementing start/stop functionality and time aggregation for tasks to provide better insights into time spent.
*   **Charting:** Using Recharts for clear visual representation of time spent on tasks.

## Important Patterns and Preferences

*   **Clean Code:** Adherence to best practices for readability, maintainability, and scalability.
*   **Component-Based UI:** Utilizing React components and ShadcnUI for a modular and reusable frontend.
*   **Type Safety:** Leveraging Zod for API schema validation and TypeScript throughout the project for robust type checking.
*   **API Communication:** Using native `fetch` API for all frontend-to-backend communication.

## Learnings and Project Insights

*   The project's success heavily relies on a strong mobile user experience.
*   Clear definition of goal and task statuses is crucial for effective tracking.
*   The 24-hour time budget warning is a critical feature for realistic daily planning.
*   Multi-user support with robust authentication is a core requirement, necessitating careful JWT implementation.
*   RTL/LTR layout support is essential for the target user base. The previous punctuation display issue has been addressed and is no longer a concern.
*   User preference for `fetch` over `axios` for API calls has been noted and implemented.
