# Validation — 2026-10-22

- Production build: pnpm docs:build PASS (exit0,51pages, final rebuild28.93s). Plugin timing notices only.
- node .trellis/tasks/10-19-new-index3-release/verify-release.cjs PASS: SFC compile, default/release contract, mobile and desktop SSR fallback, 1.25s lifecycle, hidden/offscreen/no idle RAF, mouse-only parallax and cleanup.
- Headless Edge155:32 browser scenarios passed all assertions: both themes; JS at320,390,768,900,960,1280,1920; noJS additionally920,921. No horizontal overflow; hero download present; release download absent; visible interactive controls6desktop/8mobile; crop32–48px; mobile full toolbar; no title overlap or page errors. Screenshot review dark1280/light320/light900 confirms intended hierarchy.
- Network blocked except local production server for reproducible layout checks; no real Safari/iPad acceptance claimed. No visible GUI opened.
- Sandbox Edge launch failed with crashpad named-pipe error; authorized outside-sandbox headless launch succeeded. Browser test assertions completed; test runner required cleanup of a lingering Node handle after browser exit. This is test-host cleanup, not a product failure.
- git diff --check PASS; modified tracked sources retain UTF-8 noBOM/LF. No lint or standalone typecheck command configured.
- Checker fixed SSR desktop crop at920/921 boundary and restored original ReleaseSection line endings.
- Preview/report copies: C:/Users/alan-/.codex/visualizations/2026/10/22/01a1616d-bbc1-7c12-b074-8ea5c990ca1d/inkeys3-release-desktop.png, inkeys3-release-mobile.png, inkeys3-release-validation.json.
- User requested no commits/pushes. Unrelated initial untracked files preserved.
- Final harness cleanup: switched to an explicitly owned Playwright browser server; --smoke passed and exited0 in5.31s. No site code changes were needed.
