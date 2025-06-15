## Brief overview
This rule set outlines preferences for using Tailwind CSS classes within the project, focusing on directionality-agnostic utilities.

## Tailwind CSS Preferences
- When applying spacing between elements, prefer using `gap-*` utilities (e.g., `gap-4`, `gap-x-2`, `gap-y-3`) over `space-x-*` or `space-y-*` utilities.
- This preference ensures better compatibility with different writing modes and simplifies responsive design by providing a more consistent spacing model.
- **Trigger case:** When adding horizontal or vertical spacing between elements in a flex or grid container.
