# Active Context: MeowDo

## Current Work Focus

The current focus is on frontend development, specifically implementing user authentication. All core backend features, including Workspace, Goal, and Task management (CRUD), daily time budget calculation and 24h warning logic, and user authentication/authorization, have been successfully implemented.

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
*   Created `frontend/src/components/auth/LoginForm.tsx` and `frontend/src/components/auth/RegisterForm.tsx` for user authentication.
*   Created `frontend/src/api/auth.ts` to handle authentication API calls using the native `fetch` API (switched from `axios` as per user's request).
*   Installed required Shadcn UI components (`button`, `input`, `label`, `card`) in the frontend.
*   Updated `frontend/src/App.tsx` to manage authentication state and conditionally render login/register forms or main application content.
*   Updated translation files (`frontend/public/locales/en/translation.json`, `ar/translation.json`, `fa/translation.json`) with new authentication-related keys.

## Next Steps

1.  Continue frontend development for other core features (e.g., Workspaces, Goals, Tasks).

## Active Decisions and Considerations

*   **Mobile-First Design:** Emphasizing responsiveness from the outset for all UI components.
*   **Modular Architecture:** Planning for a clear separation between backend (Express Zod API, Drizzle) and frontend (Vite + React) to facilitate independent development and scalability.
*   **Internationalization (i18n):** Integrating multi-lingual support (En, Ar, Fa) early in the frontend setup, including full support for RTL/LTR layouts. The previous RTL punctuation display issue has been addressed and is no longer a concern.
*   **Theming:** Implementing Light Mode and Dark Mode capabilities for user preference.
*   **Multi-user & Authentication:** Implementing JWT-based authentication for multi-user support, with tokens passed via `localStorage` and included in `fetch` headers.

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
