# Research: Existing Guidelines, Git History, and Open Decisions

- **Query**: Inspect existing convention documents, current git status, recent relevant history, candidate frontend spec files, and unresolved decisions.
- **Scope**: internal
- **Date**: 2026-07-29

## Findings

### Files Found

| File Path | Description |
|---|---|
| `AGENTS.md` | Trellis-managed project entry instructions; does not define application coding conventions. |
| `.trellis/tasks/00-bootstrap-guidelines/prd.md` | Bootstrap task requirements and target spec list. |
| `.trellis/tasks/00-bootstrap-guidelines/task.json` | In-progress task metadata and `.trellis/spec/frontend/` scope. |
| `.trellis/spec/frontend/index.md` | Placeholder frontend guideline index. |
| `.trellis/spec/frontend/directory-structure.md` | Empty directory guideline scaffold. |
| `.trellis/spec/frontend/component-guidelines.md` | Empty component guideline scaffold. |
| `.trellis/spec/frontend/hook-guidelines.md` | Empty hook guideline scaffold. |
| `.trellis/spec/frontend/state-management.md` | Empty state guideline scaffold. |
| `.trellis/spec/frontend/type-safety.md` | Empty type-safety guideline scaffold. |
| `.trellis/spec/frontend/quality-guidelines.md` | Empty quality guideline scaffold. |
| `.trellis/spec/guides/*.md` | Pre-populated generic thinking guides, outside the frontend bootstrap content target. |

### Existing Convention Documentation

The six frontend spec files are still scaffolds containing `(To be filled by the team)` and prompt comments. `frontend/index.md:15-22` marks every frontend guide as `To fill`. The index requires English documentation and asks for actual conventions with real code examples (`frontend/index.md:26-39`).

The bootstrap PRD identifies these exact six files as the intended outputs (`.trellis/tasks/00-bootstrap-guidelines/prd.md:29-42`). It also states that generic thinking guides are already populated and only need customization when they conflict with the project (`prd.md:44-47`).

No `CLAUDE.md`, `CONTRIBUTING.md`, `CONVENTIONS.md`, `.cursorrules`, `.cursor/rules`, `.windsurfrules`, `.clinerules`, `.roomodes`, `.aider.conf.yml`, `.editorconfig`, `.vscode` settings, or GitHub Copilot instruction file was found. `README.md` documents setup commands but not coding conventions.

### Resolved User Decisions

After the repository research, the developer resolved the conventions that source history alone could not establish:

- New or modified JavaScript and TypeScript uses single quotes, no semicolons, and 2-space indentation. Existing mixed-format history remains in place, and unrelated lines are not reformatted.
- pnpm is the only package manager for this repository. `pnpm-lock.yaml` is the only dependency lockfile, so the stale `package-lock.json` is deleted.
- `pnpm docs:build` is the repository-local quality gate. Publishing is handled by Netlify configuration outside the repository; no local deploy command or deployment configuration should be invented.
- Any addition or change under `docs/.vuepress/public/` requires a user-facing reminder to upload or update the corresponding 123pan direct link.

These are explicit project decisions for future work, not claims that the mixed historical source or repository-local deployment files already enforce them.

### Current Git Status

At research time, the branch is `main`, tracking `origin/main`, with no ahead/behind count shown. The worktree contains:

```text
 M .gitattributes
?? .agents/
?? .codex/
?? .opencode/
?? .trellis/
?? AGENTS.md
```

These changes predate this research pass. Research output is confined to `.trellis/tasks/00-bootstrap-guidelines/research/`.

### Recent Relevant History

Recent history is concentrated in documentation, site configuration, dependencies, and download behavior:

