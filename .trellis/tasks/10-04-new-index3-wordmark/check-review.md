# Check review — 2026-10-04

## Follow-up: k/e refinement after 10a4dfd

- Product diff is confined to the k/e gesture data in `glyphs.ts`: the existing k stem becomes its own stroke, the closed upper-right arm becomes open, and the arm-to-e transition and e bowl are revised. I/n/y/s control points, common sampling, slant and nominal width are unchanged. Splitting a stroke naturally reallocates per-stroke timing within the existing 4.2s total.
- Diagnosed the renderer-test failure as an antialias boundary classification issue, not a new enclosed hole. At 900px, n pixel `(191, 150)` has alpha 51 and connects diagonally to exterior pixel `(192, 149)` with alpha 95, then alpha 0. Four-connected flood fill incorrectly excludes it. At 901px, the corresponding alpha-104 pixel connects through alpha-136 antialias coverage; using alpha 128 as both the flood boundary and hole threshold incorrectly closes that boundary too.
- With main-agent agreement, updated only `verify-render.cjs`: exterior traversal is eight-connected through nonopaque pixels; a low-alpha pixel below 128 is reported only when enclosed by opaque ink. The asserted hole count remains exactly zero. Added 900/901px I/n/s coverage, synthetic fully enclosed alpha 0/51/127 holes which must each be detected, and diagonal semitransparent boundary fixtures which must remain exterior.
- Negative-control diagnostic removed the round inner stroke in memory only. The corrected detector still found **35 genuine enclosed I pixels**, demonstrating that this change does not excuse the original rendering defect. No source/test tolerance was added and no production renderer change was needed.
- Follow-up verification: `verify-render.cjs`, `verify.cjs`, `verify-lifecycle.cjs` and `git diff --check` all PASS. Main agent independently reports targeted TypeScript PASS and production build PASS (52 pages, exit 0). Reviewer made no product source changes, opened no GUI, and created no commit.

The remaining sections record the earlier full review before this glyph-only follow-up.

## Findings (fixed)

No additional mechanical issues found; this reviewer made no source changes. The implementation agent's round-join repair was already present when final review began.

## Findings (not fixed)

None. Review used the latest user requirements: direct rainbow curves independent of illustrative input, coordinated proportions, separate y/s, adaptive raw-point density, and round joins without transparent holes.

## Verified behavior

- Browser-only canvas creation, listeners and observers are mounted; precomputed scene construction is SSR-safe. Unmount removes listeners, observers and the outstanding animation frame.
- Hidden/offscreen playback pauses the active clock and resumes without consuming hidden time. Live reduced-motion changes show the complete rainbow and disable tilt. Fine-pointer gating and touch-event exclusion are present.
- Pointer proximity uses the untransformed plane, a 120px falloff, maximum 4-degree rotation and 6px translation; raw and rainbow layers share one canvas transform.
- Layout preserves aspect ratio, 42% vertical position, a 900px maximum and side padding including perspective. Ink timing and arc-length color persist across pen lifts; gray events reveal whole segments discretely.
- Rainbow geometry is independent of raw coordinates. Rendering uses round-cap/round-join connected strokes under the variable-width ribbon; corner/reversal tests and I/n/s hole tests pass. Native canvas pixel checks verify deterministic redraws, resize/DPR cache invalidation and empty image borders.
- Inspected the saved monochrome frame: shared lowercase height, slant and stroke proportions, with y/s visibly separated. This static inspection does not establish subjective animation smoothness or substitute for browser visual acceptance.

## Verification

- Lint: unavailable; the repository has no lint command/configuration. No linter pass claimed.
- TypeCheck: PASS for `glyphs.ts` and `softPen.ts` using installed TypeScript with `--noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM --skipLibCheck`. The Vue SFC was compiled and exercised by the lifecycle harness; there is no repository-wide standalone Vue type-check command.
- Tests: PASS for `verify.cjs` (114 illustrative raw points, 2,975 ink points, 100 cycles, 20 responsive cases including projected corners).
- Tests: PASS for `verify-lifecycle.cjs` (pause/resume, offscreen, live motion preference, pointer bounds/return/touch exclusion, teardown).
- Tests: PASS for `verify-render.cjs` (13 history-independent frames, discrete raw segments, 4 resize/DPR cases, independent rainbow pixels, round corner/reversal geometry and zero enclosed transparent I/n/s seam pixels).
- `git diff --check`: PASS for tracked changes; the NewHome3 directory is currently untracked, so that command alone does not validate its source diff.
- Production `pnpm docs:build`: coordinated by the main agent; record its result separately.
- No GUI/browser opened, dependencies changed, commit created or push performed.

## Spec sync recommendation

Task PRD/design already include the latest typography and round-join requirements. Preserve the narrow rendering lesson in frontend guidance: filled offset ribbons do not acquire round joins from the canvas `lineJoin` setting alone, and turn/reversal alpha tests should accompany changes to their geometry. Main session owns any shared-spec update.
