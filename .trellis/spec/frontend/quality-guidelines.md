# Quality Guidelines

## Tooling Contract

pnpm is the canonical package manager. `package.json` pins pnpm 11.11.0 and requires Node.js 22.13.0 or newer; use `pnpm-lock.yaml` as the only dependency lockfile.

The repository currently has no ESLint, Prettier, Stylelint, standalone type-check, unit test, integration test, end-to-end test, accessibility test, or CI quality command. Do not report these checks as passing or make them requirements unless a future task adds the tooling.

## Formatting

For newly written or modified source, use:

- Single quotes in JavaScript and TypeScript.
- No semicolons.
- 2-space indentation.

Existing files contain exceptions. Keep unrelated lines stable and avoid formatting-only rewrites when making a scoped change.

## Verification and Release

Run the production site build after source or content changes:

```bash
pnpm docs:build
```

This command builds VuePress with clean cache and temporary directories. A successful site build is the current verification and release boundary. Output is generated in `docs/.vuepress/dist/` and remains ignored; do not edit or commit it.

Netlify is configured outside this repository. Publishing consumes the site build output, and repository-local deployment configuration or commands are intentionally not documented here.

## Review Checklist

- Confirm pages, navigation, sidebars, and globally registered component names still agree with their consumers.
- Keep browser-only work in mounted/event contexts or behind an SSR guard.
- Ensure third-party instances, observers, timers, and listeners are cleaned up where applicable; `VideoPlayerAmbilight.vue` is the reference for media teardown.
- Preserve responsive behavior and relevant accessibility attributes on changed UI.
- Validate remote payloads before assigning them to reactive state; `DownloadCard.vue` is the current normalization example.
- Run `pnpm docs:build` and report any warnings or failures accurately.
- If `docs/.vuepress/public/` was added to or changed, remind the user to upload or update the corresponding 123pan direct link.

No additional automated test or accessibility gate is required at present. Manual review should be proportional to the changed page or interaction.

## NewHome3 performance and compatibility checks

Compare optimized renderer pixels against a committed baseline across pen/material/theme/size, rewind and erasure states before claiming unchanged effects. Report workload dimensions and forced pixel flush for CPU timings; native Canvas timing does not establish device FPS. Use isolated, windowless browser engines for permitted CLI checks. A changed user agent in Chromium is not a WebKit test; Windows WebKit is not a Safari/iPad device acceptance. Check composited screenshots as well as Canvas alpha. Verify system reduced-motion does not suppress this demo, and separately retain manual pause and hidden/offscreen clock suspension.

The installed Vite default production target is Safari/iOS16.4 (alongside its Chromium/Firefox targets); local API/CSS fallbacks do not guarantee the full theme/runtime on arbitrary older browsers. Preserve dependencies/build configuration and document unreplicated client failures instead of attributing them to an unrelated verified defect.
