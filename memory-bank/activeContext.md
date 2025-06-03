# Active Context: MeowDo

## Current Work Focus

The current focus is on initializing the project structure and setting up the foundational memory bank documentation. This involves creating the necessary directories and core Markdown files to establish a clear understanding of the project's requirements, design, and technical considerations.

## Recent Changes

*   Created the `memory-bank` directory.
*   Created and populated `memory-bank/projectbrief.md` with the initial project description.
*   Created and populated `memory-bank/productContext.md` with details on the project's purpose, problems solved, how it should work, and UX goals.

## Next Steps

1.  Complete the creation of all core memory bank files (`systemPatterns.md`, `techContext.md`, `progress.md`).
2.  Present the initial project setup plan to the user.
3.  Await user approval and a switch to ACT MODE to begin implementing the backend and frontend infrastructure.

## Active Decisions and Considerations

*   **Mobile-First Design:** Emphasizing responsiveness from the outset for all UI components.
*   **Modular Architecture:** Planning for a clear separation between backend (Express Zod API, Drizzle) and frontend (Vite + React) to facilitate independent development and scalability.
*   **Internationalization (i18n):** Integrating multi-lingual support (En, Ar, Fa) early in the frontend setup, including full support for RTL/LTR layouts.
*   **Theming:** Implementing Light Mode and Dark Mode capabilities for user preference.
*   **Multi-user & Authentication:** Implementing JWT-based authentication for multi-user support, with tokens passed via the Authorization header.

## Important Patterns and Preferences

*   **Clean Code:** Adherence to best practices for readability, maintainability, and scalability.
*   **Component-Based UI:** Utilizing React components and ShadcnUI for a modular and reusable frontend.
*   **Type Safety:** Leveraging Zod for API schema validation and TypeScript throughout the project for robust type checking.

## Learnings and Project Insights

*   The project's success heavily relies on a strong mobile user experience.
*   Clear definition of goal and task statuses is crucial for effective tracking.
*   The 24-hour time budget warning is a critical feature for realistic daily planning.
*   Multi-user support with robust authentication is a core requirement, necessitating careful JWT implementation.
*   RTL/LTR layout support is essential for the target user base and needs to be considered in UI component design.
