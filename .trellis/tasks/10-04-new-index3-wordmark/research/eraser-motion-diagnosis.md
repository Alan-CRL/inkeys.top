# Research: Eraser trajectory stutter and stiff reversals

- Query: Why does the current new-index3 eraser stutter, appear to jump at turns, and look stiff?
- Scope: internal, read-only product diagnosis; actual temporal cursor path rather than analytic endpoint continuity alone
- Date: 2026-10-05

## Files found

- `docs/.vuepress/theme/components/NewHome3/eraser.ts` — route construction, curvature-derived time mapping, fixed-rate cursor and immutable mask chunks.
- `docs/.vuepress/theme/components/NewHome3/playback.ts` — 4.8s sweep driven by active elapsed time, with boundary opacity phases.
- `docs/.vuepress/theme/components/NewHome3/NewHome3.vue` — shared CSS-pixel cursor and mask consumed each paint.
- `.trellis/tasks/10-04-new-index3-wordmark/verify-eraser.cjs` — existing spatial continuity, coverage, radius, mean-speed and layout assertions.
- `research/eraser-motion-diagnostic.cjs` / `research/eraser-motion-metrics.json` — reproducible actual getEraserFrame frame-to-frame movement measurements.
- `research/eraser-motion-fine.cjs` — fine temporal guide interpolation and turn-interior curvature/speed checks.

## Findings

### Performance-induced skipping and intrinsic trajectory problems are separate

Parent measured rendering independently; see `eraser-render-performance.md`. At roughly 5–10 effective frames per second, the actual trajectory can move about 200–374 CSS pixels between displayed frames (900×406 plane), skipping most of a reversal. This explains perceived position teleportation without requiring a literal endpoint discontinuity.

The route has no literal positional discontinuity at curve joins. Its matched unit tangent and arc-length curvature are genuinely equal there. However, these guarantees only apply to the joins, not the interiors of the quintic turns, nor to time acceleration/jerk.

### Tight interior bends remain despite C2 endpoint matches

`eraser.ts:153–158` builds quintic reversal control points from a heuristic handle plus endpoint conditions. It places no constraint on minimum turn radius, interior derivative magnitude, loop shape or time-domain acceleration.

At 900×406, the route has 25 curves, including 12 turns, and total travel 5435.54 CSS pixels in 4.8 seconds: average 1132.40 px/s. Several upper reversals have extremely tight interior radii:

| Curve index | Minimum local radius | Speed at that radius | Time |
|---|---:|---:|---:|
| 3 | 3.865 px | 490.6 px/s | .333 s |
| 5 | 3.407 px | 549.6 px/s | .702 s |
| 7 | 1.504 px | 588.9 px/s | 1.096 s |
| 11 | 2.836 px | 515.7 px/s | 2.118 s |
| 15 | 2.559 px | 526.1 px/s | 3.130 s |

For comparison, central lower reversals have minimum radii about14–16px. Curve7 implies approximately230,544px/s² normal acceleration at its tightest location. These are near-cusp bends visually, even though their mathematical derivatives need not be discontinuous.

`eraser.ts:173–195` derives speed from curvature with a floor, then spatial bidirectional smoothing and global normalization to4.8s. This is not an acceleration/jerk-limited motion planner. Spatial smoothing also lifts local speed at sharp peaks; comparing mean speed of a whole swipe versus a whole turn does not ensure sufficiently slow motion at the tightest reversal.

### Actual cursor path is visibly abrupt even without expensive rendering

Actual `getEraserFrame` measurements at900×406:

| Sampling | Largest movement | Largest adjacent nonzero heading change |
|---|---:|---:|
|60Hz|45.65px/frame|106.39°|
|120Hz|23.66px/step|67.26°|

Fine interpolation of the unquantized guide still has maximum heading changes40.17° at480Hz and22.88° at1000Hz, confirming tight interior bends rather than only display-rate aliasing.

### Cursor itself is quantized, not merely the erasure mask

`eraser.ts:263–267` returns `cached.cursors[floor(progress*576)]`, so the pointer jumps in120Hz increments without interpolation. A144Hz sample has115–116 repeated positions over692 frames; at240Hz every other frame repeats. This creates additional uneven movement on high-refresh displays. At60Hz the position change can still be45.65px because motion is very fast. Heading statistics for repeated-position high-refresh samples are intentionally not used to characterize real turning: zero movement has undefined direction.

## Why prior checks passed

`verify-eraser.cjs:133–134` verifies matching endpoint tangent/curvature, not maximum curvature across reversal interiors. Its speed assertion at149 compares mean speeds, and150 only checks near-rest beginning/end. The radius continuity check at36 concerns eraser size, not the path bend radius. Pixel coverage, deterministic rewind, zero remnants and viewport clearance establish correctness, not perceptual frame smoothness or realistic motion. There is no frame-time budget, per-frame displacement, time-domain acceleration or jerk limit.

## Targeted remedies and tradeoffs

1. First fix renderer work growth (parent diagnosis). Otherwise new geometry remains invisible behind dropped frames.
2. Replace reversal handle heuristic with broad, monotone round turns having minimum radius tied to cursor size, and validate interiors. May require fewer swipes, looser exact lane placement, or greater duration to retain complete coverage.
3. Plan time by a curvature-derived normal-acceleration bound plus tangential acceleration limits; add smooth jerk-limited ramps. Increasing duration alone scales speed but does not remove geometric near-cusps.
4. Interpolate cursor at actual active time separately from immutable mask checkpoint updates. Preserve checkpoint mask determinism/rewind while using incremental mask replay or cached checkpoints rather than replaying everything.
5. Add checks for minimum interior radius, local reversal speed, sampled displacement and acceleration; benchmark actual compositor work at late progress. Do not use endpoint C2 labels as a substitute for these measurements.

## Related specs

- `.trellis/spec/frontend/state-management.md` — immutable mask replay contract and shared cursor time currently emphasize deterministic replay; optimization must preserve rewind/resize/pause semantics.
- `.trellis/spec/frontend/quality-guidelines.md` — command-line verification does not establish real browser visual acceptance.
- Task latest PRD/design — upward-convex swipes, calm turn-aware movement, opaque cursor and boundary fades are intended behavior.

## External references

None required: all claims come from current local implementation and reproducible command-line measurements. No browser, GUI or native-repository edits performed.

## Caveats / Not Found

These CPU/geometry measurements do not claim browser GPU performance or visual acceptance. The900×406 plane is the tested desktop size; narrower planes scale distances. No product changes, commit or push were made. Endpoint continuity is intact; the perceived jumps combine dropped frames, fast tight turns and quantized cursor motion.
