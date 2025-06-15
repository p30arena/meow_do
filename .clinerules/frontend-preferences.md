## Brief overview
This rule set outlines preferences for frontend development within the MeowDo project, specifically regarding UI library usage.

## UI Library Preferences
- When initializing or adding UI components, always use `shadcn` (e.g., `npx shadcn@latest init` or `npx shadcn@latest add`) instead of the deprecated `shadcn-ui` package.
  - **Trigger case:** When the CLI suggests using `shadcn` instead of `shadcn-ui`.
