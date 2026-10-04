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

## k/e refinement after10a4dfd
- Product diff limited to glyphs.ts: k-stem + ke replaces single heavy ke gesture, removes right closed loop/backtracking, quieter lower-leg connector and more open e. Other glyph control points, renderer and Vue unchanged.
- Current data:110 illustrative raw points/2797 dense ink points; width13.5992–16.8035 within original pressure envelope.100cycles/20layouts, compiled Vue lifecycle, strict TS all PASS.
- Pixel test initial n1pixel failure was AA exterior-connectivity misclassification. Corrected to8-neighbor flood through partially opaque edge pixels, retaining zero tolerance for enclosed alpha<128. Added synthetic holes alpha0/51/127, diagonal AA, and900/901px glyph tests. Negative control omitting round-joined interior still detects35 genuine I holes. Final renderer regression PASS.
- Production build using existing pinned pnpm11.11.0 command: exit0,52pages,16.69s; only plugin timing notices. No GUI, dependency/config change, commit or push this round.
- Latest monochrome/color proof in frames/; pre-refinement comparison preserved as before-ke-monochrome.png and before-ke-color.png. Appearance remains subject to user feedback.

## Playback controls and pen travel after6be2b54
- Accepted k/e revision committed as6be2b54 before this change. User explicitly authorizes a final commit for the following additions; no push.
- Loop ink completion immediately removes gray input; hold/fade contain rainbow only. Manual pause jumps to opaque finished rainbow; continue starts the0.7s fade immediately then replays normally.
- Native pause/continue button uses equal responsive right/bottom insets and absolute positioning inside the first screen. Reduced-motion disables playback control; paused parallax remains available.
- Distance-aware pen travel gaps114–222ms apply to both layers, including k's two strokes; total writing duration remains4.2s. Current100raw/2797ink points, width13.3263–16.2459.
- Logic, native Canvas pixel and compiled Vue lifecycle tests PASS:100cycles/20layouts, no pixels during pen travel, no gray during completed/fading rainbow, all-phase manual pause/resume, resize/visibility/preference changes while paused, teardown. Raw-spacing regression now includes adaptive curve samples instead of filtering them out by elapsed sample interval.
- Targeted strict TypeScript PASS. Existing pinned pnpm docs:build PASS(exit0),52pages,10.94s; only plugin timing notices. Build ran outside sandbox due known esbuild subprocess restriction; no dependency/config changes.
- Independent Trellis review found no actionable issue. No GUI/browser test performed per user instructions; native Canvas and mocked lifecycle checks do not replace browser visual acceptance.
