## Brief overview
This rule set outlines preferences for handling user confirmations within the project.

## Confirmation Dialogs
- When implementing user confirmation prompts (e.g., for delete operations, logout), always use the `AlertDialog` component from `shadcn/ui` (`ui/alert-dialog`).
- Do not use native browser confirmation methods like `window.confirm()`.
- **Trigger case:** When a confirmation is required for a user action.