| Commit | Observed change |
|---|---|
| `a01fd17` | Switched the download mirror and added `docs/version/changelog/20260713a.md`. |
| `3010bb4` | Revised the UInk format specification registries, headers, and type IDs. |
| `ac8af48` | Added Device and Media blocks to the UInk specification. |
| `f3779b1` | Moved project-level pnpm settings into `pnpm-workspace.yaml`, selected pnpm 11 / Node 22.13+, and updated VuePress/theme/runtime dependencies and CDN URLs. |
| `75bc1cd` | Added per-channel new-tab download behavior. |
| `0101f5b` | Added the CDN-to-local image fallback script in VuePress config. |
| `38d6a80` | Added download dropdown behavior and associated component styling. |
| `7eaf3e5` | Added route-aware Busuanzi tracking, layout integration, and homepage visit counter registration. |
| `3ee2942` | Added the initial Busuanzi site visit counter. |

Commit `f3779b1` explicitly removed legacy `.npmrc` settings and recreated them in `pnpm-workspace.yaml`; it also regenerated `pnpm-lock.yaml`. This history supports pnpm 11 configuration as current repository intent.

Commit `7eaf3e5` shows the current composition pattern for cross-page browser behavior: a tracker component is locally mounted by the layout, while the visible homepage counter is globally registered for Markdown usage.

### Candidate Frontend Spec Files

The following mapping is based on the current scaffold names and evidence collected in the other research reports:

| Candidate Spec | Repository Evidence Available |
|---|---|
| `.trellis/spec/frontend/directory-structure.md` | `docs/` as source root; `.vuepress` config/theme/public organization; generated `.temp/.cache/dist`; content groupings. |
| `.trellis/spec/frontend/component-guidelines.md` | Mixed SFC styles; global Markdown registration versus layout-local components; local props; scoped/global CSS; Plume component reuse. |
| `.trellis/spec/frontend/hook-guidelines.md` | Vue lifecycle hooks and watchers inside SFCs; no standalone custom composables found. |
| `.trellis/spec/frontend/state-management.md` | Local `ref`/`computed`; route-derived state; native fetch state; no global store found. |
| `.trellis/spec/frontend/type-safety.md` | Mixed TypeScript/JavaScript SFCs; local interfaces; runtime props; `.vue` shim; manual remote-data validation; no `tsconfig`. |
| `.trellis/spec/frontend/quality-guidelines.md` | Existing build command; ignored generated output; browser cleanup/SSR guards; responsive CSS; no lint/test/check/CI commands found. |
| `.trellis/spec/frontend/index.md` | Status table can reflect whichever guideline documents are populated by the main workflow. |

### Concise Repository Summary

The project is a Chinese-first documentation/product site built with Vue 3, VuePress 2 RC, VuePress Theme Plume RC, and Vite. pnpm 11 is the declared package manager and Node.js 22.13+ is required. Authored pages are Markdown under `docs/`; VuePress configuration, custom Vue components, shared CSS, and public assets are under `docs/.vuepress/`. The frontend uses a mixture of typed and untyped Vue SFCs, primarily Composition API, with one Options API component. State and fetching are local to components. The only documented verification command is the production VuePress build; no deployment, lint, test, or standalone type-check setup is present.

### External References

No external research was required for this topic. Repository history and local task/spec files provide the relevant evidence.

### Related Specs

- `.trellis/spec/frontend/index.md` and all six linked frontend guideline files are the direct bootstrap targets.
- `.trellis/spec/guides/code-reuse-thinking-guide.md` and `.trellis/spec/guides/cross-layer-thinking-guide.md` are already populated generic guides and are not identified by the PRD as files requiring bootstrap content.

## Caveats / Not Found

The following points remain deliberately contextual rather than mandatory standards:

- Whether new Vue components should always use TypeScript and `<script setup>`, or continue matching the mixed existing styles.
- What linting, type-checking, testing, accessibility, and review requirements are expected beyond a successful production build.
- Whether future shared stateful logic should remain component-local or use standalone composables; none currently establish a precedent.
- Whether generated `docs/.vuepress/dist` should be inspected manually for a particular release; it remains ignored and the repository-local gate is the production build.
