# Validation — scroll frame and ambient ink

- Production: `pnpm docs:build` passed, exit 0, 51 pages, final build 15.01s. Only existing PLUGIN_TIMINGS diagnostics; no compilation errors.
- Logic/lifecycle: `verify-frame.cjs`, `verify-ambient.cjs` (400 seeded rounds), existing `10-19-new-index3-release/verify-release.cjs`, and `10-04-new-index3-wordmark/verify-lifecycle.cjs` passed.
- Focused TypeScript: installed `typescript/bin/tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck` passed for scrollFrame.ts and ambientScene.ts.
- Headless Edge matrix: 28 cases (320/390/768/900/960/1280/1920px × light/dark × JavaScript/no-JavaScript) passed. Checked horizontal overflow, three scroll phases, upward recall, downward dismissal, top reset, opaque no-JS navigation, native mobile menu, keyboard focus lock and hidden navigation inert state. Screenshots captured for every matrix case.
- Headless ambient: five cases passed (four scene types desktop; pen mobile). Checked document-anchored positions, concurrency bounds, pointerless/aria-hidden layer, visibility freeze/resume and complete erase/fade. Shape case also checks native SPA route navigation removes frame/ambient and restores navigation interactivity.
- CDP recorded actual headless page frames for the scroll transitions and shape draw/morph/erase cycle; encoded as GIF with captured timestamps. Screenshots manually inspected at desktop light/dark and 320px mobile, including digits/highlighter/eraser.
- Latest user refinement implemented: solid exterior/nav, faint aperture contour, subtle hero/below-fold separator; content gradient retained inside only.
- `git diff --check` passed. Original source encodings/newlines retained. Existing unrelated untracked files preserved. No commits or push.

## Scope and limitations

Browser verification used local production output and headless system Edge on Windows, with remote network resources blocked for reproducibility. No visible GUI was launched. Safari/Firefox and physical touch devices were not tested; lifecycle visibility was simulated via visibilitychange, and scroll tests used scripted document scroll. Deterministic pointer/touch gating is covered by existing component regressions.

## Artifacts

Saved previews and reports: `C:/Users/alan-/.codex/visualizations/2026/10/22/01a1616d-bbc1-7c12-b074-8ea5c990ca1d/`.

- scroll-frame-dark.png
- scroll-frame-mobile.png
- ambient-digits.png
- inkeys-scroll-motion.gif
- scroll-frame-report.json (28 cases)
- ambient-report.json (5 cases)

Full temporary screenshot runs: `C:/Users/alan-/AppData/Local/Temp/inkeys-shell-fbno3H` and `C:/Users/alan-/AppData/Local/Temp/inkeys-shell-ehTe6j`.

Re-run from repository root: `node <task-path>/verify-browser.cjs` and `node <task-path>/verify-browser.cjs --ambient`. Requires bundled Playwright and headless Edge; this runner needs elevated sandbox permission to create the Edge crashpad pipe. No application code was changed to bypass the environment restriction.
