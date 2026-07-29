# Frontend Development Guidelines

The frontend is a VuePress documentation site rooted at `docs/`. Read the guide that matches the files being changed.

## Guides

- [Directory Structure](./directory-structure.md) - Pages, theme code, configuration, public assets, and generated output.
- [Component Guidelines](./component-guidelines.md) - Vue component styles, props, registration, CSS, and accessibility.
- [Hook Guidelines](./hook-guidelines.md) - Lifecycle hooks, watchers, browser integration, and future composables.
- [State Management](./state-management.md) - Component-local, route-derived, and fetched state.
- [Type Safety](./type-safety.md) - Mixed TypeScript/JavaScript conventions and runtime validation.
- [Quality Guidelines](./quality-guidelines.md) - Formatting, build verification, release checks, and current tooling limits.

## Quick Checks

- Match the established style of the file and feature being changed.
- For new or modified source, use single quotes, no semicolons, and 2-space indentation; do not reformat unrelated existing exceptions.
- Run `pnpm docs:build` after source or content changes.
- When `docs/.vuepress/public/` changes, remind the user to upload or update the corresponding 123pan direct link.
