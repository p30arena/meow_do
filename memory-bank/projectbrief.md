# Project Brief: MeowDo - Goals, Tasks, and Time Tracker and Management Web App

## Core Requirements and Goals

MeowDo is a mobile-friendly web application designed for tracking and managing goals, tasks, and time. Its primary users are mobile users, so responsiveness and mobile-first design are crucial.

### Key Features:

1.  **Workspaces:** Users must be able to define and manage multiple workspaces.
2.  **Goals:** Within each workspace, users can define goals.
    *   Each goal has a `name` and a `description`.
    *   Goals can have an optional `deadline`.
    *   Goals have a `status` (`pending`, `reached`).
3.  **Tasks:** Daily tasks can be defined for each goal.
    *   Each task must have a `time budget` assigned.
    *   The sum of time budgets for all tasks in a day must be calculated and displayed.
    *   A warning must be displayed if the sum of daily task times exceeds 24 hours.
    *   Tasks can be copied to the next day (recurring tasks).
    *   Tasks can have an optional `deadline`.
    *   Tasks have a `status` (`pending`, `started`, `failed`, `done`).
    *   Tasks will have a `priority` (default 1, highest 10).
    *   Users can "start" and "stop" tasks, with tracking records inserted on start and updated on stop.
    *   The application will provide a summary of time spent for each task based on the current day, month, and year, displayed in a bar chart using Recharts.

4.  **User Preferences:** Users can specify and store their timezone preference.

## Tech Stack

### Backend:

*   **Framework:** Express Zod API
*   **Database:** Drizzle ORM with PostgreSQL

### Frontend:

*   **Framework:** Vite + React
*   **UI Library:** ShadcnUI
*   **Styling:** TailwindCSS v3
*   **Icons:** Lucide Icons
*   **Features:**
    *   MultiLingual support (English, Arabic, Farsi)
    *   Light Mode + Dark Mode
