# Validation — 2026-10-04

## Final implementation
- Unified handwritten proportions: shared baseline/x-height/slant; I/n/ke/y/s natural groups. Direct dense cubic ink, no physical smoother.
- Gray layer purely illustrative, with local turning-point enrichment and independent pen lifts; current sample: 114 raw vs 2975 dense ink points.
- Rounded caps and joins at every color section: a connected native round-joined interior plus variable-width ribbon; sharp turns split rounded sub-runs without inserting animation lifts. No dot stamping.
- Intro and loop timing, responsive layout, fine-pointer proximity parallax, reduced-motion, active-time pausing and cleanup.

## Passed commands/checks
- `node .trellis/tasks/10-04-new-index3-wordmark/verify.cjs`: finite points, sequential strokes, width range13.4497–16.6544 within85%–115% of15.5,100 timeline cycles,20 responsive cases including perspective corners.
- `node .trellis/tasks/10-04-new-index3-wordmark/verify-render.cjs`:13 reused-v-fresh Canvas frames, discrete raw events,4 resizes/DPRs, raw-coordinate perturbation cannot change rainbow pixels, synthetic90deg/reversal round joins, zero enclosed transparent pixels for I/n/s.
- `node .trellis/tasks/10-04-new-index3-wordmark/verify-lifecycle.cjs`: actual compiled Vue setup in a commandline DOM/RAF mock; hidden/offscreen pause/resume, live reduced-motion, pointer limit/return/touch exclusion, teardown.
- Targeted strict TypeScript noEmit check for glyphs.ts and softPen.ts (ES2022/DOM, Bundler resolution).
- Production `pnpm docs:build`, pinned local11.11.0 executable: exit0,52pages rendered,11.67s. Initial sandbox attempt failed with esbuild spawn EPERM; approved unsandboxed retry succeeded. No dependency/config/source workaround. Only plugin timing informational warnings.
- `git diff --check`, all3 source files UTF8 noBOM/LF; hashes of existing client/new-index2/new-index3/NewHome2/design-drafts unchanged.

## Visual review and limits
Actual Canvas renderer used through bundled @napi-rs/canvas without GUI or browser window.12 stage PNGs plus monochrome proof in frames/. Inspected full wordmark, raw phase and joins; removed old long y-s connector, inconsistent glyph proportions and transparent wedges. Offline snapshots do not constitute browser interaction testing or user approval of final artistic appearance.

## Scope/spec assessment
Only NewHome3 product files modified. Registration/routes/dependencies unchanged. Feature-specific typography/timeline/round-join contracts retained in this task design; no global frontend convention or cross-layer API was introduced, so no unrelated shared-spec changes required. User requested no commit/push; no automatic committing archive command used. Keep this task available for visual refinements.
