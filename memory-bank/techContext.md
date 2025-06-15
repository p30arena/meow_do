# Tech Context: MeowDo

## Technologies Used

### Backend:
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **API Validation:** Zod
*   **ORM:** Drizzle ORM
*   **Database:** PostgreSQL
*   **Language:** TypeScript

### Frontend:
*   **Build Tool:** Vite
*   **Library:** React
*   **UI Components:** ShadcnUI
*   **Styling:** TailwindCSS v3
*   **Icons:** Lucide Icons
*   **Language:** TypeScript
*   **Internationalization:** `react-i18next` (or similar) - will need to support RTL/LTR.
*   **State Management:** React Context (for base theme), `localStorage` (for theme persistence)
*   **Charting:** Recharts
*   **Timezone Handling:** (To be selected, e.g., `luxon`, `date-fns-tz`, or `moment-timezone`)

## Development Setup

### General:
*   **Package Manager:** npm or yarn (will standardize on one, likely npm)
*   **Version Control:** Git
*   **Code Editor:** VS Code (recommended extensions: ESLint, Prettier, Tailwind CSS IntelliSense, Drizzle Kit)

### Backend Specific:
*   **Database Setup:** Local PostgreSQL instance or Dockerized PostgreSQL container for development.
*   **Environment Variables:** `.env` file for sensitive information (database credentials, API keys).
*   **Migrations:** Drizzle Kit for database schema migrations.

### Frontend Specific:
*   **Vite Configuration:** Standard Vite setup for React with TypeScript.
*   **TailwindCSS Configuration:** `tailwind.config.js` for custom themes and utility classes.
*   **ShadcnUI Setup:** Initializing Shadcn components as per their documentation, likely involving `npx shadcn@latest init` and `npx shadcn@latest add <component>`.

## Technical Constraints

*   **Mobile-First Performance:** The application must be highly performant and responsive on mobile devices, requiring careful optimization of assets and rendering.
*   **Scalability:** The database and API should be designed to handle a growing number of users and data.
*   **Security:** Robust measures for authentication, authorization, and data protection are essential.
*   **Maintainability:** Codebase should be clean, well-documented, and follow established coding standards to facilitate future development and debugging.
*   **Browser Compatibility:** Support for modern mobile and desktop browsers.

## Dependencies

*   **Backend:** `express`, `zod`, `drizzle-orm`, `pg` (PostgreSQL driver), `dotenv`, `cors`, `jsonwebtoken`.
*   **Frontend:** `react`, `react-dom`, `vite`, `tailwindcss`, `postcss`, `autoprefixer`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `react-i18next` (or similar), `zustand` (or similar), `stylis-plugin-rtl` (or similar for RTL support), `recharts`, `luxon` (or similar timezone library).
*   **Development:** `typescript`, `nodemon` (backend), `vite-plugin-react` (frontend), `drizzle-kit`, `eslint`, `prettier`.

## Tool Usage Patterns

*   **Drizzle Kit:** Used for generating migrations and pushing schema changes to the database.
*   **Vite:** Used for fast development server and optimized builds for the frontend.
*   **npm/yarn scripts:** Standardized scripts for running development servers, builds, tests, and database operations.
*   **ESLint & Prettier:** Enforced for code quality and formatting consistency across the project.
